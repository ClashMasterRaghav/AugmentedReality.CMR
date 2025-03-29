// Main entry point for AR Web application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { init, animate } from './ar_core.js';
import { setupEventListeners } from './ar_interaction.js';
import { loadVideoTexture, updateVideoTextures } from './ar_media.js';
import { createNotification } from './ar_ui.js';
import { checkARSupport, checkWebXRSupport } from './ar_utils.js';

// Check for WebXR support when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Hide loading message when ready
    const loadingMessage = document.getElementById('loadingMessage');
    
    // Check if browser supports WebXR and AR
    const webXRSupported = checkWebXRSupport();
    const arSupported = await checkARSupport();
    
    if (!webXRSupported || !arSupported) {
        // Show unsupported message
        if (loadingMessage) {
            loadingMessage.textContent = 'WebXR AR not supported by your browser/device';
            loadingMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        }
        createNotification('WebXR AR not supported by your browser/device', 'error');
        console.error('WebXR AR not supported');
        return;
    }
    
    // Initialize the AR application
    init();
    
    // Setup interaction event listeners
    setupEventListeners();
    
    // Load video texture for screens
    loadVideoTexture();
    
    // Start animation loop
    animate();
    
    // Hide loading message
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
    
    createNotification('AR Experience ready! Tap the AR button to start', 'success');
}); 