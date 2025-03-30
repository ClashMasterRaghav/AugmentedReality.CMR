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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XREstimatedLight } from 'three/addons/webxr/XREstimatedLight.js';

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

// Additional globals
const clock = new THREE.Clock();
let controls;
let light;
let hasInitialized = false;
let welcomeScreen;

// Main initialization function called from ar_main.js
export function initAR(containerElement, existingScene) {
    console.log("Initializing AR core");
    
    if (hasInitialized) {
        console.warn("AR has already been initialized");
        return;
    }
    
    hasInitialized = true;
    container = containerElement;
    
    // Create or use existing scene
    scene = existingScene || new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Raycaster for interactions
    raycaster = new THREE.Raycaster();
    tempMatrix = new THREE.Matrix4();
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // AR Button with enhanced session options for better compatibility
    const arButton = ARButton.createButton(renderer, {
        optionalFeatures: [
            'dom-overlay', 
            'hit-test', 
            'anchors',
            'light-estimation'
        ],
        domOverlay: { root: document.body },
        requiredFeatures: [], // Don't require any specific features to increase compatibility
        sessionInit: {
            requiredFeatures: [], // Don't make anything required to improve device compatibility
            optionalFeatures: [
                'dom-overlay',
                'light-estimation',
                'hit-test',
                'anchors'
            ]
        },
        onSessionStarted: (session) => {
            console.log("AR session started successfully");
            isARMode = true;
            createNotification('AR session started. Look around to place screens.', 'success');
        },
        onSessionEnded: () => {
            console.log("AR session ended");
            isARMode = false;
        }
    });
    
    document.body.appendChild(arButton);
    
    // Add error handling for AR session
    try {
        // Add event listener for session start (useful for debugging)
        renderer.xr.addEventListener('sessionstart', function() {
            console.log("AR session started successfully");
            console.log("XR session:", renderer.xr.getSession());
            
            // Set flag for AR mode
            isARMode = true;
            
            // Create notification for user
            createNotification('AR session started. Look around to place screens.', 'success');
        });
        
        // Add event listener for session end
        renderer.xr.addEventListener('sessionend', function() {
            console.log("AR session ended");
            // Reset AR mode flag
            isARMode = false;
            
            // Reset any AR-specific states
            
            // Reload the page to return to initial state
            // window.location.reload(); // Comment this out for better debugging
        });
    } catch (error) {
        console.error("Error setting up XR session event listeners:", error);
    }
    
    // Add basic lighting
    light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);
    
    // Add XR estimated light
    try {
        const xrLight = new XREstimatedLight(renderer);
        xrLight.addEventListener('estimationstart', () => {
            console.log('Light estimation started');
            scene.add(xrLight);
            scene.remove(light); // Remove basic light when estimation starts
        });
    } catch (error) {
        console.warn('XREstimatedLight not supported, using fallback lighting', error);
    }
    
    // Create a welcome screen on startup
    welcomeScreen = createNewBrowserScreen();
    welcomeScreen.position.set(0, 0, -1);
    scene.add(welcomeScreen);
    
    // Setup interaction handlers
    setupInteractions(renderer, camera, scene);
    
    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    console.log("AR core initialized successfully");
    return true;
}

// Function to handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Render function - called each frame
export function render() {
    if (renderer && scene && camera) {
        // Update video textures every frame
        if (typeof updateVideoTextures === 'function') {
            updateVideoTextures();
        }
        
        // Update progress bar for video if needed
        if (typeof updateVideoProgress === 'function') {
            updateVideoProgress();
        }
        
        // Render the scene
        renderer.render(scene, camera);
    }
}

// Animation loop - called by the renderer
export function animate() {
    // Set up animation loop for WebXR
    renderer.setAnimationLoop(render);
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

// Create a start screen as the first content
function createStartScreen() {
    const startScreen = createNewBrowserScreen();
    startScreen.position.set(0, 0, -1); // Position in front of user
    scene.add(startScreen);
    
    createNotification('Screen created! Look around and tap to place more screens.', 'success');
}