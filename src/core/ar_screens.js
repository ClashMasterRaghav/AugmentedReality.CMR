// Screen creation and management functionality
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { videoTexture, registerVideoScreen, unregisterVideoScreen } from './ar_media.js';
import { generateUUID, showNotification } from './ar_utils.js';

// Array to store screen objects
export let screens = [];
let css3dRenderer;
export let css3dScene;

// Initialize CSS3D renderer for real web content
export function initCSS3DRenderer() {
    // Create CSS3D renderer and scene for web content
    css3dRenderer = new CSS3DRenderer();
    css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    css3dRenderer.domElement.style.position = 'absolute';
    css3dRenderer.domElement.style.top = '0';
    css3dRenderer.domElement.style.left = '0';
    css3dRenderer.domElement.style.pointerEvents = 'none'; // Let AR interactions pass through
    document.body.appendChild(css3dRenderer.domElement);
    
    css3dScene = new THREE.Scene();
    
    // Handle resize events
    window.addEventListener('resize', () => {
        css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    console.log("CSS3D Renderer initialized for real website integration");
    return css3dRenderer;
}

// Update CSS3D Renderer - call this in animation loop
export function updateCSS3DRenderer() {
    if (css3dRenderer && css3dScene && window.camera) {
        css3dRenderer.render(css3dScene, window.camera);
    }
}

// Create a standard browser screen with video content
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Screen ${screens.length + 1}`;
    
    console.log("Creating video screen with draggable top bar");
    
    // Create the screen container
    const screen = enhancedCreateScreen(position, size, title, videoTexture);
    
    // Add basic identification data
    screen.userData = { 
        type: 'screen', 
        id: generateUUID(),
        screenNumber: screens.length + 1,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'video'
    };
    
    // Add drop shadow
    addDropShadow(screen, screenWidth, screenHeight);
    
    // Add border
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    screen.add(borderPanel);
    
    // Find and update the drag handle reference in userData
    const topBar = screen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = screen;
        screen.userData.dragHandle = topBar;
    }
    
    // Add to scene and screens array
    if (window.scene) {
        window.scene.add(screen);
    }
    screens.push(screen);
    
    // Register the screen for video updates
    registerVideoScreen(screen);
    
    // Add entrance animation
    animateScreenEntrance(screen);
    
    console.log("Created screen with ID:", screen.userData.id);
    
    // Select this as the current screen
    selectScreen(screen);
    
    return screen;
}

// Create a YouTube screen using CSS3D renderer
export function createYouTubeScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Check if CSS3D renderer is initialized
    if (!css3dRenderer) {
        initCSS3DRenderer();
    }
    
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `YouTube ${screens.length + 1}`;
    
    console.log("Creating YouTube screen with real iframe");
    
    // Create a placeholder texture for WebGL renderer
    const placeholderTexture = createFallbackTexture(screens.length + 1);
    
    // Create the screen with placeholder texture
    const screen = enhancedCreateScreen(position, size, title, placeholderTexture);
    
    // Add identification data
    screen.userData = { 
        type: 'screen', 
        id: generateUUID(),
        screenNumber: screens.length + 1,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'youtube',
        hasRealContent: true
    };
    
    // Add shadow and styled border
    addDropShadow(screen, screenWidth, screenHeight);
    
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xE62117, // YouTube red
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    screen.add(borderPanel);
    
    // Update drag handle reference
    const topBar = screen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = screen;
        screen.userData.dragHandle = topBar;
    }
    
    // Create actual iframe for YouTube with CSS3D
    const videoId = "Myrr9vA7j5A"; // Demo video ID
    const iframeElement = document.createElement('iframe');
    iframeElement.style.width = `${screenWidth * 1000}px`;
    iframeElement.style.height = `${screenHeight * 1000}px`;
    iframeElement.style.border = '0px';
    iframeElement.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1`;
    iframeElement.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    
    // Create CSS3D object and position it to match the Three.js object
    const css3dObject = new CSS3DObject(iframeElement);
    css3dObject.scale.set(0.001, 0.001, 0.001); // Scale down to match Three.js units
    css3dObject.position.copy(position);
    css3dObject.quaternion.copy(screen.quaternion);
    
    // Store reference to CSS3D object
    screen.userData.css3dObject = css3dObject;
    css3dScene.add(css3dObject);
    
    // Update function to sync CSS3D object with Three.js object
    const updateCSS3DPosition = () => {
        if (screen.userData.css3dObject) {
            screen.userData.css3dObject.position.copy(screen.position);
            screen.userData.css3dObject.quaternion.copy(screen.quaternion);
            screen.userData.css3dObject.scale.set(
                0.001 * screen.scale.x,
                0.001 * screen.scale.y,
                0.001 * screen.scale.z
            );
        }
    };
    
    // Store the update function
    screen.userData.updateCSS3DPosition = updateCSS3DPosition;
    
    // Add to scene and screens array
    if (window.scene) {
        window.scene.add(screen);
    }
    screens.push(screen);
    
    // Add entrance animation
    animateScreenEntrance(screen);
    
    console.log("Created YouTube screen with ID:", screen.userData.id);
    
    // Select this as the current screen
    selectScreen(screen);
    
    return screen;
}

// Create a DuckDuckGo search screen
export function createDuckDuckGoScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Check if CSS3D renderer is initialized
    if (!css3dRenderer) {
        initCSS3DRenderer();
    }
    
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Search ${screens.length + 1}`;
    
    console.log("Creating DuckDuckGo search screen");
    
    // Create placeholder texture for WebGL renderer
    const placeholderTexture = createFallbackTexture(screens.length + 1);
    
    // Create the screen with placeholder
    const screen = enhancedCreateScreen(position, size, title, placeholderTexture);
    
    // Add identification data
    screen.userData = { 
        type: 'screen', 
        id: generateUUID(),
        screenNumber: screens.length + 1,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'duckduckgo',
        hasRealContent: true
    };
    
    // Add shadow and styled border
    addDropShadow(screen, screenWidth, screenHeight);
    
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xDE5833, // DuckDuckGo orange
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    screen.add(borderPanel);
    
    // Update drag handle reference
    const topBar = screen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = screen;
        screen.userData.dragHandle = topBar;
    }
    
    // Create iframe for DuckDuckGo
    const iframeElement = document.createElement('iframe');
    iframeElement.style.width = `${screenWidth * 1000}px`;
    iframeElement.style.height = `${screenHeight * 1000}px`;
    iframeElement.style.border = '0px';
    iframeElement.src = 'https://duckduckgo.com/';
    
    // Create CSS3D object
    const css3dObject = new CSS3DObject(iframeElement);
    css3dObject.scale.set(0.001, 0.001, 0.001);
    css3dObject.position.copy(position);
    css3dObject.quaternion.copy(screen.quaternion);
    
    // Store reference
    screen.userData.css3dObject = css3dObject;
    css3dScene.add(css3dObject);
    
    // Update function for syncing position
    const updateCSS3DPosition = () => {
        if (screen.userData.css3dObject) {
            screen.userData.css3dObject.position.copy(screen.position);
            screen.userData.css3dObject.quaternion.copy(screen.quaternion);
            screen.userData.css3dObject.scale.set(
                0.001 * screen.scale.x,
                0.001 * screen.scale.y,
                0.001 * screen.scale.z
            );
        }
    };
    
    screen.userData.updateCSS3DPosition = updateCSS3DPosition;
    
    // Add to scene and screens array
    if (window.scene) {
        window.scene.add(screen);
    }
    screens.push(screen);
    
    // Add entrance animation
    animateScreenEntrance(screen);
    
    console.log("Created DuckDuckGo screen with ID:", screen.userData.id);
    
    // Select this as the current screen
    selectScreen(screen);
    
    return screen;
}

// Create a Google Maps screen
export function createGoogleMapsScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Check if CSS3D renderer is initialized
    if (!css3dRenderer) {
        initCSS3DRenderer();
    }
    
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Maps ${screens.length + 1}`;
    
    console.log("Creating Google Maps screen");
    
    // Create placeholder texture
    const placeholderTexture = createFallbackTexture(screens.length + 1);
    
    // Create the screen with placeholder
    const screen = enhancedCreateScreen(position, size, title, placeholderTexture);
    
    // Add identification data
    screen.userData = { 
        type: 'screen', 
        id: generateUUID(),
        screenNumber: screens.length + 1,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: 'maps',
        mapType: 'satellite',
        hasRealContent: true
    };
    
    // Add shadow and styled border
    addDropShadow(screen, screenWidth, screenHeight);
    
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.02, screenHeight + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4285F4, // Google blue
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    screen.add(borderPanel);
    
    // Update drag handle reference
    const topBar = screen.children.find(child => 
        child.userData && child.userData.type === 'dragHandle');
    
    if (topBar) {
        topBar.userData.screen = screen;
        screen.userData.dragHandle = topBar;
    }
    
    // Create iframe for Google Maps (satellite view)
    const iframeElement = document.createElement('iframe');
    iframeElement.style.width = `${screenWidth * 1000}px`;
    iframeElement.style.height = `${screenHeight * 1000}px`;
    iframeElement.style.border = '0px';
    iframeElement.src = 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d12035.399933674062!2d-122.4194!3d37.7749!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sus!4v1612345678901!5m2!1sen!2sus';
    
    // Create CSS3D object
    const css3dObject = new CSS3DObject(iframeElement);
    css3dObject.scale.set(0.001, 0.001, 0.001);
    css3dObject.position.copy(position);
    css3dObject.quaternion.copy(screen.quaternion);
    
    // Store reference
    screen.userData.css3dObject = css3dObject;
    css3dScene.add(css3dObject);
    
    // Update function for syncing position
    const updateCSS3DPosition = () => {
        if (screen.userData.css3dObject) {
            screen.userData.css3dObject.position.copy(screen.position);
            screen.userData.css3dObject.quaternion.copy(screen.quaternion);
            screen.userData.css3dObject.scale.set(
                0.001 * screen.scale.x,
                0.001 * screen.scale.y,
                0.001 * screen.scale.z
            );
        }
    };
    
    screen.userData.updateCSS3DPosition = updateCSS3DPosition;
    
    // Add to scene and screens array
    if (window.scene) {
        window.scene.add(screen);
    }
    screens.push(screen);
    
    // Add entrance animation
    animateScreenEntrance(screen);
    
    console.log("Created Google Maps screen with ID:", screen.userData.id);
    
    // Select this as the current screen
    selectScreen(screen);
    
    return screen;
}

