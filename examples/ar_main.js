// Main entry point for AR Web application
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { initAR, render, animate, scene, camera } from './ar_core.js?v=4';
import { setupEventListeners } from './ar_interaction.js?v=4';
import { loadVideoTexture } from './ar_media.js?v=4';
import { createButton, createControlPanel, updateControlPanel } from './ar_ui_wrapper.js?v=4';
import * as WebDOM from './ar_web_dom.js?v=4';
import * as WebOverlay from './ar_web_overlay.js?v=4';
import * as WebMessaging from './ar_web_messaging.js?v=4';
import { createInteractivePlane } from './ar_interaction_plane.js?v=4';

// Flag to track if AR has been initialized
let hasInitialized = false;

// Define startAR function as a placeholder if not imported
const startAR = window.startAR || function() {
    console.log("Using placeholder startAR function - no AR session will be started");
    return Promise.resolve();
};

// Initialize function mapping for web content loading
const contentLoaders = {
    'fixed': createDOMDemo,
    'responsive': createTextureDemo,
    'vr-optimized': createMessagingDemo
};

// Export a global function for content loading
window.loadWebContent = function(type) {
    console.log(`Loading web content type: ${type}`);
    
    // Remove any existing text overlays
    const existingOverlays = document.querySelectorAll('.content-type-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    // Reset any existing content
    resetAllDemos();
    
    // Call the appropriate loader function
    if (contentLoaders[type]) {
        contentLoaders[type]();
    } else {
        console.error(`Unknown content type: ${type}`);
    }
};

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Skip initialization if already done through direct init() call
    if (hasInitialized) {
        console.log("Skipping DOMContentLoaded initialization as AR has already been initialized");
        return;
    }
    
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
    
    // Initialize AR experience
    function initializeAR() {
        // Use the exported init function to avoid code duplication
        init();
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
export async function init() {
    // Prevent multiple initializations
    if (hasInitialized) {
        console.log("AR already initialized, skipping duplicate initialization");
        return;
    }
    
    hasInitialized = true;
    console.log("Initializing AR from init() function");
    
    try {
        // Check if WebXR is supported
        const isSupported = await checkWebXRSupport();
        if (!isSupported) {
            displayARNotSupportedMessage();
            return;
        }
        
        // Initialize AR
        await initAR();
        
        // Make sure global scene is set for UI components
        window.arScene = scene;
        
        // Ensure camera is globally available to avoid "isPerspectiveCamera" errors
        if (camera) {
            console.log("Setting global camera reference");
            window.arCamera = camera;
        } else {
            console.warn("Camera not available after AR initialization");
        }
        
        // Initialize video texture
        loadVideoTexture();
        
        // Set up event listeners
        setupEventListeners();
        
        // Add demo controls
        createDemoControls();
        
        // Start animation loop
        animate();
        
        // Hide loading message
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        console.log("AR has been initialized successfully");
    } catch (error) {
        console.error("Failed to initialize AR:", error);
        displayErrorMessage(error.message);
    }
}

// Check if WebXR is supported
async function checkWebXRSupport() {
    if ('xr' in navigator) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            console.log('WebXR AR supported:', supported);
            return supported;
        } catch (error) {
            console.error('Error checking AR support:', error);
            return false;
        }
    } else {
        console.log('WebXR not supported in this browser');
        return false;
    }
}

// Display AR not supported message
function displayARNotSupportedMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
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
}

// Display error message
function displayErrorMessage(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) {
        errorMessage.innerHTML = `
            <h2>AR Initialization Failed</h2>
            <p>There was a problem starting the AR experience: ${message}</p>
            <p>Please try reloading the page or using a different device.</p>
        `;
        errorMessage.style.display = 'block';
    }
}

