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
        // Check WebXR and AR support
        isWebXRSupported().then(supported => {
            const loadingMessage = document.getElementById('loadingMessage');
            const errorMessage = document.getElementById('errorMessage');
            
            if (!supported) {
                // Show error message for unsupported browsers
                if (loadingMessage) loadingMessage.style.display = 'none';
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    console.error('WebXR AR is not supported on this device or browser');
                } else {
                    // If error message element doesn't exist, create one
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
                // Initialize video texture
                loadVideoTexture();
                
                // Initialize AR
                initAR();
                
                // Set up event listeners
                setupEventListeners();
                
                // Start animation loop
                animate();
                
                // Hide loading message once everything is initialized
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