// UI elements and controls for AR experience
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
export function initUI() {
    createControlPanel();
    createVirtualKeyboard();
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
    scene.add(notificationMesh);
    
    // Remove after timeout
    setTimeout(() => {
        scene.remove(notificationMesh);
        material.dispose();
        geometry.dispose();
        texture.dispose();
    }, 3000);
}

// Create a minimalist control panel with modern design
export function createControlPanel() {
    // Create panel group
    controlPanel = new THREE.Group();
    
    // Modern, sleek panel design with solid appearance
    const panelSize = { width: 0.28, height: 0.13 };
    const panelGeometry = new THREE.PlaneGeometry(panelSize.width, panelSize.height);
    
    // Create rounded panel texture with high-quality design
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 512;
    panelCanvas.height = 256;
    const panelCtx = panelCanvas.getContext('2d');
    
    // Draw rounded rectangle with flat design
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
    
    // Solid color with slight gradient for depth
    const gradient = panelCtx.createLinearGradient(0, 0, 0, panelCanvas.height);
    gradient.addColorStop(0, '#1E1E2F'); // Dark blue-gray at top
    gradient.addColorStop(1, '#121420'); // Even darker at bottom
    panelCtx.fillStyle = gradient;
    panelCtx.fill();
    
    // Add subtle pattern for texture
    panelCtx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * panelCanvas.width;
        const y = Math.random() * panelCanvas.height;
        const size = Math.random() * 2 + 0.5;
        panelCtx.beginPath();
        panelCtx.arc(x, y, size, 0, Math.PI * 2);
        panelCtx.fill();
    }
    
    // Add sleek accent border
    panelCtx.strokeStyle = 'rgba(75, 0, 130, 0.8)'; // Deep purple border
    panelCtx.lineWidth = 4;
    panelCtx.stroke();
    
    // Add "AR CONTROLS" text as panel title
    panelCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    panelCtx.font = 'bold 24px Arial';
    panelCtx.textAlign = 'center';
    panelCtx.fillText('AR CONTROLS', panelCanvas.width/2, 50);
    
    // Create texture from canvas
    const panelTexture = new THREE.CanvasTexture(panelCanvas);
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: false, // Fully opaque
        side: THREE.DoubleSide
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    controlPanel.add(panelMesh);
    
    // Create an edge highlight for depth
    const edgeGeometry = new THREE.PlaneGeometry(panelSize.width + 0.003, panelSize.height + 0.003);
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x8a2be2, // Deep purple
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edgeMesh.position.z = -0.001;
    controlPanel.add(edgeMesh);
    
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
    fullPanelDrag.userData = {
        type: 'dragHandle',
        isDragArea: true,
        originalColor: 0xffffff,
        hoverColor: 0xffffff
    };
    controlPanel.add(fullPanelDrag);
    
    // Define button parameters - preserve original functionality
    const buttonSize = 0.055;
    const buttonSpacing = 0.10;
    
    // Create buttons - MOVED INSIDE THE PANEL
    const buttonPositions = [
        { x: -buttonSpacing/2, y: 0.01 },  // Left - Add Screen - moved up
        { x: buttonSpacing/2, y: 0.01 }    // Right - Delete Screen - moved up
    ];
    
    const buttonActions = ['newScreen', 'deleteScreen'];
    const buttonColors = [0x03DAC5, 0xCF6679]; // Modern Material Design colors - teal and red
    
    buttonPositions.forEach((position, index) => {
        // Create modern 3D-looking button
        const buttonGeometry = new THREE.CircleGeometry(buttonSize / 2, 32);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            color: buttonColors[index],
            transparent: false, // Fully opaque
            side: THREE.DoubleSide
        });
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.position.set(position.x, position.y, 0.003);
        button.renderOrder = 100;
        button.userData = {
            type: 'button',
            action: buttonActions[index],
            hoverColor: index === 0 ? 0x66F0E5 : 0xFF97A2, // Lighter teal, lighter pink
            activeColor: buttonColors[index],
            inactiveColor: buttonColors[index],
            originalColor: buttonColors[index],
            isToggle: false,
            isActive: true
        };
        
        controlPanel.add(button);
        
        // Add icon with same functionality as before
        const iconTexture = createButtonIcon(index);
        const iconSize = buttonSize * 0.7;
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.004;
        iconMesh.renderOrder = 101;
        button.add(iconMesh);
        
        // Add button shadow for depth
        const shadowGeometry = new THREE.CircleGeometry(buttonSize / 2 * 1.1, 32);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowMesh.position.z = -0.001;
        button.add(shadowMesh);
        
        // Add subtle highlight on top edge of button for 3D effect
        const highlightGeometry = new THREE.RingGeometry(buttonSize/2 * 0.7, buttonSize/2, 32, 1, 0, Math.PI);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlightMesh.rotation.z = Math.PI;
        highlightMesh.position.z = 0.0015;
        button.add(highlightMesh);
        
        // Add label below each button - same as before
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 32;
        const labelCtx = labelCanvas.getContext('2d');
        
        labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = 'bold 16px Arial';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        labelCtx.fillText(index === 0 ? 'New Screen' : 'Delete', labelCanvas.width / 2, labelCanvas.height / 2);
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(buttonSize * 1.5, buttonSize * 0.5);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.set(0, -buttonSize * 0.8, 0.003);
        labelMesh.renderOrder = 100;
        button.add(labelMesh);
        
        // Remove pulse animation for delete button
    });
    
    // Position control panel
    controlPanel.position.set(0, 0, -0.5);
    
    // Add user data for interactivity
    controlPanel.userData = {
        type: 'controlPanel',
        isDragging: false
    };
    
    // Make panel face user initially
    controlPanel.lookAt(camera.position);
    
    // No floating animation - solid and stable appearance
    
    scene.add(controlPanel);
    
    console.log("Modern control panel created with buttons:", buttonActions);
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
    ctx.lineWidth = 12; // Thicker lines for better visibility
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw different icons based on button index
    switch(buttonIndex) {
        case 0: // New Screen icon - Plus symbol with circle
            // Draw circle
            ctx.beginPath();
            ctx.arc(128, 128, 90, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.stroke();
            
            // Draw plus
            ctx.beginPath();
            ctx.moveTo(80, 128);
            ctx.lineTo(176, 128);
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(128, 80);
            ctx.lineTo(128, 176);
            ctx.stroke();
            break;
            
        case 1: // Delete Screen icon - Modern trash can
            // Draw trash can body with rounded corners
            ctx.beginPath();
            ctx.moveTo(90, 90);
            ctx.lineTo(90, 190);
            ctx.quadraticCurveTo(90, 200, 100, 200);
            ctx.lineTo(156, 200);
            ctx.quadraticCurveTo(166, 200, 166, 190);
            ctx.lineTo(166, 90);
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            
            // Draw lid
            ctx.beginPath();
            ctx.moveTo(80, 90);
            ctx.lineTo(176, 90);
            ctx.stroke();
            
            // Draw handle
            ctx.beginPath();
            ctx.moveTo(110, 90);
            ctx.lineTo(110, 70);
            ctx.quadraticCurveTo(110, 60, 120, 60);
            ctx.lineTo(136, 60);
            ctx.quadraticCurveTo(146, 60, 146, 70);
            ctx.lineTo(146, 90);
            ctx.stroke();
            
            // Draw lines inside trash can
            ctx.lineWidth = 8; // Thinner lines for interior
            ctx.beginPath();
            ctx.moveTo(110, 110);
            ctx.lineTo(110, 175);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(128, 110);
            ctx.lineTo(128, 175);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(146, 110);
            ctx.lineTo(146, 175);
            ctx.stroke();
            break;
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Create a virtual keyboard
export function createVirtualKeyboard() {
    virtualKeyboard = new THREE.Group();
    
    // Keyboard background
    const keyboardGeometry = new THREE.PlaneGeometry(0.8, 0.3);
    const keyboardMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const keyboardMesh = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    virtualKeyboard.add(keyboardMesh);
    
    // Add glow border
    const borderGeometry = new THREE.PlaneGeometry(0.82, 0.32);
    const borderMaterial = new THREE.MeshBasicMaterial({
        color: 0x4FC3F7,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    borderMesh.position.z = -0.001;
    virtualKeyboard.add(borderMesh);
    
    // Create keys
    const keyRows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '.'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '?', '!']
    ];
    
    const keySize = 0.07;
    const keyMargin = 0.005;
    const rowOffsetY = 0.12;
    
    keyRows.forEach((row, rowIndex) => {
        const offsetY = rowOffsetY - (rowIndex * (keySize + keyMargin));
        
        row.forEach((key, keyIndex) => {
            // Calculate key position
            const offsetX = -0.36 + (keyIndex * (keySize + keyMargin));
            
            // Create key background
            const keyGeometry = new THREE.PlaneGeometry(keySize, keySize);
            const keyMaterial = new THREE.MeshBasicMaterial({
                color: 0x555555,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
            keyMesh.position.set(offsetX, offsetY, 0.001);
            keyMesh.userData = {
                type: 'key',
                value: key
            };
            virtualKeyboard.add(keyMesh);
            
            // Create key label
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 64;
            labelCanvas.height = 64;
            const labelCtx = labelCanvas.getContext('2d');
            labelCtx.fillStyle = '#ffffff';
            labelCtx.font = 'bold 48px Arial';
            labelCtx.textAlign = 'center';
            labelCtx.textBaseline = 'middle';
            labelCtx.fillText(key, 32, 32);
            
            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelGeometry = new THREE.PlaneGeometry(keySize * 0.8, keySize * 0.8);
            const labelMaterial = new THREE.MeshBasicMaterial({
                map: labelTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
            labelMesh.position.z = 0.001;
            keyMesh.add(labelMesh);
        });
    });
    
    // Add special keys
    const specialKeys = [
        { label: '⌫', value: 'Backspace', width: 0.15, x: 0.3, y: -0.12 },
        { label: '↵', value: 'Enter', width: 0.15, x: 0.3, y: 0 },
        { label: '␣', value: 'Space', width: 0.4, x: 0, y: -0.24 }
    ];
    
    specialKeys.forEach(specialKey => {
        const keyGeometry = new THREE.PlaneGeometry(specialKey.width, keySize);
        const keyMaterial = new THREE.MeshBasicMaterial({
            color: 0x2196F3,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
        keyMesh.position.set(specialKey.x, specialKey.y, 0.001);
        keyMesh.userData = {
            type: 'key',
            value: specialKey.value
        };
        virtualKeyboard.add(keyMesh);
        
        // Create key label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 64;
        labelCanvas.height = 64;
        const labelCtx = labelCanvas.getContext('2d');
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = 'bold 48px Arial';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        labelCtx.fillText(specialKey.label, 32, 32);
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(specialKey.width * 0.8, keySize * 0.8);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.z = 0.001;
        keyMesh.add(labelMesh);
    });
    
    // Hide keyboard initially
    virtualKeyboard.visible = false;
    scene.add(virtualKeyboard);
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
    
    // Only reposition if not being dragged
    if (controlPanel.userData.isDragging) return;
    
    // Position in front and below the user
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    const position = new THREE.Vector3();
    position.copy(camera.position).add(cameraDirection.multiplyScalar(-0.4)); // Closer to user (0.4m instead of 0.5m)
    
    // Position below the camera view at a comfortable height
    position.y -= 0.15;
    
    // Update panel position and rotation
    controlPanel.position.copy(position);
    controlPanel.lookAt(camera.position);
    
    // Keep panel facing the user but upright
    const euler = new THREE.Euler().setFromQuaternion(controlPanel.quaternion);
    euler.x = 0; // Keep panel upright (no tilt)
    euler.z = 0; // No roll
    controlPanel.quaternion.setFromEuler(euler);
    
    console.log("Control panel positioned in front of user");
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