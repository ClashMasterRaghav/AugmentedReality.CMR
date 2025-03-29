// UI elements and controls for AR experience
import * as THREE from 'three';
import { scene, camera, controller, renderer } from './ar_core.js';
import { createNewBrowserScreen } from './ar_screens.js';

// Export virtual keyboard reference
export let virtualKeyboard;

// Create the control panel with buttons for AR experience
export function createControlPanel() {
    const panel = new THREE.Group();
    
    // Panel background with rounded corners effect
    const panelGeometry = new THREE.PlaneGeometry(0.3, 0.25); // Increased height for more buttons
    const panelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.add(panelMesh);
    
    // Add panel border glow
    const glowGeometry = new THREE.PlaneGeometry(0.31, 0.26); // Adjusted for new panel size
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4488ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.002;
    panel.add(glowMesh);
    
    // New Screen button with improved design
    const buttonGeometry = new THREE.PlaneGeometry(0.25, 0.05);
    const buttonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4488ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const newScreenButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
    newScreenButton.position.set(0, 0.09, 0.001);
    newScreenButton.userData = { type: 'button', action: 'newScreen' };
    panel.add(newScreenButton);
    
    // New Screen button label with improved text
    const buttonCanvas = document.createElement('canvas');
    buttonCanvas.width = 256;
    buttonCanvas.height = 64;
    const btnCtx = buttonCanvas.getContext('2d');
    btnCtx.fillStyle = '#ffffff';
    btnCtx.font = 'bold 24px Arial';
    btnCtx.textAlign = 'center';
    btnCtx.textBaseline = 'middle';
    btnCtx.fillText('+ New Screen', 128, 32);
    
    const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
    const buttonLabelGeometry = new THREE.PlaneGeometry(0.24, 0.04);
    const buttonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: buttonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const buttonLabel = new THREE.Mesh(buttonLabelGeometry, buttonLabelMaterial);
    buttonLabel.position.set(0, 0.09, 0.002);
    panel.add(buttonLabel);
    
    // Move Screen button with toggle functionality
    const moveButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x44cc88,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const moveScreenButton = new THREE.Mesh(buttonGeometry, moveButtonMaterial);
    moveScreenButton.position.set(0, 0.03, 0.001);
    moveScreenButton.userData = { 
        type: 'button',
        action: 'moveScreen',
        isToggle: true,
        isActive: false
    };
    panel.add(moveScreenButton);
    
    // Move Screen button label
    const moveButtonCanvas = document.createElement('canvas');
    moveButtonCanvas.width = 256;
    moveButtonCanvas.height = 64;
    const moveBtnCtx = moveButtonCanvas.getContext('2d');
    moveBtnCtx.fillStyle = '#ffffff';
    moveBtnCtx.font = 'bold 24px Arial';
    moveBtnCtx.textAlign = 'center';
    moveBtnCtx.textBaseline = 'middle';
    moveBtnCtx.fillText('Move Screen', 128, 32);
    
    const moveButtonTexture = new THREE.CanvasTexture(moveButtonCanvas);
    const moveButtonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: moveButtonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const moveButtonLabel = new THREE.Mesh(buttonLabelGeometry, moveButtonLabelMaterial);
    moveButtonLabel.position.set(0, 0.03, 0.002);
    panel.add(moveButtonLabel);
    
    // Rotate Screen button
    const rotateButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xf39c12, // Orange color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const rotateScreenButton = new THREE.Mesh(buttonGeometry, rotateButtonMaterial);
    rotateScreenButton.position.set(0, -0.03, 0.001);
    rotateScreenButton.userData = { 
        type: 'button',
        action: 'rotateScreen',
        isToggle: true,
        isActive: false
    };
    panel.add(rotateScreenButton);
    
    // Rotate Screen button label
    const rotateButtonCanvas = document.createElement('canvas');
    rotateButtonCanvas.width = 256;
    rotateButtonCanvas.height = 64;
    const rotateBtnCtx = rotateButtonCanvas.getContext('2d');
    rotateBtnCtx.fillStyle = '#ffffff';
    rotateBtnCtx.font = 'bold 24px Arial';
    rotateBtnCtx.textAlign = 'center';
    rotateBtnCtx.textBaseline = 'middle';
    rotateBtnCtx.fillText('Rotate Screen', 128, 32);
    
    const rotateButtonTexture = new THREE.CanvasTexture(rotateButtonCanvas);
    const rotateButtonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: rotateButtonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const rotateButtonLabel = new THREE.Mesh(buttonLabelGeometry, rotateButtonLabelMaterial);
    rotateButtonLabel.position.set(0, -0.03, 0.002);
    panel.add(rotateButtonLabel);
    
    // End AR button
    const endARButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xe74c3c, // Red color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const endARButton = new THREE.Mesh(buttonGeometry, endARButtonMaterial);
    endARButton.position.set(0, -0.09, 0.001);
    endARButton.userData = { type: 'button', action: 'endAR' };
    panel.add(endARButton);
    
    // End AR button label
    const endARButtonCanvas = document.createElement('canvas');
    endARButtonCanvas.width = 256;
    endARButtonCanvas.height = 64;
    const endARBtnCtx = endARButtonCanvas.getContext('2d');
    endARBtnCtx.fillStyle = '#ffffff';
    endARBtnCtx.font = 'bold 24px Arial';
    endARBtnCtx.textAlign = 'center';
    endARBtnCtx.textBaseline = 'middle';
    endARBtnCtx.fillText('End AR', 128, 32);
    
    const endARButtonTexture = new THREE.CanvasTexture(endARButtonCanvas);
    const endARButtonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: endARButtonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const endARButtonLabel = new THREE.Mesh(buttonLabelGeometry, endARButtonLabelMaterial);
    endARButtonLabel.position.set(0, -0.09, 0.002);
    panel.add(endARButtonLabel);
    
    // Position the control panel in front of the user
    panel.position.set(0, -0.2, -0.6); // Moved forward and slightly down
    panel.rotation.x = -Math.PI / 8; // Tilt slightly up
    panel.userData = { type: 'controlPanel' };
    scene.add(panel);
    
    return panel;
}