// Add drop shadow to a screen for better depth perception
function addDropShadow(screen, width, height) {
    // Create shadow plane
    const shadowGeometry = new THREE.PlaneGeometry(width * 1.05, height * 1.05);
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
    });
    
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.position.z = -0.005;
    shadowMesh.renderOrder = 0;
    screen.add(shadowMesh);
    
    // Create subtle glow effect
    const glowGeometry = new THREE.PlaneGeometry(width * 1.1, height * 1.1);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.004;
    glowMesh.renderOrder = 1;
    screen.add(glowMesh);
    
    // Store reference to glow for animation
    screen.userData.glowMesh = glowMesh;
}

// Animate screen entrance with a pop effect
export function animateScreenEntrance(screen) {
    if (!screen) return;
    
    // Save original position for animation
    const targetPosition = screen.position.clone();
    const targetScale = screen.scale.clone();
    
    // Start slightly below and scaled down
    screen.position.y -= 0.3;
    screen.scale.set(0.1, 0.1, 0.1);
    
    // Animation parameters
    const duration = 0.5; // seconds
    const startTime = Date.now();
    
    function animate() {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const progress = Math.min(elapsed / duration, 1); // 0 to 1
        
        // Easing function (ease out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Apply animation
        screen.position.y = targetPosition.y - 0.3 * (1 - eased);
        
        // Scale animation
        screen.scale.x = targetScale.x * (0.1 + 0.9 * eased);
        screen.scale.y = targetScale.y * (0.1 + 0.9 * eased);
        screen.scale.z = targetScale.z * (0.1 + 0.9 * eased);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Create a fallback texture when CSS3D content isn't available
function createFallbackTexture(screenNumber) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#202030');
    gradient.addColorStop(1, '#101020');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Grid pattern
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Add loading text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Loading Screen ${screenNumber}...`, canvas.width/2, canvas.height/2);
    ctx.font = '16px Arial';
    ctx.fillText('Real content will appear soon', canvas.width/2, canvas.height/2 + 30);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Enhanced screen creation with modern UI
function enhancedCreateScreen(position, size, title = 'Screen', content = null) {
    const { x: width, y: height } = size;
    
    // Create main group
    const screenGroup = new THREE.Group();
    screenGroup.position.copy(position);
    
    // Create content panel
    const contentGeometry = new THREE.PlaneGeometry(width, height);
    
    // Use content texture if provided, otherwise create a placeholder
    let contentMaterial;
    if (content) {
        // For video or image content
        contentMaterial = new THREE.MeshBasicMaterial({
            map: content,
            side: THREE.DoubleSide
        });
    } else {
        // Placeholder gradient material
        contentMaterial = new THREE.MeshBasicMaterial({
            color: 0x202030,
            side: THREE.DoubleSide
        });
    }
    
    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.userData.type = 'content';
    screenGroup.add(contentPanel);
    
    // Add top drag bar with title
    const barHeight = height * 0.08;
    const barGeometry = new THREE.PlaneGeometry(width, barHeight);
    
    // Create title bar texture
    const barCanvas = document.createElement('canvas');
    barCanvas.width = 512;
    barCanvas.height = 48;
    const barCtx = barCanvas.getContext('2d');
    
    // Gradient background for title bar
    const gradient = barCtx.createLinearGradient(0, 0, 512, 0);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#34495e');
    barCtx.fillStyle = gradient;
    barCtx.fillRect(0, 0, 512, 48);
    
    // Add title text
    barCtx.fillStyle = '#ecf0f1';
    barCtx.font = 'bold 20px Arial';
    barCtx.textAlign = 'center';
    barCtx.textBaseline = 'middle';
    barCtx.fillText(title, 256, 24);
    
    // Subtle design lines
    barCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    barCtx.lineWidth = 1;
    barCtx.beginPath();
    barCtx.moveTo(0, 47.5);
    barCtx.lineTo(512, 47.5);
    barCtx.stroke();
    
    // Create texture from canvas
    const barTexture = new THREE.CanvasTexture(barCanvas);
    
    // Create title bar material
    const barMaterial = new THREE.MeshBasicMaterial({
        map: barTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create and position title bar
    const dragHandle = new THREE.Mesh(barGeometry, barMaterial);
    dragHandle.position.y = height / 2 - barHeight / 2;
    dragHandle.position.z = 0.001; // Slightly in front of content
    dragHandle.userData = {
        type: 'dragHandle',
        isInteractive: true
    };
    screenGroup.add(dragHandle);
    
    // Add control buttons to title bar
    // Close button (X)
    addControlButton(screenGroup, 'close', width / 2 - barHeight * 0.7, height / 2 - barHeight / 2, barHeight * 0.6);
    
    // Minimize button (-)
    addControlButton(screenGroup, 'minimize', width / 2 - barHeight * 1.7, height / 2 - barHeight / 2, barHeight * 0.6);
    
    return screenGroup;
}

// Add a control button to the screen
function addControlButton(screen, type, x, y, size) {
    // Create button canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Button background
    ctx.fillStyle = type === 'close' ? '#e74c3c' : '#3498db';
    ctx.beginPath();
    ctx.arc(32, 32, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Button icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    if (type === 'close') {
        // X icon
        ctx.beginPath();
        ctx.moveTo(24, 24);
        ctx.lineTo(40, 40);
        ctx.moveTo(40, 24);
        ctx.lineTo(24, 40);
        ctx.stroke();
    } else if (type === 'minimize') {
        // - icon
        ctx.beginPath();
        ctx.moveTo(24, 32);
        ctx.lineTo(40, 32);
        ctx.stroke();
    }
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create button
    const geometry = new THREE.CircleGeometry(size / 2, 32);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const button = new THREE.Mesh(geometry, material);
    button.position.set(x, y, 0.002);
    button.userData = {
        type: 'button',
        buttonType: type,
        isInteractive: true
    };
    
    screen.add(button);
    return button;
}

// Select a screen to make it active
export function selectScreen(screen) {
    console.log("Selecting screen:", screen ? screen.userData.id : "none");
    
    // Deselect all screens first
    screens.forEach(s => {
        if (s.userData) {
            s.userData.isSelected = false;
        }
    });
    
    // Select the new screen if provided
    if (screen) {
        screen.userData.isSelected = true;
        
        // Animate the selected screen (slight scale up)
        animateScreenScale(screen, 1.05, 0.2, true);
        
        // Show notification
        showNotification(`Selected: ${screen.userData.contentType || 'Screen'} ${screen.userData.screenNumber || ''}`);
    }
    
    // Update global reference if window has access to core
    if (window.setSelectedScreen) {
        window.setSelectedScreen(screen);
    }
}

// Animate screen scale with bounce effect
function animateScreenScale(screen, targetScale, duration, bounce = false) {
    if (!screen) return;
    
    const startScale = screen.scale.clone();
    const endScale = new THREE.Vector3(targetScale, targetScale, targetScale);
    const startTime = Date.now();
    
    function animate() {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function with optional bounce
        let scale;
        if (bounce && progress >= 1) {
            scale = targetScale;
        } else if (bounce) {
            // Bounce effect
            const bounceFactor = -Math.pow(2, -10 * progress) * Math.sin((progress - 0.1) * 5 * Math.PI) + 1;
            scale = startScale.x + (endScale.x - startScale.x) * bounceFactor;
        } else {
            // Simple easing
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            scale = startScale.x + (endScale.x - startScale.x) * eased;
        }
        
        screen.scale.set(scale, scale, scale);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Update screen visual effects
export function updateScreenEffects() {
    screens.forEach(screen => {
        if (screen.userData && screen.userData.isSelected) {
            // Find the border mesh
            const borderMesh = screen.children.find(child => 
                child.geometry && 
                child.geometry.type === 'PlaneGeometry' && 
                Math.abs(child.position.z - (-0.001)) < 0.0001);
                
            if (borderMesh) {
                // Subtle pulsing effect for selected screen's border
                const time = Date.now() * 0.001;
                const pulseIntensity = 0.15 * Math.sin(time * 2) + 0.85;
                borderMesh.material.color.setRGB(
                    0.1 * pulseIntensity,
                    0.1 * pulseIntensity,
                    0.5 * pulseIntensity
                );
            }
            
            // Update glow effect for selected screen
            const glowMesh = screen.userData.glowMesh;
            if (glowMesh) {
                const time = Date.now() * 0.001;
                const glowIntensity = 0.2 * Math.sin(time * 1.5) + 0.25;
                glowMesh.material.opacity = glowIntensity;
            }
            
            // Subtle floating effect for selected screen
            screen.position.y += Math.sin(Date.now() * 0.002) * 0.0001;
        }
        
        // Update CSS3D object position if screen has real content
        if (screen.userData && screen.userData.hasRealContent && screen.userData.updateCSS3DPosition) {
            screen.userData.updateCSS3DPosition();
        }
    });
    
    // Update CSS3D renderer
    if (css3dRenderer) {
        updateCSS3DRenderer();
    }
}

// Create a screen from button press - used to connect UI buttons to screen creation
export function createScreenFromButton(screenType, position) {
    // Default position in front of the camera if not provided
    if (!position && window.camera) {
        // Get camera direction
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(window.camera.quaternion);
        
        // Position 1.5 meters in front of camera
        position = new THREE.Vector3();
        position.copy(window.camera.position).addScaledVector(direction, 1.5);
    }
    
    console.log(`Creating ${screenType} screen at position:`, position);
    
    // Create appropriate screen based on type
    switch(screenType.toLowerCase()) {
        case 'youtube':
            return createYouTubeScreen(position);
        case 'maps':
        case 'googlemaps':
        case 'googlemapssatellite':
            return createGoogleMapsScreen(position);
        case 'duckduckgo':
        case 'search':
            return createDuckDuckGoScreen(position);
        case 'browser':
        case 'video':
        default:
            return createNewBrowserScreen(position);
    }
} 