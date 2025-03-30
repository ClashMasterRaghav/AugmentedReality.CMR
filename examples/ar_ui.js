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
    
    // Panel background - sleek modern design with rounded corners
    const panelSize = { width: 0.28, height: 0.14 }; // Taller and wider panel for better usability
    const panelGeometry = new THREE.PlaneGeometry(panelSize.width, panelSize.height);
    
    // Create rounded panel texture
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 512;
    panelCanvas.height = 256;
    const panelCtx = panelCanvas.getContext('2d');
    
    // Draw rounded rectangle with modern gradient
    const cornerRadius = 40; // Increased corner radius for more modern look
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
    
    // Create premium gradient
    const gradient = panelCtx.createLinearGradient(0, 0, 0, panelCanvas.height);
    gradient.addColorStop(0, '#1e3c72'); // Deep blue
    gradient.addColorStop(1, '#2a5298'); // Lighter blue
    panelCtx.fillStyle = gradient;
    panelCtx.fill();
    
    // Add more noticeable inner glow
    panelCtx.shadowBlur = 20;
    panelCtx.shadowColor = 'rgba(52, 152, 219, 0.5)';
    panelCtx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
    panelCtx.lineWidth = 3;
    panelCtx.stroke();
    
    // Add a title/header section with gradient
    const headerGradient = panelCtx.createLinearGradient(0, 0, panelCanvas.width, 0);
    headerGradient.addColorStop(0, 'rgba(41, 128, 185, 0.9)');
    headerGradient.addColorStop(1, 'rgba(52, 152, 219, 0.8)');
    panelCtx.fillStyle = headerGradient;
    
    // Draw rounded header
    panelCtx.beginPath();
    panelCtx.moveTo(cornerRadius, 0);
    panelCtx.lineTo(panelCanvas.width - cornerRadius, 0);
    panelCtx.quadraticCurveTo(panelCanvas.width, 0, panelCanvas.width, cornerRadius);
    panelCtx.lineTo(panelCanvas.width, 50);
    panelCtx.lineTo(0, 50);
    panelCtx.lineTo(0, cornerRadius);
    panelCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
    panelCtx.closePath();
    panelCtx.fill();
    
    // Add a title text with shadow for depth
    panelCtx.shadowBlur = 5;
    panelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    panelCtx.shadowOffsetY = 2;
    panelCtx.fillStyle = '#ffffff';
    panelCtx.font = 'bold 28px Arial';
    panelCtx.textAlign = 'center';
    panelCtx.textBaseline = 'middle';
    panelCtx.fillText('AR Controls', panelCanvas.width / 2, 25);
    
    // Reset shadow for other elements
    panelCtx.shadowBlur = 0;
    panelCtx.shadowOffsetY = 0;
    
    // Add more visible drag handle indicator
    panelCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 3; i++) {
        panelCtx.fillRect(panelCanvas.width / 2 - 25 + i * 25, 37, 15, 4);
    }
    
    // Add subtle pattern overlay for texture
    panelCtx.globalCompositeOperation = 'overlay';
    panelCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < panelCanvas.width; i += 4) {
        for (let j = 0; j < panelCanvas.height; j += 4) {
            if (Math.random() > 0.8) {
                panelCtx.fillRect(i, j, 2, 2);
            }
        }
    }
    panelCtx.globalCompositeOperation = 'source-over';
    
    // Create texture from canvas
    const panelTexture = new THREE.CanvasTexture(panelCanvas);
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    controlPanel.add(panelMesh);
    
    // Add enhanced glow effect around the panel
    const glowGeometry = new THREE.PlaneGeometry(panelSize.width + 0.02, panelSize.height + 0.02);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x3498db,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.001;
    controlPanel.add(glowMesh);
    
    // Add a more obvious draggable area to the panel header
    const headerHeight = 0.035; // Taller header for easier grabbing
    const dragHandleGeometry = new THREE.PlaneGeometry(panelSize.width, headerHeight);
    const dragHandleMaterial = new THREE.MeshBasicMaterial({
        color: 0x3498db,
        transparent: true,
        opacity: 0.01, // Almost invisible but clickable
        side: THREE.DoubleSide
    });
    const dragHandle = new THREE.Mesh(dragHandleGeometry, dragHandleMaterial);
    dragHandle.position.set(0, panelSize.height / 2 - headerHeight / 2, 0.002);
    dragHandle.userData = {
        type: 'dragHandle',
        isDraggable: true,
        panel: controlPanel
    };
    controlPanel.add(dragHandle);
    
    // Define better button parameters
    const buttonSize = 0.075; // LARGER buttons for easier interaction
    const buttonSpacing = 0.11;
    
    // Create buttons - only 2 buttons: Add Screen and Delete Screen
    const buttonPositions = [
        { x: -buttonSpacing/2, y: -0.03 },  // Left - Add Screen
        { x: buttonSpacing/2, y: -0.03 }    // Right - Delete Screen
    ];
    
    const buttonActions = ['newScreen', 'deleteScreen'];
    const buttonColors = [0x27ae60, 0xe74c3c]; // Green, Red - more modern colors
    const buttonLabels = ['Add', 'Delete'];
    
    buttonPositions.forEach((position, index) => {
        // Create button group for each button
        const buttonGroup = new THREE.Group();
        buttonGroup.position.set(position.x, position.y, 0);
        
        // Create button mesh with circle geometry for better touch targeting
        const buttonGeometry = new THREE.CircleGeometry(buttonSize / 2, 32);
        
        // Create a modern gradient texture for the button
        const buttonCanvas = document.createElement('canvas');
        buttonCanvas.width = 128;
        buttonCanvas.height = 128;
        const buttonCtx = buttonCanvas.getContext('2d');
        
        // Draw filled circle with gradient
        const centerX = buttonCanvas.width / 2;
        const centerY = buttonCanvas.height / 2;
        const radius = buttonCanvas.width / 2 - 2;
        
        // Create more vibrant radial gradient
        const buttonGradient = buttonCtx.createRadialGradient(
            centerX, centerY - 10, radius * 0.3, // Offset center for 3D effect
            centerX, centerY, radius
        );
        
        if (index === 0) { // Add button - more vibrant green
            buttonGradient.addColorStop(0, '#2ecc71');
            buttonGradient.addColorStop(0.7, '#27ae60');
            buttonGradient.addColorStop(1, '#219653');
        } else { // Delete button - more vibrant red
            buttonGradient.addColorStop(0, '#f5365c');
            buttonGradient.addColorStop(0.7, '#e74c3c');
            buttonGradient.addColorStop(1, '#c0392b');
        }
        
        buttonCtx.beginPath();
        buttonCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        buttonCtx.fillStyle = buttonGradient;
        buttonCtx.fill();
        
        // Add more prominent inner shadow for 3D effect
        buttonCtx.shadowBlur = 15;
        buttonCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        buttonCtx.shadowOffsetY = 5;
        buttonCtx.shadowOffsetX = 0;
        
        // Add subtle highlight for 3D effect
        buttonCtx.beginPath();
        buttonCtx.arc(centerX, centerY - 15, radius * 0.75, 0, Math.PI, true);
        buttonCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        buttonCtx.lineWidth = 4;
        buttonCtx.stroke();
        
        const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            map: buttonTexture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.position.z = 0.002; // Moved forward for better interaction
        button.renderOrder = 100; // Very high render order to ensure visibility
        button.userData = {
            type: 'button',
            action: buttonActions[index],
            hoverColor: index === 0 ? 0x2ecc71 : 0xe74c3c, // Modern green and red
            activeColor: buttonColors[index],
            inactiveColor: buttonColors[index],
            originalColor: buttonColors[index],
            isToggle: false, // No toggle buttons
            isActive: true // Both are active by default
        };
        
        buttonGroup.add(button);
        
        // Add icon to button using canvas texture
        const iconTexture = createButtonIcon(index);
        const iconSize = buttonSize * 0.65; // Larger icon for better visibility
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.003;
        button.add(iconMesh);
        
        // Add button label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 32;
        const labelCtx = labelCanvas.getContext('2d');
        
        // Clear canvas
        labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        
        // Draw button label with shadow
        labelCtx.shadowBlur = 4;
        labelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        labelCtx.shadowOffsetY = 2;
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = 'bold 18px Arial';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        labelCtx.fillText(buttonLabels[index], labelCanvas.width / 2, labelCanvas.height / 2);
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(buttonSize * 0.9, buttonSize * 0.35);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.y = -buttonSize * 0.6;
        labelMesh.position.z = 0.002;
        buttonGroup.add(labelMesh);
        
        // Add subtle pulse animation for buttons
        if (index === 0) { // Only animate the Add button for better UX
            const pulseAnimation = () => {
                const time = Date.now() * 0.002; // Slower animation
                const scale = 1 + Math.sin(time * 2) * 0.05;
                button.scale.set(scale, scale, 1);
                
                // Keep animating
                requestAnimationFrame(pulseAnimation);
            };
            
            // Start the animation
            pulseAnimation();
        }
        
        controlPanel.add(buttonGroup);
    });
    
    // Add control panel to scene
    controlPanel.position.set(0, -0.4, -0.7); // Start at waist height, a bit closer
    controlPanel.userData = { 
        type: 'controlPanel',
        isDraggable: true,
        isBeingDragged: false,
        originalPosition: new THREE.Vector3(0, -0.4, -0.7),
        offset: new THREE.Vector3(),
        // Store references to button states for easy access
        buttonStates: {
            isMoveModeActive: false,
            isRotateModeActive: false
        }
    };
    
    // Make the control panel follow the camera but at waist height
    controlPanel.userData.update = function() {
        // Only update position if not being dragged
        if (!this.isBeingDragged) {
            const cameraDirection = new THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(camera.quaternion);
            
            // Calculate position in front of the user
            const position = new THREE.Vector3();
            position.copy(camera.position).add(cameraDirection.multiplyScalar(-0.7));
            
            // Position at waist height (lower than camera)
            position.y = camera.position.y - 0.4; // Waist height
            
            // Smoothly interpolate to new position
            this.position.lerp(position, 0.08);
            
            // Always face the user
            this.lookAt(camera.position);
        }
    };
    
    // Add enhanced floating animation
    const floatAnimation = () => {
        if (!controlPanel.userData.isBeingDragged) {
            const time = Date.now() * 0.001;
            // Combine multiple sine waves for more natural movement
            const floatY = (Math.sin(time * 0.8) * 0.004) + (Math.sin(time * 1.2) * 0.002);
            controlPanel.position.y += floatY - controlPanel.userData.lastFloatY || 0;
            controlPanel.userData.lastFloatY = floatY;
        }
        requestAnimationFrame(floatAnimation);
    };
    
    // Start floating animation
    floatAnimation();
    
    scene.add(controlPanel);
    
    console.log("Enhanced control panel created with buttons:", buttonActions);
    
    return controlPanel;
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
    ctx.lineWidth = 6; // Thinner lines for a more elegant look
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
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
            
        case 1: // Delete Screen icon - Trash can
            // Draw trash can body
            ctx.beginPath();
            ctx.moveTo(40, 44);
            ctx.lineTo(40, 94);
            ctx.quadraticCurveTo(40, 98, 44, 98);
            ctx.lineTo(84, 98);
            ctx.quadraticCurveTo(88, 98, 88, 94);
            ctx.lineTo(88, 44);
            ctx.stroke();
            
            // Draw lid
            ctx.beginPath();
            ctx.moveTo(36, 44);
            ctx.lineTo(92, 44);
            ctx.stroke();
            
            // Draw handle
            ctx.beginPath();
            ctx.moveTo(56, 44);
            ctx.lineTo(56, 36);
            ctx.lineTo(72, 36);
            ctx.lineTo(72, 44);
            ctx.stroke();
            
            // Draw lines inside trash can
            ctx.beginPath();
            ctx.moveTo(52, 56);
            ctx.lineTo(52, 86);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(64, 56);
            ctx.lineTo(64, 86);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(76, 56);
            ctx.lineTo(76, 86);
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