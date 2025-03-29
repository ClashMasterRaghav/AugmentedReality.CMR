// Core AR functionality for initialization, scene setup, and render loop
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { createControlPanel, createVirtualKeyboard } from './ar_ui.js';
import { createNewBrowserScreen, selectScreen, screens, updateScreenEffects } from './ar_screens.js';
import { setupEventListeners, setupVideoControls } from './ar_interaction.js';
import { initUI, createNotification } from './ar_ui.js';
import { loadVideoTexture, toggleVideoPlayback, toggleVideoMute, updateVideoTextures } from './ar_media.js';

// Global variables exported for use in other modules
export let camera, scene, renderer;
export let controller, controllerGrip;
export let font;
export let raycaster = new THREE.Raycaster();
export let workingMatrix = new THREE.Matrix4();
export let isPlacingScreen = false;
export let newScreen = null;
export let isMovingScreen = false;
export let isMoveModeActive = false;
export let isRotateModeActive = false;
export let selectedScreen = null;
export let selectedKey = null;
export let container;
export let isARMode = false;

// Main initialization function called from ar_main.js
export function initAR() {
    try {
        console.log("Initializing AR application with EXTREME visibility improvements...");
        init();
        return true;
    } catch (error) {
        console.error("Error initializing AR:", error);
        // Show error in console only to avoid circular dependencies
        console.error("Error initializing AR: " + error.message);
        return false;
    }
}

// Initialize the AR environment
function init() {
    console.log("Initializing AR application with EXTREME visibility improvements...");
    
    // Set up THREE.js scene
    scene = new THREE.Scene();
    
    // Add ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Much brighter light
    scene.add(ambientLight);
    
    // Add directional light for better visibility
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    
    // Set up camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Set up renderer with alpha for AR
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Set up AR button
    document.body.appendChild(ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test']
    }));
    
    // Setup controllers
    controller = renderer.xr.getController(0);
    scene.add(controller);
    
    // Initialize Raycaster for interaction with increased sensitivity
    raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.1;
    raycaster.params.Points.threshold = 0.1;
    
    // Set up touch events for XR and non-XR
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);
    
    // Add XR session start/end event listeners
    renderer.xr.addEventListener('sessionstart', onXRSessionStart);
    renderer.xr.addEventListener('sessionend', onXRSessionEnd);
    
    // Create loading video element and textures
    createVideoElement();
    
    // Set up video controls
    setupVideoControls();
    
    // Display starting status
    showStartupOverlay();
    
    // Create a start screen that will be immediately visible and VERY close
    const startScreen = createStartScreen();

    // Create THREE screens in different locations to ensure at least one is visible
    createSurroundingScreens();
    
    // Start animation loop
    renderer.setAnimationLoop(render);
    
    console.log("AR application initialized successfully");
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
export function animate() {
    renderer.setAnimationLoop(render);
    
    // Update video textures in every frame
    updateVideoTextures();
    
    // Check if in AR mode
    isARMode = renderer.xr.isPresenting;
}

