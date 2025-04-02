// Screen creation and management functionality
import * as THREE from 'three';
import { scene, camera, selectedScreen, setSelectedScreen } from './ar_core.js';
import { virtualKeyboard } from './ar_ui.js';
import { videoTexture } from './ar_media.js';

// Array to store screen objects
export let screens = [];

// Create a new browser screen
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    try {
        // Get a valid scene reference
        const sceneToUse = window.arScene || scene;
        
        if (!sceneToUse) {
            console.error("Cannot create browser screen: no scene reference available");
            return null;
        }
        
        // Screen dimensions
        const screenWidth = 1.0;
        const screenHeight = 0.75;
        const size = { x: screenWidth, y: screenHeight };
        const title = `Screen ${screens.length + 1}`;
        
        console.log("Creating screen with draggable top bar and video");
        
        // Create the screen container using the enhanced implementation
        const browserWindow = enhancedCreateScreen(position, size, title, videoTexture);
        
        if (!browserWindow) {
            console.error("Failed to create enhanced screen");
            return null;
        }
        
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
        sceneToUse.add(browserWindow);
        screens.push(browserWindow);
        
        // Add entrance animation
        animateScreenEntrance(browserWindow);
        
        console.log("Created screen with ID:", browserWindow.userData.id);
        
        // Select this as the current screen
        selectScreen(browserWindow);
        
        return browserWindow;
    } catch (error) {
        console.error("Error creating browser screen:", error);
        return null;
    }
}

