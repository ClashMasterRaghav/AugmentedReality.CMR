// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoTexture } from './ar_media.js';

// Array to store screen objects
export let screens = [];

// Helper function to create a rounded rectangle geometry
function createRoundedRectGeometry(width, height, radius, segments = 8) {
    // Create shape with rounded corners
    const shape = new THREE.Shape();
    
    // Start at top left, just after the corner
    shape.moveTo(-width/2 + radius, -height/2);
    
    // Bottom edge with bottom-right corner
    shape.lineTo(width/2 - radius, -height/2);
    shape.absarc(width/2 - radius, -height/2 + radius, radius, Math.PI * 1.5, Math.PI * 2, false);
    
    // Right edge with top-right corner
    shape.lineTo(width/2, height/2 - radius);
    shape.absarc(width/2 - radius, height/2 - radius, radius, 0, Math.PI * 0.5, false);
    
    // Top edge with top-left corner
    shape.lineTo(-width/2 + radius, height/2);
    shape.absarc(-width/2 + radius, height/2 - radius, radius, Math.PI * 0.5, Math.PI, false);
    
    // Left edge with bottom-left corner
    shape.lineTo(-width/2, -height/2 + radius);
    shape.absarc(-width/2 + radius, -height/2 + radius, radius, Math.PI, Math.PI * 1.5, false);
    
    // Create geometry from shape
    const geometry = new THREE.ShapeGeometry(shape, segments);
    return geometry;
}

// Create a new browser screen
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.5)) {
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
    
    // Add border for better visibility with rounded corners
    const cornerRadius = 0.04; // Rounded corner radius
    const borderGeometry = createRoundedRectGeometry(screenWidth + 0.02, screenHeight + 0.02, cornerRadius);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, // Dark gray border
        side: THREE.DoubleSide
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    browserWindow.add(borderPanel);
    
    // Add a subtle glow effect around the border
    const glowGeometry = createRoundedRectGeometry(screenWidth + 0.04, screenHeight + 0.04, cornerRadius + 0.01);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide
    });
    const glowBorder = new THREE.Mesh(glowGeometry, glowMaterial);
    glowBorder.position.z = -0.002;
    glowBorder.userData.isGlow = true;
    browserWindow.add(glowBorder);
    browserWindow.userData.glowBorder = glowBorder;
    
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
    
    // Add a subtle "appear" animation
    browserWindow.scale.set(0.8, 0.8, 1);
    browserWindow.userData.originalOpacity = borderMaterial.opacity;
    borderMaterial.opacity = 0.6;
    
    // Animate scale and opacity
    const startTime = performance.now();
    const duration = 400; // ms
    
    function animateAppear() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out progress
        const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Scale up and fade in
        browserWindow.scale.set(
            0.8 + (0.2 * easedProgress),
            0.8 + (0.2 * easedProgress),
            1
        );
        
        borderMaterial.opacity = 0.6 + (0.4 * easedProgress);
        
        if (progress < 1) {
            requestAnimationFrame(animateAppear);
        } else {
            browserWindow.scale.set(1, 1, 1);
            borderMaterial.opacity = 1.0;
        }
    }
    
    requestAnimationFrame(animateAppear);
    
    console.log("Created screen with ID:", browserWindow.userData.id);
    
    // Select this as the current screen
    selectScreen(browserWindow);
    
    return browserWindow;
}

