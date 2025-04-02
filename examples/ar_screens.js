// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen, setSelectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoTexture } from './ar_media.js';

// Array to store screen objects
export let screens = [];

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
        originalScale: new THREE.Vector3(1, 1, 1), // Store original scale to prevent scaling issues
        contentType: 'video'
    };
    
    // Add drop shadow for depth and better visual appearance
    addDropShadow(browserWindow, screenWidth, screenHeight);
    
    // Add border with improved styling
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, // Dark gray border
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
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
    
    // Add entrance animation
    animateScreenEntrance(browserWindow);
    
    console.log("Created screen with ID:", browserWindow.userData.id);
    
    // Select this as the current screen
    selectScreen(browserWindow);
    
    return browserWindow;
}

// Create a new YouTube screen
export function createYouTubeScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `YouTube ${screens.length + 1}`;
    
    console.log("Creating YouTube screen with iframe");
    
    // Create iframe content texture
    const iframeTexture = createIframeTexture("https://www.youtube.com/embed?enablejsapi=1", 1024, 768);
    
    // Create the screen container
    const youtubeScreen = enhancedCreateScreen(position, size, title, iframeTexture);
    
    // Add basic identification data
    youtubeScreen.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'youtube'
    };
    
    // Add shadow and border
    addDropShadow(youtubeScreen, screenWidth, screenHeight);
    
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xE62117, // YouTube red color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990; // Ensure it's behind the content
    youtubeScreen.add(borderPanel);
    
    // Update drag handle reference
    const topBar = youtubeScreen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = youtubeScreen;
        youtubeScreen.userData.dragHandle = topBar;
    }
    
    // Add to scene and screens array
    scene.add(youtubeScreen);
    screens.push(youtubeScreen);
    
    // Add entrance animation
    animateScreenEntrance(youtubeScreen);
    
    console.log("Created YouTube screen with ID:", youtubeScreen.userData.id);
    
    // Select this as the current screen
    selectScreen(youtubeScreen);
    
    return youtubeScreen;
}

// Create a new DuckDuckGo search screen
export function createDuckDuckGoScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `DuckDuckGo ${screens.length + 1}`;
    
    console.log("Creating DuckDuckGo screen with iframe");
    
    // Create iframe content texture
    const iframeTexture = createIframeTexture("https://duckduckgo.com/", 1024, 768);
    
    // Create the screen container
    const duckduckgoScreen = enhancedCreateScreen(position, size, title, iframeTexture);
    
    // Add basic identification data
    duckduckgoScreen.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'duckduckgo'
    };
    
    // Add shadow and border
    addDropShadow(duckduckgoScreen, screenWidth, screenHeight);
    
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xDE5833, // DuckDuckGo orange color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990; // Ensure it's behind the content
    duckduckgoScreen.add(borderPanel);
    
    // Update drag handle reference
    const topBar = duckduckgoScreen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = duckduckgoScreen;
        duckduckgoScreen.userData.dragHandle = topBar;
    }
    
    // Add to scene and screens array
    scene.add(duckduckgoScreen);
    screens.push(duckduckgoScreen);
    
    // Add entrance animation
    animateScreenEntrance(duckduckgoScreen);
    
    console.log("Created DuckDuckGo screen with ID:", duckduckgoScreen.userData.id);
    
    // Select this as the current screen
    selectScreen(duckduckgoScreen);
    
    return duckduckgoScreen;
}

