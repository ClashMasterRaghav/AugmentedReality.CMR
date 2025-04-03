// UI elements and controls for AR experience
import * as THREE from 'three';
import { createRoundedRectTexture, createGlowTexture, loadTexture } from './ar_utils.js';

// Global UI elements
export let controlPanel = null;
export let virtualKeyboard = null;

// UI interaction states
export let isMoveModeActive = false;
export let isRotateModeActive = false;
export let isResizeModeActive = false;

// Initialize UI elements
export function initUI() {
    // Control panel will be created by setupControlPanel
    createVirtualKeyboard();
}

// Create a control panel
export function createControlPanel() {
    // If a control panel already exists, don't create another one
    if (controlPanel && window.scene && window.scene.children.includes(controlPanel)) {
        console.log("Control panel already exists - not creating a new one");
        return controlPanel;
    }
    
    console.log("Creating control panel");
    controlPanel = new THREE.Group();
    controlPanel.name = "controlPanel";
    controlPanel.userData = {
        type: 'controlPanel',
        isDragging: false,
        manuallyPositioned: false
    };
    
    // Panel dimensions
    const panelWidth = 0.6;
    const panelHeight = 0.4;
    
    // Create a rounded rectangle texture for the panel
    const panelTexture = createRoundedRectTexture(
        512, 512, 
        30,
        'rgba(10, 20, 40, 0.85)',
        'rgba(30, 80, 140, 0.9)',
        3,
        'rgba(70, 140, 230, 1.0)'
    );
    
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
    });
    
    // Create a background glow effect
    const glowSize = 40;
    const glowTexture = createGlowTexture(
        512 + glowSize*2, 
        512 + glowSize*2, 
        'rgba(60, 140, 230, 0.25)'
    );
    
    const glowMaterial = new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
    });
    
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    
    // Add glow behind panel
    const glowGeometry = new THREE.PlaneGeometry(panelWidth * 1.2, panelHeight * 1.2);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.005;
    
    controlPanel.add(glowMesh);
    controlPanel.add(panelMesh);
    
    // Set render order for proper visibility
    panelMesh.renderOrder = 1000;
    glowMesh.renderOrder = 999;
    
    // Add buttons to control panel
    const buttonSize = panelHeight / 6;
    const smallButtonSize = buttonSize * 1.3;
    const spacing = smallButtonSize * 2.1;
    
    // Add the screen type buttons at the bottom of the panel
    const buttonY = -panelHeight/2 + smallButtonSize * 1.2;
    const buttonStartX = -spacing * 1.5;
    
    // Create YouTube button
    const youtubeIcon = loadTexture('examples/textures/ar_icons/youtube.png');
    createUIButton(
        controlPanel,
        'YouTube',
        buttonStartX, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'youtube' },
        youtubeIcon
    );
    
    // Create Search button
    const searchIcon = loadTexture('examples/textures/ar_icons/DuckDuckGo_logo.png');
    createUIButton(
        controlPanel,
        'Search',
        buttonStartX + spacing, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'duckduckgo' },
        searchIcon
    );
    
    // Create Maps button
    const mapsIcon = loadTexture('examples/textures/ar_icons/satellite-earth.png');
    createUIButton(
        controlPanel,
        'Maps',
        buttonStartX + spacing * 2, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'googlemapssatellite' },
        mapsIcon
    );
    
    // Create App button
    const appIcon = loadTexture('examples/textures/ar_icons/app-window.png');
    createUIButton(
        controlPanel,
        'App',
        buttonStartX + spacing * 3, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'electronapp' },
        appIcon
    );
    
    // Add the Add and Delete buttons at the top of the panel
    const topButtonY = panelHeight/2 - smallButtonSize * 1.2;
    
    // Create Add button
    const addIcon = loadTexture('examples/textures/ar_icons/plus.png');
    createUIButton(
        controlPanel,
        'Add',
        buttonStartX + spacing * 0.5, 
        topButtonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'addScreen' },
        addIcon
    );
    
    // Create Delete button
    const deleteIcon = loadTexture('examples/textures/ar_icons/trash.png');
    createUIButton(
        controlPanel,
        'Delete',
        buttonStartX + spacing * 2.5, 
        topButtonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'deleteScreen' },
        deleteIcon
    );
    
    // Add control panel to scene
    if (window.scene) {
        window.scene.add(controlPanel);
    }
    
    console.log("Control panel created successfully");
    
    return controlPanel;
}

