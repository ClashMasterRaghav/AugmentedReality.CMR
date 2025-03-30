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

// Create a rounded rectangle shape for UI elements
function createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    // Improved smoothness with more points in corners
    const segments = 8; // Number of segments in each corner curve
    
    // Start from bottom left
    shape.moveTo(-halfWidth + radius, -halfHeight);
    
    // Bottom edge
    shape.lineTo(halfWidth - radius, -halfHeight);
    
    // Bottom right corner
    for (let i = 0; i <= segments; i++) {
        const angle = Math.PI / 2 * i / segments;
        const x = halfWidth - radius + Math.cos(angle + Math.PI / 2) * radius;
        const y = -halfHeight + radius - Math.cos(angle) * radius;
        shape.lineTo(x, y);
    }
    
    // Right edge
    shape.lineTo(halfWidth, halfHeight - radius);
    
    // Top right corner
    for (let i = 0; i <= segments; i++) {
        const angle = Math.PI / 2 * i / segments;
        const x = halfWidth - radius + Math.cos(angle) * radius;
        const y = halfHeight - radius + Math.sin(angle) * radius;
        shape.lineTo(x, y);
    }
    
    // Top edge
    shape.lineTo(-halfWidth + radius, halfHeight);
    
    // Top left corner
    for (let i = 0; i <= segments; i++) {
        const angle = Math.PI / 2 * i / segments;
        const x = -halfWidth + radius - Math.sin(angle) * radius;
        const y = halfHeight - radius + Math.cos(angle) * radius;
        shape.lineTo(x, y);
    }
    
    // Left edge
    shape.lineTo(-halfWidth, -halfHeight + radius);
    
    // Bottom left corner
    for (let i = 0; i <= segments; i++) {
        const angle = Math.PI / 2 * i / segments;
        const x = -halfWidth + radius - Math.cos(angle) * radius;
        const y = -halfHeight + radius - Math.sin(angle) * radius;
        shape.lineTo(x, y);
    }
    
    shape.closePath();
    return shape;
}

