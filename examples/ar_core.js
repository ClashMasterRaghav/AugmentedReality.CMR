// Core AR functionality for initialization, scene setup, and render loop
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { createControlPanel, createVirtualKeyboard, setupControlPanel } from './ar_ui.js';
import { createNewBrowserScreen, selectScreen, screens, updateScreenEffects } from './ar_screens.js';
import { setupEventListeners, setupVideoControls, showControlPanelInstructions } from './ar_interaction.js';
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
export let lastCameraPosition = new THREE.Vector3();
export let lastCameraRotation = new THREE.Euler();

// Function to safely update the selected screen reference globally
export function setSelectedScreen(screen) {
    console.log("Setting global selectedScreen to:", screen ? (screen.userData && screen.userData.id ? screen.userData.id : "unknown") : "null");
    selectedScreen = screen;
}

// Main initialization function called from ar_main.js
export function initAR() {
    try {
        console.log("Initializing AR application...");
        initAREnvironment();
        return true;
    } catch (error) {
        console.error("Error initializing AR:", error);
        // Show error in console only to avoid circular dependencies
        console.error("Error initializing AR: " + error.message);
        return false;
    }
}

// Initialize the AR environment
function initAREnvironment() {
    // Initialize scene FIRST to ensure it exists for all other functions
    scene = new THREE.Scene();
    
    // Make scene globally accessible as a fallback
    window.arScene = scene;
    
    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // AR Button with session end event handling
    const arButton = ARButton.createButton(renderer, {
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    });
    
    document.body.appendChild(arButton);
    
    // Add event listener for session start
    renderer.xr.addEventListener('sessionstart', function() {
        console.log("AR session started - showing panel instructions");
        // Show instructions for draggable panel after a short delay
        showControlPanelInstructions();
    });
    
    // Add event listener for session end
    renderer.xr.addEventListener('sessionend', function() {
        console.log("AR session ended");
        // Reload the page to return to initial state
        window.location.reload();
    });

    // Load font for text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
        // Create UI controls once font is loaded
        if (scene) {
            createControlPanel(scene);
            createVirtualKeyboard();
        } else {
            console.error("Cannot create UI elements - scene is undefined");
        }
    });

    // Controller setup
    if (!renderer || !renderer.xr) {
        console.error("Cannot create controller: renderer or renderer.xr is undefined");
        return false;
    }
    
    try {
        // Try to get the controller but check if it exists
        controller = renderer.xr.getController(0);
        
        if (!controller) {
            console.error("Failed to get XR controller");
            return false;
        }
        
        // Add controller event listeners
        controller.addEventListener('selectstart', function() {
            controller.userData.isSelecting = true;
        });
        
        controller.addEventListener('selectend', function() {
            controller.userData.isSelecting = false;
        });
        
        scene.add(controller);

        // Controller model
        const controllerModelFactory = new XRControllerModelFactory();
        controllerGrip = renderer.xr.getControllerGrip(0);
        controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
        scene.add(controllerGrip);

        // Pointer for interaction - SMALLER SIZE
        const geometry = new THREE.SphereGeometry(0.005, 16, 16); // Reduced size
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan for better visibility
        const pointer = new THREE.Mesh(geometry, material);
        pointer.position.z = -0.1;
        controller.add(pointer);
    } catch (error) {
        console.error("Error setting up controller:", error);
        return false;
    }

    // Window resize handler
    window.addEventListener('resize', onWindowResize);

    // Initialize UI elements - make sure scene exists first
    if (scene) {
        initUI(scene);
    } else {
        console.error("Cannot initialize UI - scene is undefined");
    }
    
    // Preload video texture right after scene setup
    console.log("Initializing video functionality");
    const videoTexture = loadVideoTexture();
    
    // Connect video controls to the interaction module
    setupVideoControls({
        toggleVideoPlayback,
        toggleVideoMute
    });
    
    // Setup event listeners only if controller is initialized
    if (controller) {
        setupEventListeners();
    } else {
        console.error("Cannot setup event listeners - controller is undefined");
    }
    
    // Start animation loop
    renderer.setAnimationLoop(animate);
    
    // Create initial screen
    createStartScreen();
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
            selectedScreen.position.lerp(targetPosition, 0.85);
        }
    }
    
    // Check if camera has moved significantly and update control panel
    const currentCameraPosition = camera.position.clone();
    const currentCameraRotation = new THREE.Euler().setFromQuaternion(camera.quaternion);
    
    // Calculate movement thresholds
    const positionThreshold = 0.7; // Increased from 0.5 for less frequent updates
    const rotationThreshold = 0.4; // Increased from 0.3 for less frequent updates
    
    // Check for significant camera movement
    const hasMoved = currentCameraPosition.distanceTo(lastCameraPosition) > positionThreshold;
    const hasRotated = 
        Math.abs(currentCameraRotation.x - lastCameraRotation.x) > rotationThreshold ||
        Math.abs(currentCameraRotation.y - lastCameraRotation.y) > rotationThreshold;
    
    // If camera has moved significantly, update the control panel position
    if (hasMoved || hasRotated) {
        setupControlPanel();
        
        // Update last known position and rotation
        lastCameraPosition.copy(currentCameraPosition);
        lastCameraRotation.copy(currentCameraRotation);
    }
    
    // Update screen visual effects
    updateScreenEffects();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Create a welcome screen at the start
