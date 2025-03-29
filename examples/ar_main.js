// Main entry point for AR Web application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { initAR, render, animate } from './ar_core.js';
import { setupEventListeners } from './ar_interaction.js';
import { loadVideoTexture } from './ar_media.js';

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
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
});