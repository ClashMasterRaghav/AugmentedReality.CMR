// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoElement } from './ar_media.js';

// Array to store screen objects
export let screens = [];
let screenCounter = 0;

// Create a new browser screen at the given position
export function createNewBrowserScreen(position, url = null) {
    // Screen dimensions
    const screenWidth = 1.5;
    const screenHeight = 0.84375; // 16:9 aspect ratio
    const screenDepth = 0.01;
    const topBarHeight = 0.04; // Thin top bar
    
    console.log("Creating new screen at position:", position);
    
    // Group to hold all screen components
    const screenGroup = new THREE.Group();
    
    // Create background plane - use box for more visibility
    const planeGeometry = new THREE.BoxGeometry(screenWidth, screenHeight, screenDepth, 1, 1, 1);
    
    // Create background material - use video texture if available
    let backgroundMaterial;
    if (videoElement && videoElement.readyState >= 2) {
        const videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture,
            side: THREE.DoubleSide
        });
    } else {
        // Fallback with light gray background for better visibility
        backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333, // Lighter color for visibility
            side: THREE.DoubleSide
        });
    }
    
    const backgroundPlane = new THREE.Mesh(planeGeometry, backgroundMaterial);
    
    // Store screen number and add to global list
    const screenNumber = screenCounter++;
    screens.push({
        group: screenGroup,
        width: screenWidth,
        height: screenHeight,
        number: screenNumber
    });
    
    backgroundPlane.userData = {
        type: 'screen',
        screenNumber: screenNumber,
        isBackground: true
    };
    
    // Create top bar for dragging (full width)
    const topBarGeometry = new THREE.BoxGeometry(screenWidth, topBarHeight, screenDepth * 1.5);
    
    // Create canvas for top bar texture with grip pattern
    const topBarCanvas = document.createElement('canvas');
    const topBarTexture = new THREE.CanvasTexture(topBarCanvas);
    const context = topBarCanvas.getContext('2d');
    
    // Set canvas size - higher resolution for better text quality
    topBarCanvas.width = 1024;
    topBarCanvas.height = 128;
    
    // Draw gradient background for top bar - brighter colors
    const gradient = context.createLinearGradient(0, 0, 0, topBarCanvas.height);
    gradient.addColorStop(0, '#444444'); // Lighter gray at top
    gradient.addColorStop(1, '#222222'); // Darker at bottom
    context.fillStyle = gradient;
    context.fillRect(0, 0, topBarCanvas.width, topBarCanvas.height);
    
    // Draw grip dots - brighter for visibility
    context.fillStyle = 'rgba(255,255,255,0.7)'; // Brighter dots
    const dotSpacing = 50;
    const dotSize = 6; // Larger dots
    const centerY = topBarCanvas.height / 2;
    
    // Draw three rows of dots
    for (let row = 0; row < 3; row++) {
        const rowOffset = (row - 1) * 12;
        for (let i = 0; i < 15; i++) {
            context.beginPath();
            context.arc(
                topBarCanvas.width / 2 - (dotSpacing * 7) + i * dotSpacing,
                centerY + rowOffset, 
                dotSize, 
                0, 
                Math.PI * 2
            );
            context.fill();
        }
    }
    
    // Add screen title text - brighter and bigger
    context.font = 'bold 38px Arial'; // Larger font
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add text shadow for better readability
    context.shadowColor = 'rgba(0,0,0,0.7)';
    context.shadowBlur = 6;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    context.fillText(`Screen ${screenNumber}`, topBarCanvas.width / 2, centerY);
    
    // Apply texture to top bar
    const topBarMaterial = new THREE.MeshBasicMaterial({
        map: topBarTexture,
        transparent: true,
        opacity: 1.0 // Full opacity for visibility
    });
    
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    
    // Position top bar at the top center of the screen
    // Slightly outside the screen for better visibility
    topBar.position.y = screenHeight / 2 + topBarHeight / 2 - 0.005;
    topBar.position.z = 0.005; // Slightly in front of background for visibility
    
    // Tag top bar for interaction
    topBar.userData = {
        type: 'dragHandle',
        screenNumber: screenNumber,
        originalColor: '#444444',
        isDraggable: true
    };
    
    // Add video progress bar
    const progressBarHeight = 0.015; // Slightly thicker for visibility
    const progressBarWidth = screenWidth * 0.9; // FULL WIDTH progress bar
    
    // Progress bar background - brighter for visibility
    const progressBgGeometry = new THREE.BoxGeometry(progressBarWidth, progressBarHeight, screenDepth * 2);
    const progressBgMaterial = new THREE.MeshBasicMaterial({
        color: 0x555555, // Lighter gray
        opacity: 0.9, // More opaque
        transparent: true
    });
    
    const progressBarBg = new THREE.Mesh(progressBgGeometry, progressBgMaterial);
    
    // Position progress bar at bottom of screen
    progressBarBg.position.y = -(screenHeight / 2) + 2.5 * progressBarHeight;
    progressBarBg.position.z = 0.006;
    progressBarBg.position.x = 0; // Centered
    
    // Tag for identification
    progressBarBg.userData = {
        type: 'progressBar',
        isBackground: true,
        screenNumber: screenNumber
    };
    
    // Progress bar fill indicator - brighter color
    const progressFillGeometry = new THREE.BoxGeometry(0.01, progressBarHeight, screenDepth * 3);
    const progressFillMaterial = new THREE.MeshBasicMaterial({
        color: 0x4499ff // Brighter blue
    });
    
    const progressBarFill = new THREE.Mesh(progressFillGeometry, progressFillMaterial);
    
    // Position at start of progress bar
    progressBarFill.position.copy(progressBarBg.position);
    progressBarFill.position.x = -(progressBarWidth / 2); // Start at left edge
    progressBarFill.position.z = 0.007; // Slightly in front of background
    
    // Tag for identification
    progressBarFill.userData = {
        type: 'progressBarFill',
        screenNumber: screenNumber
    };
    
    // Video control buttons - larger and brighter
    const buttonSize = 0.05; // Larger buttons
    const buttonDepth = screenDepth * 2;
    const buttonSpacing = 0.07;
    const buttonY = -(screenHeight / 2) + 3.5 * progressBarHeight + buttonSize / 2;
    
    // Play/Pause button
    const playButtonGeometry = new THREE.BoxGeometry(buttonSize, buttonSize, buttonDepth);
    const playButtonCanvas = document.createElement('canvas');
    playButtonCanvas.width = 128;
    playButtonCanvas.height = 128;
    const playContext = playButtonCanvas.getContext('2d');
    
    // Draw play icon - brighter
    playContext.fillStyle = '#222222'; // Dark gray background
    playContext.fillRect(0, 0, 128, 128);
    playContext.fillStyle = '#ffffff'; // White icon
    playContext.beginPath();
    playContext.moveTo(40, 30);
    playContext.lineTo(40, 98);
    playContext.lineTo(98, 64);
    playContext.closePath();
    playContext.fill();
    
    const playButtonTexture = new THREE.CanvasTexture(playButtonCanvas);
    const playButtonMaterial = new THREE.MeshBasicMaterial({
        map: playButtonTexture
    });
    
    const playButton = new THREE.Mesh(playButtonGeometry, playButtonMaterial);
    playButton.position.set(-(screenWidth / 2) + buttonSize, buttonY, 0.006);
    
    // Tag for interaction
    playButton.userData = {
        type: 'button',
        action: 'play',
        screenNumber: screenNumber
    };
    
    // Volume/Mute button
    const volumeButtonGeometry = new THREE.BoxGeometry(buttonSize, buttonSize, buttonDepth);
    const volumeButtonCanvas = document.createElement('canvas');
    volumeButtonCanvas.width = 128;
    volumeButtonCanvas.height = 128;
    const volumeContext = volumeButtonCanvas.getContext('2d');
    
    // Draw volume icon - brighter
    volumeContext.fillStyle = '#222222'; // Dark gray background
    volumeContext.fillRect(0, 0, 128, 128);
    volumeContext.fillStyle = '#ffffff'; // White icon
    
    // Speaker icon
    volumeContext.beginPath();
    volumeContext.moveTo(40, 45);
    volumeContext.lineTo(55, 45);
    volumeContext.lineTo(75, 25);
    volumeContext.lineTo(75, 103);
    volumeContext.lineTo(55, 83);
    volumeContext.lineTo(40, 83);
    volumeContext.closePath();
    volumeContext.fill();
    
    // Sound waves
    volumeContext.lineWidth = 4; // Thicker lines
    volumeContext.beginPath();
    volumeContext.arc(75, 64, 15, -Math.PI / 3, Math.PI / 3);
    volumeContext.stroke();
    volumeContext.beginPath();
    volumeContext.arc(75, 64, 25, -Math.PI / 3, Math.PI / 3);
    volumeContext.stroke();
    
    const volumeButtonTexture = new THREE.CanvasTexture(volumeButtonCanvas);
    const volumeButtonMaterial = new THREE.MeshBasicMaterial({
        map: volumeButtonTexture
    });
    
    const volumeButton = new THREE.Mesh(volumeButtonGeometry, volumeButtonMaterial);
    volumeButton.position.set(-(screenWidth / 2) + buttonSize * 2 + buttonSpacing, buttonY, 0.006);
    
    // Tag for interaction
    volumeButton.userData = {
        type: 'button',
        action: 'volume',
        screenNumber: screenNumber
    };
    
    // Add all elements to the screen group
    screenGroup.add(backgroundPlane);
    screenGroup.add(topBar);
    screenGroup.add(progressBarBg);
    screenGroup.add(progressBarFill);
    screenGroup.add(playButton);
    screenGroup.add(volumeButton);
    
    // Add bold border outline to make screen edges visible
    const borderGeometry = new THREE.EdgesGeometry(planeGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
        color: 0x88ccff, // Bright blue for visibility
        transparent: true,
        opacity: 0.8, // More opaque
        linewidth: 2 // Thicker line (not supported on all platforms)
    });
    
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    screenGroup.add(border);
    
    // Set screen position and add to scene
    screenGroup.position.copy(position);
    scene.add(screenGroup);
    
    // Set screen data for hit testing
    screenGroup.userData = {
        type: 'screenGroup',
        screenNumber: screenNumber,
        screenWidth: screenWidth,
        screenHeight: screenHeight,
        originalScale: new THREE.Vector3(1, 1, 1) // Store original scale
    };
    
    console.log(`Screen ${screenNumber} created and added to scene at`, position);
    
    return screenGroup;
}