function createStartScreen() {
    const startScreen = createNewBrowserScreen(new THREE.Vector3(0, 0, -1.5));
    
    // Set up control panel initial position
    setTimeout(setupControlPanel, 500);
}

// Create a modern, styled keyboard background
export function createKeyboardBackground(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Draw a rounded rectangle for the keyboard background
    const cornerRadius = width * 0.05;
    ctx.fillStyle = 'rgba(40, 44, 52, 0.85)'; // Dark, semi-transparent background
    
    // Create rounded rectangle
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(width - cornerRadius, 0);
    ctx.quadraticCurveTo(width, 0, width, cornerRadius);
    ctx.lineTo(width, height - cornerRadius);
    ctx.quadraticCurveTo(width, height, width - cornerRadius, height);
    ctx.lineTo(cornerRadius, height);
    ctx.quadraticCurveTo(0, height, 0, height - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.fill();
    
    // Add subtle gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add a border
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.6)';
    ctx.lineWidth = width * 0.005;
    ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create a modern, styled key texture
export function createKeyTexture(text, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Calculate rounded corners based on width
    const cornerRadius = width * 0.15;
    
    // Create key background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(65, 70, 80, 0.9)');
    gradient.addColorStop(1, 'rgba(45, 50, 60, 0.9)');
    
    // Draw rounded rectangle for key
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(width - cornerRadius, 0);
    ctx.quadraticCurveTo(width, 0, width, cornerRadius);
    ctx.lineTo(width, height - cornerRadius);
    ctx.quadraticCurveTo(width, height, width - cornerRadius, height);
    ctx.lineTo(cornerRadius, height);
    ctx.quadraticCurveTo(0, height, 0, height - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    
    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add subtle inner shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = width * 0.03;
    ctx.shadowOffsetX = width * 0.01;
    ctx.shadowOffsetY = height * 0.01;
    
    // Add key border
    ctx.strokeStyle = 'rgba(80, 90, 100, 0.8)';
    ctx.lineWidth = width * 0.01;
    ctx.stroke();
    
    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Add text
    const fontSize = Math.min(width, height) * 0.4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create an output display for the keyboard
export function createOutputDisplay(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = 'rgba(20, 20, 25, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Add a subtle border
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.5)';
    ctx.lineWidth = width * 0.005;
    ctx.strokeRect(0, 0, width, height);
    
    // Add placeholder text
    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.font = `${height * 0.5}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('', width * 0.05, height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}