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
    
    // Larger screen dimensions
    const screenWidth = 1.0;  // Increased from 0.8
    const screenHeight = 0.75; // Increased from 0.6
    const aspectRatio = 16/9; // Maintain proper video aspect ratio
    const contentWidth = screenWidth * 0.95;
    const contentHeight = contentWidth / aspectRatio;
    
    // Shadow for depth effect
    const shadowGeometry = new THREE.PlaneGeometry(screenWidth + 0.05, screenHeight + 0.05);
    const shadowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    const shadowPanel = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPanel.position.z = -0.01;
    browserWindow.add(shadowPanel);
    
    // Modern border with rounded corners effect
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2c2c2c, // Dark grey border
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1.0
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.005;
    browserWindow.add(borderPanel);
    
    // Browser background - main content area
    const browserGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    const browserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x121212, // Dark background like modern YouTube
        side: THREE.DoubleSide
    });
    const browserPanel = new THREE.Mesh(browserGeometry, browserMaterial);
    browserWindow.add(browserPanel);
    
    // Modern header bar
    const headerGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight * 0.12);
    const headerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x181818, // Modern dark header
        side: THREE.DoubleSide
    });
    const headerBar = new THREE.Mesh(headerGeometry, headerMaterial);
    headerBar.position.y = screenHeight * 0.44;
    headerBar.position.z = 0.001;
    browserWindow.add(headerBar);
    
    // Create title for the screen with modern font style
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 1024;
    titleCanvas.height = 128;
    const titleCtx = titleCanvas.getContext('2d');
    titleCtx.fillStyle = '#ffffff';
    titleCtx.font = 'bold 40px Roboto, Arial';
    titleCtx.textAlign = 'left'; // Left-aligned like modern interfaces
    titleCtx.textBaseline = 'middle';
    titleCtx.fillText(`AR Video Player ${screens.length + 1}`, 30, 64);
    
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleGeometry = new THREE.PlaneGeometry(screenWidth * 0.9, screenHeight * 0.1);
    const titleMaterial = new THREE.MeshBasicMaterial({ 
        map: titleTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(-screenWidth * 0.05, screenHeight * 0.44, 0.002);
    browserWindow.add(titleMesh);
    
    // Content area with video - moved forward slightly to avoid clipping
    const contentGeometry = new THREE.PlaneGeometry(contentWidth, contentHeight);
    
    // Check if video texture is available, otherwise use static content
    const contentMaterial = videoTexture ? 
        new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide }) :
        new THREE.MeshBasicMaterial({ 
            map: createFallbackTexture(screens.length + 1),
            side: THREE.DoubleSide
        });
        
    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.position.y = screenHeight * 0.05; // Centered in window
    contentPanel.position.z = 0.005; // Moved forward to avoid clipping
    browserWindow.add(contentPanel);
    
    // Modern control bar
    const controlBarGeometry = new THREE.PlaneGeometry(contentWidth, screenHeight * 0.1);
    const controlBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x181818, // Modern dark controls
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    const controlBar = new THREE.Mesh(controlBarGeometry, controlBarMaterial);
    controlBar.position.y = -screenHeight * 0.38; // Position at bottom of content
    controlBar.position.z = 0.006; // In front of video
    browserWindow.add(controlBar);
    
    // Add progress bar with modern design
    const progressBgGeometry = new THREE.PlaneGeometry(contentWidth * 0.98, screenHeight * 0.02);
    const progressBgMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444, // Progress bar background
        side: THREE.DoubleSide
    });
    const progressBg = new THREE.Mesh(progressBgGeometry, progressBgMaterial);
    progressBg.position.y = -screenHeight * 0.33; // Top of control bar
    progressBg.position.z = 0.007;
    browserWindow.add(progressBg);
    
    // Add progress indicator (YouTube red)
    const progressGeometry = new THREE.PlaneGeometry(contentWidth * 0.2, screenHeight * 0.02); // Starting progress
    const progressMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000, // YouTube red
        side: THREE.DoubleSide
    });
    const progress = new THREE.Mesh(progressGeometry, progressMaterial);
    progress.position.x = -contentWidth * 0.39; // Start from left
    progress.position.y = -screenHeight * 0.33;
    progress.position.z = 0.008;
    browserWindow.add(progress);
    
    // Create modern control buttons with larger size for better touch
    const buttonSize = screenHeight * 0.07;
    const buttonPositions = [
        { x: -contentWidth * 0.42, y: -screenHeight * 0.42, type: 'play' },
        { x: -contentWidth * 0.32, y: -screenHeight * 0.42, type: 'volume' },
        { x: contentWidth * 0.42, y: -screenHeight * 0.42, type: 'fullscreen' }
    ];
    
    buttonPositions.forEach(btn => {
        addControlButton(browserWindow, btn.type, btn.x, btn.y, buttonSize);
    });
    
    // Position the window
    browserWindow.position.copy(position);
    browserWindow.userData = { 
        type: 'screen', 
        id: screens.length, 
        isSelected: false,
        content: `Video Screen ${screens.length + 1}`,
        originalScale: new THREE.Vector3(1, 1, 1),
        controls: {
            isPlaying: true,
            isMuted: true,
            progress: 0,
            volume: 0
        }
    };
    
    scene.add(browserWindow);
    screens.push(browserWindow);
    
    // Set this as the selected screen
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
        side: THREE.DoubleSide
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, 0.003);
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
        side: THREE.DoubleSide
    });
    const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    iconMesh.position.z = 0.001;
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