// Create a new YouTube screen
export function createYouTubeScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `YouTube ${screens.length + 1}`;
    
    console.log("Creating YouTube screen with iframe");
    
    // Create iframe content texture with specific video
    // Using the video URL provided by the user: https://youtu.be/Myrr9vA7j5A
    const videoId = "Myrr9vA7j5A";
    const iframeTexture = createIframeTexture(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1`, 1024, 768);
    
    // Create the screen container
    const youtubeScreen = enhancedCreateScreen(position, size, title, iframeTexture);
    
    // Add basic identification data
    youtubeScreen.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'youtube',
        videoId: videoId
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
    
    // Create iframe content texture with satellite view enabled
    const iframeTexture = createIframeTexture("https://www.google.com/maps/embed?maptype=satellite", 1024, 768);
    
    // Create the screen container
    const mapsScreen = enhancedCreateScreen(position, size, title, iframeTexture);
    
    // Add basic identification data
    mapsScreen.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'maps',
        mapType: 'satellite'
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
    
    // Create a placeholder texture for Electron with the YouTube video
    const electronTexture = createElectronPlaceholderTexture(1024, 768, "Myrr9vA7j5A");
    
    // Create the screen container
    const electronScreen = enhancedCreateScreen(position, size, title, electronTexture);
    
    // Add basic identification data
    electronScreen.userData = { 
        type: 'screen', 
        id: screens.length,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'electron',
        videoId: "Myrr9vA7j5A" // Store the video ID for reference
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
    
    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Add some realistic UI elements based on the URL
    // Draw header bar for any page
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, 0, width, 50);
    
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(0, 48, width, 2);
    
    // Draw content based on URL type
    if (url.includes('youtube')) {
        // Extract video ID if present
        let videoId = "Myrr9vA7j5A"; // Default to provided video
        if (url.includes('embed/')) {
            const parts = url.split('embed/');
            if (parts.length > 1) {
                videoId = parts[1].split('?')[0];
            }
        }
        
        // Draw YouTube style content with video thumbnail
        // Background
        ctx.fillStyle = '#0f0f0f'; // YouTube dark mode background
        ctx.fillRect(0, 50, canvas.width, canvas.height - 50);
        
        // Video player area
        ctx.fillStyle = '#000000';
        ctx.fillRect(50, 80, width - 100, (width - 100) * 9/16); // 16:9 aspect ratio
        
        // Draw video title below player
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Roboto, Arial';
        ctx.textAlign = 'left';
        ctx.fillText('AR Experience Video - ID: ' + videoId, 50, (width - 100) * 9/16 + 100);
        
        // Video progress bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(50, (width - 100) * 9/16 + 50, (width - 100) * 0.2, 4); // Red progress
        ctx.fillStyle = '#3d3d3d';
        ctx.fillRect(50 + (width - 100) * 0.2, (width - 100) * 9/16 + 50, (width - 100) * 0.8, 4); // Dark gray remaining
        
        // Video controls area
        ctx.fillStyle = '#222222';
        ctx.fillRect(50, (width - 100) * 9/16 + 40, width - 100, 30);
        
        // Play button
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(70, (width - 100) * 9/16 + 48);
        ctx.lineTo(70, (width - 100) * 9/16 + 62);
        ctx.lineTo(85, (width - 100) * 9/16 + 55);
        ctx.closePath();
        ctx.fill();
        
        // Recommended videos on right side
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#222222';
            ctx.fillRect(width - 300, 80 + i * 120, 250, 100);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Roboto, Arial';
            ctx.fillText(`Recommended Video ${i + 1}`, width - 290, 150 + i * 120);
        }
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
        
        // White duck silhouette in center of logo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(width/2, 120, 25, 0, Math.PI * 2);
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
        
        // Privacy info section
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(50, 260, width - 100, 100);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Privacy, simplified.', width/2, 290);
        ctx.font = '14px Arial';
        ctx.fillText('Search privately with DuckDuckGo. We never track your searches.', width/2, 320);
    } else if (url.includes('maps')) {
        // Draw Google Maps style content
        // Check if satellite view is requested
        const isSatellite = url.includes('satellite');
        
        // Maps area - different background for satellite vs regular
        if (isSatellite) {
            // Satellite view - dark blue/black with city lights
            const gradient = ctx.createLinearGradient(0, 50, 0, height);
            gradient.addColorStop(0, '#000a12');
            gradient.addColorStop(1, '#002f52');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 50, width, height - 50);
            
            // Draw some "city lights" as small yellow dots
            ctx.fillStyle = 'rgba(255, 240, 180, 0.5)';
            for (let i = 0; i < 300; i++) {
                const x = Math.random() * width;
                const y = 50 + Math.random() * (height - 50);
                const size = Math.random() * 2;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw some "roads" as thin white lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 15; i++) {
                const x1 = Math.random() * width;
                const y1 = 50 + Math.random() * (height - 50);
                const x2 = Math.random() * width;
                const y2 = 50 + Math.random() * (height - 50);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        } else {
            // Regular map view - light colors
            ctx.fillStyle = '#e8eaed';
            ctx.fillRect(0, 50, width, height - 50);
            
            // Draw some "roads"
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            for (let i = 0; i < 10; i++) {
                const x1 = Math.random() * width;
                const y1 = 50 + Math.random() * (height - 50);
                const x2 = Math.random() * width;
                const y2 = 50 + Math.random() * (height - 50);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            
            // Draw some "roads" as thinner gray lines
            ctx.strokeStyle = '#d4d4d4';
            ctx.lineWidth = 3;
            for (let i = 0; i < 20; i++) {
                const x1 = Math.random() * width;
                const y1 = 50 + Math.random() * (height - 50);
                const x2 = Math.random() * width;
                const y2 = 50 + Math.random() * (height - 50);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        
        // Map search bar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(50, 65, width - 100, 40);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
        ctx.fillRect(50, 65, width - 100, 40);
        ctx.shadowBlur = 0;
        
        // Map controls
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(width - 50, height/2, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Zoom in/out
        ctx.fillStyle = '#5f6368';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+', width - 50, height/2 - 10);
        ctx.fillText('−', width - 50, height/2 + 15);
        
        // Map type toggle button (satellite/regular)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(width - 150, height - 80, 100, 30);
        ctx.fillStyle = '#5f6368';
        ctx.font = '14px Arial';
        ctx.fillText(isSatellite ? 'Satellite' : 'Map', width - 100, height - 60);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4; // Improve texture quality
    texture.needsUpdate = true;
    
    return texture;
}

// Create a placeholder texture for Electron apps
function createElectronPlaceholderTexture(width = 1024, height = 768, videoId = null) {
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
    ctx.fillText('Electron YouTube Viewer App', width/2, 20);
    
    // Electron logo smaller and in the top left
    ctx.fillStyle = '#47848F';
    ctx.beginPath();
    ctx.arc(width - 60, 15, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Sidebar
    ctx.fillStyle = '#1a1b23';
    ctx.fillRect(0, 30, 50, height - 30);
    
    // Sidebar icons (simplified)
    const sidebarIcons = ['#', '♥', '★', '⚙'];
    sidebarIcons.forEach((icon, i) => {
        ctx.fillStyle = i === 0 ? '#ffffff' : '#666666';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(icon, 25, 60 + i * 40);
    });
    
    // YouTube player area
    ctx.fillStyle = '#000000';
    const playerWidth = width - 70;
    const playerHeight = playerWidth * 9/16; // 16:9 aspect ratio
    ctx.fillRect(60, 50, playerWidth, playerHeight);
    
    if (videoId) {
        // Add video ID to display
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Video ID: ${videoId}`, 65, playerHeight + 65);
        
        // Video progress bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(60, playerHeight + 80, playerWidth * 0.3, 4);
        ctx.fillStyle = '#3d3d3d';
        ctx.fillRect(60 + (playerWidth * 0.3), playerHeight + 80, playerWidth * 0.7, 4);
        
        // Control buttons
        ctx.fillStyle = '#333333';
        ctx.fillRect(60, playerHeight + 90, playerWidth, 40);
        
        // Play button
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(80, playerHeight + 110);
        ctx.lineTo(100, playerHeight + 110);
        ctx.stroke();
        
        // Volume icon
        ctx.beginPath();
        ctx.moveTo(130, playerHeight + 105);
        ctx.lineTo(140, playerHeight + 105);
        ctx.lineTo(150, playerHeight + 100);
        ctx.lineTo(150, playerHeight + 120);
        ctx.lineTo(140, playerHeight + 115);
        ctx.lineTo(130, playerHeight + 115);
        ctx.closePath();
        ctx.fill();
    } else {
        // Show Electron logo and welcome message when no video
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
        
        // App description
        ctx.font = '16px Arial';
        ctx.fillText('YouTube Viewer App', width/2, height/2 + 110);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4; // Improve texture quality
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
    try {
        // IMPORTANT: Don't try to use keyboard for now - it's causing errors
        const skipKeyboardUpdate = true;
        
        // Deselect previously selected screen
        if (selectedScreen) {
            try {
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
            } catch (error) {
                console.warn("Error while deselecting previous screen:", error);
            }
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
        
        try {
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
        } catch (error) {
            console.warn("Error while applying visual effects to selected screen:", error);
        }
        
        // Position keyboard under selected screen if needed - skip if we're having issues
        if (!skipKeyboardUpdate && virtualKeyboard) {
            try {
                updateKeyboardPosition(screen, virtualKeyboard);
            } catch (error) {
                console.warn("Error updating keyboard position:", error);
            }
        }
    } catch (error) {
        console.error("Error in selectScreen:", error);
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
export function updateKeyboardPosition(screen, virtualKeyboard) {
    // Safely check if screen and keyboard exist
    if (!screen || !virtualKeyboard) {
        console.warn('Cannot update keyboard position: screen or keyboard is undefined');
        return;
    }

    try {
        // Validate that these objects have the required properties to avoid errors
        if (!screen.position || !screen.scale) {
            console.warn('Screen object is missing required properties (position or scale)');
            return;
        }
        
        if (!virtualKeyboard.position || typeof virtualKeyboard.lookAt !== 'function') {
            console.warn('VirtualKeyboard object is missing required properties');
            return;
        }
        
        // Position the keyboard below the screen
        const screenPosition = screen.position.clone();
        const screenScale = screen.scale.clone();
        
        // Calculate position below the screen
        screenPosition.y -= 0.2 * screenScale.y;
        
        // Set keyboard position
        virtualKeyboard.position.copy(screenPosition);
        
        // Try to make keyboard face the user using camera if available
        const cameraRef = getActiveCamera();
        
        if (cameraRef && cameraRef.position) {
            // Use camera to orient keyboard
            try {
                // Only try to use lookAt if we have a valid camera position
                virtualKeyboard.lookAt(cameraRef.position);
            
                // Keep keyboard upright by zeroing rotation on x and z
                virtualKeyboard.rotation.x = 0;
                virtualKeyboard.rotation.z = 0;
            } catch (err) {
                console.warn('Error orienting keyboard with camera:', err);
                // Fallback to default orientation
                virtualKeyboard.rotation.set(0, 0, 0);
            }
        } else {
            // Fallback orientation if no camera
            console.warn('No camera available for keyboard orientation, using default');
            virtualKeyboard.rotation.set(0, 0, 0);
        }
    } catch (error) {
        console.error('Error updating keyboard position:', error);
    }
}

// Helper function to get active camera from scene
function getActiveCamera() {
    // Try using the imported camera reference first
    if (typeof camera !== 'undefined' && camera) {
        return camera;
    }
    
    // Try the global window.arCamera if available
    if (typeof window !== 'undefined' && window.arCamera) {
        return window.arCamera;
    }
    
    // First try scene.camera if it exists
    if (scene && scene.camera) {
        return scene.camera;
    }
    
    // Try to find PerspectiveCamera in scene (safely)
    if (scene && scene.children && Array.isArray(scene.children)) {
        try {
            const foundCamera = scene.children.find(
                child => child && typeof child === 'object' && 
                child.isCamera === true
            );
            if (foundCamera) return foundCamera;
        } catch (err) {
            console.warn("Error finding camera in scene:", err);
        }
    }
    
    // For debugging
    console.warn("No camera found. Available references:", {
        importedCamera: typeof camera !== 'undefined' ? "defined" : "undefined",
        windowCamera: typeof window !== 'undefined' && window.arCamera ? "defined" : "undefined",
        sceneCamera: scene && scene.camera ? "defined" : "undefined"
    });
    
    // Last resort - return null
    return null;
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