// Create a new Google Maps screen
export function createGoogleMapsScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Google Maps ${screens.length + 1}`;
    
    console.log("Creating Google Maps screen with iframe");
    
    // Create iframe content texture
    const iframeTexture = createIframeTexture("https://www.google.com/maps/embed", 1024, 768);
    
    // Create the screen container
    const mapsScreen = enhancedCreateScreen(position, size, title, iframeTexture);
    
    // Add basic identification data
    mapsScreen.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'maps'
    };
    
    // Add shadow and border
    addDropShadow(mapsScreen, screenWidth, screenHeight);
    
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4285F4, // Google blue color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990; // Ensure it's behind the content
    mapsScreen.add(borderPanel);
    
    // Update drag handle reference
    const topBar = mapsScreen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = mapsScreen;
        mapsScreen.userData.dragHandle = topBar;
    }
    
    // Add to scene and screens array
    scene.add(mapsScreen);
    screens.push(mapsScreen);
    
    // Add entrance animation
    animateScreenEntrance(mapsScreen);
    
    console.log("Created Google Maps screen with ID:", mapsScreen.userData.id);
    
    // Select this as the current screen
    selectScreen(mapsScreen);
    
    return mapsScreen;
}

// Create a new Electron app screen
export function createElectronAppScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Electron App ${screens.length + 1}`;
    
    console.log("Creating Electron App simulation screen");
    
    // Create a placeholder texture for Electron (we can't actually run Electron in the browser)
    const electronTexture = createElectronPlaceholderTexture();
    
    // Create the screen container
    const electronScreen = enhancedCreateScreen(position, size, title, electronTexture);
    
    // Add basic identification data
    electronScreen.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'electron'
    };
    
    // Add shadow and border
    addDropShadow(electronScreen, screenWidth, screenHeight);
    
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x47848F, // Electron teal color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990; // Ensure it's behind the content
    electronScreen.add(borderPanel);
    
    // Update drag handle reference
    const topBar = electronScreen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = electronScreen;
        electronScreen.userData.dragHandle = topBar;
    }
    
    // Add to scene and screens array
    scene.add(electronScreen);
    screens.push(electronScreen);
    
    // Add entrance animation
    animateScreenEntrance(electronScreen);
    
    console.log("Created Electron App screen with ID:", electronScreen.userData.id);
    
    // Select this as the current screen
    selectScreen(electronScreen);
    
    return electronScreen;
}

