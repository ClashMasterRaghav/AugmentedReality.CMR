// Main entry point for AR Web application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { initAR, render, animate } from './ar_core.js';
import { setupEventListeners } from './ar_interaction.js';
import { loadVideoTexture } from './ar_media.js';

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing AR application");
    
    // Flag to track if user has interacted
    let userHasInteracted = false;
    const interactionHelper = document.getElementById('interactionHelper');
    const videoElement = document.getElementById('videoElement');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    // Setup error handling for unhandled errors
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error || event.message);
        showErrorMessage('An error occurred: ' + (event.error?.message || event.message));
        return false;
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showErrorMessage('A promise error occurred: ' + (event.reason?.message || 'Unknown error'));
        return false;
    });
    
    // Function to show error messages to the user
    function showErrorMessage(message) {
        if (loadingMessage) loadingMessage.style.display = 'none';
        
        if (errorMessage) {
            errorMessage.innerHTML = `
                <h2>AR Error</h2>
                <p>${message}</p>
                <p>Please try reloading the page or using a different device.</p>
                <button id="reloadButton" style="padding: 10px 20px; background: #4285F4; color: white; border: none; border-radius: 4px; margin-top: 10px;">Reload Page</button>
            `;
            errorMessage.style.display = 'block';
            
            // Add reload button functionality
            setTimeout(() => {
                const reloadButton = document.getElementById('reloadButton');
                if (reloadButton) {
                    reloadButton.addEventListener('click', () => {
                        window.location.reload();
                    });
                }
            }, 100);
        } else {
            // Create an error message if it doesn't exist
            const newErrorMessage = document.createElement('div');
            newErrorMessage.id = 'errorMessage';
            newErrorMessage.style.position = 'absolute';
            newErrorMessage.style.top = '50%';
            newErrorMessage.style.left = '50%';
            newErrorMessage.style.transform = 'translate(-50%, -50%)';
            newErrorMessage.style.color = '#fff';
            newErrorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            newErrorMessage.style.padding = '20px';
            newErrorMessage.style.borderRadius = '10px';
            newErrorMessage.style.fontFamily = 'Arial, sans-serif';
            newErrorMessage.style.fontSize = '18px';
            newErrorMessage.style.textAlign = 'center';
            newErrorMessage.style.zIndex = '1000';
            
            newErrorMessage.innerHTML = `
                <h2>AR Error</h2>
                <p>${message}</p>
                <p>Please try reloading the page or using a different device.</p>
                <button id="reloadButton" style="padding: 10px 20px; background: #4285F4; color: white; border: none; border-radius: 4px; margin-top: 10px;">Reload Page</button>
            `;
            
            document.body.appendChild(newErrorMessage);
            
            // Add reload button functionality
            setTimeout(() => {
                const reloadButton = document.getElementById('reloadButton');
                if (reloadButton) {
                    reloadButton.addEventListener('click', () => {
                        window.location.reload();
                    });
                }
            }, 100);
        }
    }
    
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
        
        console.log("User has interacted, initializing AR");
        
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
        try {
            initializeAR();
        } catch (error) {
            console.error("Error in initializeAR:", error);
            showErrorMessage("Failed to initialize AR: " + error.message);
        }
        
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
        // Check WebXR and AR support
        isWebXRSupported().then(supported => {
            if (!supported) {
                // Show error message for unsupported browsers
                if (loadingMessage) loadingMessage.style.display = 'none';
                showErrorMessage('WebXR AR is not supported on this device or browser');
                return;
            }
            
            // Initialize the AR experience
            try {
                // Initialize video texture
                try {
                    if (typeof loadVideoTexture === 'function') {
                        loadVideoTexture();
                    } else {
                        console.warn("loadVideoTexture function not available");
                    }
                } catch (videoError) {
                    console.error("Error loading video texture:", videoError);
                }
                
                // Initialize AR
                const arInitialized = initAR();
                
                if (!arInitialized) {
                    throw new Error("AR initialization failed");
                }
                
                // Set up event listeners
                try {
                    if (typeof setupEventListeners === 'function') {
                        setupEventListeners();
                    } else {
                        console.warn("setupEventListeners function not available");
                    }
                } catch (eventError) {
                    console.error("Error setting up event listeners:", eventError);
                }
                
                // Start animation loop
                try {
                    if (typeof animate === 'function') {
                        animate();
                    } else {
                        console.warn("animate function not available");
                    }
                } catch (animateError) {
                    console.error("Error starting animation loop:", animateError);
                }
                
                // Hide loading message once everything is initialized
                if (loadingMessage) {
                    loadingMessage.style.display = 'none';
                }
            } catch (error) {
                // Handle initialization errors
                console.error('Failed to initialize AR experience:', error);
                showErrorMessage('Failed to initialize AR: ' + error.message);
            }
        }).catch(xrError => {
            console.error('WebXR check failed:', xrError);
            showErrorMessage('WebXR check failed: ' + xrError.message);
        });
    }
    
    // On desktop or WebXR-supported devices, initialize immediately
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // Just wait a moment for everything to load
        setTimeout(() => {
            handleUserInteraction();
        }, 1000);
    }
});