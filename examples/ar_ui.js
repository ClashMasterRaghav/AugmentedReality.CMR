// UI elements for AR application
import * as THREE from 'three';
import { scene, camera, renderer, controller } from './ar_core.js';
import { createNewBrowserScreen, screens, selectScreen } from './ar_screens.js';

// Global UI elements
export let controlPanel = null;
export let virtualKeyboard = null;

// UI interaction states
export let isMoveModeActive = false;
export let isRotateModeActive = false;
export let isResizeModeActive = false;

// Export notification functions explicitly at the top level
export function createNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // Create DOM notification
    createDOMNotification(message, type);
    
    // Create 3D notification if renderer is available
    if (renderer && camera) {
        create3DNotification(message, type);
    }
}

// Alias for backward compatibility
export const showNotification = createNotification;

// Initialize UI elements
export function initUI(sceneRef) {
    try {
        // Use a scene reference passed directly, from window, or from the module
        const sceneToUse = sceneRef || window.arScene || scene;
        
        if (!sceneToUse) {
            console.error("Cannot initialize UI: no scene reference available");
            return false;
        }
        
        // Set module-level scene for components that need it
        window.arScene = sceneToUse;
        
        // Initialize UI components with explicit scene reference
        createControlPanel(sceneToUse);
        createVirtualKeyboard(sceneToUse);
        
        return true;
    } catch (error) {
        console.error("Error initializing UI:", error);
        return false;
    }
}

// Create a notification in the DOM
function createDOMNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add type-specific styling
    switch(type) {
        case 'error':
            notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            break;
        case 'success':
            notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
            break;
        case 'warning':
            notification.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
            break;
        default:
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    }
    
    // Add to container
    container.appendChild(notification);
    
    // Remove after animation completes
    setTimeout(() => {
        if (notification.parentNode === container) {
            container.removeChild(notification);
        }
    }, 3000);
}

// Create a 3D notification in space
function create3DNotification(message, type = 'info') {
    if (!camera) return;
    
    // Get a valid scene reference
    const sceneToUse = window.arScene || scene;
    
    if (!sceneToUse) {
        console.error("Cannot create 3D notification: no scene reference available");
        return;
    }
    
    // Create canvas for the notification
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Set background color based on type
    let bgColor;
    switch(type) {
        case 'error':
            bgColor = 'rgba(255, 0, 0, 0.7)';
            break;
        case 'success':
            bgColor = 'rgba(0, 255, 0, 0.7)';
            break;
        case 'warning':
            bgColor = 'rgba(255, 165, 0, 0.7)';
            break;
        default:
            bgColor = 'rgba(0, 0, 0, 0.7)';
    }
    
    // Draw rounded rectangle background (compatible with all browsers)
    context.fillStyle = bgColor;
    // Use path drawing instead of roundRect for better compatibility
    context.beginPath();
    context.moveTo(20, 0);
    context.lineTo(canvas.width - 20, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, 20);
    context.lineTo(canvas.width, canvas.height - 20);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - 20, canvas.height);
    context.lineTo(20, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - 20);
    context.lineTo(0, 20);
    context.quadraticCurveTo(0, 0, 20, 0);
    context.closePath();
    context.fill();
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create notification panel
    const geometry = new THREE.PlaneGeometry(0.5, 0.125);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const notificationMesh = new THREE.Mesh(geometry, material);
    
    // Position notification in front of camera
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const position = new THREE.Vector3();
    position.copy(camera.position).add(direction.multiplyScalar(1));
    position.y += 0.2; // Position above eye level
    
    notificationMesh.position.copy(position);
    notificationMesh.quaternion.copy(camera.quaternion);
    
    // Add to scene
    sceneToUse.add(notificationMesh);
    
    // Remove after timeout
    setTimeout(() => {
        sceneToUse.remove(notificationMesh);
        material.dispose();
        geometry.dispose();
        texture.dispose();
    }, 3000);
}

