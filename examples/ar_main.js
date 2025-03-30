// Main entry point for AR Web application
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XREstimatedLight } from 'three/addons/webxr/XREstimatedLight.js';
import { initAR, animate } from './ar_core.js';
import { setupEventListeners } from './ar_interaction.js';
import { loadVideoTexture } from './ar_media.js';

console.log("AR Main script loaded");

// Added polyfill check
const isWebXRPolyfilled = typeof window.WebXRPolyfill !== 'undefined';

// Global variables
let container;
let loadingMessage;
let errorMessageElement;
let bypassButton;
let hasEnteredAR = false;
let canvas;

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing AR application");
    
    // Cache DOM elements
    container = document.createElement('div');
    document.body.appendChild(container);
    
    loadingMessage = document.getElementById('loadingMessage');
    errorMessageElement = document.getElementById('errorMessage');
    
    // Wait for user interaction before initializing (needed for audio/video on mobile)
    if (isMobileDevice()) {
        console.log('Mobile device detected, waiting for user interaction');
        const interactionHelper = document.getElementById('interactionHelper');
        interactionHelper.style.display = 'block';
        
        document.addEventListener('click', () => {
            if (interactionHelper.style.display !== 'none') {
                interactionHelper.style.display = 'none';
                initializeAR();
            }
        }, { once: true });
    } else {
        // On desktop, initialize immediately
        console.log("Desktop detected, initializing immediately");
        setTimeout(() => {
            initializeAR();
        }, 1000);
    }
});

// Check if the device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if WebXR AR is supported
async function isWebXRSupported() {
    console.log('Checking WebXR support...');
    
    // Create result object with default values
    const result = {
        supported: false,
        reason: 'unknown',
        message: 'WebXR AR not supported'
    };
    
    // Check if running on HTTPS (required for WebXR)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('WebXR requires HTTPS (except on localhost)');
        result.reason = 'https_required';
        result.message = 'WebXR requires HTTPS';
        return result;
    }
    
    // Check if navigator.xr is available
    if (!navigator.xr) {
        console.warn('navigator.xr not available');
        
        // Check if we're on a compatible mobile device that might support AR
        if (isMobileDevice()) {
            console.log('Mobile device detected, may still support AR with polyfill');
            result.reason = 'possibly_supported_mobile';
            result.message = 'Device might support AR, but browser reports no WebXR';
        } else {
            result.reason = 'webxr_not_available';
            result.message = 'WebXR not available in this browser';
        }
        return result;
    }
    
    try {
        // Try to check if 'immersive-ar' is supported
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        console.log('immersive-ar supported:', supported);
        
        if (supported) {
            result.supported = true;
            return result;
        } else {
            // Not supported, but check if we're on mobile
            if (isMobileDevice()) {
                console.log('Mobile device detected, may still support AR despite negative check');
                result.reason = 'possibly_supported_mobile';
                result.message = 'Device might support AR, but browser reports it as unavailable';
            } else {
                result.reason = 'ar_not_supported';
                result.message = 'This browser or device does not support WebXR AR';
            }
            return result;
        }
    } catch (error) {
        console.error('Error checking WebXR support:', error);
        result.reason = 'error_checking';
        result.message = 'Error checking WebXR AR support: ' + error.message;
        return result;
    }
}

// Initialize AR
async function initializeAR() {
    console.log('Initializing AR...');
    
    // Check WebXR support
    const xrSupportResult = await isWebXRSupported();
    console.log('WebXR support check result:', xrSupportResult);
    
    if (!xrSupportResult.supported) {
        console.warn('WebXR AR not supported:', xrSupportResult.reason);
        
        // Show appropriate error message
        let errorTitle = "WebXR AR Not Supported";
        let errorText = "Your browser or device does not support WebXR Augmented Reality.";
        
        if (xrSupportResult.reason === 'https_required') {
            errorTitle = "HTTPS Required";
            errorText = "WebXR requires HTTPS. Please access this page using a secure connection (https://).";
        } else if (xrSupportResult.reason === 'possibly_supported_mobile') {
            errorTitle = "WebXR Detection Issue";
            errorText = "Your device might support AR, but the browser reports it as unavailable. You can try to enter AR mode anyway.";
            
            // Create bypass button if it doesn't exist
            if (!bypassButton) {
                bypassButton = document.createElement('button');
                bypassButton.id = 'bypassButton';
                bypassButton.textContent = 'Try AR Anyway';
                bypassButton.addEventListener('click', () => {
                    console.log('Bypass button clicked, trying to enter AR anyway');
                    errorMessageElement.style.display = 'none';
                    startARExperience();
                });
                
                // If errorMessageElement doesn't exist, create it
                if (!errorMessageElement) {
                    errorMessageElement = document.createElement('div');
                    errorMessageElement.id = 'errorMessage';
                    document.body.appendChild(errorMessageElement);
                }
                
                errorMessageElement.appendChild(bypassButton);
            }
        }
        
        // Update error message
        if (errorMessageElement) {
            const titleElement = errorMessageElement.querySelector('h2');
            if (titleElement) {
                titleElement.textContent = errorTitle;
            } else {
                const newTitleElement = document.createElement('h2');
                newTitleElement.textContent = errorTitle;
                errorMessageElement.prepend(newTitleElement);
            }
            
            // Update error text
            const paragraphs = errorMessageElement.querySelectorAll('p');
            if (paragraphs.length > 0) {
                paragraphs[0].textContent = errorText;
            } else {
                const newParagraph = document.createElement('p');
                newParagraph.textContent = errorText;
                errorMessageElement.appendChild(newParagraph);
            }
            
            errorMessageElement.style.display = 'block';
        }
        
        if (xrSupportResult.reason !== 'possibly_supported_mobile') {
            // If not "possibly supported", create a fallback non-AR experience
            console.log('Creating fallback non-AR experience');
            createFallbackExperience();
            return;
        }
    } else {
        // WebXR is supported, start the AR experience
        startARExperience();
    }
}

