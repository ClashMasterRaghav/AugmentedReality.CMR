// Default screen functionality for AR
import * as THREE from "three";
import { scene, camera } from "./ar_core.js";
import { videoTexture } from "./ar_media.js";
import { selectScreen } from "./ar_screens.js";

// Create a default screen with standardized functionality
export function createDefaultScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    console.log("Creating default screen with ID:", screenId, "at position:", position);
    
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Screen ${screenId || "Default"}`;
    
    console.log("Default screen config:", { size, title });
    
    // Check if videoTexture is available, create fallback if not
    let screenTexture = videoTexture;
    if (!screenTexture) {
        console.warn("Video texture not available, creating fallback texture");
        // Create a fallback texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a237e'); // Indigo
        gradient.addColorStop(1, '#303f9f'); // Lighter indigo
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add welcome text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Welcome to AR Experience', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.font = '20px Arial';
        ctx.fillText('Touch the control panel to create screens', canvas.width / 2, canvas.height / 2 + 20);
        
        screenTexture = new THREE.CanvasTexture(canvas);
    }
    
    // Create the screen container 
    console.log("Creating enhanced screen with title:", title);
    const defaultScreen = enhancedCreateScreen(
        position,
        size,
        title,
        screenTexture
    );
    
    console.log("Enhanced screen created:", defaultScreen);
    
    // Add basic identification data
    defaultScreen.userData = { 
        type: "screen",
        id: screenId,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: "default"
    };
    
    // Add drop shadow for depth
    addDropShadow(defaultScreen, screenWidth, screenHeight);
    
    // Add border with styling
    const borderGeometry = new THREE.PlaneGeometry(
        screenWidth + 0.02,
        screenHeight + 0.02
    );
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, // Dark gray border
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    defaultScreen.add(borderPanel);
    
    // Set up drag handle
    const topBar = defaultScreen.children.find(
        (child) => child.userData && child.userData.type === "dragHandle"
    );
    
    if (topBar) {
        topBar.userData.screen = defaultScreen;
        defaultScreen.userData.dragHandle = topBar;
    } else {
        console.warn("No drag handle found in default screen");
    }
    
    // Add entrance animation
    animateScreenEntrance(defaultScreen);
    
    console.log("Default screen creation complete, ID:", defaultScreen.userData.id);
    
    return defaultScreen;
}

// Enhanced screen creation function with modern UI
export function enhancedCreateScreen(position, size, title = "Screen", content = null) {
    // Create the screen container
    const screen = new THREE.Group();
    
    // Define screen dimensions
    const screenWidth = size.x;
    const screenHeight = size.y;
    const topBarHeight = 0.06; // Thinner top bar
    
    // Content background - create this first so it's behind the top bar
    const backgroundGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    let backgroundMaterial;
    
    if (content && content.isTexture) {
        // Use provided texture
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: content,
            side: THREE.DoubleSide,
            depthTest: true
        });
    } else {
        // Default subtle dark background with gradient
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext("2d");
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(1, "#16213e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add subtle pattern
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 3 + 1;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            depthTest: true
        });
    }
    
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = 0.003;
    background.renderOrder = 1010;
    screen.add(background);
    
    // Create a solid black top bar that spans the entire width
    const topBarGeometry = new THREE.PlaneGeometry(screenWidth, topBarHeight);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x111111,
        transparent: false,
        side: THREE.DoubleSide,
        depthTest: true
    });
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    topBar.position.set(0, screenHeight / 2 - topBarHeight / 2, 0.004);
    topBar.renderOrder = 10;
    topBar.userData = {
        type: "dragHandle",
        isTopBar: true,
        screen: screen,
        originalColor: topBarMaterial.color.getHex()
    };
    screen.add(topBar);
    
    // Create a modern grip pattern to indicate draggability
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    
    // Create a gradient background for the top bar
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a subtle border at the bottom
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, canvas.height - 1, canvas.width, 1);
    
    // Draw screen title with improved typography
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Add text shadow for better readability
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(title, canvas.width / 2, canvas.height / 2);
    ctx.shadowColor = "transparent";
    
    // Add modern grip indicator
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    const dotRadius = 1.5;
    const dotSpacing = 12;
    const dotsStartX = canvas.width - 100;
    const dotsY = canvas.height / 2;
    
    // Draw the dots with a more modern arrangement
    for (let i = 0; i < 3; i++) {
        const x = dotsStartX + i * dotSpacing;
        ctx.beginPath();
        ctx.arc(x, dotsY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Apply the canvas as a texture to the top bar
    const topBarTexture = new THREE.CanvasTexture(canvas);
    topBarTexture.anisotropy = 4;
    topBarMaterial.map = topBarTexture;
    topBarMaterial.needsUpdate = true;
    
    // Add video control buttons if content is a video texture
    if (content && content.isVideoTexture) {
        // Add play/pause button to bottom left
        const playButton = addControlButton(
            screen,
            "pause",
            -screenWidth / 2 + 0.05,
            -screenHeight / 2 + 0.05,
            0.03
        );
        playButton.userData.videoControl = true;
        playButton.userData.videoAction = "togglePlayback";
        playButton.userData.action = "playButton";
        
        // Add volume button to bottom right
        const volumeButton = addControlButton(
            screen,
            "muted",
            screenWidth / 2 - 0.05,
            -screenHeight / 2 + 0.05,
            0.03
        );
        volumeButton.userData.videoControl = true;
        volumeButton.userData.videoAction = "toggleMute";
        volumeButton.userData.action = "volumeButton";
        
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
    // Create button with circular background
    const buttonGeometry = new THREE.CircleGeometry(size, 32);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, 0.005);
    button.renderOrder = 1020;
    button.userData = {
        type: "button",
        action: type
    };
    
    // Create icon
    createControlIcon(type).then(iconTexture => {
        const iconSize = size * 0.8;
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.001;
        button.add(iconMesh);
    });
    
    screen.add(button);
    return button;
}

// Create control button icons
function createControlIcon(type) {
    const canvas = document.createElement("canvas");
    canvas.width = 128; // Increased size for better quality
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Map icon types to local file paths
    const logoURLs = {
        play: "examples/textures/ar_icons/play-buttton.png",
        pause: "examples/textures/ar_icons/pause-button.png",
        volume: "examples/textures/ar_icons/unmute.png",
        muted: "examples/textures/ar_icons/mute.png"
    };
    
    // Create a promise to handle async loading
    return new Promise((resolve) => {
        // Create a fallback icon using canvas drawing
        function createFallbackIcon() {
            ctx.fillStyle = "#ffffff";
            ctx.font = "30px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // Draw different icons based on type
            switch(type) {
                case 'play':
                    // Draw play triangle
                    ctx.beginPath();
                    ctx.moveTo(42, 32);
                    ctx.lineTo(42, 96);
                    ctx.lineTo(96, 64);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'pause':
                    // Draw pause bars
                    ctx.fillRect(42, 32, 20, 64);
                    ctx.fillRect(72, 32, 20, 64);
                    break;
                case 'volume':
                    // Draw speaker icon
                    ctx.beginPath();
                    ctx.moveTo(40, 48);
                    ctx.lineTo(56, 48);
                    ctx.lineTo(72, 32);
                    ctx.lineTo(72, 96);
                    ctx.lineTo(56, 80);
                    ctx.lineTo(40, 80);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Draw sound waves
                    ctx.beginPath();
                    ctx.arc(80, 64, 12, -Math.PI/3, Math.PI/3);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(80, 64, 24, -Math.PI/3, Math.PI/3);
                    ctx.stroke();
                    break;
                case 'muted':
                    // Draw muted speaker
                    ctx.beginPath();
                    ctx.moveTo(40, 48);
                    ctx.lineTo(56, 48);
                    ctx.lineTo(72, 32);
                    ctx.lineTo(72, 96);
                    ctx.lineTo(56, 80);
                    ctx.lineTo(40, 80);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Draw X over it
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(80, 48);
                    ctx.lineTo(104, 80);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(104, 48);
                    ctx.lineTo(80, 80);
                    ctx.stroke();
                    break;
                default:
                    // Text fallback for unknown types
                    ctx.fillText(type.toUpperCase(), canvas.width / 2, canvas.height / 2);
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            resolve(texture);
        }
        
        // Try to load image if URL exists
        if (logoURLs[type]) {
            const img = new Image();
            img.onload = function() {
                // Draw image centered on canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Create texture from canvas
                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                resolve(texture);
            };
            
            img.onerror = function() {
                console.warn(`Failed to load icon image for: ${type}, using fallback`);
                createFallbackIcon();
            };
            
            // Set image source
            img.src = logoURLs[type];
        } else {
            // Fallback if no logo URL is available
            console.warn(`No icon URL defined for type: ${type}, using fallback`);
            createFallbackIcon();
        }
    });
}

// Add a drop shadow for better depth perception
export function addDropShadow(screen, width, height) {
    // Create a larger, darker plane behind the screen
    const shadowWidth = width + 0.06; 
    const shadowHeight = height + 0.06;
    const shadowGeometry = new THREE.PlaneGeometry(shadowWidth, shadowHeight);
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.position.z = -0.005; // Behind the screen
    shadowMesh.renderOrder = 980; // Even lower render order
    shadowMesh.userData.type = "shadow";
    
    screen.add(shadowMesh);
    
    // Add a subtle glow with darker blue color
    const glowGeometry = new THREE.PlaneGeometry(width + 0.01, height + 0.01);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a237e, // Dark blue glow (indigo 900)
        transparent: true,
        opacity: 0.0, // Start invisible, will show when selected
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthTest: true
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.003; // Between screen and shadow
    glowMesh.renderOrder = 985; // Between shadow and border
    glowMesh.userData.type = "glow";
    
    screen.add(glowMesh);
    screen.userData.glowMesh = glowMesh;
}

// Animate screen entrance with a scale-up and fade-in effect
export function animateScreenEntrance(screen) {
    // Store original scale
    const targetScale = screen.scale.clone();
    
    // Start small and scale up
    screen.scale.set(0.5, 0.5, 0.5);
    
    // Animate to full size
    const duration = 300; // milliseconds
    const startTime = performance.now();
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out for smoother animation
        const easedProgress = progress < 0.5
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Scale up
        screen.scale.lerpVectors(
            new THREE.Vector3(0.5, 0.5, 0.5),
            targetScale,
            easedProgress
        );
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
} 