// Enhanced screen creation function with modern UI
function enhancedCreateScreen(position, size, title = 'Screen', content = null) {
    // Create the screen container
    const screen = new THREE.Group();
    
    // Define screen dimensions
    const screenWidth = size.x;
    const screenHeight = size.y;
    const topBarHeight = 0.06; // Thinner top bar
    const cornerRadius = 0.04; // Rounded corner radius
    
    // Content background - create this first so it's behind the top bar
    // Use rounded corners for the content background
    const backgroundGeometry = createRoundedRectGeometry(screenWidth, screenHeight, cornerRadius);
    let backgroundMaterial;
    
    if (content && content.isVideoTexture) {
        // Use video texture if provided with correct aspect ratio handling
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: content,
            side: THREE.DoubleSide,
            depthTest: false
        });
        
        // Video aspect ratio is handled in ar_media.js, so we don't need to duplicate it here
    } else {
        // Default subtle dark background
        backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x121212,
            side: THREE.DoubleSide,
            depthTest: false
        });
        
        // Create a fallback texture with loading indicator if needed
        if (!content) {
            const fallbackTexture = createFallbackTexture(title.split(' ').pop() || '1');
            backgroundMaterial.map = fallbackTexture;
        }
    }
    
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.set(0, 0, 0.002);
    background.renderOrder = 1;
    screen.add(background);
    
    // Create a solid black top bar that spans the width but respects the rounded corners at the top
    // For top bar, we use a custom shape to match the top rounded corners
    const topBarShape = new THREE.Shape();
    
    // Start at bottom left of top bar
    topBarShape.moveTo(-screenWidth/2, screenHeight/2 - topBarHeight);
    
    // Bottom edge (straight)
    topBarShape.lineTo(screenWidth/2, screenHeight/2 - topBarHeight);
    
    // Right edge with top-right corner
    topBarShape.lineTo(screenWidth/2, screenHeight/2 - cornerRadius);
    topBarShape.absarc(
        screenWidth/2 - cornerRadius, 
        screenHeight/2 - cornerRadius, 
        cornerRadius, 
        0, 
        Math.PI * 0.5, 
        false
    );
    
    // Top edge with top-left corner
    topBarShape.lineTo(-screenWidth/2 + cornerRadius, screenHeight/2);
    topBarShape.absarc(
        -screenWidth/2 + cornerRadius, 
        screenHeight/2 - cornerRadius, 
        cornerRadius, 
        Math.PI * 0.5, 
        Math.PI, 
        false
    );
    
    // Close the shape
    topBarShape.lineTo(-screenWidth/2, screenHeight/2 - topBarHeight);
    
    const topBarGeometry = new THREE.ShapeGeometry(topBarShape);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x111111, // Solid black color
        transparent: false, // No transparency
        side: THREE.DoubleSide,
        depthTest: true // Enable depth testing to prevent seeing through
    });
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    topBar.position.z = 0.004;
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
        // Move play button to bottom left
        const playButton = addControlButton(screen, 'play', -screenWidth/2 + 0.05, -screenHeight/2 + 0.05, 0.03);
        playButton.userData.videoControl = true;
        playButton.userData.videoAction = 'togglePlayback';
        
        // Keep volume button on bottom right, but initialize with muted icon
        const volumeButton = addControlButton(screen, 'muted', screenWidth/2 - 0.05, -screenHeight/2 + 0.05, 0.03);
        volumeButton.userData.videoControl = true;
        volumeButton.userData.videoAction = 'toggleMute';
        volumeButton.userData.action = 'volumeButton'; // Set the action name to what ar_media.js expects
        
        // Store controls in userData
        screen.userData.controls = {
            isPlaying: true,
            isMuted: true,
            playButton: playButton,
            volumeButton: volumeButton
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
            // Draw play icon (triangle)
            ctx.beginPath();
            ctx.moveTo(22, 16);
            ctx.lineTo(22, 48);
            ctx.lineTo(48, 32);
            ctx.closePath();
            ctx.fill();
            break;
        
        case 'pause': 
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
            
        case 'muted':
            // Draw muted icon - speaker with X
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
            
            // X mark for mute - make it more visible
            ctx.lineWidth = 3.5; // Thicker line for better visibility
            ctx.strokeStyle = '#ff5555'; // Red color for emphasis
            
            // Draw a slightly larger X
            ctx.beginPath();
            ctx.moveTo(36, 20);
            ctx.lineTo(54, 44);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(36, 44);
            ctx.lineTo(54, 20);
            ctx.stroke();
            
            // Reset styles for next elements
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#ffffff';
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
            
        default:
            // For any unrecognized type, draw a question mark
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', canvas.width/2, canvas.height/2);
            console.warn('Unknown icon type:', type);
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
            child.geometry && child.geometry.type === 'ShapeGeometry' && 
            Math.abs(child.position.z - (-0.001)) < 0.0001);
            
        if (borderMesh) {
            borderMesh.material.color.set(0x444444); // Dark gray border
            borderMesh.material.opacity = 0.7;
        }
        
        // Hide glow effect
        const glowBorder = selectedScreen.userData.glowBorder;
        if (glowBorder) {
            glowBorder.material.opacity = 0.0;
        }
        
        // Stop any animations
        if (selectedScreen.userData.selectionAnimation) {
            cancelAnimationFrame(selectedScreen.userData.selectionAnimation);
            selectedScreen.userData.selectionAnimation = null;
        }
        
        selectedScreen.userData.isSelected = false;
    }
    
    // Select new screen
    screen.userData.isSelected = true;
    
    // Highlight border for selected screen
    const borderMesh = screen.children.find(child => 
        child.geometry && child.geometry.type === 'ShapeGeometry' && 
        Math.abs(child.position.z - (-0.001)) < 0.0001);
        
    if (borderMesh) {
        borderMesh.material.color.set(0x4CAF50); // Green border
        borderMesh.material.opacity = 1.0;
    }
    
    // Show and animate glow effect
    const glowBorder = screen.userData.glowBorder;
    if (glowBorder) {
        // Start with a subtle glow
        glowBorder.material.opacity = 0.2;
        
        // Create pulsing animation for the glow
        const startTime = performance.now();
        
        function animateGlow() {
            const elapsed = performance.now() - startTime;
            // Create a 1.5-second pulse cycle
            const pulseProgress = (elapsed % 1500) / 1500;
            
            // Use a sine wave to create smooth pulsing (range 0.2 to 0.5)
            const opacity = 0.2 + (Math.sin(pulseProgress * Math.PI * 2) * 0.15 + 0.15);
            glowBorder.material.opacity = opacity;
            
            // Store animation reference for cancellation
            screen.userData.selectionAnimation = requestAnimationFrame(animateGlow);
        }
        
        // Start the animation
        screen.userData.selectionAnimation = requestAnimationFrame(animateGlow);
    }
    
    // Create a subtle "selected" animation
    const originalScale = screen.scale.clone();
    screen.scale.set(originalScale.x * 1.05, originalScale.y * 1.05, originalScale.z);
    
    // Animate back to original scale with a slight bounce
    const scaleStartTime = performance.now();
    const scaleDuration = 300; // ms
    
    function animateScale() {
        const elapsed = performance.now() - scaleStartTime;
        const progress = Math.min(elapsed / scaleDuration, 1);
        
        if (progress < 1) {
            // Ease out with slight bounce
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const bounceEffect = Math.sin(progress * Math.PI * (1 + progress * 2)) * 0.03 * (1 - progress);
            
            screen.scale.set(
                originalScale.x * (1 + 0.05 * (1 - easedProgress) + bounceEffect),
                originalScale.y * (1 + 0.05 * (1 - easedProgress) + bounceEffect),
                originalScale.z
            );
            
            requestAnimationFrame(animateScale);
        } else {
            // Ensure we end exactly at the original scale
            screen.scale.copy(originalScale);
        }
    }
    
    requestAnimationFrame(animateScale);
    
    // Position keyboard under selected screen if needed
    if (virtualKeyboard) {
        updateKeyboardPosition(screen);
    }
    
    // Store selected screen reference
    selectedScreen = screen;
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
    // Get current time for animations
    const time = Date.now() * 0.001;
    
    screens.forEach(screen => {
        // Add subtle hover/float effect to all screens
        if (!screen.userData.lastHoverY) {
            screen.userData.lastHoverY = screen.position.y;
            screen.userData.hoverOffset = Math.random(); // Random offset for variation
        }
        
        // Very subtle floating motion (less than 1cm)
        const floatAmount = 0.003; // Maximum float amount
        const floatSpeed = 0.5; // Speed of float cycle
        const newY = screen.userData.lastHoverY + 
            Math.sin((time + screen.userData.hoverOffset) * floatSpeed) * floatAmount;
        
        // Apply with very slight lerp for smoothness
        screen.position.y = screen.position.y * 0.97 + newY * 0.03;
        
        // Add screen-specific effects for selected screen
        if (screen.userData.isSelected) {
            // The main selection effects are now handled in the selectScreen function
            
            // Add subtle shadow pulsing if there's a glow border
            const glowBorder = screen.userData.glowBorder;
            if (glowBorder && !screen.userData.selectionAnimation) {
                // Only apply this if the selectScreen animation isn't running
                const pulseIntensity = (Math.sin(time * 2) * 0.1) + 0.9;
                glowBorder.material.opacity = 0.2 * pulseIntensity;
            }
            
            // Very subtle rotation sway for selected screen (less than 1 degree)
            const rotAmount = 0.005; // About 0.3 degrees
            screen.rotation.y = Math.sin(time * 0.8) * rotAmount;
            screen.rotation.x = Math.sin(time * 0.5) * rotAmount * 0.5;
        }
        
        // Add interaction feedback for buttons on hover
        screen.children.forEach(child => {
            if (child.userData && child.userData.type === 'button') {
                // If the button is being hovered
                if (child.userData.isHovered) {
                    // Add subtle pulsing effect for hovered buttons
                    const hoverPulse = (Math.sin(time * 5) * 0.1) + 0.95;
                    child.scale.set(hoverPulse, hoverPulse, 1);
                }
            }
        });
    });
} 