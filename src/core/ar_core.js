// Core AR functionality for initialization, scene setup, and render loop
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { createControlPanel } from './ar_ui.js';
import { showNotification } from './ar_utils.js';
import { updateVideoTextures } from './ar_media.js';
import { createNewBrowserScreen, updateScreenEffects } from './ar_screens.js';

// Global variables for use in other modules
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
export let isARMode = false;
export let lastCameraPosition = new THREE.Vector3();
export let lastCameraRotation = new THREE.Euler();

// Track initialization state
let isARInitialized = false;

// Frame counter for optimizing updates
let frameCount = 0;

// Function to safely update the selected screen reference globally
export function setSelectedScreen(screen) {
    console.log("Setting global selectedScreen to:", screen ? (screen.userData && screen.userData.id ? screen.userData.id : "unknown") : "null");
    selectedScreen = screen;
}

// Main initialization function
export function initAR(container, camera) {
    // Prevent multiple initializations
    if (isARInitialized) {
        console.log("AR application already initialized, skipping.");
        return true;
    }
    
    try {
        console.log("Initializing AR application...");
        if (container && camera) {
            scene = window.scene || new THREE.Scene();
            initAREnvironment();
        } else {
            initAREnvironment();
        }
        return true;
    } catch (error) {
        console.error("Error initializing AR:", error);
        showNotification("Error initializing AR: " + error.message, "error");
        return false;
    }
}

// Export alias for initAR to maintain compatibility with app.js
export const initARCore = initAR;

// Update AR core components
export function updateARCore() {
    // Update frame counter
    frameCount++;
    
    // Update controller state if in XR mode
    if (renderer && renderer.xr.isPresenting) {
        // Update raycaster from controller if available
        if (controller) {
            updateControllerRaycaster();
        }
        
        // Check for hit test results if enabled
        if (renderer.xr.isPresenting && renderer.xr.getSession()) {
            const session = renderer.xr.getSession();
            if (session.requestHitTestSource) {
                updateHitTest(session);
            }
        }
    }
}

// Update raycaster from controller
function updateControllerRaycaster() {
    if (!controller || !raycaster) return;
    
    // Set raycaster from controller direction
    workingMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);
}

// Update hit test results
function updateHitTest(session) {
    if (!session.hitTestSourceRequested && !session.hitTestSource) {
        session.hitTestSourceRequested = true;
        
        // Request hit test source
        session.requestReferenceSpace('viewer').then((referenceSpace) => {
            session.requestHitTestSource({ space: referenceSpace })
                .then((source) => {
                    session.hitTestSource = source;
                })
                .catch((error) => {
                    console.error("Error requesting hit test source:", error);
                    session.hitTestSourceRequested = false;
                });
        });
    } else if (session.hitTestSource) {
        // Get hit test results
        const hitTestResults = frame.getHitTestResults(session.hitTestSource);
        
        if (hitTestResults.length) {
            const hit = hitTestResults[0];
            // Process hit test result if needed
            // This can be used for placing objects on real-world surfaces
        }
    }
}

// Initialize the AR environment
function initAREnvironment() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Create scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Make global references to scene and camera for other modules
    window.scene = scene;
    window.camera = camera;

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
    
    // Make renderer available globally for other modules
    window.renderer = renderer;

    // AR Button with session end event handling - follow the cones example pattern
    const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ui-container') || document.body }
    });
    
    document.body.appendChild(arButton);
    
    // Add event listener for session start
    renderer.xr.addEventListener('sessionstart', function() {
        console.log("AR session started");
        showNotification("AR session started - Looking for surfaces");
        
        // Create control panel immediately on session start
        if (createControlPanel) {
            const panel = createControlPanel();
            console.log("Control panel created in session start:", panel);
        }
        
        // Show instructions after a short delay
        setTimeout(() => {
            showNotification("Tap and drag control panel to position it");
            
            // Create an initial screen for testing
            createStartScreen();
        }, 1000);
    });
    
    // Add event listener for session end
    renderer.xr.addEventListener('sessionend', function() {
        console.log("AR session ended");
        // Clean reload to reset state
        window.location.reload();
    });

    // Load font for text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
    });

    // Controller setup - follow the cones example pattern
    controller = renderer.xr.getController(0);
    controller.addEventListener('connected', function(event) {
        console.log("XR Controller connected:", event.data.gamepad);
        this.add(buildController(event.data));
    });
    controller.addEventListener('disconnected', function() {
        console.log("XR Controller disconnected");
        this.remove(this.children[0]);
    });
    
    controller.addEventListener('selectstart', function() {
        console.log("Controller select start");
        controller.userData.isSelecting = true;
    });
    
    controller.addEventListener('selectend', function() {
        console.log("Controller select end");
        controller.userData.isSelecting = false;
    });
    
    scene.add(controller);

    // Controller model
    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip = renderer.xr.getControllerGrip(0);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    scene.add(controllerGrip);

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    renderer.setAnimationLoop(render);

    // Set initialization flag
    isARInitialized = true;
    
    console.log("AR experience initialized successfully");
}

