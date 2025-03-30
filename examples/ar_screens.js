// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoTexture } from './ar_media.js';

// Array to store screen objects
export let screens = [];

// Create a new browser screen
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.2)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Screen ${screens.length + 1}`;
    
    console.log("Creating screen with draggable top bar and video");
    
    // Create the screen container using the enhanced implementation
    const browserWindow = enhancedCreateScreen(position, size, title, videoTexture);
    
    // Add basic identification data
    browserWindow.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1) // Store original scale to prevent scaling issues
    };
    
    // Add border with rounded corners for better visibility
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, // Dark gray border
        side: THREE.DoubleSide
    });
    
    // Create rounded corners using shape geometry
    const roundedRectShape = createRoundedRectShape(screenWidth + 0.02, screenHeight + 0.02, 0.04);
    const borderGeometry = new THREE.ShapeGeometry(roundedRectShape);
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.userData = {
        type: 'border'
    };
    browserWindow.add(borderPanel);
    
    // Find and update the drag handle reference in userData
    const topBar = browserWindow.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = browserWindow;
        browserWindow.userData.dragHandle = topBar;
    }
    
    // Add to scene and screens array
    scene.add(browserWindow);
    screens.push(browserWindow);
    
    console.log("Created screen with ID:", browserWindow.userData.id);
    
    // Select this as the current screen
    selectScreen(browserWindow);
    
    return browserWindow;
}

// Helper function to create a rounded rectangle shape
function createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    
    const x = -width / 2;
    const y = -height / 2;
    
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);
    
    return shape;
}

// Enhanced screen creation function with modern UI
function enhancedCreateScreen(position, size, title = 'Screen', content = null) {
    // Create the screen container
    const screen = new THREE.Group();
    
    // Define screen dimensions
    const screenWidth = size.x;
    const screenHeight = size.y;
    const topBarHeight = 0.06; // Thinner top bar
    const cornerRadius = 0.04; // Corner radius
    
    // Content background - create this first so it's behind the top bar
    // Use rounded corners for the content background
    const backgroundShape = createRoundedRectShape(screenWidth, screenHeight, cornerRadius);
    const backgroundGeometry = new THREE.ShapeGeometry(backgroundShape);
    let backgroundMaterial;
    
    if (content && content.isVideoTexture) {
        // Use video texture if provided with correct mapping to fill the screen
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: content,
            side: THREE.DoubleSide,
            depthTest: false
        });
        
        // Set texture mapping to ensure full coverage
        content.wrapS = THREE.ClampToEdgeWrapping;
        content.wrapT = THREE.ClampToEdgeWrapping;
        content.repeat.set(1, 1);
        content.offset.set(0, 0);
        content.center.set(0.5, 0.5);
        content.needsUpdate = true;
    } else {
        // Create a gradient texture for the background
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        
        // Create a subtle gradient (dark blue to dark purple)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#121520');
        gradient.addColorStop(1, '#1a1025');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add a slight noise texture for depth
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 1000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
            const size = Math.random() * 2;
            ctx.fillRect(
                Math.random() * canvas.width, 
                Math.random() * canvas.height, 
                size, size
            );
        }
        ctx.globalAlpha = 1.0;
        
        // Create texture from canvas
        const backgroundTexture = new THREE.CanvasTexture(canvas);
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: backgroundTexture,
            side: THREE.DoubleSide,
            depthTest: false
        });
        
        // Create fallback texture with loading indicator if needed
        if (!content) {
            // The fallback texture will be added on top of the gradient
            const fallbackTexture = createFallbackTexture(title.split(' ').pop() || '1');
            const fallbackMaterial = new THREE.MeshBasicMaterial({
                map: fallbackTexture,
                side: THREE.DoubleSide,
                transparent: true,
                depthTest: false
            });
            
            // Create a mesh for the fallback content
            const fallbackGeometry = new THREE.PlaneGeometry(screenWidth * 0.8, screenHeight * 0.6);
            const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
            fallbackMesh.position.z = 0.003; // Slightly in front of background
            screen.add(fallbackMesh);
        }
    }
    
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.set(0, 0, 0.002);
    background.renderOrder = 1;
    screen.add(background);
    
    // Create a solid black top bar with rounded corners at the top
    // For top bar, we use a custom shape with rounded corners only at the top
    const topBarShape = new THREE.Shape();
    const halfWidth = screenWidth / 2;
    const halfHeight = screenHeight / 2;
    const topY = halfHeight;
    const bottomY = halfHeight - topBarHeight;
    
    // Start from bottom left
    topBarShape.moveTo(-halfWidth, bottomY);
    // Line to top left corner
    topBarShape.lineTo(-halfWidth, topY - cornerRadius);
    // Top left corner curve
    topBarShape.quadraticCurveTo(-halfWidth, topY, -halfWidth + cornerRadius, topY);
    // Line to top right corner
    topBarShape.lineTo(halfWidth - cornerRadius, topY);
    // Top right corner curve
    topBarShape.quadraticCurveTo(halfWidth, topY, halfWidth, topY - cornerRadius);
    // Line to bottom right
    topBarShape.lineTo(halfWidth, bottomY);
    // Line back to start (bottom left)
    topBarShape.lineTo(-halfWidth, bottomY);
    
    const topBarGeometry = new THREE.ShapeGeometry(topBarShape);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x111111, // Solid black color
        transparent: false, // No transparency
        side: THREE.DoubleSide,
        depthTest: true // Enable depth testing to prevent seeing through
    });
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    topBar.position.set(0, 0, 0.004);
    topBar.renderOrder = 10;
    topBar.userData = {
        type: 'dragHandle',
        isTopBar: true,
        screen: screen,
        originalColor: topBarMaterial.color.getHex()
    };
    screen.add(topBar);
    
    // Create a more modern grip pattern to indicate draggability
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 64; // Reduced height for thinner top bar
    const ctx = canvas.getContext('2d');
    
    // Create a solid black background for the top bar
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw screen title with improved typography
    ctx.fillStyle = '#ffffff';
    ctx.font = '26px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(title, canvas.width / 2, canvas.height / 2);
    ctx.shadowColor = 'transparent';
    
    // Add subtle grip indicator dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const dotRadius = 1.5;
    const dotSpacing = 12;
    const dotsStartX = canvas.width - 100;
    const dotsY = canvas.height / 2;
    
    for (let i = 0; i < 4; i++) {
        const x = dotsStartX + (i * dotSpacing);
        // First row (slightly above center)
        ctx.beginPath();
        ctx.arc(x, dotsY - 5, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        // Second row (slightly below center)
        ctx.beginPath();
        ctx.arc(x, dotsY + 5, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Apply the canvas as a texture to the top bar
    const topBarTexture = new THREE.CanvasTexture(canvas);
    topBarTexture.anisotropy = 4;
    topBarMaterial.map = topBarTexture;
    topBarMaterial.needsUpdate = true;
    
    // Add video control buttons with refined positioning
    if (content && content.isVideoTexture) {
        // Move play button to bottom left - increase button size
        const playButton = addControlButton(screen, 'play', -screenWidth/2 + 0.08, -screenHeight/2 + 0.08, 0.04);
        playButton.userData.videoControl = true;
        playButton.userData.videoAction = 'togglePlayback';
        
        // Keep volume button on bottom right, but initialize with muted icon - increase button size
        const volumeButton = addControlButton(screen, 'muted', screenWidth/2 - 0.08, -screenHeight/2 + 0.08, 0.04);
        volumeButton.userData.videoControl = true;
        volumeButton.userData.videoAction = 'toggleMute';
        
        // Add a simple timeline slider
        const timelineWidth = screenWidth * 0.6;
        const timelineHeight = 0.01;
        
        // Timeline background
        const timelineGeometry = new THREE.PlaneGeometry(timelineWidth, timelineHeight);
        const timelineMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthTest: true
        });
        const timeline = new THREE.Mesh(timelineGeometry, timelineMaterial);
        timeline.position.set(0, -screenHeight/2 + 0.08, 0.008);
        timeline.renderOrder = 15;
        timeline.userData = {
            type: 'timeline',
            interactive: true
        };
        screen.add(timeline);
        
        // Progress indicator
        const progressGeometry = new THREE.PlaneGeometry(timelineWidth, timelineHeight);
        const progressMaterial = new THREE.MeshBasicMaterial({
            color: 0x4285f4, // Google blue
            side: THREE.DoubleSide,
            depthTest: true
        });
        const progress = new THREE.Mesh(progressGeometry, progressMaterial);
        progress.scale.set(0, 1, 1); // Start with zero width
        progress.position.set(-timelineWidth/2, 0, 0.001); // Left-aligned
        timeline.add(progress);
        
        // Slider handle
        const handleSize = 0.02;
        const handleGeometry = new THREE.CircleGeometry(handleSize, 32);
        const handleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            depthTest: true
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(-timelineWidth/2, 0, 0.002); // Start at left
        timeline.add(handle);
        
        // Time display
        const timeDisplay = createTimeDisplay();
        timeDisplay.position.set(0, timelineHeight + 0.02, 0.001);
        timeline.add(timeDisplay);
        
        // Store controls in userData
        screen.userData.controls = {
            isPlaying: true,
            isMuted: true,
            currentTime: 0,
            duration: 100, // Default, will update when video loads
            playButton: playButton,
            volumeButton: volumeButton,
            timeline: timeline,
            progress: progress,
            handle: handle,
            timeDisplay: timeDisplay
        };
    }
    
    // Position the entire screen
    screen.position.copy(position);
    
    return screen;
}

// Add a control button to the screen
function addControlButton(screen, type, x, y, size) {
    const buttonGeometry = new THREE.CircleGeometry(size, 32);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444, // Darker gray for more subtle appearance
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: true // Enable depth testing to prevent seeing through screens
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, 0.010); // Increased z-position to be in front of everything
    button.renderOrder = 20; // Very high render order to ensure it's drawn on top
    button.userData = {
        type: 'button',
        action: type + 'Button',
        screen: screen
    };
    
    // Create icon for the button with improved design
    const iconTexture = createControlIcon(type);
    const iconSize = size * 0.7; // Smaller icon for more whitespace
    const iconGeometry = new THREE.PlaneGeometry(iconSize * 2, iconSize * 2);
    const iconMaterial = new THREE.MeshBasicMaterial({
        map: iconTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true // Enable depth testing to prevent seeing through screens
    });
    const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    iconMesh.position.z = 0.001; // Slightly in front of button
    iconMesh.renderOrder = 21; // Even higher than the button
    button.add(iconMesh);
    
    // Add subtle highlight/shadow for depth
    const highlightGeometry = new THREE.CircleGeometry(size * 1.02, 32);
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthTest: true // Enable depth testing to prevent seeing through screens
    });
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.position.z = -0.001; // Slightly behind the button
    button.add(highlightMesh);
    
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
    ctx.lineWidth = 2.5; // Thinner lines for a more elegant look
    ctx.lineCap = 'round';
    
    switch(type) {
        case 'play':
            // Draw pause icon (two vertical bars)
            ctx.fillRect(22, 18, 6, 28);
            ctx.fillRect(36, 18, 6, 28);
            break;
            
        case 'volume':
            // Draw volume/mute icon with sleeker design
            // Speaker base
            ctx.beginPath();
            ctx.moveTo(18, 26);
            ctx.lineTo(24, 26);
            ctx.lineTo(32, 18);
            ctx.lineTo(32, 46);
            ctx.lineTo(24, 38);
            ctx.lineTo(18, 38);
            ctx.closePath();
            ctx.fill();
            
            // Sound waves - more subtle with thinner lines
            ctx.beginPath();
            ctx.moveTo(40, 24);
            ctx.bezierCurveTo(44, 30, 44, 34, 40, 40);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(44, 20);
            ctx.bezierCurveTo(50, 28, 50, 36, 44, 44);
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

// Create a time display element
function createTimeDisplay() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0:00 / 0:00', canvas.width/2, canvas.height/2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create plane
    const geometry = new THREE.PlaneGeometry(0.13, 0.03);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Store canvas and context for updates
    mesh.userData = {
        canvas: canvas,
        context: ctx,
        texture: texture,
        updateTime: function(current, total) {
            // Format times as MM:SS
            const formatTime = (seconds) => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw text
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${formatTime(current)} / ${formatTime(total)}`, canvas.width/2, canvas.height/2);
            
            // Update texture
            texture.needsUpdate = true;
        }
    };
    
    return mesh;
}

// Select a screen and update UI accordingly
export function selectScreen(screen) {
    // Deselect previously selected screen
    if (selectedScreen) {
        // Change border color back to normal
        const borderMesh = selectedScreen.children.find(child => 
            child.userData && child.userData.type === 'border' || 
            (child.geometry && child.geometry.type === 'ShapeGeometry' && 
            Math.abs(child.position.z - (-0.001)) < 0.0001));
            
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
        child.userData && child.userData.type === 'border' || 
        (child.geometry && child.geometry.type === 'ShapeGeometry' && 
        Math.abs(child.position.z - (-0.001)) < 0.0001));
        
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