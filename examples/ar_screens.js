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
    
    console.log("CREATING NEW SCREEN - LOOK DIRECTLY IN FRONT OF YOU");
    console.log("Screen position:", position);
    
    // Group to hold all screen components
    const screenGroup = new THREE.Group();
    
    // Create background plane - use box for more visibility
    const planeGeometry = new THREE.BoxGeometry(screenWidth, screenHeight, screenDepth, 1, 1, 1);
    
    // Create background material - ALWAYS use a bright, visible color first
    // even if video texture is available
    const backgroundMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // Bright cyan for maximum visibility
        side: THREE.DoubleSide,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5
    });
    
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
    
    // Create top bar for dragging (full width) - WITH BRIGHT COLOR
    const topBarGeometry = new THREE.BoxGeometry(screenWidth, topBarHeight, screenDepth * 1.5);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff, // Bright magenta
        transparent: false,
        opacity: 1.0
    });
    
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    
    // Position top bar at the top center of the screen
    topBar.position.y = screenHeight / 2 + topBarHeight / 2 - 0.005;
    topBar.position.z = 0.005; // Slightly in front of background for visibility
    
    // Tag top bar for interaction
    topBar.userData = {
        type: 'dragHandle',
        screenNumber: screenNumber,
        originalColor: '#ff00ff',
        isDraggable: true
    };
    
    // Add progress bar and controls (very visible)
    const progressBarHeight = 0.02; // Thicker for visibility
    const progressBarWidth = screenWidth * 0.9;
    
    // Progress bar background with bright color
    const progressBgGeometry = new THREE.BoxGeometry(progressBarWidth, progressBarHeight, screenDepth * 2);
    const progressBgMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Bright red
        opacity: 1.0,
        transparent: false
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
    
    // Progress bar fill indicator - bright color
    const progressFillGeometry = new THREE.BoxGeometry(0.01, progressBarHeight, screenDepth * 3);
    const progressFillMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00 // Bright yellow
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
    
    // Video control buttons - large and bright
    const buttonSize = 0.06; // Larger buttons
    const buttonDepth = screenDepth * 2;
    const buttonSpacing = 0.07;
    const buttonY = -(screenHeight / 2) + 3.5 * progressBarHeight + buttonSize / 2;
    
    // Play/Pause button
    const playButtonGeometry = new THREE.BoxGeometry(buttonSize, buttonSize, buttonDepth);
    const playButtonMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Bright green
        transparent: false
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
    const volumeButtonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00, // Bright yellow
        transparent: false
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
    
    // Add bright glowing border to make screen edges extremely visible
    const borderGeometry = new THREE.EdgesGeometry(planeGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
        color: 0xff00ff, // Bright magenta
        transparent: false,
        opacity: 1.0,
        linewidth: 5 // Thicker line (not supported on all platforms)
    });
    
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    screenGroup.add(border);
    
    // Add outer glow to the screen
    const glowGeometry = new THREE.PlaneGeometry(screenWidth + 0.2, screenHeight + 0.2);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff, // Bright magenta
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthTest: false // Show through other objects
    });
    
    const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
    glowPlane.position.z = -0.02; // Behind the screen
    screenGroup.add(glowPlane);
    
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
    
    // Replace with video texture after a short delay to ensure screen is visible first
    if (videoElement && videoElement.readyState >= 2) {
        setTimeout(() => {
            const videoTexture = new THREE.VideoTexture(videoElement);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.format = THREE.RGBFormat;
            
            backgroundMaterial.map = videoTexture;
            backgroundMaterial.color.set(0xffffff); // Switch to white to show video correctly
            backgroundMaterial.needsUpdate = true;
            
            console.log("Video texture applied to screen");
        }, 5000); // 5 second delay to ensure screen is seen first
    }
    
    console.log(`Screen ${screenNumber} created and added to scene`);
    
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