// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoTexture } from './ar_media.js';

// Array to store screen objects
export let screens = [];

// Create a new browser screen
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.2)) {
    const browserWindow = new THREE.Group();
    
    // Browser background with improved design
    const browserGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const browserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const browserPanel = new THREE.Mesh(browserGeometry, browserMaterial);
    browserWindow.add(browserPanel);
    
    // Create border with improved design
    const borderGeometry = new THREE.PlaneGeometry(0.82, 0.62);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2196F3, // Blue border
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    browserWindow.add(borderPanel);
    
    // Add a subtle shadow effect
    const shadowGeometry = new THREE.PlaneGeometry(0.84, 0.64);
    const shadowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2
    });
    const shadowPanel = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPanel.position.z = -0.003;
    browserWindow.add(shadowPanel);
    
    // Address bar with improved design
    const addressBarGeometry = new THREE.PlaneGeometry(0.76, 0.06);
    const addressBarMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xf0f0f0,
        side: THREE.DoubleSide
    });
    const addressBar = new THREE.Mesh(addressBarGeometry, addressBarMaterial);
    addressBar.position.y = 0.25;
    addressBar.position.z = 0.001;
    browserWindow.add(addressBar);
    
    // Add url text
    const urlCanvas = document.createElement('canvas');
    urlCanvas.width = 380;
    urlCanvas.height = 30;
    const urlCtx = urlCanvas.getContext('2d');
    urlCtx.fillStyle = '#000000';
    urlCtx.font = '20px Arial';
    urlCtx.fillText(`AR Video Screen ${screens.length + 1}`, 10, 20);
    
    const urlTexture = new THREE.CanvasTexture(urlCanvas);
    const urlGeometry = new THREE.PlaneGeometry(0.38, 0.03);
    const urlMaterial = new THREE.MeshBasicMaterial({ 
        map: urlTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const urlMesh = new THREE.Mesh(urlGeometry, urlMaterial);
    urlMesh.position.set(-0.15, 0.25, 0.002);
    browserWindow.add(urlMesh);
    
    // Content area with video
    const contentGeometry = new THREE.PlaneGeometry(0.76, 0.46);
    
    // Check if video texture is available, otherwise use static content
    const contentMaterial = videoTexture ? 
        new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide }) :
        new THREE.MeshBasicMaterial({ 
            map: createBrowserContentTexture(screens.length + 1),
            side: THREE.DoubleSide
        });

    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.position.y = -0.03;
    contentPanel.position.z = 0.001;
    browserWindow.add(contentPanel);
    
    // Add rotation and tilt controls
    addControlsToScreen(browserWindow);
    
    // Position the window
    browserWindow.position.copy(position);
    browserWindow.userData = { 
        type: 'screen', 
        id: screens.length, 
        isSelected: false,
        content: `Video Screen ${screens.length + 1}`,
        originalScale: new THREE.Vector3(1, 1, 1),
        initialRotation: new THREE.Euler()
    };
    
    scene.add(browserWindow);
    screens.push(browserWindow);
    
    // Set this as the selected screen
    selectScreen(browserWindow);
    
    return browserWindow;
}

