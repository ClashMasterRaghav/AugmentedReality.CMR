// Main entry point for AR Web application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { initAR, render, animate } from './ar_core.js';
import { setupEventListeners } from './ar_interaction.js';
import { loadVideoTexture } from './ar_media.js';

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Flag to track if user has interacted
    let userHasInteracted = false;
    const interactionHelper = document.getElementById('interactionHelper');
    const videoElement = document.getElementById('videoElement');
    
    // Set initial muted state for autoplay
    if (videoElement) {
        videoElement.muted = true;
    }
    
    // Show interaction helper on mobile devices
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        if (interactionHelper) {
            interactionHelper.style.display = 'block';
            
            // Add event listener for interaction
            interactionHelper.addEventListener('click', handleUserInteraction);
            document.body.addEventListener('click', handleUserInteraction);
        }
    }
    
    // Handle user interaction to enable audio
    function handleUserInteraction() {
        if (userHasInteracted) return;
        userHasInteracted = true;
        
        // Hide the interaction helper
        if (interactionHelper) {
            interactionHelper.style.display = 'none';
        }
        
        // Try to enable audio
        if (videoElement) {
            videoElement.muted = true; // Keep muted initially but allow unmuting via controls
            
            // Try to play the video
            videoElement.play().catch(error => {
                console.error("Error playing video:", error);
            });
        }
        
        // Initialize AR after user interaction
        initializeAR();
        
        // Remove event listeners
        document.body.removeEventListener('click', handleUserInteraction);
        if (interactionHelper) {
            interactionHelper.removeEventListener('click', handleUserInteraction);
        }
    }
    
    // Check if WebXR is supported
    const isWebXRSupported = () => {
        if ('xr' in navigator) {
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
        console.log("Initializing AR experience...");
        
        // Check WebXR and AR support with better error handling
        isWebXRSupported()
            .then(supported => {
                const loadingMessage = document.getElementById('loadingMessage');
                const errorMessage = document.getElementById('errorMessage');
                
                if (!supported) {
                    // Show error message for unsupported browsers
                    if (loadingMessage) loadingMessage.style.display = 'none';
                    if (errorMessage) {
                        errorMessage.style.display = 'block';
                        errorMessage.innerHTML = `
                            <h2>WebXR AR Not Supported</h2>
                            <p>Your browser or device does not support WebXR Augmented Reality.</p>
                            <p>Please try using a compatible browser like Chrome on an AR-capable Android device.</p>
                        `;
                        console.error('WebXR AR is not supported on this device or browser');
                    } else {
                        // If error message element doesn't exist, create one
                        createErrorMessage('WebXR AR Not Supported', 
                            'Your browser or device does not support WebXR Augmented Reality. ' +
                            'Please try using a compatible browser like Chrome on an AR-capable Android device.');
                    }
                    return;
                }
                
                // Initialize the AR experience
                try {
                    console.log("WebXR is supported, initializing AR components...");
                    
                    // Initialize video texture
                    loadVideoTexture();
                    
                    // Initialize AR
                    if (!initAR()) {
                        throw new Error("Failed to initialize AR components");
                    }
                    
                    // Set up event listeners with better error handling
                    try {
                        setupEventListeners();
                    } catch (eventError) {
                        console.error("Error setting up event listeners, but continuing:", eventError);
                        // Continue even if event setup fails
                    }
                    
                    // Start animation loop
                    animate();
                    
                    // Hide loading message once everything is initialized
                    if (loadingMessage) {
                        loadingMessage.style.display = 'none';
                    }
                    
                    console.log("AR initialization complete");
                } catch (error) {
                    // Handle initialization errors
                    console.error('Failed to initialize AR experience:', error);
                    
                    // Hide loading message and show error
                    if (loadingMessage) loadingMessage.style.display = 'none';
                    
                    createErrorMessage('AR Initialization Failed', 
                        `There was a problem starting the AR experience: ${error.message}. ` +
                        'Please try reloading the page or using a different device.');
                }
            })
            .catch(error => {
                console.error("Error checking WebXR support:", error);
                createErrorMessage('WebXR Check Failed', 
                    'Could not determine if your device supports AR. ' +
                    'Please ensure you have granted the necessary permissions.');
            });
    }
    
    // Helper function to create error messages
    function createErrorMessage(title, message) {
        const existingError = document.getElementById('errorMessage');
        
        if (existingError) {
            existingError.innerHTML = `
                <h2>${title}</h2>
                <p>${message}</p>
                <p>Please try reloading the page or using a different device.</p>
            `;
            existingError.style.display = 'block';
            return;
        }
        
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
            <h2>${title}</h2>
            <p>${message}</p>
            <p>Please try reloading the page or using a different device.</p>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    // On desktop or WebXR-supported devices, initialize immediately
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // Just wait a moment for everything to load
        setTimeout(() => {
            handleUserInteraction();
        }, 1000);
    }
});