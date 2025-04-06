// Main entry point for Vision Pro AR application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { createScreens } from './components/screens.js';
import { createUI } from './components/ui.js';
import { setupInteractions } from './components/interaction.js';
import { appleVisionProHandTracking } from './components/visionProHandlers.js';

// Global variables
let camera, scene, renderer;
let controller, controllerGrip;
let isARSessionActive = false;
let userInteracted = false;
let videoTexture;

// Initialize the application when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up interaction handler for mobile devices
    const interactionHelper = document.getElementById('interactionHelper');
    
    // Show interaction helper on mobile
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        if (interactionHelper) {
            interactionHelper.style.display = 'block';
            interactionHelper.addEventListener('click', handleUserInteraction);
            document.body.addEventListener('click', handleUserInteraction);
        }
    } else {
        // On desktop, initialize immediately
        setTimeout(handleUserInteraction, 1000);
    }
});

// Handle user interaction to start the experience
function handleUserInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    
    // Hide interaction helper
    const interactionHelper = document.getElementById('interactionHelper');
    if (interactionHelper) {
        interactionHelper.style.display = 'none';
    }
    
    // Try to enable video
    const videoElement = document.getElementById('videoElement');
    if (videoElement) {
        videoElement.muted = true;
        videoElement.play().catch(error => {
            console.error("Error playing video:", error);
        });
    }
    
    // Initialize AR experience
    initAR();
}

// Check if WebXR and AR are supported
async function isARSupported() {
    if (!('xr' in navigator)) {
        console.log('WebXR not supported');
        return false;
    }
    
    try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        console.log('AR support:', supported);
        
        // Check for Apple-specific visionOS support
        const isAppleVisionPro = /AppleWebKit/.test(navigator.userAgent) && 
                                  /visionOS/.test(navigator.userAgent);
        
        if (isAppleVisionPro) {
            console.log("Apple Vision Pro detected");
        }
        
        return supported;
    } catch (error) {
        console.error('Error checking AR support:', error);
        return false;
    }
}

// Initialize the AR experience
async function initAR() {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    // Check AR support
    const arSupported = await isARSupported();
    if (!arSupported) {
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (errorMessage) {
            errorMessage.innerHTML = `
                <h2>WebXR AR Not Supported</h2>
                <p>Your browser or device does not support WebXR Augmented Reality.</p>
                <p>For Apple Vision Pro, please ensure you're using Safari on visionOS.</p>
            `;
            errorMessage.style.display = 'block';
        }
        return;
    }
    
    try {
        // Initialize Three.js
        initThreeJS();
        
        // Load video texture
        initVideoTexture();
        
        // Create UI and interaction
        createUI(scene, camera, renderer);
        createScreens(scene, camera, videoTexture);
        setupInteractions(scene, camera, controller);
        
        // Set up Apple Vision Pro specific features if available
        const isAppleVisionPro = /AppleWebKit/.test(navigator.userAgent) && 
                                /visionOS/.test(navigator.userAgent);
        if (isAppleVisionPro) {
            appleVisionProHandTracking(scene, camera, renderer);
        }
        
        // Start animation loop
        animate();
        
        // Hide loading message
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        // Show a welcome notification
        showNotification("Welcome to Vision Pro AR Experience");
    } catch (error) {
        console.error("Failed to initialize AR:", error);
        
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (errorMessage) {
            errorMessage.innerHTML = `
                <h2>AR Initialization Failed</h2>
                <p>There was a problem starting the AR experience: ${error.message}</p>
                <p>Please try reloading the page or using a different device.</p>
            `;
            errorMessage.style.display = 'block';
        }
    }
}

// Initialize Three.js environment
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create renderer with AR support
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Create AR button with better styling
    const arButton = ARButton.createButton(renderer, {
        optionalFeatures: ['dom-overlay', 'hand-tracking', 'anchors'],
        domOverlay: { root: document.body }
    });
    document.body.appendChild(arButton);
    
    // Set up controller
    controller = renderer.xr.getController(0);
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    scene.add(controller);
    
    // Controller model
    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip = renderer.xr.getControllerGrip(0);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    scene.add(controllerGrip);
    
    // Add controller pointer
    const geometry = new THREE.SphereGeometry(0.01, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const pointer = new THREE.Mesh(geometry, material);
    pointer.position.z = -0.1;
    controller.add(pointer);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Handle AR session start/end
    renderer.xr.addEventListener('sessionstart', () => {
        isARSessionActive = true;
        showNotification("AR session started");
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        isARSessionActive = false;
        showNotification("AR session ended");
    });
}

// Initialize video texture
function initVideoTexture() {
    const videoElement = document.getElementById('videoElement');
    if (videoElement) {
        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;
    }
}

// Controller event handlers
function onSelectStart() {
    this.userData.isSelecting = true;
}

function onSelectEnd() {
    this.userData.isSelecting = false;
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    renderer.setAnimationLoop(render);
}

// Render function
function render() {
    renderer.render(scene, camera);
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`Notification: ${message}`);
    
    // Create DOM notification
    const container = document.getElementById('notificationContainer');
    if (container) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Style based on type
        switch(type) {
            case 'error': 
                notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                break;
            case 'success': 
                notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
                break;
            default: 
                notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        }
        
        container.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode === container) {
                container.removeChild(notification);
            }
        }, 3000);
    }
} 