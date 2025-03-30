// Core AR functionality for initialization, scene setup, and render loop
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { createControlPanel, createVirtualKeyboard } from './ar_ui.js';
import { createNewBrowserScreen, selectScreen, screens, updateScreenEffects } from './ar_screens.js';
import { setupEventListeners, setupVideoControls } from './ar_interaction.js';
import { initUI, createNotification } from './ar_ui.js';
import { loadVideoTexture, toggleVideoPlayback, toggleVideoMute, updateVideoTextures, updateVideoProgress } from './ar_media.js';

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

    // Load font for text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
        // Create UI controls once font is loaded
        createControlPanel();
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

    // Initialize UI elements
    initUI();
    
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

// Main update loop
export function animate() {
    requestAnimationFrame(animate);
    
    // Update controller
    controller.update();
    
    // Update screens if needed
    if (selectedScreen && typeof updateKeyboardPosition === 'function') {
        updateKeyboardPosition(selectedScreen);
    }
    
    // Update video progress if available
    if (typeof videoElement !== 'undefined' && videoElement && typeof updateVideoProgress === 'function') {
        // Find screens with video controls
        screens.forEach(screen => {
            if (screen.userData.controls && screen.userData.controls.progressBar) {
                // Calculate progress (0-1)
                const duration = videoElement.duration;
                const currentTime = videoElement.currentTime;
                
                if (isFinite(duration) && duration > 0) {
                    const progress = currentTime / duration;
                    screen.userData.controls.progress = progress;
                    
                    // Update progress bar
                    updateVideoProgress(
                        screen.userData.controls.progressBar,
                        progress,
                        screen
                    );
                }
            }
        });
    }
    
    // Render the scene
    render();
}

// Render function to be exported
export function render() {
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Initialize the AR experience
export async function init() {
    // ... existing code ...
    
    // Create a welcome screen at startup with slight delay to ensure all systems are loaded
    setTimeout(() => {
        // Create a screen positioned in front of the camera
        createNewBrowserScreen(new THREE.Vector3(0, 0, -1.5));
        console.log("Welcome screen created");
    }, 500);
    
    // Add event listeners for interaction
    setupEventListeners();
    
    // Load video texture if media module is available
    if (typeof loadVideoTexture === 'function') {
        await loadVideoTexture('./examples/textures/sample_video.mp4');
        
        // Connect video controls to interaction module if setupVideoControls is available
        if (typeof setupVideoControls === 'function') {
            setupVideoControls({
                toggleVideoPlayback,
                toggleVideoMute
            });
        }
    }
    
    // Start animation loop
    animate();
    
    // Show a welcome notification
    if (typeof showNotification === 'function') {
        showNotification('AR Experience Started', 'Touch the top of screen to move it');
    }
}

// Create a welcome screen at the start
function createStartScreen() {
    const startScreen = createNewBrowserScreen(new THREE.Vector3(0, 0, -1.5));
}