// Create a control panel with options
export function createControlPanel(options = {}) {
    try {
        console.log("Creating control panel");
        
        // Handle passing scene directly or as options.parent
        let parent;
        if (options instanceof THREE.Scene || options instanceof THREE.Object3D) {
            // Direct scene object was passed
            parent = options;
            options = {}; // Reset options to default
            console.log("Using direct scene reference for control panel");
        } else if (options.parent) {
            // Options object with parent property
            parent = options.parent;
            console.log("Using options.parent for control panel");
        } else {
            // No parent specified
            console.error("Control panel creation failed: No parent object provided");
            return null;
        }
        
        // Extract configured options with defaults
        const {
            width = 0.5,
            height = 0.3,
            position = new THREE.Vector3(0, 0, -0.5),
            title = 'Control Panel',
            transparent = true,
            color = 0x2c3e50
        } = options;
        
        // Create panel container
        const panel = new THREE.Group();
        panel.position.copy(position);
        
        // Create background plane
        const geometry = new THREE.PlaneGeometry(width, height);
        
        // Create panel background with canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(52, 73, 94, 0.9)');  // Dark blue-gray
        gradient.addColorStop(1, 'rgba(44, 62, 80, 0.9)');  // Slightly darker
        
        // Fill background
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border
        ctx.strokeStyle = 'rgba(100, 120, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width-4, canvas.height-4);
        
        // Add title text
        if (title) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, canvas.width/2, 40);
            
            // Add divider line
            ctx.strokeStyle = 'rgba(100, 120, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(canvas.width-50, 50);
            ctx.stroke();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        // Create panel mesh
        const panelMesh = new THREE.Mesh(geometry, material);
        panel.add(panelMesh);
        
        // Store mesh reference for buttons to attach to
        panel.mesh = panelMesh;
        
        // Add to parent scene
        try {
            parent.add(panel);
            console.log("Control panel added to scene");
        } catch (error) {
            console.error("Failed to add control panel to parent:", error);
            return null;
        }
        
        return panel;
    } catch (error) {
        console.error("Error creating control panel:", error);
        return null;
    }
}