// Function to create demo controls for different web content approaches
export function createDemoControls() {
    console.log("Creating demo controls...");
    
    // First, remove any text overlays that might have been created
    document.querySelectorAll('.content-type-overlay').forEach(el => el.remove());
    
    try {
        // Make sure we have a valid scene reference
        const sceneToUse = window.arScene || scene;
        
        if (!sceneToUse) {
            console.error("No valid scene reference found for creating control panel");
            return null;
        }
        
        console.log("Using scene for control panel:", {
            type: sceneToUse.type,
            children: sceneToUse.children?.length || 0,
            isObject3D: sceneToUse instanceof THREE.Object3D,
            hasAdd: typeof sceneToUse.add === 'function'
        });
        
        // Create control panel with explicit scene reference and more debugging
        console.log("Creating control panel with scene reference");
        const controlPanelOptions = {
            width: 0.5,
            height: 0.25,
            position: new THREE.Vector3(0, -0.3, -0.7),
            title: 'Web Experience',
            transparent: true,
            scene: sceneToUse // Explicitly pass the scene reference
        };
        
        console.log("Control panel options:", controlPanelOptions);
        const controlPanel = createControlPanel(controlPanelOptions);
        
        if (!controlPanel) {
            console.error("Failed to create control panel - returned null");
            
            // Try a simpler approach - create a basic object and add directly to scene
            console.log("Attempting to create a basic control panel...");
            const basicPanel = new THREE.Group();
            basicPanel.position.copy(controlPanelOptions.position);
            
            try {
                sceneToUse.add(basicPanel);
                console.log("Added basic panel to scene");
                
                // Add a simple mesh to visualize the panel
                const panelGeometry = new THREE.PlaneGeometry(0.5, 0.25);
                const panelMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x2196F3,
                    transparent: true,
                    opacity: 0.7
                });
                const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
                basicPanel.add(panelMesh);
                
                // Add fallback DOM buttons for debugging
                addFallbackDOMButtons();
                
                return basicPanel;
            } catch (error) {
                console.error("Failed to create even a basic panel:", error);
                
                // Add fallback DOM buttons for debugging
                addFallbackDOMButtons();
                
                return null;
            }
        }
        
        console.log("Control panel created successfully:", {
            type: controlPanel.type,
            children: controlPanel.children?.length || 0,
            hasObject: controlPanel.object ? true : false,
            hasMesh: controlPanel.mesh ? true : false
        });
        
        // Ensure controlPanel has a mesh property for button parent
        let buttonParent;
        
        if (controlPanel.mesh) {
            console.log("Using controlPanel.mesh as button parent");
            buttonParent = controlPanel.mesh;
        } else if (controlPanel.children && controlPanel.children.length > 0) {
            // Try to find a suitable mesh in children
            console.log("Searching for a suitable mesh in control panel children");
            const possibleMesh = controlPanel.children.find(child => 
                child instanceof THREE.Mesh && 
                child.geometry instanceof THREE.PlaneGeometry);
            
            if (possibleMesh) {
                console.log("Found suitable mesh in children:", possibleMesh.type);
                buttonParent = possibleMesh;
            } else {
                console.log("No suitable mesh found. Using first child as button parent");
                buttonParent = controlPanel.children[0];
            }
        } else {
            console.log("Control panel has no mesh or children. Using control panel itself as button parent");
            buttonParent = controlPanel;
        }
        
        console.log("Button parent selected:", {
            type: buttonParent.type,
            isObject3D: buttonParent instanceof THREE.Object3D,
            hasAdd: typeof buttonParent.add === 'function'
        });
        
        // Shared button configuration
        const buttonConfig = {
            parent: buttonParent,
            height: 0.06,
            width: 0.35,
            color: 0x2196F3
        };
        
        console.log("Button configuration:", buttonConfig);
        
        // Create buttons
        let buttonsCreated = 0;
        const totalButtons = 3;
        
        try {
            console.log("Creating 'Fixed Content' button");
            const fixedButton = createButton({
                ...buttonConfig,
                position: new THREE.Vector3(0, 0.07, 0.01),
                label: 'Fixed Content',
                onClick: () => {
                    console.log("Fixed Content button clicked");
                    document.querySelectorAll('.content-type-overlay').forEach(el => el.remove());
                    if (window.loadWebContent) {
                        window.loadWebContent('fixed');
                    } else {
                        console.error("loadWebContent function not available");
                    }
                }
            });
            
            if (fixedButton) {
                console.log("Fixed Content button created successfully");
                buttonsCreated++;
            }
        } catch (error) {
            console.error("Failed to create Fixed Content button:", error);
        }
        
        try {
            console.log("Creating 'Responsive Content' button");
            const responsiveButton = createButton({
                ...buttonConfig,
                position: new THREE.Vector3(0, 0, 0.01),
                label: 'Responsive Content',
                onClick: () => {
                    console.log("Responsive Content button clicked");
                    document.querySelectorAll('.content-type-overlay').forEach(el => el.remove());
                    if (window.loadWebContent) {
                        window.loadWebContent('responsive');
                    } else {
                        console.error("loadWebContent function not available");
                    }
                }
            });
            
            if (responsiveButton) {
                console.log("Responsive Content button created successfully");
                buttonsCreated++;
            }
        } catch (error) {
            console.error("Failed to create Responsive Content button:", error);
        }
        
        try {
            console.log("Creating 'VR Optimized Content' button");
            const virtualButton = createButton({
                ...buttonConfig,
                position: new THREE.Vector3(0, -0.07, 0.01),
                label: 'VR Optimized Content',
                onClick: () => {
                    console.log("VR Optimized Content button clicked");
                    document.querySelectorAll('.content-type-overlay').forEach(el => el.remove());
                    if (window.loadWebContent) {
                        window.loadWebContent('vr-optimized');
                    } else {
                        console.error("loadWebContent function not available");
                    }
                }
            });
            
            if (virtualButton) {
                console.log("VR Optimized Content button created successfully");
                buttonsCreated++;
            }
        } catch (error) {
            console.error("Failed to create VR Optimized Content button:", error);
        }
        
        console.log(`Created ${buttonsCreated}/${totalButtons} buttons successfully`);
        
        // Add fallback DOM buttons as backup in case 3D buttons don't work
        if (buttonsCreated < totalButtons) {
            addFallbackDOMButtons();
        }
        
        return controlPanel;
    } catch (error) {
        console.error("Error creating demo controls:", error);
        
        // Add fallback DOM buttons for debugging
        addFallbackDOMButtons();
        
        return null;
    }
}

