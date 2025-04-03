// Main AR application entry point
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { initARCore, updateARCore, createFloorGrid } from './core/ar_core.js';
import { initCSS3DRenderer, updateCSS3DRenderer, createNewBrowserScreen, createYouTubeScreen, animateScreenEntrance, updateScreenEffects } from './core/ar_screens.js';
import { initInteraction, setupEventListeners } from './core/ar_interaction.js';
import { initUI, updateUI, createControlPanel } from './core/ar_ui.js';
import { initAudio, updateAudio } from './core/ar_audio.js';
import { initMedia, updateMedia } from './core/ar_media.js';
import { loadEnvironmentAssets } from './core/ar_environment.js';
import { showNotification } from './core/ar_utils.js';

// Global frame counter for optimizing updates
let frameCount = 0;

// Global state tracking
let isARSupported = false;
let isARSessionStarted = false;
let isInitialized = false;

// Global variables for scene elements
window.camera = null;
window.scene = null; 
window.renderer = null;
window.controller = null;
window.selectedScreen = null;

// Initialize application on page load
window.addEventListener('DOMContentLoaded', init);

// Main initialization function
async function init() {
    try {
        console.log('Initializing AR application...');
        
        // Check device capabilities and AR support
        checkDeviceCapabilities();
        
        // Set up the UI overlay
        await initUIElements();
        
        // Initialize the rendering system
        initRendering();
        
        // Set up the WebXR AR session
        setupARSession();
        
        // Set up event handlers
        setupEventListeners();
        
        // Load environment assets
        await loadEnvironmentAssets();
        
        // Initialize audio system
        await initAudio();
        
        // Initialize media sources
        await initMedia();
        
        // Mark initialization as complete
        isInitialized = true;
        
        // Start animation loop
        animate();
        
        // Show welcome notification
        showNotification('AR Environment Ready', 'success');
        
        // Dispatch initialization complete event
        document.dispatchEvent(new Event('ar-initialized'));
        
        console.log('AR application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize AR application:', error);
        showNotification('Failed to initialize. Error: ' + error.message, 'error');
    }
}

// Check device capabilities and AR support
function checkDeviceCapabilities() {
    // Check if WebXR is supported
    if ('xr' in navigator) {
        // Check if AR is supported
        navigator.xr.isSessionSupported('immersive-ar')
            .then((supported) => {
                isARSupported = supported;
                updateARSupportStatus(supported);
            })
            .catch((error) => {
                console.error('Error checking AR support:', error);
                isARSupported = false;
                updateARSupportStatus(false);
            });
    } else {
        console.warn('WebXR not supported by this browser');
        isARSupported = false;
        updateARSupportStatus(false);
    }
    
    // Check if touch is supported
    const isTouchSupported = ('ontouchstart' in window) || 
                            (navigator.maxTouchPoints > 0) || 
                            (navigator.msMaxTouchPoints > 0);
    
    // Check if device motion is supported
    const isDeviceMotionSupported = 'DeviceMotionEvent' in window;
    
    console.log('Device capabilities:', {
        ar: isARSupported,
        touch: isTouchSupported,
        deviceMotion: isDeviceMotionSupported
    });
}

// Update UI based on AR support status
function updateARSupportStatus(supported) {
    const statusElement = document.getElementById('ar-status');
    if (statusElement) {
        if (supported) {
            statusElement.textContent = 'AR Ready';
            statusElement.className = 'status-ready';
        } else {
            statusElement.textContent = 'AR Not Supported';
            statusElement.className = 'status-error';
            
            // Show fallback experience message
            showNotification(
                'AR not supported on this device. Falling back to standard 3D mode.',
                'warning'
            );
        }
    }
}

// Initialize UI elements
async function initUIElements() {
    // Create base UI container if not exists
    let uiContainer = document.getElementById('ui-container');
    if (!uiContainer) {
        uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        document.body.appendChild(uiContainer);
    }
    
    // Create status indicator
    const statusElement = document.createElement('div');
    statusElement.id = 'ar-status';
    statusElement.textContent = 'Checking AR Support...';
    statusElement.className = 'status-checking';
    uiContainer.appendChild(statusElement);
    
    // Create notification container
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    uiContainer.appendChild(notificationContainer);
    
    // Initialize UI module
    await initUI();
    
    return uiContainer;
}