// Create modern, clean button icons
function createButtonIcon(buttonIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Higher resolution for better quality
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up shared styling - more modern look
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Determine which icon to draw
    if (buttonIndex === 0) { // New Screen button
        // Draw a modern plus sign
            ctx.beginPath();
        ctx.moveTo(64, 128);
        ctx.lineTo(192, 128);
            ctx.stroke();
            
            ctx.beginPath();
        ctx.moveTo(128, 64);
        ctx.lineTo(128, 192);
            ctx.stroke();
    } else if (buttonIndex === 1) { // Delete button
        // Draw a modern 'X'
            ctx.beginPath();
        ctx.moveTo(80, 80);
        ctx.lineTo(176, 176);
            ctx.stroke();
            
            ctx.beginPath();
        ctx.moveTo(176, 80);
        ctx.lineTo(80, 176);
            ctx.stroke();
    } else if (buttonIndex === 2) { // YouTube icon
        // Red circle with play button
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(128, 128, 90, 0, Math.PI * 2);
        ctx.fill();
        
        // White play button
        ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
        ctx.moveTo(100, 90);
        ctx.lineTo(180, 128);
        ctx.lineTo(100, 166);
        ctx.closePath();
        ctx.fill();
    } else if (buttonIndex === 3) { // DuckDuckGo icon
        // Orange circle
        ctx.fillStyle = '#DE5833';
        ctx.beginPath();
        ctx.arc(128, 128, 90, 0, Math.PI * 2);
        ctx.fill();
        
        // Duck silhouette (simplified)
        ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
        ctx.arc(148, 108, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#DE5833';
            ctx.beginPath();
        ctx.arc(158, 98, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(130, 130);
        ctx.lineTo(180, 170);
        ctx.lineTo(130, 170);
        ctx.closePath();
        ctx.fill();
    } else if (buttonIndex === 4) { // Google Maps icon
        // Blue-ish background
        ctx.fillStyle = '#4285F4';
        ctx.beginPath();
        ctx.arc(128, 128, 90, 0, Math.PI * 2);
        ctx.fill();
        
        // Maps pin
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(128, 108, 40, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#EA4335';
        ctx.beginPath();
        ctx.moveTo(128, 108);
        ctx.lineTo(128, 188);
        ctx.lineTo(108, 168);
        ctx.closePath();
        ctx.fill();
    } else if (buttonIndex === 5) { // Electron icon
        // Teal background
        ctx.fillStyle = '#47848F';
        ctx.beginPath();
        ctx.arc(128, 128, 90, 0, Math.PI * 2);
        ctx.fill();
        
        // Electron orbits and nucleus
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 8;
        
        // Orbit 1
        ctx.beginPath();
        ctx.ellipse(128, 128, 70, 30, 0, 0, Math.PI * 2);
            ctx.stroke();
            
        // Orbit 2
            ctx.beginPath();
        ctx.ellipse(128, 128, 70, 30, Math.PI/3, 0, Math.PI * 2);
            ctx.stroke();
            
        // Orbit 3
            ctx.beginPath();
        ctx.ellipse(128, 128, 70, 30, -Math.PI/3, 0, Math.PI * 2);
            ctx.stroke();
        
        // Nucleus
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(128, 128, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Create a screen type selector with buttons for different content types
function createScreenTypeSelector(parent, offsetX = 0, offsetY = -0.05, buttonSize = 0.04, sceneRef) {
    try {
        // Get scene reference
        const scene = sceneRef || window.arScene || parent.parent;
        
        if (!scene) {
            console.error("Cannot create screen type selector: scene is undefined");
            return null;
        }
        
    // Create a panel for content type selection
    const selectorGroup = new THREE.Group();
    
    // Create a background panel for the selector
        const panelWidth = 0.40; // Increase width to ensure all buttons fit
        const panelHeight = 0.15; // Taller panel for larger buttons
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    
    // Create a texture for the selector panel
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 512;
    panelCanvas.height = 256; // Taller canvas
    const panelCtx = panelCanvas.getContext('2d');
    
    // Draw panel background with glass morphism style
    const cornerRadius = 40;
    panelCtx.beginPath();
    panelCtx.moveTo(cornerRadius, 0);
    panelCtx.lineTo(panelCanvas.width - cornerRadius, 0);
    panelCtx.quadraticCurveTo(panelCanvas.width, 0, panelCanvas.width, cornerRadius);
    panelCtx.lineTo(panelCanvas.width, panelCanvas.height - cornerRadius);
    panelCtx.quadraticCurveTo(panelCanvas.width, panelCanvas.height, panelCanvas.width - cornerRadius, panelCanvas.height);
    panelCtx.lineTo(cornerRadius, panelCanvas.height);
    panelCtx.quadraticCurveTo(0, panelCanvas.height, 0, panelCanvas.height - cornerRadius);
    panelCtx.lineTo(0, cornerRadius);
    panelCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
    panelCtx.closePath();
    
    // Matching gradient to control panel but slightly more transparent
    const gradient = panelCtx.createLinearGradient(0, 0, 0, panelCanvas.height);
    gradient.addColorStop(0, 'rgba(70, 75, 102, 0.80)'); // Slightly lighter than control panel
    gradient.addColorStop(1, 'rgba(40, 45, 70, 0.80)'); // Slightly lighter than control panel
    panelCtx.fillStyle = gradient;
    panelCtx.fill();
    
    // Add glass effect highlight
    panelCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    panelCtx.beginPath();
    panelCtx.moveTo(cornerRadius, 0);
    panelCtx.lineTo(panelCanvas.width - cornerRadius, 0);
    panelCtx.quadraticCurveTo(panelCanvas.width, 0, panelCanvas.width, cornerRadius);
    panelCtx.lineTo(panelCanvas.width, panelCanvas.height/3);
    panelCtx.lineTo(0, panelCanvas.height/3);
    panelCtx.lineTo(0, cornerRadius);
    panelCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
    panelCtx.closePath();
    panelCtx.fill();
    
    // Add title with modern font
    panelCtx.fillStyle = '#ffffff';
    panelCtx.font = '600 18px Inter, SF Pro Display, Arial';
    panelCtx.textAlign = 'center';
    panelCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    panelCtx.shadowBlur = 2;
    panelCtx.shadowOffsetX = 1;
    panelCtx.shadowOffsetY = 1;
    panelCtx.fillText('SCREEN TYPES', panelCanvas.width/2, 28);
    panelCtx.shadowBlur = 0;
    
    // Add subtle divider line
    panelCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    panelCtx.lineWidth = 1;
    panelCtx.beginPath();
    panelCtx.moveTo(panelCanvas.width/2 - 100, 38);
    panelCtx.lineTo(panelCanvas.width/2 + 100, 38);
    panelCtx.stroke();
    
    // Add subtle border with gradient to match control panel
    const borderGradient = panelCtx.createLinearGradient(0, 0, panelCanvas.width, panelCanvas.height);
    borderGradient.addColorStop(0, 'rgba(180, 190, 255, 0.7)'); // Light purple-blue
    borderGradient.addColorStop(0.5, 'rgba(120, 140, 220, 0.5)'); // Medium purple-blue
    borderGradient.addColorStop(1, 'rgba(90, 100, 180, 0.7)'); // Darker purple-blue
    panelCtx.strokeStyle = borderGradient;
    panelCtx.lineWidth = 2;
    panelCtx.stroke();
    
    // Create texture for panel
    const panelTexture = new THREE.CanvasTexture(panelCanvas);
    panelTexture.needsUpdate = true;
    
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panelMesh.renderOrder = 1004;
    selectorGroup.add(panelMesh);
    
    // Add a solid background blocking plane behind the panel to fix interaction issues
    const blockingGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const blockingMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: false,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const blockingMesh = new THREE.Mesh(blockingGeometry, blockingMaterial);
    blockingMesh.position.z = -0.003;
    blockingMesh.renderOrder = 1002; // Below panel but above glow
    blockingMesh.visible = false; // Invisible but still blocks raycasts
    selectorGroup.add(blockingMesh);
    
    // Add subtle glow behind the panel
    const glowGeometry = new THREE.PlaneGeometry(panelWidth + 0.01, panelHeight + 0.01);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x6495ED, // Cornflower blue glow (matching control panel)
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.002;
    glowMesh.renderOrder = 1003;
    selectorGroup.add(glowMesh);
    
    // Create type selection buttons (4 buttons in a row)
    const buttonTypes = ['youtube', 'duckduckgo', 'maps', 'electron'];
    const buttonIcons = [2, 3, 4, 5]; // indices for the createButtonIcon function
    const buttonColors = [0xE62117, 0xDE5833, 0x4285F4, 0x47848F]; // colors matching each service
    
    // BIGGER button size for better touch targets
        const smallButtonSize = buttonSize * 1.3; // Increase from 1.2 to 1.3 (larger)
        const spacing = smallButtonSize * 2.1; // Slightly reduce spacing to fit all buttons
    const startX = -spacing * 1.5; // Starting position for first button
        const buttonY = 0; // Center buttons vertically
    
    buttonTypes.forEach((type, index) => {
        // Create button canvas for gradient effect
        const buttonCanvas = document.createElement('canvas');
        buttonCanvas.width = 128;
        buttonCanvas.height = 128;
        const buttonCtx = buttonCanvas.getContext('2d');
            
            // First, create a solid background fill to ensure the entire button is visible and clickable
            buttonCtx.fillStyle = "#333333"; // Dark grey background
            buttonCtx.beginPath();
            buttonCtx.arc(64, 64, 64, 0, Math.PI * 2);
            buttonCtx.fill();
        
        // Create gradient fill
            const buttonGradient = buttonCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        const baseColor = new THREE.Color(buttonColors[index]);
        const r = Math.floor(baseColor.r * 255);
        const g = Math.floor(baseColor.g * 255);
        const b = Math.floor(baseColor.b * 255);
        
        buttonGradient.addColorStop(0, `rgb(${r + 40}, ${g + 40}, ${b + 40})`); // Lighter center
            buttonGradient.addColorStop(0.7, `rgb(${r}, ${g}, ${b})`); // Original color
            buttonGradient.addColorStop(1, `rgb(${Math.floor(r*0.7)}, ${Math.floor(g*0.7)}, ${Math.floor(b*0.7)})`); // Darker edge
        
        buttonCtx.fillStyle = buttonGradient;
        buttonCtx.beginPath();
        buttonCtx.arc(64, 64, 64, 0, Math.PI * 2);
        buttonCtx.fill();
        
        // Add subtle inner shadow
        buttonCtx.shadowBlur = 10;
        buttonCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        buttonCtx.shadowOffsetX = 2;
        buttonCtx.shadowOffsetY = 2;
        buttonCtx.beginPath();
        buttonCtx.arc(64, 64, 62, 0, Math.PI * 2);
        buttonCtx.stroke();
        buttonCtx.shadowBlur = 0;
        
        const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
        
            // Create button with texture - make sure it's a full circle, not just an outline
        const buttonGeometry = new THREE.CircleGeometry(smallButtonSize / 2, 32);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            map: buttonTexture,
                transparent: true, // Keep transparent for proper texture display
                opacity: 1.0, // Full opacity
            side: THREE.DoubleSide
        });
        
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        // Position with adjusted Y coordinate
        button.position.set(startX + spacing * index, buttonY, 0.004); // Increased z position to ensure it's in front of blocking plane
        button.renderOrder = 1005;
        button.userData = {
            type: 'button',
            action: 'selectScreenType',
            screenType: buttonTypes[index],
            hoverColor: new THREE.Color(buttonColors[index]).lerp(new THREE.Color(0xFFFFFF), 0.3), // Lighter version for hover
            activeColor: buttonColors[index],
            inactiveColor: buttonColors[index],
            originalColor: buttonColors[index],
            isToggle: false,
            isActive: true
        };
        
        // Add button shadow for depth
        const shadowGeometry = new THREE.CircleGeometry(smallButtonSize / 2 * 1.05, 32);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowMesh.position.z = -0.001;
        shadowMesh.renderOrder = 1004;
            // Link shadow mesh to button for interaction
            shadowMesh.userData = {
                type: 'buttonPart',
                parentButton: button
            };
        button.add(shadowMesh);
        
        // Add icon to button - LARGER
        const iconTexture = createButtonIcon(buttonIcons[index]);
        const iconSize = smallButtonSize * 0.8; // Keep at 0.8
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.004;
        iconMesh.renderOrder = 1006;
            // Link icon mesh to button for interaction
            iconMesh.userData = {
                type: 'buttonPart',
                parentButton: button
            };
        button.add(iconMesh);
        
        // Add label for each button with text shadow for better readability
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 48; // Taller for better quality
        const labelCtx = labelCanvas.getContext('2d');
        
        // Clear canvas and add text with shadow
        labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        
        labelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        labelCtx.shadowBlur = 3;
        labelCtx.shadowOffsetX = 1;
        labelCtx.shadowOffsetY = 1;
        
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = '600 14px Inter, SF Pro Display, Arial'; // Use consistent font with control panel
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        
        // Choose appropriate text for each button
        let labelText;
        switch(index) {
            case 0: labelText = 'YouTube'; break;
            case 1: labelText = 'Search'; break;
            case 2: labelText = 'Maps'; break;
            case 3: labelText = 'App'; break;
        }
        
        labelCtx.fillText(labelText, labelCanvas.width / 2, labelCanvas.height / 2);
        labelCtx.shadowBlur = 0;
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(smallButtonSize * 1.8, smallButtonSize * 0.6);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.set(0, -smallButtonSize * 0.8, 0.002);
        labelMesh.renderOrder = 1006;
        button.add(labelMesh);
        
        selectorGroup.add(button);
    });
    
    // Position the selector panel relative to the parent
        selectorGroup.position.set(offsetX, offsetY - 0.08, 0.01); // Reduce gap between panels
    parent.add(selectorGroup);
    
    return selectorGroup;
    } catch (error) {
        console.error("Error creating screen type selector:", error);
        return null;
    }
}

// Create a virtual keyboard for text input
export function createVirtualKeyboard(sceneRef) {
    try {
        console.log("Creating virtual keyboard with scene:", sceneRef);
        // Get a valid scene reference
        const sceneToUse = sceneRef || window.arScene || scene;
        
        if (!sceneToUse) {
            console.error("Cannot create virtual keyboard: no scene reference available");
            return null;
        }
        
        // Create the keyboard group
    virtualKeyboard = new THREE.Group();
        virtualKeyboard.visible = false; // Initially hidden
        
        // Add userData
        virtualKeyboard.userData = {
            type: 'virtualKeyboard',
            isActive: false
        };
        
        // Create the keyboard base
        const keyboardWidth = 0.6;
        const keyboardHeight = 0.25;
        
        // Create keyboard background directly here instead of using a separate function
        const keyboardGeometry = new THREE.PlaneGeometry(keyboardWidth, keyboardHeight);
        
        // Create keyboard texture
        const keyboardCanvas = document.createElement('canvas');
        keyboardCanvas.width = 1024;
        keyboardCanvas.height = 512;
        const ctx = keyboardCanvas.getContext('2d');
        
        // Draw keyboard background
        ctx.fillStyle = 'rgba(30, 35, 60, 0.85)';
        ctx.fillRect(0, 0, keyboardCanvas.width, keyboardCanvas.height);
        
        // Add border
        ctx.strokeStyle = 'rgba(120, 140, 220, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, keyboardCanvas.width - 4, keyboardCanvas.height - 4);
        
        const keyboardTexture = new THREE.CanvasTexture(keyboardCanvas);
    const keyboardMaterial = new THREE.MeshBasicMaterial({
            map: keyboardTexture,
        transparent: true,
            opacity: 0.9
    });
        
    const keyboardMesh = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    virtualKeyboard.add(keyboardMesh);
    
    // Create keys
        const keys = [
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
            'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
            'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '.',
            'Z', 'X', 'C', 'V', 'B', 'N', 'M', '_', '←', '✓'
        ];
        
        const rows = 4;
        const cols = 10;
        const keySize = 0.055;
        const padding = 0.005;
        const startX = -(keyboardWidth / 2) + keySize / 2 + padding;
        const startY = (keyboardHeight / 2) - keySize / 2 - padding;
        
        for (let i = 0; i < keys.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            const x = startX + col * (keySize + padding);
            const y = startY - row * (keySize + padding);
            
            // Create key
            const keyGeometry = new THREE.PlaneGeometry(keySize, keySize);
            
            // Create texture for key
            const keyCanvas = document.createElement('canvas');
            keyCanvas.width = 128;
            keyCanvas.height = 128;
            const keyCtx = keyCanvas.getContext('2d');
            
            // Key background
            keyCtx.fillStyle = keys[i] === '←' || keys[i] === '✓' ? '#4285f4' : '#ffffff';
            keyCtx.fillRect(0, 0, keyCanvas.width, keyCanvas.height);
            
            // Key border
            keyCtx.strokeStyle = '#bbbbbb';
            keyCtx.lineWidth = 2;
            keyCtx.strokeRect(2, 2, keyCanvas.width - 4, keyCanvas.height - 4);
            
            // Key text
            keyCtx.fillStyle = keys[i] === '←' || keys[i] === '✓' ? '#ffffff' : '#000000';
            keyCtx.font = 'bold 48px Arial';
            keyCtx.textAlign = 'center';
            keyCtx.textBaseline = 'middle';
            keyCtx.fillText(keys[i], keyCanvas.width / 2, keyCanvas.height / 2);
            
            const keyTexture = new THREE.CanvasTexture(keyCanvas);
        const keyMaterial = new THREE.MeshBasicMaterial({
                map: keyTexture,
                transparent: false
            });
            
        const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
            keyMesh.position.set(x, y, 0.001);
            
            // Add user data for interaction
        keyMesh.userData = {
                type: 'keyboardKey',
                key: keys[i],
                isInteractive: true
        };
            
        virtualKeyboard.add(keyMesh);
        }
        
        // Position the keyboard in front of camera
        virtualKeyboard.position.set(0, -0.1, -0.5);
        
        // Add to scene
        sceneToUse.add(virtualKeyboard);
        
        return virtualKeyboard;
    } catch (error) {
        console.error("Error creating virtual keyboard:", error);
        return null;
    }
}

// Toggle mode buttons (move, rotate, resize)
export function toggleModeButton(mode) {
    if (!controlPanel) return;
    
    const buttons = controlPanel.children.filter(child => 
        child.userData && child.userData.type === 'button');
    
    let buttonIndex;
    switch(mode) {
        case 'move':
            buttonIndex = 1;
            isMoveModeActive = !isMoveModeActive;
            isRotateModeActive = false;
            isResizeModeActive = false;
            break;
        case 'rotate':
            buttonIndex = 2;
            isRotateModeActive = !isRotateModeActive;
            isMoveModeActive = false;
            isResizeModeActive = false;
            break;
        case 'resize':
            buttonIndex = 3;
            isResizeModeActive = !isResizeModeActive;
            isMoveModeActive = false;
            isRotateModeActive = false;
            break;
    }
    
    if (buttonIndex !== undefined && buttons[buttonIndex]) {
        const button = buttons[buttonIndex];
        const isActive = mode === 'move' ? isMoveModeActive : 
                       mode === 'rotate' ? isRotateModeActive : 
                       isResizeModeActive;
        
        // Update button color based on active state
        button.material.color.set(isActive ? 0x44cc88 : 0x777777);
        button.userData.originalColor = isActive ? 0x44cc88 : 0x777777;
        
        // Update other buttons to inactive
        buttons.forEach((otherButton, idx) => {
            if (idx !== buttonIndex && idx !== 0) { // Skip the New Screen button
                otherButton.material.color.set(0x777777);
                otherButton.userData.originalColor = 0x777777;
            }
        });
    }
}

// Update UI elements
export function updateUI() {
    // Update control panel position
    if (controlPanel && controlPanel.userData.update) {
        controlPanel.userData.update();
    }
    
    // Update button hover effects
    if (controlPanel && controlPanel.children) {
        const buttons = controlPanel.children.filter(child => 
            child.userData && child.userData.type === 'button');
            
        buttons.forEach(button => {
            // Reset color if not being interacted with
            if (!button.userData.isHovered && !button.userData.isPressed) {
                button.material.color.set(button.userData.originalColor);
            }
        });
    }
}

// Set button hover state
export function setButtonHover(button, isHovered) {
    if (!button || !button.userData) return;
    
    button.userData.isHovered = isHovered;
    
    if (isHovered) {
        button.material.color.set(button.userData.hoverColor);
    } else if (!button.userData.isPressed) {
        button.material.color.set(button.userData.originalColor);
    }
}

// Set button pressed state
export function setButtonPressed(button, isPressed) {
    if (!button || !button.userData) return;
    
    button.userData.isPressed = isPressed;
    
    if (isPressed) {
        // Visual feedback - darken the button
        const color = new THREE.Color(button.userData.originalColor);
        color.multiplyScalar(0.7);
        button.material.color.copy(color);
    } else if (button.userData.isHovered) {
        button.material.color.set(button.userData.hoverColor);
    } else {
        button.material.color.set(button.userData.originalColor);
    }
}

// Position control panel in front of user
export function setupControlPanel() {
    if (!controlPanel) return;
    
    // Only reposition if not being dragged AND not previously manually positioned
    if (controlPanel.userData.isDragging || controlPanel.userData.manuallyPositioned) return;
    
    // Position in front and below the user
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    const targetPosition = new THREE.Vector3();
    targetPosition.copy(camera.position).add(cameraDirection.multiplyScalar(-0.6)); // Further from user (0.6m instead of 0.4m)
    
    // Position BELOW the default screen position
    targetPosition.y -= 0.4; // Position it much lower to appear below the screen
    
    // Add smoothing with lerp - use 0.08 factor for gentler movement (matching screen movement)
    if (!controlPanel.userData.smoothPositioning) {
        // For first time positioning, set directly
        controlPanel.position.copy(targetPosition);
        // Initialize the smoothPositioning flag
        controlPanel.userData.smoothPositioning = true;
    } else {
        // For subsequent positioning, use lerp for smooth transition
        controlPanel.position.lerp(targetPosition, 0.08); // Smaller factor = slower, smoother movement
    }
    
    // Update panel rotation to face user, but do it smoothly
    // Get the direction to camera
    const lookDirection = new THREE.Vector3().subVectors(camera.position, controlPanel.position);
    
    // Create a temporary quaternion for the target rotation
    const targetQuaternion = new THREE.Quaternion();
    const lookMatrix = new THREE.Matrix4().lookAt(controlPanel.position, camera.position, new THREE.Vector3(0, 1, 0));
    targetQuaternion.setFromRotationMatrix(lookMatrix);
    
    // Apply smooth rotation
    controlPanel.quaternion.slerp(targetQuaternion, 0.08); // Match position lerp factor
    
    // Keep panel facing the user but upright
    const euler = new THREE.Euler().setFromQuaternion(controlPanel.quaternion);
    euler.x = 0; // Keep panel upright (no tilt)
    euler.z = 0; // No roll
    controlPanel.quaternion.setFromEuler(euler);
}

// Add gentle floating animation to the control panel to make it look more interactive
export function floatAnimation() {
    if (!controlPanel) return;
    
    const time = Date.now(); // Get current time in milliseconds
    
    // SIGNIFICANTLY REDUCE the amplitude - make it barely noticeable
    const amplitude = 0.00003; // Reduced from 0.0003 to 0.00003 (10x less)
    
    // Very slight floating motion effect
    controlPanel.position.y += Math.sin(time * 0.001) * amplitude;
    
    // Update glow effect to match the reduced floating
    const glowMesh = controlPanel.children.find(child => 
        child.material && child.material.blending === THREE.AdditiveBlending);
    
    if (glowMesh) {
        // Use a much more subtle glow
        glowMesh.material.opacity = 0.03 + Math.sin(time * 0.0005) * 0.01;
    }
}

// Create a modern interactive button with customizable options
export function createButton(options = {}) {
    try {
        // Extract options with defaults
        const {
            parent = null,
            position = new THREE.Vector3(0, 0, 0),
            width = 0.1,
            height = 0.05,
            color = 0x4285f4,
            label = 'Button',
            icon = null,
            onClick = null
        } = options;
        
        // Check if parent is provided and valid
        if (!parent) {
            console.error("Parent object is required for createButton");
            return null;
        }
        
        // Verify parent is a valid THREE.Object3D
        if (!(parent instanceof THREE.Object3D)) {
            console.error("Parent must be a THREE.Object3D", parent);
            return null;
        }
        
        // Create button group
        const button = new THREE.Group();
        button.position.copy(position);
        
        // Create button background
        const buttonGeometry = new THREE.PlaneGeometry(width, height);
        
        // Create a canvas texture for the button
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Draw button background with rounded corners
        const cornerRadius = 20;
        ctx.beginPath();
        ctx.moveTo(cornerRadius, 0);
        ctx.lineTo(canvas.width - cornerRadius, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
        ctx.lineTo(canvas.width, canvas.height - cornerRadius);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
        ctx.lineTo(cornerRadius, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
        ctx.lineTo(0, cornerRadius);
        ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
        ctx.closePath();
        
        // Color format conversion and gradient
        const threeColor = new THREE.Color(color);
        const r = Math.floor(threeColor.r * 255);
        const g = Math.floor(threeColor.g * 255);
        const b = Math.floor(threeColor.b * 255);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `rgb(${r + 30}, ${g + 30}, ${b + 30})`);
        gradient.addColorStop(1, `rgb(${r - 20}, ${g - 20}, ${b - 20})`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add subtle border
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
        ctx.stroke();
        
        // Add label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, canvas.width/2, canvas.height/2);
        
        // Create button texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });
        
        const buttonMesh = new THREE.Mesh(buttonGeometry, material);
        button.add(buttonMesh);
        
        // Add userData for interaction
        button.userData = {
            type: 'button',
            isInteractive: true,
            originalColor: color,
            hoverColor: new THREE.Color(color).offsetHSL(0, 0, 0.1),
            activeColor: new THREE.Color(color).offsetHSL(0, 0, -0.1),
            isHovered: false,
            isPressed: false,
            onClick: onClick
        };
        
        // Try to safely add to parent
        try {
            if (parent.add && typeof parent.add === 'function') {
                parent.add(button);
                console.log("Button added successfully:", label);
            } else {
                console.error("Parent object doesn't have an add method");
                return null;
            }
        } catch (error) {
            console.error("Failed to add button to parent:", error);
            return null;
        }
        
        return button;
    } catch (error) {
        console.error("Error creating button:", error);
        return null;
    }
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) {
        ctx.fill();
    }
    
    if (stroke) {
        ctx.stroke();
    }
}