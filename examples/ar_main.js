// Main entry point for AR Web application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { initAR, render, animate } from './ar_core.js?v=3';
import { setupEventListeners, createInteractivePlane } from './ar_interaction.js?v=3';
import { loadVideoTexture } from './ar_media.js?v=3';
import { createButton, createControlPanel, updateControlPanel } from './ar_ui_wrapper.js';
import * as WebDOM from './ar_web_dom.js?v=3';
import * as WebOverlay from './ar_web_overlay.js?v=3';
import * as WebMessaging from './ar_web_messaging.js?v=3';

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

// AR Main - Interactive Web Content Demo
async function init() {
    // Initialize AR
    await initAR();
    
    // Add demo controls
    createDemoControls();
    
    // Start AR
    await startAR();
    
    // Animation loop
    renderer.setAnimationLoop(update);
}

// Create demo control panel and buttons
function createDemoControls() {
    // Create a control panel for web interaction demo
    const controlPanel = createControlPanel({
        title: "Interactive Web Demo",
        position: new THREE.Vector3(0, 0.15, -0.5),
        width: 0.6,
        height: 0.3,
        rows: 3,
        columns: 2
    });
    
    // Add buttons for each approach
    createButton({
        parent: controlPanel.mesh,
        position: new THREE.Vector3(-0.15, 0.05, 0.01),
        width: 0.25,
        height: 0.07,
        label: "DOM Injection",
        onClick: () => createDOMDemo()
    });
    
    createButton({
        parent: controlPanel.mesh,
        position: new THREE.Vector3(0.15, 0.05, 0.01),
        width: 0.25,
        height: 0.07,
        label: "HTML Texture",
        onClick: () => createTextureDemo()
    });
    
    createButton({
        parent: controlPanel.mesh,
        position: new THREE.Vector3(-0.15, -0.05, 0.01),
        width: 0.25,
        height: 0.07,
        label: "DOM Overlay",
        onClick: () => createOverlayDemo()
    });
    
    createButton({
        parent: controlPanel.mesh,
        position: new THREE.Vector3(0.15, -0.05, 0.01),
        width: 0.25,
        height: 0.07,
        label: "Web Messaging",
        onClick: () => createMessagingDemo()
    });
    
    createButton({
        parent: controlPanel.mesh,
        position: new THREE.Vector3(0, -0.15, 0.01),
        width: 0.5,
        height: 0.07,
        label: "Reset All Demos",
        onClick: resetAllDemos
    });
    
    return controlPanel;
}

// Demo functions for each approach
let activeScreens = [];

// DOM Injection demo
function createDOMDemo() {
    console.log("Creating DOM Injection demo");
    
    // Check if renderer is available
    if (!renderer) {
        console.error("Renderer not initialized");
        return;
    }
    
    // Initialize the CSS3D renderer if needed
    if (!window.webDOMInitialized) {
        try {
            // Import the CSS3DRenderer dynamically
            import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/renderers/CSS3DRenderer.js')
                .then(module => {
                    window.CSS3DRenderer = module.CSS3DRenderer;
                    WebDOM.initWebDOMRenderer(renderer.domElement);
                    window.webDOMInitialized = true;
                    
                    // Create the demo after initialization
                    createDOMPanel();
                })
                .catch(error => {
                    console.error("Failed to load CSS3DRenderer:", error);
                });
        } catch (error) {
            console.error("Error initializing DOM renderer:", error);
        }
    } else {
        createDOMPanel();
    }
}

// Create a DOM panel after initialization
function createDOMPanel() {
    // Create a web panel with DOM injection
    const panel = WebDOM.createInteractiveWebPanel({
        url: "https://www.wikipedia.org",
        width: 1.6,
        height: 0.9,
        position: new THREE.Vector3(0, 0.5, -2),
        rotation: new THREE.Euler(0, 0, 0)
    });
    
    if (panel) {
        activeScreens.push({
            type: 'dom',
            panel: panel
        });
    }
}

