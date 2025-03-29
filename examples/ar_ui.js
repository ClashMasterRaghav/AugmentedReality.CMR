// UI elements and controls for AR experience
import * as THREE from 'three';
import { scene, camera, renderer, controller } from './ar_core.js';
import { createNewBrowserScreen, screens, selectScreen } from './ar_screens.js';

// Global UI elements
export let controlPanel;
export let virtualKeyboard;

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

// Create a minimalist control panel with buttons
export function createControlPanel() {
    // Create panel group
    controlPanel = new THREE.Group();
    
    // Panel background - fully opaque now
    const panelSize = { width: 0.25, height: 0.15 };
    const panelGeometry = new THREE.PlaneGeometry(panelSize.width, panelSize.height);
    const panelMaterial = new THREE.MeshBasicMaterial({
        color: 0x111111,
        transparent: false, // Make fully opaque
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    controlPanel.add(panelMesh);
    
    // Add stronger glow effect around the panel
    const glowGeometry = new THREE.PlaneGeometry(panelSize.width + 0.02, panelSize.height + 0.02);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ccff,
        transparent: true,
        opacity: 0.7, // Increased opacity for better visibility
        side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.001;
    controlPanel.add(glowMesh);
    
    // Define button parameters
    const buttonSize = 0.06; // Larger buttons for touch
    const buttonSpacing = 0.08;
    
    // Create buttons - only 3 buttons: New Screen, Move, and Rotate
    const buttonPositions = [
        { x: -buttonSpacing, y: 0 },  // Left - New Screen
        { x: 0, y: 0 },               // Center - Move
        { x: buttonSpacing, y: 0 }    // Right - Rotate
    ];
    
    const buttonActions = ['newScreen', 'moveScreen', 'rotateScreen'];
    const buttonColors = [0x2196F3, 0x777777, 0x777777]; // Blue, Grey, Grey
    
    buttonPositions.forEach((position, index) => {
        // Create button mesh with circle geometry for better touch targeting
        const buttonGeometry = new THREE.CircleGeometry(buttonSize / 2, 32);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            color: buttonColors[index],
            transparent: true,
            opacity: 1.0, // Full opacity for buttons
            side: THREE.DoubleSide
        });
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.position.set(position.x, position.y, 0.001);
        button.userData = {
            type: 'button',
            action: buttonActions[index],
            hoverColor: 0x4FC3F7,
            activeColor: index === 0 ? 0x2196F3 : 0x44cc88, // New button is blue, others green when active
            inactiveColor: 0x777777,
            originalColor: buttonColors[index],
            isToggle: index > 0, // Move and Rotate are toggles
            isActive: index === 0 // Only New Screen starts as active
        };
        
        controlPanel.add(button);
        
        // Add icon to button using canvas texture
        const iconTexture = createButtonIcon(index);
        const iconSize = buttonSize * 0.8; // Larger icon
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.002;
        button.add(iconMesh);
        
        // Add subtle shadow/depth effect
        const buttonShadowGeometry = new THREE.CircleGeometry(buttonSize / 2 + 0.002, 32);
        const buttonShadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const buttonShadow = new THREE.Mesh(buttonShadowGeometry, buttonShadowMaterial);
        buttonShadow.position.z = -0.001;
        button.add(buttonShadow);
    });
    
    // Add control panel to scene
    controlPanel.position.set(0, -0.25, -0.5);
    controlPanel.userData = { 
        type: 'controlPanel',
        // Store references to button states for easy access
        buttonStates: {
            isMoveModeActive: false,
            isRotateModeActive: false
        }
    };
    
    // Make the control panel follow the camera
    controlPanel.userData.update = function() {
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        const position = new THREE.Vector3();
        position.copy(camera.position).add(cameraDirection.multiplyScalar(-0.5));
        
        // Position below the camera view
        position.y -= 0.15;
        
        this.position.copy(position);
        this.quaternion.copy(camera.quaternion);
        
        // Update button states
        const buttons = this.children.filter(child => 
            child.userData && child.userData.type === 'button');
        
        buttons.forEach(button => {
            if (button.userData.action === 'moveScreen') {
                if (button.userData.isActive !== isMoveModeActive) {
                    button.userData.isActive = isMoveModeActive;
                    button.material.color.set(isMoveModeActive ? 
                        button.userData.activeColor : 
                        button.userData.inactiveColor);
                }
            } else if (button.userData.action === 'rotateScreen') {
                if (button.userData.isActive !== isRotateModeActive) {
                    button.userData.isActive = isRotateModeActive;
                    button.material.color.set(isRotateModeActive ? 
                        button.userData.activeColor : 
                        button.userData.inactiveColor);
                }
            }
        });
    };
    
    scene.add(controlPanel);
}

// Create button icons using canvas textures
function createButtonIcon(buttonIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up shared styling
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8; // Thicker lines for visibility
    ctx.lineCap = 'round';
    
    // Draw different icons based on button index
    switch(buttonIndex) {
        case 0: // New Screen icon - Plus symbol
            ctx.beginPath();
            ctx.moveTo(35, 64);
            ctx.lineTo(93, 64);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(64, 35);
            ctx.lineTo(64, 93);
            ctx.stroke();
            break;
            
        case 1: // Move icon - Four arrows
            ctx.beginPath();
            // Left arrow
            ctx.moveTo(25, 64);
            ctx.lineTo(45, 64);
            ctx.moveTo(35, 54);
            ctx.lineTo(25, 64);
            ctx.lineTo(35, 74);
            
            // Right arrow
            ctx.moveTo(103, 64);
            ctx.lineTo(83, 64);
            ctx.moveTo(93, 54);
            ctx.lineTo(103, 64);
            ctx.lineTo(93, 74);
            
            // Up arrow
            ctx.moveTo(64, 25);
            ctx.lineTo(64, 45);
            ctx.moveTo(54, 35);
            ctx.lineTo(64, 25);
            ctx.lineTo(74, 35);
            
            // Down arrow
            ctx.moveTo(64, 103);
            ctx.lineTo(64, 83);
            ctx.moveTo(54, 93);
            ctx.lineTo(64, 103);
            ctx.lineTo(74, 93);
            
            ctx.stroke();
            break;
            
        case 2: // Rotate icon - Circular arrows for X and Y rotation
            ctx.beginPath();
            // X-axis rotation (horizontal oval)
            ctx.save();
            ctx.scale(1.5, 0.8);
            ctx.arc(64/1.5, 64/0.8, 20, 0, 2 * Math.PI);
            ctx.restore();
            ctx.stroke();
            
            // Y-axis rotation (vertical oval)
            ctx.beginPath();
            ctx.save();
            ctx.scale(0.8, 1.5);
            ctx.arc(64/0.8, 64/1.5, 20, 0, 2 * Math.PI);
            ctx.restore();
            ctx.stroke();
            
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(100, 64);
            ctx.lineTo(90, 54);
            ctx.lineTo(90, 74);
            ctx.fill();
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