// Create the AR scene and start the experience
function startARExperience() {
    console.log('=== Starting AR Experience ===');
    console.log('UA: ' + navigator.userAgent);
    
    try {
        // First, clear any existing error messages
        if (errorMessageElement) {
            errorMessageElement.style.display = 'none';
        }

        // Prepare for AR entry
        console.log('Clearing console to focus on AR-specific logs');
        console.clear();
        console.log('Starting AR experience - Session will begin when you tap the AR button');
        
        // Show a prominent notification that the user should tap the AR button
        const startMessage = document.createElement('div');
        startMessage.style.position = 'fixed';
        startMessage.style.top = '50%';
        startMessage.style.left = '50%';
        startMessage.style.transform = 'translate(-50%, -50%)';
        startMessage.style.backgroundColor = 'rgba(0, 100, 255, 0.9)';
        startMessage.style.color = 'white';
        startMessage.style.padding = '20px';
        startMessage.style.borderRadius = '10px';
        startMessage.style.textAlign = 'center';
        startMessage.style.zIndex = '9999';
        startMessage.style.fontSize = '20px';
        startMessage.style.fontWeight = 'bold';
        startMessage.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        startMessage.innerHTML = 'Tap the "START AR" button to begin<br><small>Look for the button at the bottom of the screen</small>';
        document.body.appendChild(startMessage);
        
        // Hide loading message if it exists
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        // Create container for AR scene
        console.log('Creating AR container');
        container = container || document.createElement('div');
        document.body.appendChild(container);
        
        // Create scene
        console.log('Creating AR scene');
        const scene = new THREE.Scene();
        
        // Initialize AR experience
        console.log('Initializing AR core');
        const initResult = initAR(container, scene);
        console.log('AR initialization result:', initResult);
        
        // Remove start message after a delay (let people see the AR button)
        setTimeout(() => {
            if (startMessage.parentNode) {
                document.body.removeChild(startMessage);
            }
        }, 5000);
        
        // AR should now be initialized and waiting for user to press the AR button
        console.log('AR experience ready - waiting for user to enter AR mode');
    } catch (error) {
        console.error('Critical error starting AR experience:', error);
        
        // Show detailed error message
        const errorMsg = document.createElement('div');
        errorMsg.style.position = 'fixed';
        errorMsg.style.top = '50%';
        errorMsg.style.left = '50%';
        errorMsg.style.transform = 'translate(-50%, -50%)';
        errorMsg.style.backgroundColor = 'rgba(200, 0, 0, 0.9)';
        errorMsg.style.color = 'white';
        errorMsg.style.padding = '20px';
        errorMsg.style.borderRadius = '10px';
        errorMsg.style.textAlign = 'left';
        errorMsg.style.zIndex = '9999';
        errorMsg.style.width = '80%';
        errorMsg.style.maxWidth = '500px';
        errorMsg.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        
        errorMsg.innerHTML = `
            <h2>AR Initialization Error</h2>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Stack:</strong><br>${error.stack.replace(/\n/g, '<br>')}</p>
            <p><strong>Browser:</strong> ${navigator.userAgent}</p>
            <button id="dismissError" style="padding: 10px 15px; background: #fff; color: #c00; border: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">Dismiss</button>
        `;
        
        document.body.appendChild(errorMsg);
        
        // Add dismiss button functionality
        document.getElementById('dismissError').addEventListener('click', () => {
            if (errorMsg.parentNode) {
                document.body.removeChild(errorMsg);
            }
            
            // Try creating fallback experience
            createFallbackExperience();
        });
    }
}

// Create a fallback non-AR experience
function createFallbackExperience() {
    console.log('Creating fallback non-AR experience...');
    
    // Hide loading message
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
    
    // Simple fallback using OrbitControls
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444444);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    
    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    
    // Add some light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 5, 5);
    scene.add(directionalLight);
    
    // Add a grid helper for orientation
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // Create a message to inform the user
    const messageElement = document.createElement('div');
    messageElement.style.position = 'absolute';
    messageElement.style.top = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.color = 'white';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontFamily = 'Arial, sans-serif';
    messageElement.style.fontSize = '16px';
    messageElement.style.zIndex = '100';
    messageElement.innerHTML = 'AR not available. Showing a simplified fallback experience.';
    document.body.appendChild(messageElement);
    
    // Add a simple screen demo
    const geometry = new THREE.PlaneGeometry(1, 0.75);  // 4:3 aspect ratio
    const material = new THREE.MeshBasicMaterial({ color: 0x5555ff, side: THREE.DoubleSide });
    const screen = new THREE.Mesh(geometry, material);
    screen.position.set(0, 1.5, 0);
    scene.add(screen);
    
    // Animation loop for fallback
    function animateFallback() {
        requestAnimationFrame(animateFallback);
        controls.update();
        renderer.render(scene, camera);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Start animation
    animateFallback();
    
    console.log('Fallback non-AR experience created successfully');
}

// Show a notification to the user
function showNotification(message, duration = 2000) {
    const notificationContainer = document.getElementById('notificationContainer');
    
    if (!notificationContainer) {
        console.warn('Notification container not found');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notificationContainer.removeChild(notification);
    }, duration);
}

// Export notification function for use in other modules
export { showNotification }; 