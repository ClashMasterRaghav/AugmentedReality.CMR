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
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
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
    
    // Add event listener for session end
    renderer.xr.addEventListener('sessionend', function() {
        console.log("AR session ended");
        // Reload the page to return to initial state
        window.location.reload();
    });

    // Add persistent "+" button for adding new screens
    createAddScreenButton();

    // Load font for text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
        // Create virtual keyboard only (no control panel)
        createVirtualKeyboard();
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

    // Pointer for interaction - SMALLER SIZE
    const geometry = new THREE.SphereGeometry(0.005, 16, 16); // Reduced size
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan for better visibility
    const pointer = new THREE.Mesh(geometry, material);
    pointer.position.z = -0.1;
    controller.add(pointer);

    // Window resize handler
    window.addEventListener('resize', onWindowResize);

    // Initialize UI elements (minus control panel)
    initUIWithoutControlPanel();
    
    // Preload video texture right after scene setup
    console.log("Initializing video functionality");
    const videoTexture = loadVideoTexture();
    
    // Connect video controls to the interaction module
    setupVideoControls({
        toggleVideoPlayback,
        toggleVideoMute
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Start animation loop
    renderer.setAnimationLoop(animate);
    
    // Add a notification to let the user know the app is ready
    createNotification('AR Experience Ready', 'success');
    
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
    // Position the screen directly in front of the camera at a good viewing distance
    const startPosition = new THREE.Vector3(0, 0, -1.0);
    
    // Create the screen with a more visible size
    const startScreen = createNewBrowserScreen(startPosition);
    
    // Ensure the screen is facing the user
    startScreen.lookAt(camera.position);
    
    // Provide visual/haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
    
    console.log("Start screen created at position:", startPosition);
    
    // Show notification to help user locate the screen
    createNotification('Find the screen in front of you', 'info');
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