// Create a screen with enhanced visuals and gradient background
function enhancedCreateScreen(position, size, title = 'Screen', content = null) {
    const width = size.x || 1;
    const height = size.y || 0.6;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    // Create screen group
    const screen = new THREE.Group();
    screen.position.copy(position);
    
    // Create screen background with gradient
    const backgroundGeometry = new THREE.PlaneGeometry(width, height);
    
    // Create gradient background texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512 * (height / width);
    const ctx = canvas.getContext('2d');
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#121212');    // Very dark gray at top
    gradient.addColorStop(1, '#000000');    // Pure black at bottom
    
    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle ambient patterns/highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    
    // Add a subtle vignette effect
    const grd = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width
    );
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create texture from canvas
    const backgroundTexture = new THREE.CanvasTexture(canvas);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
        map: backgroundTexture,
        side: THREE.DoubleSide
    });
    
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = -0.01; // Slightly behind content
    screen.add(background);
    
    // Create screen content
    let contentTexture;
    if (content === null) {
        // Use video texture if available, otherwise fallback
        import('./ar_media.js').then(mediaModule => {
            if (mediaModule.videoTexture) {
                contentTexture = mediaModule.videoTexture;
                applyTexture(contentTexture);
            } else {
                contentTexture = createFallbackTexture(screens.length + 1);
                applyTexture(contentTexture);
            }
        }).catch(err => {
            console.error("Error importing video module:", err);
            contentTexture = createFallbackTexture(screens.length + 1);
            applyTexture(contentTexture);
        });
    } else if (typeof content === 'string') {
        // Create texture from URL
        const textureLoader = new THREE.TextureLoader();
        contentTexture = textureLoader.load(content, 
            // onLoad callback
            function(texture) {
                applyTexture(texture);
            },
            // onProgress callback
            undefined,
            // onError callback
            function(err) {
                console.error('Error loading texture:', err);
                contentTexture = createFallbackTexture(screens.length + 1);
                applyTexture(contentTexture);
            }
        );
    } else {
        // Assume content is already a texture
        contentTexture = content;
        applyTexture(contentTexture);
    }
    
    function applyTexture(texture) {
        // Content area (slightly smaller than background)
        const contentWidth = width * 0.95;
        const contentHeight = height * 0.95;
        const contentGeometry = new THREE.PlaneGeometry(contentWidth, contentHeight);
        const contentMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        const content = new THREE.Mesh(contentGeometry, contentMaterial);
        content.position.z = 0; // On top of background
        screen.add(content);
        
        // Update screen's userData
        screen.userData.width = width;
        screen.userData.height = height;
        screen.userData.content = content;
        
        // Make video texture available to the screen
        if (texture && content && screen.userData) {
            screen.userData.videoTexture = texture;
        }
    }
    
    // Add top bar for dragging with rounded corners
    const barHeight = height * 0.08;
    
    // Create top bar with rounded corners
    const topBarShape = createRoundedRectShape(width, barHeight, 0.01);
    const topBarGeometry = new THREE.ShapeGeometry(topBarShape);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    topBar.position.set(0, halfHeight - barHeight/2, 0.005);
    topBar.userData = {
        type: 'dragHandle',
        screen: screen
    };
    screen.add(topBar);
    
    // Store reference to drag handle
    screen.userData.dragHandle = topBar;
    
    // Create a more modern grip pattern to indicate draggability
    const gripWidth = width * 0.2;
    const gripGeometry = new THREE.PlaneGeometry(gripWidth, barHeight * 0.5);
    const gripCanvas = document.createElement('canvas');
    gripCanvas.width = 128;
    gripCanvas.height = 32;
    const gripCtx = gripCanvas.getContext('2d');
    
    // Draw grip dots
    gripCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const dotRadius = 2;
    const dotSpacing = 12;
    const startX = (gripCanvas.width - (dotRadius * 2 * 3 + dotSpacing * 2)) / 2;
    const centerY = gripCanvas.height / 2;
    
    for (let i = 0; i < 3; i++) {
        gripCtx.beginPath();
        gripCtx.arc(startX + i * (dotRadius * 2 + dotSpacing), centerY, dotRadius, 0, Math.PI * 2);
        gripCtx.fill();
    }
    
    const gripTexture = new THREE.CanvasTexture(gripCanvas);
    const gripMaterial = new THREE.MeshBasicMaterial({
        map: gripTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.z = 0.001; // Slightly above top bar
    topBar.add(grip);
    
    // Add title text
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 256;
    titleCanvas.height = 32;
    const titleCtx = titleCanvas.getContext('2d');
    
    titleCtx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
    titleCtx.fillRect(0, 0, titleCanvas.width, titleCanvas.height);
    
    titleCtx.font = '16px Arial';
    titleCtx.textAlign = 'left';
    titleCtx.textBaseline = 'middle';
    titleCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    titleCtx.fillText(title, 10, titleCanvas.height/2);
    
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleGeometry = new THREE.PlaneGeometry(width * 0.6, barHeight * 0.7);
    const titleMaterial = new THREE.MeshBasicMaterial({
        map: titleTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(-width * 0.15, 0, 0.001); // Left-aligned, slightly above top bar
    topBar.add(titleMesh);
    
    // Add screen to list immediately
    screen.userData = {
        type: 'screen',
        id: 'screen_' + (screens.length + 1),
        title: title,
        width: width,
        height: height,
        controls: {},
        // Store initial values
        originalScale: new THREE.Vector3(1, 1, 1),
        originalPosition: position.clone()
    };
    
    screens.push(screen);
    
    return screen;
}

// Create a control button with rounded shape
function addControlButton(screen, type, x, y, size) {
    // Create a circular button for better touch target
    const buttonSize = size || 0.05; // Increased size for better touchability
    const buttonGeometry = new THREE.CircleGeometry(buttonSize, 32);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, 0.01);
    button.userData = {
        type: 'button',
        action: type + 'Button',
        size: buttonSize
    };
    
    // Create button icon
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 128;
    iconCanvas.height = 128;
    const ctx = iconCanvas.getContext('2d');
    
    // Draw icon based on type
    const iconTexture = createControlIcon(type);
    const iconGeometry = new THREE.PlaneGeometry(buttonSize * 1.4, buttonSize * 1.4);
    const iconMaterial = new THREE.MeshBasicMaterial({
        map: iconTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    icon.position.z = 0.001;
    button.add(icon);
    
    // Add subtle 3D effect with a glow
    const glowSize = buttonSize * 1.2;
    const glowGeometry = new THREE.CircleGeometry(glowSize, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.001;
    button.add(glow);
    
    // Add to screen
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

// Create a fallback texture with rounded corners
function createFallbackTexture(screenNumber) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Fill with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#212121');
    gradient.addColorStop(1, '#121212');
    ctx.fillStyle = gradient;
    
    // Draw rounded rectangle background
    const radius = 20;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.fill();
    
    // Add subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Add screen number and loading text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Screen ${screenNumber}`, canvas.width/2, canvas.height/2 - 40);
    
    ctx.font = '24px Arial';
    ctx.fillText('Loading content...', canvas.width/2, canvas.height/2 + 20);
    
    // Add a subtle loading animation indicator
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2 + 80, 20, 0, Math.PI * 1.5);
    ctx.stroke();
    
    // Create texture
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

// Create a resize handle for the corner of the screen
function createResizeHandle(size) {
    const group = new THREE.Group();
    
    // Create the handle background
    const handleGeometry = new THREE.CircleGeometry(size, 32);
    const handleMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthTest: true
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    group.add(handle);
    
    // Create diagonal resize icon
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Draw diagonal arrows
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw diagonal line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(46, 46);
    ctx.stroke();
    
    // Draw arrowheads
    ctx.beginPath();
    ctx.moveTo(46, 46);
    ctx.lineTo(46, 38);
    ctx.moveTo(46, 46);
    ctx.lineTo(38, 46);
    ctx.stroke();
    
    // Create texture from canvas
    const iconTexture = new THREE.CanvasTexture(canvas);
    const iconMaterial = new THREE.MeshBasicMaterial({
        map: iconTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    // Create icon mesh
    const iconSize = size * 0.8;
    const iconGeometry = new THREE.PlaneGeometry(iconSize * 2, iconSize * 2);
    const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    iconMesh.position.z = 0.001; // Slightly in front
    group.add(iconMesh);
    
    // Add handle properties
    group.userData = {
        type: 'resizeHandle',
        dragType: 'resize'
    };
    
    return group;
}

// Toggle screen resizing visuals
export function toggleResize(screen, isResizing) {
    if (!screen) return;
    
    // Get current scale of the screen
    const currentScale = screen.scale.clone();
    
    if (isResizing) {
        // Store original scale if not already stored
        if (!screen.userData.originalScale) {
            screen.userData.originalScale = currentScale.clone();
        }
        
        // Add resize visual cues - show a slight pulsing effect
        const pulseAnimation = () => {
            if (!screen || !screen.userData || screen.userData.isResizing !== true) return;
            
            // Create a subtle pulse effect
            const time = Date.now() * 0.001; // Convert to seconds
            const pulseScale = 1 + Math.sin(time * 5) * 0.02; // Small 2% pulse
            
            // Apply to the scale but maintain aspect ratio
            screen.scale.copy(currentScale);
            screen.scale.multiplyScalar(pulseScale);
            
            // Add a thin highlight border around the screen
            if (!screen.userData.resizeBorder) {
                const width = screen.userData.width || 1;
                const height = screen.userData.height || 0.6;
                
                // Create a wireframe border
                const borderGeom = new THREE.EdgesGeometry(
                    new THREE.PlaneGeometry(width, height)
                );
                const borderMat = new THREE.LineBasicMaterial({
                    color: 0x4FC3F7,
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.8
                });
                const border = new THREE.LineSegments(borderGeom, borderMat);
                border.position.z = 0.005; // Slightly in front
                screen.add(border);
                
                // Store reference
                screen.userData.resizeBorder = border;
            }
            
            // Request next frame if still resizing
            if (screen.userData.isResizing === true) {
                requestAnimationFrame(pulseAnimation);
            }
        };
        
        // Start the pulse animation
        screen.userData.isResizing = true;
        requestAnimationFrame(pulseAnimation);
        
    } else {
        // Stop resizing mode
        screen.userData.isResizing = false;
        
        // Remove resize border if it exists
        if (screen.userData.resizeBorder) {
            screen.remove(screen.userData.resizeBorder);
            screen.userData.resizeBorder.geometry.dispose();
            screen.userData.resizeBorder.material.dispose();
            delete screen.userData.resizeBorder;
        }
        
        // Ensure the original scale is saved (might have been modified by pinch)
        if (screen.userData.originalScale) {
            // Make sure we don't reset to original, keep current scale
            screen.userData.originalScale = screen.scale.clone();
        }
        
        // Update screen content based on new size
        updateScreenContent(screen);
    }
}

// Update screen content after resize
function updateScreenContent(screen) {
    if (!screen) return;
    
    // If screen has content texture or material, update it
    screen.children.forEach(child => {
        if (child.material && child.material.map) {
            child.material.needsUpdate = true;
        }
    });
    
    // Update layout of controls if any
    if (screen.userData.controls) {
        Object.values(screen.userData.controls).forEach(control => {
            if (control && control.position) {
                // This will force controls to update their positions
                if (control.userData && control.userData.updateLayout) {
                    control.userData.updateLayout();
                }
            }
        });
    }
    
    // If screen has a video texture, adjust video element size
    if (screen.userData.videoTexture) {
        const videoElement = screen.userData.videoElement;
        
        if (videoElement) {
            // Update video resolution to match new screen size
            const aspectRatio = screen.userData.width / screen.userData.height;
            
            // Set appropriate video quality based on screen size
            let videoQuality = 360; // Default
            
            if (screen.scale.x > 1.5) {
                videoQuality = 720;
            } else if (screen.scale.x < 0.7) {
                videoQuality = 240;
            }
            
            // Apply changes if needed
            if (videoElement.dataset.quality !== String(videoQuality)) {
                videoElement.dataset.quality = String(videoQuality);
                
                // If there's a function to update quality, call it
                if (typeof updateVideoQuality === 'function') {
                    updateVideoQuality(videoElement, videoQuality);
                }
            }
        }
    }
} 