// Add rotation and tilt controls to screen
function addControlsToScreen(screen) {
    // Add rotation handle - top left
    const rotationHandleGeometry = new THREE.CircleGeometry(0.02, 32);
    const rotationHandleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2196F3, // Blue color
        side: THREE.DoubleSide
    });
    const rotationHandle = new THREE.Mesh(rotationHandleGeometry, rotationHandleMaterial);
    rotationHandle.position.set(-0.38, 0.28, 0.002);
    rotationHandle.userData = { type: 'button', action: 'rotateScreen' };
    screen.add(rotationHandle);
    
    // Add rotation icon
    const rotationCanvas = document.createElement('canvas');
    rotationCanvas.width = 64;
    rotationCanvas.height = 64;
    const rotationCtx = rotationCanvas.getContext('2d');
    rotationCtx.strokeStyle = '#ffffff';
    rotationCtx.lineWidth = 4;
    rotationCtx.beginPath();
    rotationCtx.arc(32, 32, 20, 0, 1.5 * Math.PI);
    rotationCtx.moveTo(32, 12);
    rotationCtx.lineTo(25, 18);
    rotationCtx.moveTo(32, 12);
    rotationCtx.lineTo(39, 18);
    rotationCtx.stroke();
    
    const rotationTexture = new THREE.CanvasTexture(rotationCanvas);
    const rotationIconGeometry = new THREE.CircleGeometry(0.015, 32);
    const rotationIconMaterial = new THREE.MeshBasicMaterial({ 
        map: rotationTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const rotationIcon = new THREE.Mesh(rotationIconGeometry, rotationIconMaterial);
    rotationIcon.position.set(-0.38, 0.28, 0.003);
    screen.add(rotationIcon);
    
    // Add tilt handle - bottom left
    const tiltHandleGeometry = new THREE.CircleGeometry(0.02, 32);
    const tiltHandleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF9800, // Orange color
        side: THREE.DoubleSide
    });
    const tiltHandle = new THREE.Mesh(tiltHandleGeometry, tiltHandleMaterial);
    tiltHandle.position.set(-0.38, -0.28, 0.002);
    tiltHandle.userData = { type: 'button', action: 'tiltScreen' };
    screen.add(tiltHandle);
    
    // Add tilt icon
    const tiltCanvas = document.createElement('canvas');
    tiltCanvas.width = 64;
    tiltCanvas.height = 64;
    const tiltCtx = tiltCanvas.getContext('2d');
    tiltCtx.strokeStyle = '#ffffff';
    tiltCtx.lineWidth = 4;
    tiltCtx.beginPath();
    tiltCtx.moveTo(22, 22);
    tiltCtx.lineTo(42, 42);
    tiltCtx.moveTo(22, 22);
    tiltCtx.lineTo(12, 32);
    tiltCtx.moveTo(42, 42);
    tiltCtx.lineTo(52, 32);
    tiltCtx.stroke();
    
    const tiltTexture = new THREE.CanvasTexture(tiltCanvas);
    const tiltIconGeometry = new THREE.CircleGeometry(0.015, 32);
    const tiltIconMaterial = new THREE.MeshBasicMaterial({ 
        map: tiltTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const tiltIcon = new THREE.Mesh(tiltIconGeometry, tiltIconMaterial);
    tiltIcon.position.set(-0.38, -0.28, 0.003);
    screen.add(tiltIcon);
    
    // Add close button - top right
    const closeButtonGeometry = new THREE.CircleGeometry(0.02, 32);
    const closeButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff5252, // Red color
        side: THREE.DoubleSide
    });
    const closeButton = new THREE.Mesh(closeButtonGeometry, closeButtonMaterial);
    closeButton.position.set(0.37, 0.28, 0.002);
    closeButton.userData = { type: 'button', action: 'closeScreen' };
    screen.add(closeButton);
    
    // Add X icon
    const xCanvas = document.createElement('canvas');
    xCanvas.width = 64;
    xCanvas.height = 64;
    const xCtx = xCanvas.getContext('2d');
    xCtx.strokeStyle = '#ffffff';
    xCtx.lineWidth = 6;
    xCtx.beginPath();
    xCtx.moveTo(16, 16);
    xCtx.lineTo(48, 48);
    xCtx.moveTo(48, 16);
    xCtx.lineTo(16, 48);
    xCtx.stroke();
    
    const xTexture = new THREE.CanvasTexture(xCanvas);
    const xGeometry = new THREE.CircleGeometry(0.015, 32);
    const xMaterial = new THREE.MeshBasicMaterial({ 
        map: xTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const xIcon = new THREE.Mesh(xGeometry, xMaterial);
    xIcon.position.set(0.37, 0.28, 0.003);
    screen.add(xIcon);
    
    // Add resize handle - bottom right
    const resizeHandleGeometry = new THREE.PlaneGeometry(0.04, 0.04);
    const resizeHandleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x9e9e9e,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const resizeHandle = new THREE.Mesh(resizeHandleGeometry, resizeHandleMaterial);
    resizeHandle.position.set(0.38, -0.28, 0.002);
    resizeHandle.userData = { type: 'button', action: 'resizeScreen' };
    screen.add(resizeHandle);
    
    // Add resize icon
    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = 64;
    resizeCanvas.height = 64;
    const resizeCtx = resizeCanvas.getContext('2d');
    resizeCtx.strokeStyle = '#ffffff';
    resizeCtx.lineWidth = 4;
    resizeCtx.beginPath();
    // Draw diagonal lines in the corner
    resizeCtx.moveTo(32, 48);
    resizeCtx.lineTo(48, 32);
    resizeCtx.moveTo(24, 48);
    resizeCtx.lineTo(48, 24);
    resizeCtx.moveTo(16, 48);
    resizeCtx.lineTo(48, 16);
    resizeCtx.stroke();
    
    const resizeTexture = new THREE.CanvasTexture(resizeCanvas);
    const resizeIconGeometry = new THREE.PlaneGeometry(0.03, 0.03);
    const resizeIconMaterial = new THREE.MeshBasicMaterial({ 
        map: resizeTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const resizeIcon = new THREE.Mesh(resizeIconGeometry, resizeIconMaterial);
    resizeIcon.position.set(0.38, -0.28, 0.003);
    screen.add(resizeIcon);
}

// Create a static texture for browser content
export function createBrowserContentTexture(screenNumber) {
    // Create a canvas to draw browser content
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 460;
    
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw header
    ctx.fillStyle = '#000000';
    ctx.font = '32px Arial';
    ctx.fillText(`AR Screen ${screenNumber}`, 20, 50);
    
    // Draw content
    ctx.font = '20px Arial';
    ctx.fillText('This is a multi-screen AR browsing experience.', 20, 100);
    ctx.fillText('You can create multiple screens and place them anywhere.', 20, 130);
    
    // Draw feature box
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(20, 180, 720, 200);
    
    ctx.fillStyle = '#000000';
    ctx.font = '24px Arial';
    ctx.fillText('Screen features:', 40, 210);
    
    ctx.font = '18px Arial';
    ctx.fillText('• Selectable with highlighted border', 40, 250);
    ctx.fillText('• Movable to any position in AR space', 40, 280);
    ctx.fillText('• Rotatable and tiltable in 3D space', 40, 310);
    ctx.fillText('• Resizable for better visibility', 40, 340);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Select a screen and update UI accordingly
export function selectScreen(screen) {
    // Deselect previously selected screen
    if (selectedScreen) {
        // Change border color back to normal
        selectedScreen.children[1].material.color.set(0x2196F3);
        selectedScreen.userData.isSelected = false;
    }
    
    // Select new screen
    screen.userData.isSelected = true;
    
    // Highlight border for selected screen
    screen.children[1].material.color.set(0x4CAF50); // Green for selected
    
    // Position keyboard under selected screen if needed
    if (virtualKeyboard) {
        updateKeyboardPosition(screen);
    }
}

// Update keyboard position relative to the selected screen
export function updateKeyboardPosition(screen) {
    if (!virtualKeyboard) return;
    
    const screenPos = screen.position.clone();
    const screenScale = screen.scale.clone();
    
    // Position keyboard under selected screen, accounting for screen scale
    virtualKeyboard.position.set(
        screenPos.x, 
        screenPos.y - (0.3 + 0.15 * screenScale.y), // Adjust for screen height
        screenPos.z + 0.02
    );
    
    // Scale keyboard proportionally to screen
    const keyboardScale = Math.max(0.8, Math.min(1.2, (screenScale.x + screenScale.y) / 2));
    virtualKeyboard.scale.set(keyboardScale, keyboardScale, 1);
    
    // Make keyboard face the user
    virtualKeyboard.lookAt(camera.position);
    virtualKeyboard.rotation.x = -Math.PI / 8;
}

// Update visual effects for screens
export function updateScreenEffects() {
    screens.forEach(screen => {
        if (screen.userData.isSelected) {
            // Subtle pulsing effect for selected screen's border
            const time = Date.now() * 0.001;
            const pulseIntensity = 0.1 * Math.sin(time * 2) + 0.9;
            screen.children[1].material.color.setRGB(0.3 * pulseIntensity, 0.8 * pulseIntensity, 0.3 * pulseIntensity);
        }
    });
} 