// Create a button for UI
export function createUIButton(parent, label, x, y, size, action, actionData, iconTexture = null) {
    // Create button geometry
    const buttonGeometry = new THREE.CircleGeometry(size / 2, 32);
    
    // Create button material with light background for better visibility
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.9
    });
    
    // Create button mesh
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, 0.005);
    button.renderOrder = 1001;
    
    // Store button action data
    button.userData = {
        type: 'button',
        action: action,
        actionData: actionData,
        label: label,
        originalColor: 0x666666,
        hoverColor: 0x999999,
        isToggle: false,
        isActive: false
    };
    
    // Add icon if provided
    if (iconTexture) {
        const iconSize = size * 0.7;
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            depthWrite: false
        });
        
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.renderOrder = 1002;
        button.add(iconMesh);
    }
    
    // Add label text below button
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128;
    labelCanvas.height = 32;
    const labelContext = labelCanvas.getContext('2d');
    
    // Draw text with shadow for better visibility
    labelContext.fillStyle = '#ffffff';
    labelContext.font = 'bold 16px Arial';
    labelContext.textAlign = 'center';
    labelContext.textBaseline = 'middle';
    
    // Add shadow for better contrast
    labelContext.shadowColor = 'rgba(0, 0, 0, 0.7)';
    labelContext.shadowBlur = 4;
    labelContext.shadowOffsetX = 1;
    labelContext.shadowOffsetY = 1;
    
    labelContext.fillText(label, 64, 16);
    
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelGeometry = new THREE.PlaneGeometry(size * 1.2, size * 0.4);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        depthWrite: false
    });
    
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.set(0, -size * 0.7, 0);
    labelMesh.renderOrder = 1003;
    button.add(labelMesh);
    
    // Add button to parent
    parent.add(button);
    
    return button;
}

// Create a virtual keyboard
export function createVirtualKeyboard() {
    if (virtualKeyboard) {
        console.log("Virtual keyboard already exists");
        return virtualKeyboard;
    }
    
    console.log("Creating virtual keyboard");
    virtualKeyboard = new THREE.Group();
    virtualKeyboard.name = "virtualKeyboard";
    
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
    if (window.scene) {
        window.scene.add(virtualKeyboard);
    }
    
    return virtualKeyboard;
}

// Toggle mode buttons (move, rotate, resize)
export function toggleModeButton(mode) {
    if (!controlPanel) return;
    
    const buttons = controlPanel.children.filter(child => 
        child.userData && child.userData.type === 'button');
    
    let buttonIndex;
    let isActive = false;
    
    switch(mode) {
        case 'move':
            buttonIndex = 1;
            isMoveModeActive = !isMoveModeActive;
            isActive = isMoveModeActive;
            isRotateModeActive = false;
            isResizeModeActive = false;
            break;
        case 'rotate':
            buttonIndex = 2;
            isRotateModeActive = !isRotateModeActive;
            isActive = isRotateModeActive;
            isMoveModeActive = false;
            isResizeModeActive = false;
            break;
        case 'resize':
            buttonIndex = 3;
            isResizeModeActive = !isResizeModeActive;
            isActive = isResizeModeActive;
            isMoveModeActive = false;
            isRotateModeActive = false;
            break;
    }
    
    if (buttonIndex !== undefined && buttons[buttonIndex]) {
        const button = buttons[buttonIndex];
        
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

// Setup the control panel position
export function setupControlPanel() {
    // Don't try to set up control panel if no camera or scene
    if (!window.camera || !window.scene) {
        console.log("Cannot setup control panel - camera or scene not initialized");
        return;
    }
    
    // Remove existing control panel if it exists
    const existingPanels = window.scene.children.filter(obj => 
        obj.userData && obj.userData.type === 'controlPanel');
    
    if (existingPanels.length > 0) {
        console.log(`Found ${existingPanels.length} control panel(s), removing all and creating a fresh one`);
        existingPanels.forEach(panel => {
            window.scene.remove(panel);
        });
        controlPanel = null;
    }
    
    // Create a new control panel
    createControlPanel();
    
    // Position the control panel in front of the camera
    if (controlPanel) {
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(window.camera.quaternion);
        
        // Position panel in front of camera
        const targetPosition = new THREE.Vector3();
        targetPosition.copy(window.camera.position).addScaledVector(cameraDirection, 0.5);
        
        // Position slightly below center view for better ergonomics
        targetPosition.y = window.camera.position.y - 0.2;
        
        // Apply position
        controlPanel.position.copy(targetPosition);
        
        // Make panel face the camera
        controlPanel.lookAt(window.camera.position);
        
        // Keep panel upright (no tilt or roll)
        const euler = new THREE.Euler().setFromQuaternion(controlPanel.quaternion);
        euler.x = 0;
        euler.z = 0;
        controlPanel.quaternion.setFromEuler(euler);
        
        console.log("Control panel positioned at:", 
            controlPanel.position.x.toFixed(2), 
            controlPanel.position.y.toFixed(2), 
            controlPanel.position.z.toFixed(2)
        );
    }
}

// Add gentle floating animation to the control panel
export function floatAnimation() {
    if (!controlPanel) return;
    
    const time = Date.now();
    
    // Subtle floating effect
    const amplitude = 0.00003;
    controlPanel.position.y += Math.sin(time * 0.001) * amplitude;
    
    // Update glow effect
    const glowMesh = controlPanel.children.find(child => 
        child.material && child.material.blending === THREE.AdditiveBlending);
    
    if (glowMesh) {
        glowMesh.material.opacity = 0.03 + Math.sin(time * 0.0005) * 0.01;
    }
} 