// HTML-to-Texture demo
function createTextureDemo() {
    console.log("Creating HTML-to-Texture demo");
    
    // Create a texture-based web panel that will get screenshots of web content
    // For demo purposes, we'll just create a simulated texture
    
    // Create a placeholder screen
    const geometry = new THREE.PlaneGeometry(1.6, 0.9);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    
    // Draw something on the canvas to simulate web content
    const ctx = canvas.getContext('2d');
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#f5f5f5");
    gradient.addColorStop(1, "#e0e0e0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw header
    ctx.fillStyle = "#4285f4";
    ctx.fillRect(0, 0, canvas.width, 70);
    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial";
    ctx.fillText("HTML-to-Texture Demo", 20, 45);
    
    // Draw content
    ctx.fillStyle = "#333";
    ctx.font = "20px Arial";
    ctx.fillText("This demonstrates how web content can be rendered to a texture.", 20, 120);
    ctx.fillText("In a real implementation, this would use:", 20, 160);
    
    // Draw bullet points
    const bulletPoints = [
        "Server-side rendering with Puppeteer",
        "Regular screenshot updates sent to the client",
        "Canvas-based interaction handling"
    ];
    
    ctx.font = "18px Arial";
    bulletPoints.forEach((point, i) => {
        ctx.fillText("• " + point, 40, 200 + i * 40);
    });
    
    // Create material and mesh
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position the screen
    mesh.position.set(0, 0.5, -2);
    scene.add(mesh);
    
    // Create an interaction plane for the screen
    const interactionPlane = createInteractivePlane({
        width: 1.6,
        height: 0.9,
        position: new THREE.Vector3(0, 0.5, -1.99),
        onTap: (point) => {
            console.log("Texture panel tapped at", point);
            // Simulate interaction feedback
            const tapSound = new Audio("data:audio/wav;base64,UklGRl9vT19TAP//");
            tapSound.volume = 0.2;
            tapSound.play().catch(() => {});
        }
    });
    
    // Store reference
    activeScreens.push({
        type: 'texture',
        mesh: mesh,
        interactionPlane: interactionPlane
    });
}

// DOM Overlay demo
function createOverlayDemo() {
    console.log("Creating DOM Overlay demo");
    
    // Initialize the overlay system if needed
    WebOverlay.initDOMOverlay().then(success => {
        if (success) {
            // Create an overlay
            const overlay = WebOverlay.createWebOverlay("https://www.google.com", {
                width: "80%",
                height: "60%",
                position: "center",
                initiallyVisible: true,
                transparentBackground: false
            });
            
            if (overlay) {
                activeScreens.push({
                    type: 'overlay',
                    overlay: overlay
                });
            }
        } else {
            console.error("DOM Overlay initialization failed");
            // Show a message in AR
            displayErrorMessage("DOM Overlay initialization failed. Your browser may not support this feature.");
        }
    });
}

// Web Messaging demo
function createMessagingDemo() {
    console.log("Creating Web Messaging demo");
    
    // Create a messaging-enabled web panel
    const panel = WebMessaging.createInteractiveWebPanel({
        url: "https://www.duckduckgo.com",
        width: 1.6,
        height: 0.9,
        position: new THREE.Vector3(0, 0.5, -2),
        rotation: new THREE.Euler(0, 0, 0)
    });
    
    if (panel) {
        // Create an interaction handler for this panel
        const interactionPlane = createInteractivePlane({
            width: 1.6,
            height: 0.9,
            position: new THREE.Vector3(0, 0.5, -1.99),
            onTap: (point) => {
                console.log("Web messaging panel tapped");
                WebMessaging.handleWebPanelInteraction(point, camera, 'click');
            }
        });
        
        activeScreens.push({
            type: 'messaging',
            panel: panel,
            interactionPlane: interactionPlane
        });
    }
}

// Reset all demos
function resetAllDemos() {
    console.log("Resetting all demos");
    
    // Clean up each active screen based on type
    activeScreens.forEach(screen => {
        switch (screen.type) {
            case 'dom':
                if (screen.panel && screen.panel.dispose) {
                    screen.panel.dispose();
                }
                break;
                
            case 'texture':
                if (screen.mesh && screen.mesh.parent) {
                    screen.mesh.parent.remove(screen.mesh);
                    if (screen.mesh.material) {
                        screen.mesh.material.dispose();
                    }
                    if (screen.mesh.geometry) {
                        screen.mesh.geometry.dispose();
                    }
                }
                if (screen.interactionPlane && screen.interactionPlane.parent) {
                    screen.interactionPlane.parent.remove(screen.interactionPlane);
                }
                break;
                
            case 'overlay':
                if (screen.overlay && screen.overlay.destroy) {
                    screen.overlay.destroy();
                }
                break;
                
            case 'messaging':
                if (screen.panel && screen.panel.dispose) {
                    screen.panel.dispose();
                }
                if (screen.interactionPlane && screen.interactionPlane.parent) {
                    screen.interactionPlane.parent.remove(screen.interactionPlane);
                }
                break;
        }
    });
    
    // Clear the active screens array
    activeScreens = [];
}

// Display an error message in AR
function displayErrorMessage(message) {
    const geometry = new THREE.PlaneGeometry(1.6, 0.4);
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 200;
    
    // Draw the error message
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#ffcdd2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e57373";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    ctx.fillStyle = "#d32f2f";
    ctx.font = "bold 24px Arial";
    ctx.fillText("Error", 20, 40);
    
    ctx.fillStyle = "#212121";
    ctx.font = "18px Arial";
    const words = message.split(' ');
    let line = '';
    let y = 80;
    const maxWidth = canvas.width - 40;
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, 20, y);
            line = words[i] + ' ';
            y += 30;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, 20, y);
    
    // Create texture and mesh
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position in front of user
    mesh.position.set(0, 0, -2);
    scene.add(mesh);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (mesh.parent) {
            mesh.parent.remove(mesh);
        }
        if (mesh.material) {
            mesh.material.dispose();
        }
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
    }, 5000);
}

// Update function for animation loop
function update(time) {
    // Update AR core
    updateAR();
    
    // Update control panel if exists
    updateControlPanel();
    
    // Update all active web panels
    WebDOM.updateWebPanels && WebDOM.updateWebPanels();
    WebMessaging.updateWebPanels && WebMessaging.updateWebPanels();
}

// Start the application
init().catch(console.error);