// Create virtual keyboard for text input
export function createVirtualKeyboard() {
    virtualKeyboard = new THREE.Group();
    
    // Keyboard background
    const keyboardGeometry = new THREE.PlaneGeometry(0.8, 0.3);
    const keyboardMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide
    });
    const keyboardPanel = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    virtualKeyboard.add(keyboardPanel);
    
    // Create keyboard keys
    const rows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '/']
    ];
    
    const keySize = 0.05;
    const keySpacing = 0.01;
    const keyGeometry = new THREE.PlaneGeometry(keySize, keySize);
    const keyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444,
        side: THREE.DoubleSide
    });
    const keyHoverMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x666666,
        side: THREE.DoubleSide
    });
    
    // Track keys for interaction
    const keys = [];
    
    // Create rows of keys
    rows.forEach((row, rowIndex) => {
        const rowWidth = row.length * (keySize + keySpacing) - keySpacing;
        const startX = -rowWidth / 2;
        
        row.forEach((key, keyIndex) => {
            const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial.clone());
            const x = startX + keyIndex * (keySize + keySpacing);
            const y = 0.12 - rowIndex * (keySize + keySpacing);
            keyMesh.position.set(x, y, 0.001);
            
            // Store key data for interaction
            keyMesh.userData = { 
                type: 'key',
                key: key,
                originalMaterial: keyMesh.material,
                hoverMaterial: keyHoverMaterial.clone()
            };
            keys.push(keyMesh);
            
            virtualKeyboard.add(keyMesh);
            
            // Add key label using canvas texture
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 64;
            labelCanvas.height = 64;
            const labelCtx = labelCanvas.getContext('2d');
            labelCtx.fillStyle = '#ffffff';
            labelCtx.font = '32px Arial';
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
            labelMesh.position.set(x, y, 0.002);
            virtualKeyboard.add(labelMesh);
        });
    });
    
    // Add space bar
    const spaceBarGeometry = new THREE.PlaneGeometry(0.3, keySize);
    const spaceBar = new THREE.Mesh(spaceBarGeometry, keyMaterial.clone());
    spaceBar.position.set(0, -0.12, 0.001);
    spaceBar.userData = { 
        type: 'key',
        key: ' ',
        originalMaterial: spaceBar.material,
        hoverMaterial: keyHoverMaterial.clone()
    };
    keys.push(spaceBar);
    virtualKeyboard.add(spaceBar);
    
    // Add "SPACE" label for space bar
    const spaceCanvas = document.createElement('canvas');
    spaceCanvas.width = 200;
    spaceCanvas.height = 50;
    const spaceCtx = spaceCanvas.getContext('2d');
    spaceCtx.fillStyle = '#ffffff';
    spaceCtx.font = '24px Arial';
    spaceCtx.textAlign = 'center';
    spaceCtx.textBaseline = 'middle';
    spaceCtx.fillText('SPACE', 100, 25);
    
    const spaceTexture = new THREE.CanvasTexture(spaceCanvas);
    const spaceLabelGeometry = new THREE.PlaneGeometry(0.2, 0.03);
    const spaceLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: spaceTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const spaceLabelMesh = new THREE.Mesh(spaceLabelGeometry, spaceLabelMaterial);
    spaceLabelMesh.position.set(0, -0.12, 0.002);
    virtualKeyboard.add(spaceLabelMesh);
    
    // Store the keys array for interaction
    virtualKeyboard.userData = { type: 'keyboard', keys: keys };
    
    // Position the keyboard below the browser window and bring it forward
    virtualKeyboard.position.set(0, -0.45, -0.78);
    virtualKeyboard.rotation.x = -Math.PI / 8;
    virtualKeyboard.visible = false; // Hide keyboard initially
    scene.add(virtualKeyboard);
    
    return virtualKeyboard;
}

