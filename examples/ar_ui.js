// UI elements and controls for AR experience
import * as THREE from 'three';
import { scene, camera, controller, renderer } from './ar_core.js';
import { createNewBrowserScreen } from './ar_screens.js';

// Export virtual keyboard reference
export let virtualKeyboard;

// Create DOM notification
export function createNotification(message, type = 'info') {
    // Add to DOM notification container
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add color based on type
    if (type === 'error') {
        notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    } else if (type === 'success') {
        notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
    } else if (type === 'warning') {
        notification.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
    }
    
    // Add to container
    container.appendChild(notification);
    
    // Also show in 3D space if renderer is available
    if (scene && camera) {
        showNotification(message);
    }
    
    // Remove after timeout
    setTimeout(() => {
        if (container.contains(notification)) {
            container.removeChild(notification);
        }
    }, 3000);
}

// Create the control panel with buttons for AR experience
export function createControlPanel() {
    const panel = new THREE.Group();
    
    // Panel background with rounded corners effect - SMALLER SIZE
    const panelGeometry = new THREE.PlaneGeometry(0.2, 0.2); // Increased size slightly
    const panelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x222222, // Darker background
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.add(panelMesh);
    
    // Add panel border glow
    const glowGeometry = new THREE.PlaneGeometry(0.205, 0.205); // Adjusted for new panel size
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00aaff, // Brighter blue
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.002;
    panel.add(glowMesh);
    
    // Create buttons using icons instead of text - LARGER SIZE
    const buttonSize = 0.05; // Increased button size for touch
    const buttonGeometry = new THREE.CircleGeometry(buttonSize / 2, 32);
    
    // New Screen button 
    const newScreenButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00aaff, // Brighter blue
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
    });
    const newScreenButton = new THREE.Mesh(buttonGeometry, newScreenButtonMaterial);
    newScreenButton.position.set(0, 0.06, 0.001);
    newScreenButton.userData = { type: 'button', action: 'newScreen' };
    panel.add(newScreenButton);
    
    // Add + icon to new screen button
    const plusCanvas = document.createElement('canvas');
    plusCanvas.width = 128;
    plusCanvas.height = 128;
    const plusCtx = plusCanvas.getContext('2d');
    plusCtx.fillStyle = '#ffffff';
    plusCtx.fillRect(48, 24, 32, 80); // Vertical line
    plusCtx.fillRect(24, 48, 80, 32); // Horizontal line
    
    const plusTexture = new THREE.CanvasTexture(plusCanvas);
    const iconGeometry = new THREE.CircleGeometry(buttonSize / 2 * 0.8, 32);
    const plusMaterial = new THREE.MeshBasicMaterial({ 
        map: plusTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const plusIcon = new THREE.Mesh(iconGeometry, plusMaterial);
    plusIcon.position.set(0, 0.06, 0.002);
    panel.add(plusIcon);
    
    // Move Screen button with toggle functionality
    const moveButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x777777, // Grey when inactive
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
    });
    const moveScreenButton = new THREE.Mesh(buttonGeometry, moveButtonMaterial);
    moveScreenButton.position.set(0, 0, 0.001);
    moveScreenButton.userData = { 
        type: 'button',
        action: 'moveScreen',
        isToggle: true,
        isActive: false
    };
    panel.add(moveScreenButton);
    
    // Add move icon
    const moveCanvas = document.createElement('canvas');
    moveCanvas.width = 128;
    moveCanvas.height = 128;
    const moveCtx = moveCanvas.getContext('2d');
    moveCtx.fillStyle = '#ffffff';
    
    // Draw arrows indicating movement
    moveCtx.beginPath();
    moveCtx.moveTo(64, 24); // Top arrow
    moveCtx.lineTo(48, 44);
    moveCtx.lineTo(80, 44);
    moveCtx.fill();
    
    moveCtx.beginPath();
    moveCtx.moveTo(64, 104); // Bottom arrow
    moveCtx.lineTo(48, 84);
    moveCtx.lineTo(80, 84);
    moveCtx.fill();
    
    moveCtx.beginPath();
    moveCtx.moveTo(24, 64); // Left arrow
    moveCtx.lineTo(44, 44);
    moveCtx.lineTo(44, 84);
    moveCtx.fill();
    
    moveCtx.beginPath();
    moveCtx.moveTo(104, 64); // Right arrow
    moveCtx.lineTo(84, 44);
    moveCtx.lineTo(84, 84);
    moveCtx.fill();
    
    const moveTexture = new THREE.CanvasTexture(moveCanvas);
    const moveMaterial = new THREE.MeshBasicMaterial({ 
        map: moveTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const moveIcon = new THREE.Mesh(iconGeometry, moveMaterial);
    moveIcon.position.set(0, 0, 0.002);
    panel.add(moveIcon);
    
    // Rotate Screen button
    const rotateButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x777777, // Grey when inactive
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
    });
    const rotateScreenButton = new THREE.Mesh(buttonGeometry, rotateButtonMaterial);
    rotateScreenButton.position.set(0, -0.06, 0.001);
    rotateScreenButton.userData = { 
        type: 'button',
        action: 'rotateScreen',
        isToggle: true,
        isActive: false
    };
    panel.add(rotateScreenButton);
    
    // Add rotate icon
    const rotateCanvas = document.createElement('canvas');
    rotateCanvas.width = 128;
    rotateCanvas.height = 128;
    const rotateCtx = rotateCanvas.getContext('2d');
    
    // Draw rotation icon
    rotateCtx.strokeStyle = '#ffffff';
    rotateCtx.lineWidth = 8;
    rotateCtx.beginPath();
    rotateCtx.arc(64, 64, 40, 0, 1.5 * Math.PI);
    rotateCtx.stroke();
    
    // Draw arrow head
    rotateCtx.fillStyle = '#ffffff';
    rotateCtx.beginPath();
    rotateCtx.moveTo(64, 24);
    rotateCtx.lineTo(52, 40);
    rotateCtx.lineTo(76, 40);
    rotateCtx.fill();
    
    const rotateTexture = new THREE.CanvasTexture(rotateCanvas);
    const rotateMaterial = new THREE.MeshBasicMaterial({ 
        map: rotateTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const rotateIcon = new THREE.Mesh(iconGeometry, rotateMaterial);
    rotateIcon.position.set(0, -0.06, 0.002);
    panel.add(rotateIcon);
    
    // Position the control panel for better accessibility on touchscreens
    panel.position.set(0, -0.2, -0.5); // Bottom center position, closer to user
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