// Add a control button to the screen
function addControlButton(screen, type, x, y, size) {
    const buttonGeometry = new THREE.CircleGeometry(size, 32);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthTest: false // Disable depth testing for buttons
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, 0.010); // Increased z-position to be in front of everything
    button.renderOrder = 20; // Very high render order to ensure it's drawn on top
    button.userData = {
        type: 'button',
        action: type + 'Button',
        screen: screen
    };
    
    // Create icon for the button
    const iconTexture = createControlIcon(type);
    const iconSize = size * 0.8;
    const iconGeometry = new THREE.PlaneGeometry(iconSize * 2, iconSize * 2);
    const iconMaterial = new THREE.MeshBasicMaterial({
        map: iconTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false // Disable depth testing for icons
    });
    const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    iconMesh.position.z = 0.001; // Slightly in front of button
    iconMesh.renderOrder = 21; // Even higher than the button
    button.add(iconMesh);
    
    screen.add(button);
    return button;
}

// Create control button icons
function createControlIcon(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and set styles
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    switch(type) {
        case 'play':
            // Draw pause icon (two vertical bars)
            ctx.fillRect(20, 16, 8, 32);
            ctx.fillRect(36, 16, 8, 32);
            break;
            
        case 'volume':
            // Draw volume/mute icon
            // Speaker base
            ctx.beginPath();
            ctx.moveTo(16, 24);
            ctx.lineTo(24, 24);
            ctx.lineTo(32, 16);
            ctx.lineTo(32, 48);
            ctx.lineTo(24, 40);
            ctx.lineTo(16, 40);
            ctx.closePath();
            ctx.fill();
            
            // Sound waves
            ctx.beginPath();
            ctx.moveTo(40, 22);
            ctx.bezierCurveTo(45, 30, 45, 34, 40, 42);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(44, 18);
            ctx.bezierCurveTo(52, 28, 52, 36, 44, 46);
            ctx.stroke();
            break;
            
        case 'resize':
            // Draw resize icon with inward/outward arrows
            // Outward arrow (top-left)
            ctx.beginPath();
            ctx.moveTo(16, 16);
            ctx.lineTo(28, 16);
            ctx.lineTo(28, 28);
            ctx.moveTo(16, 16);
            ctx.lineTo(28, 28);
            ctx.stroke();
            
            // Inward arrow (bottom-right)
            ctx.beginPath();
            ctx.moveTo(48, 48);
            ctx.lineTo(36, 48);
            ctx.lineTo(36, 36);
            ctx.moveTo(48, 48);
            ctx.lineTo(36, 36);
            ctx.stroke();
            break;
            
        case 'fullscreen':
            // Draw fullscreen icon
            ctx.beginPath();
            // Top-left corner
            ctx.moveTo(18, 26);
            ctx.lineTo(18, 18);
            ctx.lineTo(26, 18);
            
            // Top-right corner
            ctx.moveTo(38, 18);
            ctx.lineTo(46, 18);
            ctx.lineTo(46, 26);
            
            // Bottom-right corner
            ctx.moveTo(46, 38);
            ctx.lineTo(46, 46);
            ctx.lineTo(38, 46);
            
            // Bottom-left corner
            ctx.moveTo(26, 46);
            ctx.lineTo(18, 46);
            ctx.lineTo(18, 38);
            ctx.stroke();
            break;
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Create a fallback texture when video is not available
function createFallbackTexture(screenNumber) {
    // Create a canvas to draw fallback content
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 460;
    
    const ctx = canvas.getContext('2d');
    
    // Fill background (YouTube-style dark background)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw YouTube-style loading icon (spinning circle)
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, 50, 0, 1.8 * Math.PI);
    ctx.stroke();
    
    // Draw message
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading video content...', canvas.width/2, canvas.height/2 + 100);
    ctx.font = '16px Roboto, Arial';
    ctx.fillText('Tap to interact with the player', canvas.width/2, canvas.height/2 + 140);
    
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
        const borderMesh = selectedScreen.children.find(child => 
            child.geometry && child.geometry.type === 'PlaneGeometry' && 
            Math.abs(child.position.z - (-0.001)) < 0.0001);
            
        if (borderMesh) {
            borderMesh.material.color.set(0x2196F3); // Blue border
            borderMesh.material.opacity = 0.7;
        }
        selectedScreen.userData.isSelected = false;
    }
    
    // Select new screen
    screen.userData.isSelected = true;
    
    // Highlight border for selected screen
    const borderMesh = screen.children.find(child => 
        child.geometry && child.geometry.type === 'PlaneGeometry' && 
        Math.abs(child.position.z - (-0.001)) < 0.0001);
        
    if (borderMesh) {
        borderMesh.material.color.set(0x4CAF50); // Green border
        borderMesh.material.opacity = 1.0;
    }
    
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
            // Find the border mesh
            const borderMesh = screen.children.find(child => 
                child.geometry && child.geometry.type === 'PlaneGeometry' && 
                Math.abs(child.position.z - (-0.001)) < 0.0001);
                
            if (borderMesh) {
                // Subtle pulsing effect for selected screen's border
                const time = Date.now() * 0.001;
                const pulseIntensity = 0.1 * Math.sin(time * 2) + 0.9;
                borderMesh.material.color.setRGB(0.3 * pulseIntensity, 0.8 * pulseIntensity, 0.3 * pulseIntensity);
            }
        }
    });
} 