// Render function
export function render() {
    // Handle screen placement or movement with controller
    if ((isPlacingScreen && newScreen) || (isMovingScreen && selectedScreen)) {
        const target = isPlacingScreen ? newScreen : selectedScreen;
        
        // Get controller position and direction
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Set position in front of controller
        const targetPosition = position.clone().addScaledVector(direction, 0.8);
        target.position.copy(targetPosition);
        
        // Make screen face the user
        target.lookAt(camera.position);
    }
    
    // Handle screen rotation with controller
    if (isRotateModeActive && selectedScreen) {
        // Get controller movement and rotation
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        // Extract controller orientation
        const controllerDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Get controller quaternion
        const controllerQuaternion = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
        
        // Get controller Euler angles
        const controllerEuler = new THREE.Euler().setFromQuaternion(controllerQuaternion);
        
        // Extract rotation values with sensitivity adjustment
        const xRotation = controllerEuler.x * 0.5; // Pitch
        const yRotation = controllerEuler.y * 0.5; // Yaw
        
        // Apply smooth rotation
        selectedScreen.rotation.x = THREE.MathUtils.lerp(
            selectedScreen.rotation.x,
            xRotation, 
            0.1
        );
        
        selectedScreen.rotation.y = THREE.MathUtils.lerp(
            selectedScreen.rotation.y,
            yRotation, 
            0.1
        );
        
        // Optional: add subtle rotation based on controller movement for fine-tuning
        selectedScreen.rotation.y += controllerDirection.x * 0.01;
        selectedScreen.rotation.x += controllerDirection.y * 0.01;
        
        // Limit rotation angles to avoid extreme angles
        selectedScreen.rotation.x = THREE.MathUtils.clamp(
            selectedScreen.rotation.x,
            -Math.PI / 2,  // Limit to 90 degrees up
            Math.PI / 2    // Limit to 90 degrees down
        );
    }
    
    // Handle screen movement if move mode is active
    if (isMoveModeActive && selectedScreen) {
        // Check if controller trigger/button is pressed
        if (controller.userData && controller.userData.isSelecting) {
            // Get controller position and direction
            const tempMatrix = new THREE.Matrix4();
            tempMatrix.identity().extractRotation(controller.matrixWorld);
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(controller.matrixWorld);
            const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
            
            // Set position with slight lag for smoother movement
            const targetPosition = position.clone().addScaledVector(direction, 0.8);
            selectedScreen.position.lerp(targetPosition, 0.5);
        }
    }
    
    // Update screen visual effects
    updateScreenEffects();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Create a welcome screen at the start
function createStartScreen() {
    // Position screen directly in front of the user at an extremely close distance
    const startScreenPosition = new THREE.Vector3(0, 0, -0.25); // VERY close to camera
    console.log("CREATING START SCREEN at position:", startScreenPosition);
    
    // Create large welcome screen with MAXIMUM visibility
    const startScreen = createNewBrowserScreen(startScreenPosition);
    
    // Scale up the start screen to make it more visible
    startScreen.scale.set(2.5, 2.5, 2.5);
    
    // Make sure the screen faces the user directly
    startScreen.lookAt(camera.position);
    
    // Create bright flashing indicators
    createVisibilityIndicators(startScreenPosition);
    
    // Provide strong haptic feedback to alert user
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]); // Very strong vibration pattern
    }
    
    // Add UI notification
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '50%';
    notification.style.left = '0';
    notification.style.width = '100%';
    notification.style.backgroundColor = 'rgba(255,0,255,0.9)';
    notification.style.color = 'white';
    notification.style.padding = '30px';
    notification.style.fontSize = '28px';
    notification.style.textAlign = 'center';
    notification.style.zIndex = '9999';
    notification.innerHTML = '<b>LOOK DIRECTLY IN FRONT OF YOU!</b><br>AR Screen Created';
    document.body.appendChild(notification);
    
    // Remove notification after 8 seconds
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 8000);
    
    // Add floating arrows pointing to the screen
    createDirectionalArrows(startScreenPosition);
    
    console.log("Start screen created and positioned at:", startScreenPosition);
    return startScreen;
}

// Create bright indicators to help find the screen
function createVisibilityIndicators(screenPosition) {
    const indicatorSize = 0.08; // Larger indicators
    const indicatorDistance = 0.3;
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    
    // Create bright spheres around the screen corners
    for (let i = 0; i < 4; i++) {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(indicatorSize),
            new THREE.MeshBasicMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 1.0
            })
        );
        
        // Position spheres around the screen
        const angle = (i * Math.PI / 2);
        sphere.position.set(
            screenPosition.x + Math.cos(angle) * indicatorDistance,
            screenPosition.y + Math.sin(angle) * indicatorDistance,
            screenPosition.z
        );
        
        scene.add(sphere);
        
        // Create pulsing animation
        animateIndicator(sphere);
    }
}

// Animate the indicator to pulse
function animateIndicator(indicator) {
    let scale = 1.0;
    let growing = true;
    
    function pulseAnimation() {
        if (growing) {
            scale += 0.05;
            if (scale >= 1.5) growing = false;
        } else {
            scale -= 0.05;
            if (scale <= 0.5) growing = true;
        }
        
        indicator.scale.set(scale, scale, scale);
        requestAnimationFrame(pulseAnimation);
    }
    
    pulseAnimation();
}

// Create a fixed add screen button in the top-right corner
function createAddScreenButton() {
    // Create a floating DOM button
    const addButton = document.createElement('button');
    addButton.style.position = 'fixed';
    addButton.style.top = '20px';
    addButton.style.right = '20px';
    addButton.style.width = '50px';
    addButton.style.height = '50px';
    addButton.style.borderRadius = '25px';
    addButton.style.background = '#4488ff';
    addButton.style.color = 'white';
    addButton.style.border = 'none';
    addButton.style.fontSize = '30px';
    addButton.style.fontWeight = 'bold';
    addButton.style.zIndex = '1000';
    addButton.style.cursor = 'pointer';
    addButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    addButton.innerHTML = '+';
    
    // Add event listener
    addButton.addEventListener('click', () => {
        // Create new screen
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(camera.quaternion);
        
        const position = new THREE.Vector3(0, 0, -1.0);
        position.applyMatrix4(matrix);
        position.add(camera.position);
        
        // Create the new screen
        const newScreen = createNewBrowserScreen(position);
        console.log("New screen created!");
        
        // Make it face the user
        newScreen.lookAt(camera.position);
        
        // Provide visual/haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
        // Show brief notification
        createNotification('New Screen Created', 'success');
    });
    
    document.body.appendChild(addButton);
}

// Initialize UI without control panel
function initUIWithoutControlPanel() {
    // Skip creating control panel, only initialize other UI elements
    createVirtualKeyboard();
}

