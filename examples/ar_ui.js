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

// Initialize UI elements
export function initUI() {
    createControlPanel();
    createVirtualKeyboard();
}

// Create a control panel with buttons
export function createControlPanel() {
    // Create panel group
    controlPanel = new THREE.Group();
    
    // Panel background
    const panelSize = { width: 0.2, height: 0.2 };
    const panelGeometry = new THREE.PlaneGeometry(panelSize.width, panelSize.height);
    const panelMaterial = new THREE.MeshBasicMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    controlPanel.add(panelMesh);
    
    // Add glow effect around the panel
    const glowGeometry = new THREE.PlaneGeometry(panelSize.width + 0.02, panelSize.height + 0.02);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.001;
    controlPanel.add(glowMesh);
    
    // Define button parameters
    const buttonSize = 0.05;
    const buttonMargin = 0.015;
    const buttonPositions = [
        { x: -0.05, y: 0.05 },  // Top left - New Screen
        { x: 0.05, y: 0.05 },   // Top right - Move
        { x: -0.05, y: -0.05 }, // Bottom left - Rotate
        { x: 0.05, y: -0.05 }   // Bottom right - Resize
    ];
    
    // Create buttons
    const buttonNames = ['New Screen', 'Move', 'Rotate', 'Resize'];
    const buttonColors = [0x2196F3, 0x777777, 0x777777, 0x777777];
    const buttons = [];
    
    buttonPositions.forEach((position, index) => {
        // Create button mesh
        const buttonGeometry = new THREE.CircleGeometry(buttonSize / 2, 32);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            color: buttonColors[index],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.position.set(position.x, position.y, 0.001);
        button.userData = {
            type: 'button',
            name: buttonNames[index],
            hoverColor: 0x4FC3F7,
            originalColor: buttonColors[index],
            isActive: index === 0 // Only New Screen starts as active
        };
        
        controlPanel.add(button);
        buttons.push(button);
        
        // Add icon to button using canvas texture
        const iconTexture = createButtonIcon(index);
        const iconSize = buttonSize * 0.7;
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.002;
        button.add(iconMesh);
    });
    
    // Add control panel to scene
    controlPanel.position.set(0, -0.15, -0.5);
    controlPanel.userData = { type: 'controlPanel' };
    
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
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // Draw different icons based on button index
    switch(buttonIndex) {
        case 0: // New Screen icon - Plus symbol
            ctx.beginPath();
            ctx.moveTo(40, 64);
            ctx.lineTo(88, 64);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(64, 40);
            ctx.lineTo(64, 88);
            ctx.stroke();
            break;
            
        case 1: // Move icon - Four arrows
            ctx.beginPath();
            // Left arrow
            ctx.moveTo(30, 64);
            ctx.lineTo(50, 64);
            ctx.moveTo(40, 54);
            ctx.lineTo(30, 64);
            ctx.lineTo(40, 74);
            
            // Right arrow
            ctx.moveTo(98, 64);
            ctx.lineTo(78, 64);
            ctx.moveTo(88, 54);
            ctx.lineTo(98, 64);
            ctx.lineTo(88, 74);
            
            // Up arrow
            ctx.moveTo(64, 30);
            ctx.lineTo(64, 50);
            ctx.moveTo(54, 40);
            ctx.lineTo(64, 30);
            ctx.lineTo(74, 40);
            
            // Down arrow
            ctx.moveTo(64, 98);
            ctx.lineTo(64, 78);
            ctx.moveTo(54, 88);
            ctx.lineTo(64, 98);
            ctx.lineTo(74, 88);
            
            ctx.stroke();
            break;
            
        case 2: // Rotate icon - Circular arrow
            ctx.beginPath();
            ctx.arc(64, 64, 30, 0, 1.75 * Math.PI);
            ctx.stroke();
            
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(64, 34);
            ctx.lineTo(54, 44);
            ctx.lineTo(74, 44);
            ctx.fill();
            break;
            
        case 3: // Resize icon - Expand/contract arrows
            ctx.beginPath();
            // Top-left to bottom-right arrow
            ctx.moveTo(40, 40);
            ctx.lineTo(88, 88);
            ctx.stroke();
            
            // Arrow heads
            ctx.beginPath();
            ctx.moveTo(40, 40);
            ctx.lineTo(40, 55);
            ctx.lineTo(55, 40);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(88, 88);
            ctx.lineTo(88, 73);
            ctx.lineTo(73, 88);
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