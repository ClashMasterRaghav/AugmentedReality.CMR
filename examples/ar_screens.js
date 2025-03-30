// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoTexture } from './ar_media.js';

// Array to store screen objects
export let screens = [];

// Create a new browser screen
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.2)) {
    // Create a clean, simple group
    const browserWindow = new THREE.Group();
    
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    
    console.log("Creating screen with draggable top bar and video");
    
    // Basic identification data
    browserWindow.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1) // Store original scale to prevent scaling issues
    };
    
    // Add border for better visibility
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, // Dark gray border
        side: THREE.DoubleSide
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    browserWindow.add(borderPanel);
    
    // Background plane - will hold video texture
    const bgGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    
    // Use video texture if available, otherwise use a dark background
    let bgMaterial;
    if (typeof videoTexture !== 'undefined' && videoTexture) {
        console.log("Using video texture for screen content");
        bgMaterial = new THREE.MeshBasicMaterial({ 
            map: videoTexture,
            side: THREE.DoubleSide
        });
    } else {
        console.log("Video texture not available, using fallback");
        bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x121212, // Dark background as fallback
            side: THREE.DoubleSide
        });
        
        // Create a fallback texture with loading indicator
        const fallbackTexture = createFallbackTexture(browserWindow.userData.id);
        bgMaterial.map = fallbackTexture;
    }
    
    const bgPanel = new THREE.Mesh(bgGeometry, bgMaterial);
    browserWindow.add(bgPanel);
    
    // Add draggable top bar - spans the entire width of the screen
    const topBarHeight = 0.10; // Increased height for easier grabbing in AR
    const topBarGeometry = new THREE.PlaneGeometry(screenWidth, topBarHeight);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333, // Darker than the background
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthTest: false // Ensure it's always visible
    });
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    
    // Position at the top of the screen
    topBar.position.set(
        0, // Centered horizontally
        screenHeight/2 - topBarHeight/2, // Top edge
        0.01 // Increased z-position for better touch detection
    );
    topBar.renderOrder = 100; // Ensure it renders on top
    
    // Add a grip pattern to indicate draggability
    const gripCanvas = document.createElement('canvas');
    gripCanvas.width = 512;
    gripCanvas.height = 96; // Increased height
    const ctx = gripCanvas.getContext('2d');
    
    // Fill with gradient background for better visibility
    const gradient = ctx.createLinearGradient(0, 0, 0, 96);
    gradient.addColorStop(0, '#555555');
    gradient.addColorStop(1, '#333333');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 96);
    
    // Draw grip pattern (larger dots)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) {
        const x = 30 + i * 56; // Evenly spaced dots
        ctx.beginPath();
        ctx.arc(x, 48, 4, 0, Math.PI * 2); // Larger dots, centered vertically
        ctx.fill();
    }
    
    // Add screen title text with shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Screen ${browserWindow.userData.id + 1}`, 256, 48);
    
    const gripTexture = new THREE.CanvasTexture(gripCanvas);
    const gripGeometry = new THREE.PlaneGeometry(screenWidth * 0.95, topBarHeight * 0.9);
    const gripMaterial = new THREE.MeshBasicMaterial({
        map: gripTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false
    });
    const gripMesh = new THREE.Mesh(gripGeometry, gripMaterial);
    gripMesh.position.z = 0.001; // Slightly in front of the top bar
    topBar.add(gripMesh);
    
    // Set userData for the top bar to enable dragging
    topBar.userData = {
        type: 'dragHandle',
        action: 'moveScreen',
        screen: browserWindow,
        isDraggable: true
    };
    
    // Add the top bar to the browserWindow
    browserWindow.add(topBar);
    
    // Store reference to the drag handle on the screen object
    browserWindow.userData.dragHandle = topBar;
    
    // Add video controls at the bottom of the screen if video texture exists
    if (typeof videoTexture !== 'undefined' && videoTexture) {
        // Progress bar background - full width
        const progressBgGeometry = new THREE.PlaneGeometry(screenWidth * 0.96, 0.01);
        const progressBgMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const progressBg = new THREE.Mesh(progressBgGeometry, progressBgMaterial);
        progressBg.position.set(0, -0.25, 0.005);
        progressBg.renderOrder = 90;
        browserWindow.add(progressBg);
        
        // Progress bar (initially empty) - full width
        const progressGeometry = new THREE.PlaneGeometry(screenWidth * 0.96, 0.01);
        const progressMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Red progress bar
            side: THREE.DoubleSide,
            depthTest: false
        });
        const progressBar = new THREE.Mesh(progressGeometry, progressMaterial);
        progressBar.position.set(-(screenWidth * 0.48), -0.25, 0.006); // Start at left edge
        progressBar.scale.set(0, 1, 1); // Initially 0 width
        progressBar.renderOrder = 91;
        browserWindow.add(progressBar);
        
        // Position buttons below the progress bar
        // Add play/pause button
        const playButton = addControlButton(browserWindow, 'play', -(screenWidth * 0.35), -0.31, 0.03);
        
        // Add volume/mute button
        const volumeButton = addControlButton(browserWindow, 'volume', -(screenWidth * 0.25), -0.31, 0.03);
        
        // Store controls in userData
        browserWindow.userData.controls = {
            progress: 0,
            isPlaying: true,
            isMuted: false,
            progressBar: progressBar,
            playButton: playButton,
            volumeButton: volumeButton
        };
    }
    
    // Position the window
    browserWindow.position.copy(position);
    
    // Add to scene and screens array
    scene.add(browserWindow);
    screens.push(browserWindow);
    
    console.log("Created screen with ID:", browserWindow.userData.id);
    
    // Select this as the current screen
    selectScreen(browserWindow);
    
    return browserWindow;
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