// Create screens in all directions to ensure at least one is visible
function createSurroundingScreens() {
    // Create multiple screens around the user to ensure at least one is visible
    const distances = [-0.5, -1.0, -1.5];
    const directions = [
        new THREE.Vector3(0, 0, -1), // Front
        new THREE.Vector3(1, 0, -1).normalize(), // Front-right
        new THREE.Vector3(-1, 0, -1).normalize(), // Front-left
        new THREE.Vector3(0, 0.5, -1).normalize(), // Above-front
    ];
    
    // Create screens in different positions
    for (let dist of distances) {
        for (let dir of directions) {
            const position = new THREE.Vector3()
                .copy(camera.position)
                .add(dir.clone().multiplyScalar(Math.abs(dist)));
            
            // Only create a few screens to avoid overwhelming
            if (Math.random() < 0.3) {
                const screen = createNewBrowserScreen(position);
                screen.lookAt(camera.position);
                console.log("Created additional screen at position:", position);
            }
        }
    }
}

// Create floating arrows pointing to the screen
function createDirectionalArrows(targetPosition) {
    const arrowSize = 0.15;
    const arrowDistance = 0.5;
    const directions = [
        new THREE.Vector3(0, 1, 0), // Up
        new THREE.Vector3(0, -1, 0), // Down
        new THREE.Vector3(1, 0, 0), // Right
        new THREE.Vector3(-1, 0, 0) // Left
    ];
    
    directions.forEach(direction => {
        // Create arrow
        const arrowGeometry = new THREE.ConeGeometry(arrowSize/2, arrowSize, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1.0
        });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        
        // Position arrow pointing toward target
        const arrowPosition = new THREE.Vector3()
            .copy(targetPosition)
            .add(direction.clone().multiplyScalar(arrowDistance));
        
        arrow.position.copy(arrowPosition);
        
        // Rotate arrow to point toward target
        arrow.lookAt(targetPosition);
        
        scene.add(arrow);
        
        // Animate the arrow
        animateArrow(arrow, targetPosition);
    });
}

// Animate arrow pulsing and moving
function animateArrow(arrow, targetPosition) {
    let moveDirection = 1;
    let startPosition = arrow.position.clone();
    let moveDistance = 0;
    
    function pulseAnimation() {
        // Move arrow
        moveDistance += 0.005 * moveDirection;
        if (Math.abs(moveDistance) > 0.2) {
            moveDirection *= -1;
        }
        
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, startPosition)
            .normalize();
        
        arrow.position.copy(startPosition)
            .add(direction.multiplyScalar(moveDistance));
        
        // Rotate
        arrow.rotation.y += 0.05;
        
        requestAnimationFrame(pulseAnimation);
    }
    
    pulseAnimation();
}

// Show startup overlay with instructions
function showStartupOverlay() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9998';
    overlay.style.fontSize = '24px';
    overlay.style.textAlign = 'center';
    overlay.innerHTML = `
        <div style="font-size: 36px; color: cyan; margin-bottom: 20px;">AR MODE ACTIVATED</div>
        <div style="margin-bottom: 20px;">LOOK DIRECTLY IN FRONT OF YOU</div>
        <div>You should see bright colored screens</div>
        <div style="margin-top: 20px;">If you don't see anything, slowly turn around</div>
        <div style="font-size: 18px; margin-top: 30px;">(This message will close in 5 seconds)</div>
    `;
    document.body.appendChild(overlay);
    
    // Vibrate to alert user
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
    
    // Remove overlay after 5 seconds
    setTimeout(() => {
        document.body.removeChild(overlay);
        
        // Show a persistent floating indicator
        showFloatingIndicator();
    }, 5000);
}

// Show a floating indicator to help find screens
function showFloatingIndicator() {
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.bottom = '20px';
    indicator.style.right = '20px';
    indicator.style.backgroundColor = 'rgba(0,255,255,0.7)';
    indicator.style.color = 'white';
    indicator.style.padding = '10px 15px';
    indicator.style.borderRadius = '50%';
    indicator.style.fontSize = '24px';
    indicator.style.textAlign = 'center';
    indicator.style.zIndex = '9997';
    indicator.style.boxShadow = '0 0 15px cyan';
    indicator.style.animation = 'pulse 2s infinite';
    indicator.innerHTML = `<div style="width: 30px; height: 30px; display: flex; justify-content: center; align-items: center;">👁️</div>`;
    document.body.appendChild(indicator);
    
    // Add the pulse animation
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    // Make it tap-able to show directions again
    indicator.addEventListener('click', function() {
        // Create a directional overlay
        showDirectionalOverlay();
        
        // Vibrate for feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    });
}

// Show directional overlay when indicator is tapped
function showDirectionalOverlay() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9996';
    
    // Create a compass-like indicator
    overlay.innerHTML = `
        <div style="position: relative; width: 200px; height: 200px;">
            <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); color: cyan; font-size: 18px;">FRONT</div>
            <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); color: cyan; font-size: 18px;">BACK</div>
            <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); color: cyan; font-size: 18px;">LEFT</div>
            <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); color: cyan; font-size: 18px;">RIGHT</div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 14px; text-align: center;">
                SCREENS ARE<br>ALL AROUND YOU
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Remove when tapped
    overlay.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    // Remove after 3 seconds anyway
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }, 3000);
}