// Main entry point for AR application
import { initAR } from './core/ar_core.js';
import { setupEventListeners } from './core/ar_interaction.js';
import { loadVideoTexture } from './core/ar_media.js';
import { initCSS3DRenderer } from './core/ar_screens.js';
import { checkARSupport, showNotification } from './core/ar_utils.js';

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Flag to track if user has interacted
    let userHasInteracted = false;
    const interactionHelper = document.getElementById('interactionHelper');
    const videoElement = document.getElementById('videoElement');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    // Set initial muted state for autoplay
    if (videoElement) {
        videoElement.muted = true;
    }
    
    // Show interaction helper on mobile devices
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        if (interactionHelper) {
            interactionHelper.style.display = 'block';
            interactionHelper.addEventListener('click', handleUserInteraction);
            document.body.addEventListener('click', handleUserInteraction);
        }
    } else {
        // On desktop, initialize after a brief delay
        setTimeout(() => {
            handleUserInteraction();
        }, 1000);
    }
    
    // Handle user interaction to enable audio/video
    function handleUserInteraction() {
        if (userHasInteracted) return;
        userHasInteracted = true;
        
        // Hide the interaction helper
        if (interactionHelper) {
            interactionHelper.style.display = 'none';
        }
        
        // Try to enable audio
        if (videoElement) {
            videoElement.muted = true; // Start muted, users can unmute via controls
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
    
    // Initialize AR experience
    async function initializeAR() {
        try {
            // Check if AR is supported
            const supported = await checkARSupport();
            
            if (!supported) {
                // Show error message for unsupported browsers
                if (loadingMessage) loadingMessage.style.display = 'none';
                if (errorMessage) errorMessage.style.display = 'block';
                console.error('WebXR AR is not supported on this device or browser');
                return;
            }
            
            // Initialize video texture
            loadVideoTexture();
            
            // Initialize AR core
            const initialized = initAR();
            
            if (!initialized) {
                throw new Error('Failed to initialize AR core');
            }
            
            // Initialize CSS3D renderer for web content
            initCSS3DRenderer();
            
            // Set up event listeners for interactions
            setupEventListeners();
            
            // Hide loading message
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }
            
            // Show welcome notification
            showNotification('Welcome to AR Multi-Screen Experience! Tap to add screens.');
            
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
    }
}); 