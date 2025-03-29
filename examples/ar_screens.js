// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoTexture } from './ar_media.js';

// Array to store screen objects
export let screens = [];

// Create a new browser screen
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Create a group for the entire screen
    const screenGroup = new THREE.Group();
    screenGroup.position.copy(position);
    screenGroup.userData.type = 'screen';
    
    // Set width and height with 16:9 aspect ratio
    const width = 1.0;
    const height = width * 0.75; // 4:3 aspect ratio for overall screen
    const contentAspectRatio = 16/9; // Content area has 16:9 ratio
    
    // Create shadow for depth effect
    const shadowGeometry = new THREE.PlaneGeometry(width + 0.1, height + 0.1);
    const shadowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.z = -0.01;
    shadow.userData.parentScreen = screenGroup;
    screenGroup.add(shadow);
    
    // Create a border for the screen
    const borderGeometry = new THREE.PlaneGeometry(width + 0.05, height + 0.05);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x333333, 
        side: THREE.DoubleSide
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.z = -0.005;
    border.userData.parentScreen = screenGroup;
    screenGroup.add(border);
    
    // Create the main background panel
    const browserGeometry = new THREE.PlaneGeometry(width, height);
    const browserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1F1F1F, // Dark theme
        side: THREE.DoubleSide
    });
    const browserPanel = new THREE.Mesh(browserGeometry, browserMaterial);
    browserPanel.userData.parentScreen = screenGroup;
    screenGroup.add(browserPanel);
    
    // Create modern header
    const headerHeight = height * 0.1;
    const headerGeometry = new THREE.PlaneGeometry(width, headerHeight);
    const headerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2D2D2D, // Slightly lighter than background
        side: THREE.DoubleSide
    });
    const header = new THREE.Mesh(headerGeometry, headerMaterial);
    header.position.y = height/2 - headerHeight/2;
    header.position.z = 0.001;
    header.userData.parentScreen = screenGroup;
    screenGroup.add(header);
    
    // Create title with nice font
    const title = createText("AR Video Viewer", 0.05, 0x4FC3F7);
    title.position.y = height/2 - headerHeight/2;
    title.position.z = 0.002;
    title.userData.parentScreen = screenGroup;
    screenGroup.add(title);
    
    // Create content panel for video with 16:9 aspect ratio
    const contentHeight = height * 0.6;
    const contentWidth = contentHeight * contentAspectRatio;
    const contentGeometry = new THREE.PlaneGeometry(contentWidth, contentHeight);
    const contentMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        side: THREE.DoubleSide
    });
    
    // Create the content panel (will hold video)
    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.position.y = 0;
    contentPanel.position.z = 0.004; // Ensure it's in front of browser panel
    contentPanel.userData.parentScreen = screenGroup;
    screenGroup.add(contentPanel);
    
    // Create video texture 
    const videoElement = createVideoElement();
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    contentPanel.material = new THREE.MeshBasicMaterial({ 
        map: videoTexture,
        side: THREE.DoubleSide
    });
    
    // Store video element reference
    contentPanel.userData.videoElement = videoElement;
    contentPanel.userData.videoTexture = videoTexture;
    screenGroup.userData.videoElement = videoElement;
    screenGroup.userData.contentPanel = contentPanel;
    
    // Create control bar below video
    const controlBarHeight = height * 0.12;
    const controlGeometry = new THREE.PlaneGeometry(contentWidth, controlBarHeight);
    const controlMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x212121, // Dark control bar
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
    });
    const controlBar = new THREE.Mesh(controlGeometry, controlMaterial);
    controlBar.position.y = -contentHeight/2 - controlBarHeight/2;
    controlBar.position.z = 0.006; // Ensure it's in front of content
    controlBar.userData.parentScreen = screenGroup;
    screenGroup.add(controlBar);
    
    // Store original dimensions in userData for resize operations
    screenGroup.userData.originalDimensions = {
        width: width,
        height: height,
        contentWidth: contentWidth,
        contentHeight: contentHeight
    };
    
    // Add to screens array and return
    if (!screens) screens = [];
    screens.push(screenGroup);
    
    return screenGroup;
}

// Function to create a text label
function createText(text, size = 0.04, color = 0xffffff) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const scale = 400;
    canvas.width = text.length * scale * 0.6;
    canvas.height = scale;
    
    // Set text styling
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = `bold ${scale * 0.8}px Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Convert hex color to RGB string
    const hexToRgb = (hex) => {
        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        return `rgb(${r},${g},${b})`;
    };
    
    context.fillStyle = hexToRgb(color);
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture and mesh
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const aspectRatio = canvas.width / canvas.height;
    const geometry = new THREE.PlaneGeometry(size * aspectRatio, size);
    
    // Return mesh with text
    return new THREE.Mesh(geometry, material);
}

// Create a video element for use in screens
function createVideoElement() {
    // Check if an existing video element is available in the DOM
    let videoElement = document.getElementById('videoElement');
    
    if (videoElement) {
        console.log("Using existing video element from DOM");
        return videoElement;
    }
    
    // Create a new video element if none exists
    console.log("Creating new video element");
    videoElement = document.createElement('video');
    videoElement.id = 'videoElement';
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.crossOrigin = 'anonymous';
    
    // Set fallback content
    videoElement.innerHTML = `
        <p>Your browser doesn't support HTML5 video.</p>
    `;
    
    // Create source elements for the video
    const source = document.createElement('source');
    source.src = '../textures/ar_videoplayback.mp4'; // Default path - update if needed
    source.type = 'video/mp4';
    videoElement.appendChild(source);
    
    // Hide the video element from the DOM but keep it for texture use
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);
    
    // Start playing the video (muted for autoplay)
    videoElement.play().catch(error => {
        console.error("Error starting video playback:", error);
    });
    
    return videoElement;
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
        screen: screen,
        parentScreen: screen // Reference to parent screen for easy lookup
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
    iconMesh.userData = { parentScreen: screen }; // Add parent reference
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

// Restore screens if they're missing
export function restoreScreens() {
    // Check if screens array is empty or undefined
    if (!screens || screens.length === 0) {
        console.log("No screens found, creating a new default screen");
        
        // Create a default position in front of the camera
        const position = new THREE.Vector3(0, 0, -1.2);
        if (camera) {
            // Get camera direction and position screen in front of camera
            const cameraDirection = new THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(camera.quaternion);
            position.copy(camera.position).add(cameraDirection.multiplyScalar(1.2));
        }
        
        // Create a new screen
        const newScreen = createNewBrowserScreen(position);
        console.log("Created new screen at position:", position);
        
        // Make screen face the camera
        if (camera) {
            newScreen.lookAt(camera.position);
        }
        
        return newScreen;
    } else {
        // Check if screens are actually in the scene
        const detachedScreens = screens.filter(screen => !scene.children.includes(screen));
        
        if (detachedScreens.length > 0) {
            console.log(`Found ${detachedScreens.length} detached screens, re-adding to scene`);
            
            // Re-add detached screens to the scene
            detachedScreens.forEach(screen => {
                scene.add(screen);
                console.log("Re-added screen to scene");
            });
        }
        
        return screens[0]; // Return the first screen
    }
} 