// Function to add fallback DOM buttons that will appear in DOM overlay
function addFallbackDOMButtons() {
    // Remove any existing buttons
    const existingButtons = document.getElementById('ar-fallback-buttons');
    if (existingButtons) {
        existingButtons.remove();
    }
    
    // Create buttons container
    const container = document.createElement('div');
    container.id = 'ar-fallback-buttons';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    
    // Create buttons
    const buttonStyles = `
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 10px 15px;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        width: 200px;
        text-align: center;
    `;
    
    // Fixed Content Button
    const fixedBtn = document.createElement('button');
    fixedBtn.textContent = 'Fixed Content';
    fixedBtn.style.cssText = buttonStyles;
    fixedBtn.addEventListener('click', () => {
        document.querySelectorAll('.content-type-overlay').forEach(el => el.remove());
        if (window.loadWebContent) {
            window.loadWebContent('fixed');
        }
    });
    container.appendChild(fixedBtn);
    
    // Responsive Content Button
    const responsiveBtn = document.createElement('button');
    responsiveBtn.textContent = 'Responsive Content';
    responsiveBtn.style.cssText = buttonStyles;
    responsiveBtn.addEventListener('click', () => {
        document.querySelectorAll('.content-type-overlay').forEach(el => el.remove());
        if (window.loadWebContent) {
            window.loadWebContent('responsive');
        }
    });
    container.appendChild(responsiveBtn);
    
    // VR Optimized Content Button
    const vrBtn = document.createElement('button');
    vrBtn.textContent = 'VR Optimized Content';
    vrBtn.style.cssText = buttonStyles;
    vrBtn.addEventListener('click', () => {
        document.querySelectorAll('.content-type-overlay').forEach(el => el.remove());
        if (window.loadWebContent) {
            window.loadWebContent('vr-optimized');
        }
    });
    container.appendChild(vrBtn);
    
    // Add container to body
    document.body.appendChild(container);
    
    console.log("Added fallback DOM buttons for direct interaction");
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