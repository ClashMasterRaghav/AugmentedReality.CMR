// Main entry point for AR Web application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { initAR, animate } from './ar_core.js';
import { setupEventListeners } from './ar_interaction.js';
import { loadVideoTexture } from './ar_media.js';

console.log("AR Main script loaded");

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing AR application");
    
    // Flag to track if user has interacted
    let userHasInteracted = false;
    const interactionHelper = document.getElementById('interactionHelper');
    const videoElement = document.getElementById('videoElement');
    const loadingMessage = document.getElementById('loadingMessage');
    
    console.log("Elements found:", {
        interactionHelper: !!interactionHelper,
        videoElement: !!videoElement,
        loadingMessage: !!loadingMessage
    });
    
    // Set initial muted state for autoplay
    if (videoElement) {
        videoElement.muted = true;
        console.log("Video element muted for autoplay");
    }
    
    // Show interaction helper on mobile devices
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        console.log("Mobile device detected");
        if (interactionHelper) {
            interactionHelper.style.display = 'block';
            console.log("Showing interaction helper");
            
            // Add event listener for interaction
            interactionHelper.addEventListener('click', handleUserInteraction);
            document.body.addEventListener('click', handleUserInteraction);
            console.log("Added click event listeners");
        }
    } else {
        // On desktop, initialize immediately
        console.log("Desktop detected, initializing immediately");
        setTimeout(() => {
            handleUserInteraction();
        }, 1000);
    }
    
    // Handle user interaction to enable audio
    function handleUserInteraction() {
        console.log("User interaction detected");
        if (userHasInteracted) return;
        userHasInteracted = true;
        
        // Hide the interaction helper
        if (interactionHelper) {
            interactionHelper.style.display = 'none';
            console.log("Interaction helper hidden");
        }
        
        // Try to enable audio
        if (videoElement) {
            videoElement.muted = true; // Keep muted initially but allow unmuting via controls
            
            // Try to play the video
            videoElement.play().then(() => {
                console.log("Video playback started");
            }).catch(error => {
                console.error("Error playing video:", error);
            });
        }
        
        // Initialize AR after user interaction
        console.log("Calling initializeAR() function");
        initializeAR();
        
        // Remove event listeners
        document.body.removeEventListener('click', handleUserInteraction);
        if (interactionHelper) {
            interactionHelper.removeEventListener('click', handleUserInteraction);
        }
        console.log("Removed click event listeners");
    }
    
    // Check if WebXR is supported
    const isWebXRSupported = () => {
        console.log("Checking WebXR support");
        if ('xr' in navigator) {
            console.log("navigator.xr exists");
            // Check if AR is supported
            return navigator.xr.isSessionSupported('immersive-ar')
                .then(supported => {
                    console.log('WebXR AR supported:', supported);
                    return supported;
                })
                .catch(error => {
                    console.error('Error checking AR support:', error);
                    return false;
                });
        } else {
            console.log('WebXR not supported in this browser');
            return Promise.resolve(false);
        }
    };
    
    // Initialize AR experience
    function initializeAR() {
        console.log("Initializing AR experience");
        
        // Check WebXR and AR support
        isWebXRSupported().then(supported => {
            console.log("WebXR support check completed:", supported);
            const errorMessage = document.getElementById('errorMessage');
            
            if (!supported) {
                console.log("WebXR not supported, showing error message");
                // Show error message for unsupported browsers
                if (loadingMessage) loadingMessage.style.display = 'none';
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    console.error('WebXR AR is not supported on this device or browser');
                } else {
                    // If error message element doesn't exist, create one
                    console.log("Creating error message element");
                    const errorDiv = document.createElement('div');
                    errorDiv.id = 'errorMessage';
                    errorDiv.style.position = 'absolute';
                    errorDiv.style.top = '50%';
                    errorDiv.style.left = '50%';
                    errorDiv.style.transform = 'translate(-50%, -50%)';
                    errorDiv.style.color = '#fff';
                    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                    errorDiv.style.padding = '20px';
                    errorDiv.style.borderRadius = '10px';
                    errorDiv.style.fontFamily = 'Arial, sans-serif';
                    errorDiv.style.fontSize = '18px';
                    errorDiv.style.textAlign = 'center';
                    errorDiv.style.zIndex = '1000';
                    
                    errorDiv.innerHTML = `
                        <h2>WebXR AR Not Supported</h2>
                        <p>Your browser or device does not support WebXR Augmented Reality.</p>
                        <p>Please try using a compatible browser like Chrome on an AR-capable Android device.</p>
                    `;
                    
                    document.body.appendChild(errorDiv);
                }
                return;
            }
            
            // Initialize the AR experience
            try {
                console.log("WebXR supported, starting AR initialization");
                
                // Initialize video texture
                console.log("Loading video texture");
                loadVideoTexture();
                
                // Initialize AR
                console.log("Initializing AR core");
                const initResult = initAR();
                console.log("initAR() result:", initResult);
                
                // Set up event listeners
                console.log("Setting up event listeners");
                setupEventListeners();
                
                // Start animation loop
                console.log("Starting animation loop");
                animate();
                
                // Hide loading message once everything is initialized
                console.log("AR experience initialized, hiding loading message");
                if (loadingMessage) {
                    loadingMessage.style.display = 'none';
                }
            } catch (error) {
                // Handle initialization errors
                console.error('Failed to initialize AR experience:', error);
                
                // Hide loading message and show error
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
        }).catch(error => {
            console.error("Error in WebXR support check:", error);
        });
    }
}); 