// Build a visual controller based on XRInputSource data
function buildController(data) {
    let geometry, material;
    
    switch (data.targetRayMode) {
        case 'tracked-pointer':
            // Tracked pointer - cylinder with small sphere at end
            geometry = new THREE.CylinderGeometry(0.01, 0.02, 0.08, 12);
            material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            // Rotate so the narrow end points outward
            geometry.rotateX(-Math.PI / 2); 
            break;
            
        case 'gaze':
            // Gaze mode - small reticle
            geometry = new THREE.RingGeometry(0.02, 0.03, 32).translate(0, 0, -1);
            material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            break;
    }
    
    const controller = new THREE.Mesh(geometry, material);
    
    // Add pointer tip for precise interactions
    const pointerGeometry = new THREE.SphereGeometry(0.01, 16, 16);
    const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
    pointer.position.z = -0.05; // Position at the end of the controller
    controller.add(pointer);
    
    return controller;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Setup and position the control panel
function setupControlPanel() {
    // If control panel exists (as a global variable), update its position
    if (window.controlPanel) {
        // Position control panel in front of camera
        const controlPanel = window.controlPanel;
        
        // Create position in front of and slightly below camera
        const position = new THREE.Vector3(0, -0.2, -0.8);
        position.applyQuaternion(camera.quaternion);
        position.add(camera.position);
        
        // Update position with smoothing
        controlPanel.position.lerp(position, 0.3);
        
        // Make panel face the camera
        controlPanel.lookAt(camera.position);
    } else if (createControlPanel) {
        // If panel doesn't exist yet, create it
        window.controlPanel = createControlPanel();
    }
}

// Animate floating motion for UI elements
function floatAnimation() {
    // Add subtle floating animation to control panel if it exists
    if (window.controlPanel) {
        // Gentle floating movement
        window.controlPanel.position.y += Math.sin(Date.now() * 0.002) * 0.0005;
    }
}

// Render function
function render() {
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
        
        // Add subtle rotation based on controller movement for fine-tuning
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
    
    // REMOVE auto-updating control panel position based on camera movement
    // Just update AR mode state
    if (renderer.xr.isPresenting) {
        frameCount++;
        isARMode = true;
    } else {
        isARMode = false;
    }
    
    // Add subtle floating animation to control panel
    floatAnimation();
    
    // Update screen visual effects
    updateScreenEffects();
    
    // Update video textures
    updateVideoTextures();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Create a welcome screen at the start
function createStartScreen() {
    console.log("Creating start screen...");
    
    // Create a screen at a fixed world position rather than relative to camera
    // This will prevent it from being "stuck" to the camera
    
    // Define fixed positions for screens in world space (not relative to camera)
    const browserScreenPosition = new THREE.Vector3(0, 0, -3);
    const youtubeScreenPosition = new THREE.Vector3(0, -0.7, -3);
    
    console.log("Creating browser screen at fixed position:", browserScreenPosition);
    
    let startScreen;
    
    // Try to create a browser screen first
    try {
        startScreen = createNewBrowserScreen(browserScreenPosition);
        console.log("Created browser screen:", startScreen);
        
        // Make sure the screen userData has the correct fixed position
        if (startScreen.userData) {
            startScreen.userData.fixedPosition = true;
        }
    } catch (error) {
        console.error("Failed to create browser screen:", error);
        
        // Fallback to simpler geometry if screen creation fails
        const geometry = new THREE.PlaneGeometry(1, 0.6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x3399ff,
            side: THREE.DoubleSide 
        });
        startScreen = new THREE.Mesh(geometry, material);
        startScreen.position.copy(browserScreenPosition);
        
        // Add to scene
        if (window.scene) {
            window.scene.add(startScreen);
            console.log("Added fallback screen to scene");
        }
    }
    
    // Create a YouTube screen as well
    try {
        const youtubeScreen = createYouTubeScreen('dQw4w9WgXcQ', youtubeScreenPosition);
        console.log("Created YouTube screen at fixed position:", youtubeScreenPosition);
        
        // Make sure the screen userData has the correct fixed position
        if (youtubeScreen.userData) {
            youtubeScreen.userData.fixedPosition = true;
        }
    } catch (error) {
        console.error("Failed to create YouTube screen:", error);
    }
    
    // Create visible debug markers to help with orientation
    createWorldAxisHelper();
    
    return startScreen;
}

// Create a simple axis helper to visualize world space
function createWorldAxisHelper() {
    const axisHelper = new THREE.AxesHelper(1);
    axisHelper.position.set(0, -1, -3);
    scene.add(axisHelper);
    
    // Create a red sphere to mark origin
    const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, -1, -3);
    scene.add(sphere);
    
    console.log("Added world axis helper at:", sphere.position);
}

// Create a floor grid for spatial reference
export function createFloorGrid() {
    // Check if scene exists
    if (!scene) {
        console.error("Cannot create floor grid - scene not initialized");
        return null;
    }
    
    // Create grid helper
    const size = 10;
    const divisions = 20;
    const gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x888888);
    
    // Position at floor level
    gridHelper.position.y = -1.5;
    
    // Add to scene
    scene.add(gridHelper);
    
    // Create floor plane for hit detection
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshBasicMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    floor.position.y = -1.5;
    floor.userData.type = 'floor';
    
    // Add to scene
    scene.add(floor);
    
    console.log("Floor grid created");
    return { grid: gridHelper, floor: floor };
}

// Export function to manually update/re-render
export function animate() {
    renderer.setAnimationLoop(render);
} 