// Create an iframe-based texture (simulated, won't actually load iframes in WebXR)
function createIframeTexture(url, width = 1024, height = 768) {
    // Create a canvas to simulate iframe content
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill with a light background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw a border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Draw the URL bar
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(10, 10, canvas.width - 20, 30);
    
    // Draw the URL text
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Truncate URL if too long
    let displayUrl = url;
    if (url.length > 40) {
        displayUrl = url.substring(0, 37) + '...';
    }
    ctx.fillText(displayUrl, 20, 25);
    
    // Draw loading indicator or content placeholder
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(10, 50, canvas.width - 20, height - 60);
    
    // Draw content based on URL type
    if (url.includes('youtube')) {
        // Draw YouTube style content
        // Red header
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(10, 50, canvas.width - 20, 50);
        
        // YouTube logo
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('YouTube', 30, 75);
        
        // Video player area
        ctx.fillStyle = '#000000';
        ctx.fillRect(100, 120, width - 200, height - 240);
        
        // Play button
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(width/2 - 25, height/2 - 30);
        ctx.lineTo(width/2 + 35, height/2);
        ctx.lineTo(width/2 - 25, height/2 + 30);
        ctx.closePath();
        ctx.fill();
        
        // Video title
        ctx.fillStyle = '#333333';
        ctx.font = '18px Arial';
        ctx.fillText('AR Experience Video', 100, height - 90);
        
    } else if (url.includes('duckduckgo')) {
        // Draw DuckDuckGo style content
        // Logo area
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 50, canvas.width - 20, 150);
        
        // DuckDuckGo logo (simplified)
        ctx.fillStyle = '#de5833';
        ctx.beginPath();
        ctx.arc(width/2, 120, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Search bar
        ctx.fillStyle = '#f7f7f7';
        ctx.fillRect(width/2 - 200, 190, 400, 40);
        ctx.strokeStyle = '#de5833';
        ctx.lineWidth = 2;
        ctx.strokeRect(width/2 - 200, 190, 400, 40);
        
        // Search text
        ctx.fillStyle = '#888888';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Search the web without being tracked...', width/2 - 190, 210);
        
    } else if (url.includes('maps')) {
        // Draw Google Maps style content
        // Sky
        ctx.fillStyle = '#a5d6ff';
        ctx.fillRect(10, 50, canvas.width - 20, height - 60);
        
        // Land
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(10, height - 300, canvas.width - 20, 250);
        
        // Roads
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(10, height - 200);
        ctx.lineTo(canvas.width - 10, height - 150);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(width/2, 50);
        ctx.lineTo(width/2, height - 60);
        ctx.stroke();
        
        // Buildings
        ctx.fillStyle = '#cccccc';
        for (let i = 0; i < 10; i++) {
            const bw = Math.random() * 60 + 40;
            const bh = Math.random() * 80 + 40;
            const bx = Math.random() * (width - bw - 40) + 20;
            const by = Math.random() * (height - 350) + 70;
            ctx.fillRect(bx, by, bw, bh);
        }
        
        // Location pin
        ctx.fillStyle = '#EA4335';
        ctx.beginPath();
        ctx.arc(width/2, height/2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width/2, height/2);
        ctx.lineTo(width/2, height/2 + 25);
        ctx.lineTo(width/2 - 10, height/2 + 15);
        ctx.closePath();
        ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Create a placeholder texture for Electron apps
function createElectronPlaceholderTexture(width = 1024, height = 768) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Draw window with title bar (Electron style)
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2b2e3b');
    gradient.addColorStop(1, '#1e2028');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Title bar
    ctx.fillStyle = '#121317';
    ctx.fillRect(0, 0, width, 30);
    
    // Window controls (macOS style)
    const controlColors = ['#FF5F56', '#FFBD2E', '#27C93F'];
    controlColors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(20 + i * 25, 15, 8, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Electron YouTube App', width/2, 20);
    
    // Electron logo
    ctx.fillStyle = '#47848F';
    ctx.beginPath();
    ctx.arc(width/2, height/2 - 50, 80, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width/2, height/2 - 50, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Electron name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Electron', width/2, height/2 + 80);
    
    // YouTube placeholder
    ctx.fillStyle = '#000000';
    ctx.fillRect(width/2 - 200, height/2 + 120, 400, 225);
    
    // YouTube logo
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(width/2 - 150, height/2 + 140, 50, 35);
    
    // Play button
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(width/2 - 15, height/2 + 220);
    ctx.lineTo(width/2 + 25, height/2 + 245);
    ctx.lineTo(width/2 - 15, height/2 + 270);
    ctx.closePath();
    ctx.fill();
    
    // Status bar with info
    ctx.fillStyle = '#121317';
    ctx.fillRect(0, height - 25, width, 25);
    
    ctx.fillStyle = '#77787a';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Electron v24.0.0', 10, height - 8);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Add a drop shadow for better depth perception
function addDropShadow(screen, width, height) {
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
    shadowMesh.userData.type = 'shadow';
    
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
    glowMesh.userData.type = 'glow';
    
    screen.add(glowMesh);
    screen.userData.glowMesh = glowMesh;
}

// Animate screen entrance with a scale-up and fade-in effect
function animateScreenEntrance(screen) {
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

// Enhanced screen creation function with modern UI
function enhancedCreateScreen(position, size, title = 'Screen', content = null) {
    // Create the screen container
    const screen = new THREE.Group();
    
    // Define screen dimensions
    const screenWidth = size.x;
    const screenHeight = size.y;
    const topBarHeight = 0.06; // Thinner top bar
    
    // Content background - create this first so it's behind the top bar
    const backgroundGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    let backgroundMaterial;
    
    if (content && content.isVideoTexture) {
        // Use video texture if provided
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: content,
            side: THREE.DoubleSide,
            depthTest: true // Enable depth testing to prevent see-through effect
        });
    } else if (content) {
        // Use provided texture (e.g., from createIframeTexture)
        backgroundMaterial = new THREE.MeshBasicMaterial({
            map: content,
            side: THREE.DoubleSide,
            depthTest: true // Enable depth testing
        });
    } else {
        // Default subtle dark background with gradient
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add subtle pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
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
    background.position.z = 0.003; // Increased z-position to be more visible
    background.renderOrder = 1010; // Higher render order to ensure it's visible
    screen.add(background);
    
    // Create a solid black top bar that spans the entire width
    const topBarGeometry = new THREE.PlaneGeometry(screenWidth, topBarHeight);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x111111, // Solid black color
        transparent: false, // No transparency
        side: THREE.DoubleSide,
        depthTest: true // Enable depth testing to prevent seeing through
    });
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    topBar.position.set(0, screenHeight / 2 - topBarHeight / 2, 0.004);
    topBar.renderOrder = 10;
    topBar.userData = {
        type: 'dragHandle',
        isTopBar: true,
        screen: screen,
        originalColor: topBarMaterial.color.getHex()
    };
    screen.add(topBar);
    
    // Create a modern grip pattern to indicate draggability with improved styling
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 64; // Reduced height for thinner top bar
    const ctx = canvas.getContext('2d');
    
    // Create a gradient background for the top bar
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a subtle border at the bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, canvas.height - 1, canvas.width, 1);
    
    // Draw screen title with improved typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(title, canvas.width / 2, canvas.height / 2);
    ctx.shadowColor = 'transparent';
    
    // Add modern grip indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const dotRadius = 1.5;
    const dotSpacing = 12;
    const dotsStartX = canvas.width - 100;
    const dotsY = canvas.height / 2;
    
    // Draw the dots with a more modern arrangement
    for (let i = 0; i < 3; i++) {
        const x = dotsStartX + (i * dotSpacing);
        ctx.beginPath();
        ctx.arc(x, dotsY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Apply the canvas as a texture to the top bar
    const topBarTexture = new THREE.CanvasTexture(canvas);
    topBarTexture.anisotropy = 4;
    topBarMaterial.map = topBarTexture;
    topBarMaterial.needsUpdate = true;
    
    // Add video control buttons with refined positioning
    if (content && content.isVideoTexture) {
        // Move play button to bottom left with pause icon since video is initially playing
        const playButton = addControlButton(screen, 'pause', -screenWidth/2 + 0.05, -screenHeight/2 + 0.05, 0.03);
        playButton.userData.videoControl = true;
        playButton.userData.videoAction = 'togglePlayback';
        playButton.userData.action = 'playButton'; // Set the action name to match what ar_interaction.js expects
        
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

// Add a control button to the screen with improved styling
function addControlButton(screen, type, x, y, size) {
    const buttonGeometry = new THREE.CircleGeometry(size, 32);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x222222, // Darker background for better contrast
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
        action: type + 'Button', // This will still be overridden by specific buttons with userData.action
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
    
    // Add subtle highlight/shadow for depth and 3D effect
    const highlightGeometry = new THREE.CircleGeometry(size * 1.02, 32);
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3, // More prominent
        side: THREE.DoubleSide,
        depthTest: true // Enable depth testing to prevent seeing through screens
    });
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.position.z = -0.001; // Slightly behind the button
    button.add(highlightMesh);
    
    // Add hover/interaction state
    button.userData.originalColor = buttonMaterial.color.clone();
    button.userData.hoverColor = new THREE.Color(0x3498db); // Highlight blue
    button.userData.pressColor = new THREE.Color(0x2980b9); // Darker blue when pressed
    
    // Add subtle button border for better visibility
    const borderGeometry = new THREE.RingGeometry(size * 0.98, size * 1.02, 32);
    const borderMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthTest: true
    });
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    borderMesh.position.z = 0.0005;
    button.add(borderMesh);
    
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

// Select a screen and update UI accordingly with enhanced visual feedback
export function selectScreen(screen) {
    // Deselect previously selected screen
    if (selectedScreen) {
        // Change border color back to normal
        const borderMesh = selectedScreen.children.find(child => 
            child.geometry && child.geometry.type === 'PlaneGeometry' && 
            Math.abs(child.position.z - (-0.001)) < 0.0001);
            
        if (borderMesh) {
            borderMesh.material.color.set(0x444444); // Default border color
            borderMesh.material.opacity = 0.5; // Less visible
        }
        
        // Turn off glow
        const glowMesh = selectedScreen.userData.glowMesh;
        if (glowMesh) {
            glowMesh.material.opacity = 0;
        }
        
        selectedScreen.userData.isSelected = false;
        
        // Scale down slightly for visual deselection
        selectedScreen.scale.multiplyScalar(0.97);
        // Animate back to original scale
        animateScreenScale(selectedScreen, 1.0, 150);
    }
    
    // If screen is null, just clear selection
    if (!screen) {
        // Update both local and global references
        setSelectedScreen(null);
        return;
    }
    
    // Select new screen
    // Update the global selectedScreen variable through the setter function
    setSelectedScreen(screen);
    screen.userData.isSelected = true;
    
    // Log selection for debugging
    console.log("Selected screen with ID:", screen.userData.id, "UUID:", screen.uuid.substring(0, 8) + "...");
    
    // Highlight border for selected screen
    const borderMesh = screen.children.find(child => 
        child.geometry && child.geometry.type === 'PlaneGeometry' && 
        Math.abs(child.position.z - (-0.001)) < 0.0001);
        
    if (borderMesh) {
        borderMesh.material.color.set(0x1a237e); // Dark blue border (indigo 900)
        borderMesh.material.opacity = 1.0; // More visible
    }
    
    // Turn on glow
    const glowMesh = screen.userData.glowMesh;
    if (glowMesh) {
        glowMesh.material.opacity = 0.3; // Subtle glow
    }
    
    // Scale up slightly for visual selection
    screen.scale.multiplyScalar(1.03);
    // Animate back to original scale with slight bounce
    animateScreenScale(screen, 1.0, 300, true);
    
    // Position keyboard under selected screen if needed
    if (virtualKeyboard) {
        updateKeyboardPosition(screen);
    }
}

// Animate screen scale with optional bounce effect
function animateScreenScale(screen, targetScale, duration, bounce = false) {
    const originalScale = screen.userData.originalScale || new THREE.Vector3(1, 1, 1);
    const startScale = screen.scale.clone();
    const targetVector = new THREE.Vector3().copy(originalScale).multiplyScalar(targetScale);
    
    const startTime = performance.now();
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out for smoother animation
        const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
        // Apply bounce effect if requested
        let finalProgress = easedProgress;
        if (bounce && progress > 0.7) {
            // Add a subtle bounce at the end
            const bounceAmount = Math.sin((progress - 0.7) * Math.PI * 5) * 0.02;
            finalProgress = easedProgress + bounceAmount;
        }
        
        // Update scale
        screen.scale.lerpVectors(
            startScale,
            targetVector,
            finalProgress
        );
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
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
                // Subtle pulsing effect for selected screen's border (dark blue colors)
                const time = Date.now() * 0.001;
                const pulseIntensity = 0.15 * Math.sin(time * 2) + 0.85;
                borderMesh.material.color.setRGB(
                    0.1 * pulseIntensity,  // R (low for blue)
                    0.1 * pulseIntensity,  // G (low for blue)
                    0.5 * pulseIntensity   // B (higher for blue)
                );
            }
            
            // Update glow effect for selected screen
            const glowMesh = screen.userData.glowMesh;
            if (glowMesh) {
                const time = Date.now() * 0.001;
                const glowIntensity = 0.2 * Math.sin(time * 1.5) + 0.25; // Reduced max intensity
                glowMesh.material.opacity = glowIntensity;
            }
            
            // Subtle floating effect
            screen.position.y += Math.sin(Date.now() * 0.002) * 0.0001;
        }
    });
} 