// Initialize rendering system
function initRendering() {
    // Create scene
    window.scene = new THREE.Scene();
    
    // Create camera
    window.camera = new THREE.PerspectiveCamera(
        70, 
        window.innerWidth / window.innerHeight, 
        0.01, 
        20
    );
    
    // Initialize main WebGL renderer
    window.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    window.renderer.setPixelRatio(window.devicePixelRatio);
    window.renderer.setSize(window.innerWidth, window.innerHeight);
    window.renderer.xr.enabled = true;
    document.body.appendChild(window.renderer.domElement);
    
    // Initialize AR scene with lighting and environment
    initARCore(window.scene, window.camera);
    
    // Initialize CSS3D renderer for web content
    initCSS3DRenderer();
    
    // Add window resize handler
    window.addEventListener('resize', onWindowResize, false);
}

// Set up AR session and button
function setupARSession() {
    // Create AR button
    const arButton = ARButton.createButton(window.renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ui-container') }
    });
    document.body.appendChild(arButton);
    
    // Set up session start event
    window.renderer.xr.addEventListener('sessionstart', () => {
        console.log('AR session started');
        isARSessionStarted = true;
        
        // Create XR controller for interaction
        window.controller = window.renderer.xr.getController(0);
        window.scene.add(window.controller);
        
        // Add controller to event listeners
        setupEventListeners();
        
        // Show notification
        showNotification('AR session started. Tap anywhere to place screens.', 'success');
        
        // Create control panel immediately
        createControlPanel();
        
        // Place initial screen when session starts
        setTimeout(() => {
            createInitialScreen();
        }, 2000);
    });
    
    // Set up session end event
    window.renderer.xr.addEventListener('sessionend', () => {
        console.log('AR session ended');
        isARSessionStarted = false;
    });
}

// Handle window resize
function onWindowResize() {
    if (window.camera) {
        window.camera.aspect = window.innerWidth / window.innerHeight;
        window.camera.updateProjectionMatrix();
    }
    
    if (window.renderer) {
        window.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Create initial screen when AR session starts
function createInitialScreen() {
    // Create a welcome screen
    if (!isARSessionStarted) return;
    
    // Create welcome screen with video
    const welcomeScreen = createYouTubeScreen('dQw4w9WgXcQ');
    if (welcomeScreen) {
        // Place in front of user
        const distance = 1;
        
        // Get camera direction
        const cameraPosition = new THREE.Vector3();
        window.camera.getWorldPosition(cameraPosition);
        
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(window.camera.quaternion);
        
        // Position in front of camera
        const screenPosition = cameraPosition.clone().add(
            cameraDirection.multiplyScalar(distance)
        );
        
        // Update screen position
        welcomeScreen.position.copy(screenPosition);
        
        // Look at camera
        welcomeScreen.lookAt(cameraPosition);
        
        // Offset slightly down for better viewing
        welcomeScreen.position.y -= 0.1;
        
        // Add some random rotation on y-axis
        welcomeScreen.rotateY(Math.random() * 0.2 - 0.1);
        
        // Animate entrance
        animateScreenEntrance(welcomeScreen);
    }
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update frame counter
    frameCount++;
    
    // Update AR core functionality
    updateARCore();
    
    // Update media (videos, textures)
    if (frameCount % 2 === 0) {
        updateMedia();
    }
    
    // Update audio processing
    if (frameCount % 3 === 0) {
        updateAudio();
    }
    
    // Update UI elements and controls
    updateUI();
    
    // Update screen effects and animations
    updateScreenEffects();
    
    // Update CSS3D renderer (for web content)
    updateCSS3DRenderer();
    
    // Render the scene
    if (window.renderer && window.scene && window.camera) {
        window.renderer.render(window.scene, window.camera);
    }
}

// Initialize AR functionality - this is the main entry point
export function initApplication() {
    console.log("Initializing AR...");
    
    // Initialize core AR components
    initARCore(document.getElementById('ar-container'));
    
    // Initialize required systems in the correct order
    initCSS3DRenderer();
    initInteraction();
    initMedia();
    initUI();
    initAudio();
    
    // Create the floor grid for spatial reference
    createFloorGrid();
    
    // Create control panel when AR starts
    const startARButton = document.getElementById('start-ar-button');
    if (startARButton) {
        startARButton.addEventListener('click', () => {
            console.log("AR started by user");
            
            // Create control panel after slight delay to ensure everything is ready
            setTimeout(() => {
                const controlPanel = createControlPanel();
                if (controlPanel) {
                    console.log("Control panel created successfully");
                } else {
                    console.error("Failed to create control panel");
                }
                
                // Create an initial browser screen at a comfortable distance
                const screenPosition = new THREE.Vector3(0, 0, -1.5);
                const newScreen = createNewBrowserScreen(screenPosition);
                if (newScreen) {
                    console.log("Initial screen created:", newScreen.userData.id);
                    showNotification("Created initial browser screen");
                }
            }, 500);
        });
    }
    
    // Start animation loop
    animate();
    
    console.log("AR initialized successfully");
} 