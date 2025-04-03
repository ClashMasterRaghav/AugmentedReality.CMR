// Core AR functionality for initialization, scene setup, and render loop
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { createControlPanel, setupControlPanel } from './ar_ui.js';
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
export function initAR() {
    // Prevent multiple initializations
    if (isARInitialized) {
        console.log("AR application already initialized, skipping.");
        return true;
    }
    
    try {
        console.log("Initializing AR application...");
        initAREnvironment();
        return true;
    } catch (error) {
        console.error("Error initializing AR:", error);
        showNotification("Error initializing AR: " + error.message, "error");
        return false;
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

    // AR Button with session end event handling
    const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body },
        optionalFeatures: ['dom-overlay', 'light-estimation']
    });
    
    // Add class for styling
    arButton.classList.add('ar-button');
    document.body.appendChild(arButton);
    
    // Add event listener for session start
    renderer.xr.addEventListener('sessionstart', function() {
        console.log("AR session started");
        showNotification("AR session started - Looking for surfaces");
        
        // Show instructions after a short delay
        setTimeout(() => {
            showNotification("Tap and drag control panel to position it");
        }, 2000);
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
        // Set up control panel once font is loaded
        setupControlPanel();
    });

    // Controller setup
    controller = renderer.xr.getController(0);
    
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

    // Pointer for interaction - smaller size for precision
    const geometry = new THREE.SphereGeometry(0.005, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const pointer = new THREE.Mesh(geometry, material);
    pointer.position.z = -0.1;
    controller.add(pointer);

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    renderer.setAnimationLoop(render);
    
    // Create initial screen
    createStartScreen();

    // Set initialization flag
    isARInitialized = true;
    
    console.log("AR experience initialized successfully");
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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
    
    // Check if camera has moved significantly and update control panel
    const currentCameraPosition = camera.position.clone();
    const currentCameraRotation = new THREE.Euler().setFromQuaternion(camera.quaternion);
    
    // Calculate movement thresholds
    const positionThreshold = 0.2;
    const rotationThreshold = 0.15;
    
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
    
    // Update control panel position periodically in AR mode
    if (renderer.xr.isPresenting) {
        // Update less frequently to avoid performance issues (every 30 frames)
        if (frameCount % 30 === 0) {
            setupControlPanel();
        }
        frameCount++;
        
        // Update AR mode state
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
    const startScreen = createNewBrowserScreen(new THREE.Vector3(0, 0, -1.5));
}

// Export function to manually update/re-render
export function animate() {
    renderer.setAnimationLoop(render);
} 