// Create a floating action button (FAB)
export function createFloatingActionButton(position, color, iconType, action) {
    const fab = new THREE.Group();
    
    // Button background
    const fabGeometry = new THREE.CircleGeometry(0.05, 32);
    const fabMaterial = new THREE.MeshBasicMaterial({ 
        color: color || 0x4CAF50, // Default green
        side: THREE.DoubleSide
    });
    const fabMesh = new THREE.Mesh(fabGeometry, fabMaterial);
    fab.add(fabMesh);
    
    // Add icon based on type
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 128;
    iconCanvas.height = 128;
    const iconCtx = iconCanvas.getContext('2d');
    iconCtx.fillStyle = '#ffffff';
    
    if (iconType === 'plus') {
        // Plus icon
        iconCtx.fillRect(54, 24, 20, 80); // Vertical bar
        iconCtx.fillRect(24, 54, 80, 20); // Horizontal bar
    } else if (iconType === 'close') {
        // X icon
        iconCtx.save();
        iconCtx.translate(64, 64);
        iconCtx.rotate(Math.PI / 4);
        iconCtx.fillRect(-40, -10, 80, 20); // Rotated bar 1
        iconCtx.rotate(Math.PI / 2);
        iconCtx.fillRect(-40, -10, 80, 20); // Rotated bar 2
        iconCtx.restore();
    } else if (iconType === 'move') {
        // Move icon
        iconCtx.beginPath();
        iconCtx.moveTo(64, 24); // Top arrow
        iconCtx.lineTo(44, 44);
        iconCtx.lineTo(84, 44);
        iconCtx.fill();
        
        iconCtx.beginPath();
        iconCtx.moveTo(64, 104); // Bottom arrow
        iconCtx.lineTo(44, 84);
        iconCtx.lineTo(84, 84);
        iconCtx.fill();
        
        iconCtx.beginPath();
        iconCtx.moveTo(24, 64); // Left arrow
        iconCtx.lineTo(44, 44);
        iconCtx.lineTo(44, 84);
        iconCtx.fill();
        
        iconCtx.beginPath();
        iconCtx.moveTo(104, 64); // Right arrow
        iconCtx.lineTo(84, 44);
        iconCtx.lineTo(84, 84);
        iconCtx.fill();
    } else if (iconType === 'rotate') {
        // Rotate icon
        iconCtx.strokeStyle = '#ffffff';
        iconCtx.lineWidth = 8;
        iconCtx.beginPath();
        iconCtx.arc(64, 64, 32, 0, 1.5 * Math.PI);
        iconCtx.moveTo(64, 32);
        iconCtx.lineTo(48, 48);
        iconCtx.moveTo(64, 32);
        iconCtx.lineTo(80, 48);
        iconCtx.stroke();
    }
    
    const iconTexture = new THREE.CanvasTexture(iconCanvas);
    const iconGeometry = new THREE.CircleGeometry(0.04, 32);
    const iconMaterial = new THREE.MeshBasicMaterial({ 
        map: iconTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    icon.position.z = 0.001;
    fab.add(icon);
    
    // Store action in userData
    fab.userData = { type: 'button', action: action };
    
    // Add glow effect
    const glowGeometry = new THREE.CircleGeometry(0.055, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.001;
    fab.add(glow);
    
    // Set position
    if (position) {
        fab.position.copy(position);
    }
    
    return fab;
}

// Show a notification/toast message in AR
export function showNotification(message, duration = 2000) {
    // Create notification canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw notification background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, 512, 128, 20);
    ctx.fill();
    
    // Draw notification text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, 256, 64);
    
    // Create notification panel
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(0.5, 0.125);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const notification = new THREE.Mesh(geometry, material);
    
    // Position notification in front of camera
    const position = new THREE.Vector3(0, 0, -0.7);
    position.applyMatrix4(camera.matrixWorld);
    notification.position.copy(position);
    
    // Make notification face the user
    notification.lookAt(camera.position);
    
    scene.add(notification);
    
    // Remove notification after duration
    setTimeout(() => {
        scene.remove(notification);
        material.dispose();
        geometry.dispose();
        texture.dispose();
    }, duration);
} 