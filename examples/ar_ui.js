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

// Create a minimalist control panel with modern design
export function createControlPanel(sceneRef) {
    try {
        // Use the passed scene reference or try to get it from the module
        const scene = sceneRef || window.arScene;
        
        if (!scene) {
            console.error("Cannot create control panel: scene is undefined");
            return null;
        }
        
        // Create panel group
        const controlPanel = new THREE.Group();
        
        // Add userData with necessary properties
        controlPanel.userData = {
            type: 'controlPanel',
            isDragging: false,
            manuallyPositioned: false,
            smoothPositioning: false // Initialize smoothPositioning property
        };
        
        // Modern, sleek panel design with solid appearance
        const panelSize = { width: 0.28, height: 0.13 };
        const panelGeometry = new THREE.PlaneGeometry(panelSize.width, panelSize.height);
        
        // Create rounded panel texture with high-quality design
        const panelCanvas = document.createElement('canvas');
        panelCanvas.width = 512;
        panelCanvas.height = 256;
        const panelCtx = panelCanvas.getContext('2d');
        
        // Draw rounded rectangle with flat design
        const cornerRadius = 50;
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
        
        // Glass morphism style with gradient
        const gradient = panelCtx.createLinearGradient(0, 0, 0, panelCanvas.height);
        gradient.addColorStop(0, 'rgba(60, 65, 92, 0.85)'); // Smoky blue at top
        gradient.addColorStop(1, 'rgba(30, 35, 60, 0.85)'); // Darker smoky blue at bottom
        panelCtx.fillStyle = gradient;
        panelCtx.fill();
        
        // Add subtle glass effect with highlights
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
        
        // Add thin, elegant border with gradient
        const borderGradient = panelCtx.createLinearGradient(0, 0, panelCanvas.width, panelCanvas.height);
        borderGradient.addColorStop(0, 'rgba(180, 190, 255, 0.8)'); // Light purple-blue
        borderGradient.addColorStop(0.5, 'rgba(120, 140, 220, 0.6)'); // Medium purple-blue
        borderGradient.addColorStop(1, 'rgba(90, 100, 180, 0.8)'); // Darker purple-blue
        panelCtx.strokeStyle = borderGradient;
        panelCtx.lineWidth = 2;
        panelCtx.stroke();
        
        // Add "Control Center" text as panel title with modern font
        panelCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        panelCtx.font = '600 22px Inter, SF Pro Display, Segoe UI, Arial';
        panelCtx.textAlign = 'center';
        panelCtx.fillText('CONTROL CENTER', panelCanvas.width/2, 36);
        
        // Add subtle line under the title
        panelCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        panelCtx.lineWidth = 1;
        panelCtx.beginPath();
        panelCtx.moveTo(panelCanvas.width/2 - 120, 46);
        panelCtx.lineTo(panelCanvas.width/2 + 120, 46);
        panelCtx.stroke();
        
        // Create texture from canvas
        const panelTexture = new THREE.CanvasTexture(panelCanvas);
        const panelMaterial = new THREE.MeshBasicMaterial({
            map: panelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
        // Set high renderOrder to ensure panel renders on top of other elements
        panelMesh.renderOrder = 1000;
        controlPanel.add(panelMesh);
        
        // Add background blur effect with subtle glow
        const glowGeometry = new THREE.PlaneGeometry(panelSize.width + 0.01, panelSize.height + 0.01);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x6495ED, // Cornflower blue glow
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.z = -0.002;
        glowMesh.renderOrder = 998;
        controlPanel.add(glowMesh);
        
        // Make the entire panel draggable by attaching a hidden drag area
        const fullPanelDragGeometry = new THREE.PlaneGeometry(panelSize.width, panelSize.height);
        const fullPanelDragMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.001, // Nearly invisible
            side: THREE.DoubleSide
        });
        const fullPanelDrag = new THREE.Mesh(fullPanelDragGeometry, fullPanelDragMaterial);
        fullPanelDrag.position.z = 0.0005; // Between panel and buttons
        fullPanelDrag.renderOrder = 1001; // Above panel for interaction
        fullPanelDrag.userData = {
            type: 'dragHandle',
            isDragArea: true,
            isPartOfDragHandle: true,
            originalColor: 0xffffff,
            hoverColor: 0xffffff
        };
        controlPanel.add(fullPanelDrag);
        
        // Add a modern, visually distinct drag handle at the top
        const topDragWidth = panelSize.width * 0.25;
        const topDragHeight = 0.01;
        const topDragGeometry = new THREE.PlaneGeometry(topDragWidth, topDragHeight);
        
        // Create a fancy gradient drag handle with canvas texture
        const dragHandleCanvas = document.createElement('canvas');
        dragHandleCanvas.width = 128;
        dragHandleCanvas.height = 16;
        const dragHandleCtx = dragHandleCanvas.getContext('2d');
        
        // Pill shape for drag handle
        const pillRadius = 8;
        dragHandleCtx.beginPath();
        dragHandleCtx.moveTo(pillRadius, 0);
        dragHandleCtx.lineTo(dragHandleCanvas.width - pillRadius, 0);
        dragHandleCtx.arcTo(dragHandleCanvas.width, 0, dragHandleCanvas.width, pillRadius, pillRadius);
        dragHandleCtx.arcTo(dragHandleCanvas.width, dragHandleCanvas.height, dragHandleCanvas.width - pillRadius, dragHandleCanvas.height, pillRadius);
        dragHandleCtx.lineTo(pillRadius, dragHandleCanvas.height);
        dragHandleCtx.arcTo(0, dragHandleCanvas.height, 0, dragHandleCanvas.height - pillRadius, pillRadius);
        dragHandleCtx.arcTo(0, 0, pillRadius, 0, pillRadius);
        dragHandleCtx.closePath();
        
        const handleGradient = dragHandleCtx.createLinearGradient(0, 0, dragHandleCanvas.width, 0);
        handleGradient.addColorStop(0, 'rgba(145, 190, 255, 0.8)'); // Light blue
        handleGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)'); // White
        handleGradient.addColorStop(1, 'rgba(145, 190, 255, 0.8)'); // Light blue
        
        dragHandleCtx.fillStyle = handleGradient;
        dragHandleCtx.fill();
        
        const dragHandleTexture = new THREE.CanvasTexture(dragHandleCanvas);
        const topDragMaterial = new THREE.MeshBasicMaterial({
            map: dragHandleTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const topDragHandle = new THREE.Mesh(topDragGeometry, topDragMaterial);
        topDragHandle.position.set(0, panelSize.height/2 - topDragHeight/2 - 0.015, 0.005);
        topDragHandle.renderOrder = 1002;
        topDragHandle.userData = {
            type: 'dragHandle',
            isDragArea: true,
            isPartOfDragHandle: true,
            originalColor: 0x91BEFF,
            hoverColor: 0xB8D4FF
        };
        controlPanel.add(topDragHandle);
        
        // Define button parameters - preserve original functionality
        const buttonSize = 0.055; // Increased from default size for better touch targets
        const buttonRadius = buttonSize / 2;
        const buttonSpacing = 0.14; // Slightly closer together
        
        // Create buttons with modern design
        const buttonPositions = [
            new THREE.Vector3(-panelSize.width/4, 0, 0.001),
            new THREE.Vector3(panelSize.width/4, 0, 0.001)
        ];
        
        const buttonActions = ['newScreen', 'deleteScreen'];
        const buttonColors = [0x4ecca3, 0xff6b6b]; // Modern mint green and coral red
        
        buttonPositions.forEach((position, index) => {
            // Create modern button with gradient effect using canvas
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
            const buttonGeometry = new THREE.CircleGeometry(buttonSize / 2, 32);
            const buttonMaterial = new THREE.MeshBasicMaterial({
                map: buttonTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
            button.position.copy(position);
            button.renderOrder = 1002;
            button.userData = {
                type: 'button',
                action: buttonActions[index],
                isInteractive: true
            };
            
            // Add button to panel
            controlPanel.add(button);
            
            // Create a modern icon for the button
            const iconTexture = createButtonIcon(index);
            const iconGeometry = new THREE.CircleGeometry(buttonSize * 0.3, 32); // Icon slightly smaller than button
            const iconMaterial = new THREE.MeshBasicMaterial({
                map: iconTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
            iconMesh.position.z = 0.001;
            iconMesh.renderOrder = 1003;
            button.add(iconMesh);
            
            // Create a label beneath the button
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 128;
            labelCanvas.height = 32;
            const labelCtx = labelCanvas.getContext('2d');
            
            // Add subtle shadow to text for better readability
            labelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            labelCtx.shadowBlur = 4;
            labelCtx.shadowOffsetX = 1;
            labelCtx.shadowOffsetY = 1;
            
            labelCtx.fillStyle = '#ffffff';
            labelCtx.font = '600 18px Inter, SF Pro Display, Arial'; // Modern font, slightly bolder
            labelCtx.textAlign = 'center';
            labelCtx.textBaseline = 'middle';
            labelCtx.fillText(index === 0 ? 'New Screen' : 'Delete', labelCanvas.width / 2, labelCanvas.height / 2);
            labelCtx.shadowBlur = 0; // Reset shadow
            
            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelGeometry = new THREE.PlaneGeometry(buttonSize * 1.8, buttonSize * 0.6);
            const labelMaterial = new THREE.MeshBasicMaterial({
                map: labelTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
            labelMesh.position.set(0, -buttonSize * 0.8, 0.002);
            labelMesh.renderOrder = 1003;
            button.add(labelMesh);
        });
        
        // Add positioning and interaction
        controlPanel.position.set(0, -0.3, -0.5);
        controlPanel.rotation.set(-0.2, 0, 0);
        
        // Add to scene safely
        if (scene) {
            console.log("Adding control panel to scene");
            scene.add(controlPanel);
        } else {
            console.error("Cannot add control panel to scene: scene is undefined");
        }
        
        // Add screen type selector below the main panel
        createScreenTypeSelector(controlPanel, 0, -0.08, 0.04, scene);
        
        return controlPanel;
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
        // Get scene reference
        const scene = sceneRef || window.arScene;
        
        if (!scene) {
            console.error("Cannot create virtual keyboard: scene is undefined");
            return null;
        }
        
        console.log("Creating virtual keyboard with scene:", scene);
        
        // Create keyboard group
        virtualKeyboard = new THREE.Group();
        virtualKeyboard.name = "virtualKeyboard";
        
        // Define keyboard layout
        const layout = [
            '1234567890',
            'QWERTYUIOP',
            'ASDFGHJKL',
            'ZXCVBNM_.',
            '⌫ SPACE ENTER'
        ];
        
        // Keyboard dimensions
        const keyboardWidth = 0.6;
        const keyboardHeight = 0.3;
        const rows = layout.length;
        const keyPadding = 0.005;
        
        // Calculate key size
        const rowWidths = layout.map(row => row.length);
        const maxCols = Math.max(...rowWidths);
        const keyWidth = (keyboardWidth - (keyPadding * (maxCols + 1))) / maxCols;
        const keyHeight = (keyboardHeight - (keyPadding * (rows + 1))) / rows;
        
        // Create keyboard background
        const bgGeometry = new THREE.PlaneGeometry(keyboardWidth, keyboardHeight);
        const bgTexture = createKeyboardBackground(keyboardWidth * 500, keyboardHeight * 500);
        const bgMaterial = new THREE.MeshBasicMaterial({
            map: bgTexture,
            transparent: true,
            opacity: 0.9
        });
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        virtualKeyboard.add(background);
        
        // Create keys
        layout.forEach((row, rowIndex) => {
            const rowWidth = row.length * keyWidth + (row.length + 1) * keyPadding;
            const rowStartX = -keyboardWidth / 2 + (keyboardWidth - rowWidth) / 2 + keyWidth / 2 + keyPadding;
            
            [...row].forEach((key, colIndex) => {
                // Special handling for space and other special keys
                let keyLabel = key;
                let keyTextWidth = keyWidth;
                let specialKeyWidth = keyWidth;
                
                if (key === ' ') {
                    // Space key
                    keyLabel = 'SPACE';
                    specialKeyWidth = keyWidth * 5;
                } else if (key === '⌫') {
                    // Backspace key
                    keyLabel = '⌫';
                    specialKeyWidth = keyWidth * 1.5;
                } else if (key === 'ENTER') {
                    // Enter key
                    specialKeyWidth = keyWidth * 2;
                }
                
                // Calculate key position
                let posX = rowStartX + colIndex * (keyWidth + keyPadding);
                
                // Adjust for special key widths
                if (key === 'SPACE' && colIndex > 0) {
                    posX += (specialKeyWidth - keyWidth) / 2;
                } else if (key === 'ENTER' && colIndex > 0) {
                    posX += (specialKeyWidth - keyWidth) / 2;
                }
                
                const posY = keyboardHeight / 2 - keyHeight / 2 - rowIndex * (keyHeight + keyPadding) - keyPadding;
                
                const keyGeometry = new THREE.PlaneGeometry(
                    key === 'SPACE' || key === 'ENTER' || key === '⌫' ? specialKeyWidth : keyWidth,
                    keyHeight
                );
                
                const keyTexture = createKeyTexture(keyLabel, keyLabel === 'SPACE' ? specialKeyWidth * 300 : keyWidth * 300, keyHeight * 300);
                const keyMaterial = new THREE.MeshBasicMaterial({
                    map: keyTexture,
                    transparent: true
                });
                
                const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
                keyMesh.position.set(posX, posY, 0.001);
                
                // Add user data for interaction
                keyMesh.userData = {
                    type: 'key',
                    key: key === 'SPACE' ? ' ' : key,
                    label: keyLabel,
                    originalPosition: new THREE.Vector3(posX, posY, 0.001)
                };
                
                virtualKeyboard.add(keyMesh);
            });
        });
        
        // Create a simple label for the output display
        const labelGeometry = new THREE.PlaneGeometry(keyboardWidth - keyPadding * 2, keyHeight);
        const labelTexture = createOutputDisplay(keyboardWidth * 500 - keyPadding * 2 * 500, keyHeight * 300);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true
        });
        
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.z = 0.001;
        keyMesh.add(labelMesh);
        
        // Hide keyboard initially
        virtualKeyboard.visible = false;
        
        // Add to scene
        if (scene && scene.add) {
            scene.add(virtualKeyboard);
            console.log("Virtual keyboard added to scene");
        } else {
            console.error("Cannot add virtual keyboard: scene is invalid");
        }
        
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

// Create a button with given parameters
export function createButton(options = {}) {
    const {
        parent,
        position = new THREE.Vector3(0, 0, 0),
        width = 0.2,
        height = 0.05,
        label = 'Button',
        onClick = null,
        color = 0x4285f4,
        hoverColor = 0x5a95f5,
        textColor = 0xffffff
    } = options;
    
    if (!parent) {
        console.error("Parent object is required for createButton");
        return null;
    }
    
    // Create button group
    const buttonGroup = new THREE.Group();
    buttonGroup.position.copy(position);
    
    // Create button background with rounded corners using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw button background with gradient
    const cornerRadius = Math.min(20, canvas.height / 4);
    
    // Convert THREE.Color to RGB format
    const buttonColor = new THREE.Color(color);
    const r = Math.floor(buttonColor.r * 255);
    const g = Math.floor(buttonColor.g * 255);
    const b = Math.floor(buttonColor.b * 255);
    
    // Draw a solid base color first (important for hit detection)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, cornerRadius);
    
    // Add gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(255, 255, 255, 0.2)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, 0.1)`);
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, cornerRadius);
    
    // Add subtle border
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 2;
    roundRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, cornerRadius, false, true);
    
    // Add text
    ctx.fillStyle = `rgb(${textColor})`;
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    
    // Create button geometry and material
    const buttonGeometry = new THREE.PlaneGeometry(width, height);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create button mesh
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.renderOrder = 1000;
    
    // Add user data for interaction
    button.userData = {
        type: 'button',
        action: 'customButton',
        originalColor: color,
        hoverColor: hoverColor,
        isHovered: false,
        isPressed: false,
        isToggle: false,
        isActive: true,
        onClick: onClick
    };
    
    // Add to group
    buttonGroup.add(button);
    
    // Add to parent
    parent.add(buttonGroup);
    
    return buttonGroup;
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