// Screen creation and management functionality
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { videoTexture, registerVideoScreen, unregisterVideoScreen } from './ar_media.js';
import { generateUUID, showNotification } from './ar_utils.js';

// Array to store screen objects
export let screens = [];
let css3dRenderer;
export let css3dScene;

// Initialize CSS3D renderer for real web content
export function initCSS3DRenderer() {
    if (css3dRenderer) {
        console.log('CSS3D renderer already initialized');
        return css3dRenderer;
    }
    
    try {
        // Create CSS3D renderer
        css3dRenderer = new CSS3DRenderer();
        css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        css3dRenderer.domElement.style.position = 'absolute';
        css3dRenderer.domElement.style.top = '0';
        css3dRenderer.domElement.style.left = '0';
        css3dRenderer.domElement.style.pointerEvents = 'none';
        css3dRenderer.domElement.style.zIndex = '1'; // Ensure it's behind UI but visible
        document.body.appendChild(css3dRenderer.domElement);
        
        // Create CSS3D scene - use THREE.Scene instead of CSS3DScene
        css3dScene = new THREE.Scene();
        
        // Add window resize handler
        window.addEventListener('resize', function() {
            if (css3dRenderer) {
                css3dRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        console.log('CSS3D renderer initialized');
        
        // Wait a moment for DOM to update
        setTimeout(() => {
            // Force a render to ensure visibility
            if (css3dScene && css3dRenderer && window.camera) {
                css3dRenderer.render(css3dScene, window.camera);
                console.log('Initial CSS3D render complete');
            }
        }, 500);
        
        return css3dRenderer;
    } catch (error) {
        console.error('Error initializing CSS3D renderer:', error);
        showNotification('Failed to initialize web content renderer', 'error');
        return null;
    }
}

// Update CSS3D renderer in animation loop
export function updateCSS3DRenderer() {
    if (!css3dRenderer || !css3dScene || !window.camera) return;
    
    // Check if any screens need their CSS3D objects updated
    screens.forEach(screen => {
        if (screen.userData && screen.userData.css3dObject && screen.visible) {
            // Ensure CSS3D object is in sync with the THREE.js object
            screen.userData.css3dObject.position.copy(screen.position);
            screen.userData.css3dObject.quaternion.copy(screen.quaternion);
            screen.userData.css3dObject.scale.copy(screen.scale);
            
            // Make sure CSS3D object is visible if screen is visible
            screen.userData.css3dObject.visible = screen.visible;
            
            // Update element styles for better visibility
            if (screen.userData.css3dObject.element) {
                // Only update if needed to avoid layout thrashing
                if (screen.userData.lastUpdateTime === undefined || 
                    Date.now() - screen.userData.lastUpdateTime > 500) {
                    
                    const element = screen.userData.css3dObject.element;
                    
                    // Make sure iframe has proper styling
                    if (element.tagName === 'IFRAME') {
                        element.style.border = 'none';
                        element.style.borderRadius = '10px';
                        element.style.overflow = 'hidden';
                        element.style.backgroundColor = '#ffffff';
                    }
                    
                    screen.userData.lastUpdateTime = Date.now();
                }
            }
        }
    });
    
    // Render the CSS3D scene
    css3dRenderer.render(css3dScene, window.camera);
}

// Create a new browser screen with proper structure
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.6;
    const screenHeight = 0.9;
    const dimensions = { width: screenWidth, height: screenHeight };
    
    console.log("Creating new browser screen at position:", position);
    
    // Check if we need a fallback texture (no CSS3D support/init)
    let texture;
    let hasRealContent = false;
    
    if (!css3dRenderer || !css3dScene) {
        console.log("CSS3D not available, creating fallback texture");
        texture = createFallbackTexture({
            text: "Loading web content...",
            width: 1024,
            height: 576
        });
    } else {
        // Create a placeholder texture while real content loads
        texture = createFallbackTexture({
            text: "Loading web content...",
            width: 1024,
            height: 576,
            spinnerSize: 60
        });
        hasRealContent = true;
    }
    
    // Create the screen with enhanced UI elements
    const screen = enhancedCreateScreen(dimensions, texture);
    screen.position.copy(position);
    
    // Look at camera if available
    if (window.camera) {
        const cameraPosition = new THREE.Vector3();
        window.camera.getWorldPosition(cameraPosition);
        screen.lookAt(cameraPosition);
    }
    
    // Add screen to scene
    if (window.scene) {
        window.scene.add(screen);
    }
    
    // Generate unique ID
    const screenId = generateUUID();
    const screenNumber = screens.length + 1;
    
    // Add user data
    screen.userData = {
        ...screen.userData,
        id: screenId,
        type: 'screen',
        screenNumber: screenNumber,
        contentType: 'Browser',
        width: screenWidth,
        height: screenHeight,
        createdAt: Date.now(),
        hasRealContent: hasRealContent,
        position: position.clone(),
        isVisible: true,
        isDraggable: true,
        dragHandleHeight: screenHeight * 0.15 // Top 15% is drag handle
    };
    
    // Add drop shadow for depth
    addDropShadow(screen);
    
    // Create and add CSS3D object for real web content
    if (hasRealContent && css3dRenderer && css3dScene) {
        // Create iframe for web content
        const iframe = document.createElement('iframe');
        iframe.style.width = `${screenWidth * 1000}px`;
        iframe.style.height = `${screenHeight * 1000}px`;
        iframe.style.border = 'none';
        iframe.style.borderRadius = '10px';
        iframe.src = 'https://duckduckgo.com/';
        
        // Create CSS3D object
        const css3dObject = new CSS3DObject(iframe);
        css3dObject.position.copy(position);
        css3dObject.scale.set(0.001, 0.001, 0.001); // Scale to match Three.js units
        
        // Add to CSS3D scene
        css3dScene.add(css3dObject);
        
        // Store reference in screen userData
        screen.userData.css3dObject = css3dObject;
        screen.userData.iframe = iframe;
        
        // Create method to update CSS3D object position
        screen.userData.updateCSS3DPosition = () => {
            css3dObject.position.copy(screen.position);
            css3dObject.quaternion.copy(screen.quaternion);
            css3dObject.scale.copy(screen.scale.clone().multiplyScalar(0.001)); // Maintain correct scale
        };
    }
    
    // Add to screens array
    screens.push(screen);
    
    // Animate entrance
    animateScreenEntrance(screen);
    
    console.log("Created screen with ID:", screen.userData.id);
    
    // Select this as the current screen
    selectScreen(screen);
    
    return screen;
}

// Create a YouTube screen using CSS3D renderer
export function createYouTubeScreen(videoId, position = new THREE.Vector3(0, 0, -1.5)) {
    if (!css3dRenderer || !css3dScene) {
        console.error("CSS3D renderer not initialized! Call initCSS3DRenderer() first");
        showNotification("Error: CSS3D renderer not available for YouTube", "error");
        return null;
    }
    
    console.log(`Creating YouTube screen for video ID: ${videoId}`);
    
    // Create screen dimensions
    const width = 1.6;
    const height = 0.9;
    const screenGeometry = new THREE.PlaneGeometry(width, height);
    
    // Create container for screen using enhancedCreateScreen
    const screen = enhancedCreateScreen({
        width,
        height,
        depth: 0.05
    });
    
    // Set position if provided
    if (position) {
        screen.position.copy(position);
    }
    
    // Add user data
    screen.userData.id = generateUUID();
    screen.userData.screenNumber = screens.length + 1;
    screen.userData.contentType = 'youtube';
    screen.userData.videoId = videoId;
    
    // Create CSS3D element for YouTube embed
    const iframe = document.createElement('iframe');
    iframe.style.width = `${width * 1000}px`; // Convert to pixels at a reasonable scale
    iframe.style.height = `${height * 1000}px`;
    iframe.style.border = '0px';
    
    // Use YouTube embed URL with autoplay and mute
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1`;
    
    // Create CSS3D object from iframe
    const css3dObject = new CSS3DObject(iframe);
    
    // Scale down to match Three.js units
    css3dObject.scale.set(0.001, 0.001, 0.001);
    
    // Store reference to iframe and CSS3D object
    screen.userData.iframe = iframe;
    screen.userData.css3dObject = css3dObject;
    
    // Add CSS3D object to scene
    css3dScene.add(css3dObject);
    
    // Update CSS3D position to match screen
    const updateCSS3DPosition = () => {
        if (css3dObject && screen) {
            // Copy position and rotation from screen
            css3dObject.position.copy(screen.position);
            css3dObject.quaternion.copy(screen.quaternion);
        }
    };
    
    // Initial update
    updateCSS3DPosition();
    
    // Add screen to global array
    screens.push(screen);
    
    // Add screen to Three.js scene
    if (window.scene) {
        window.scene.add(screen);
    }
    
    // Add update function to be called each frame
    screen.userData.update = () => {
        updateCSS3DPosition();
    };
    
    // Add drop shadow for depth
    addDropShadow(screen);
    
    // Animate entrance
    animateScreenEntrance(screen);
    
    console.log(`Created YouTube screen with ID: ${screen.userData.id}`);
    
    return screen;
}

// Create a DuckDuckGo search screen
export function createDuckDuckGoScreen(query = '', position = new THREE.Vector3(0, 0, -1.5)) {
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
export function createGoogleMapsScreen(location = '', position = new THREE.Vector3(0, 0, -1.5)) {
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

// Add drop shadow to enhance visual depth of screen
function addDropShadow(screen) {
    if (!screen || !screen.userData) return;
    
    const width = screen.userData.width || screen.geometry.parameters.width;
    const height = screen.userData.height || screen.geometry.parameters.height;
    
    // Create shadow plane geometry (slightly larger than screen)
    const shadowGeometry = new THREE.PlaneGeometry(width + 0.1, height + 0.1);
    
    // Create shadow material
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        blending: THREE.MultiplyBlending
    });
    
    // Create shadow mesh
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.z = -0.02; // Position behind screen
    shadow.position.y = -0.03; // Offset slightly to create shadow effect
    shadow.position.x = 0.03;
    
    screen.add(shadow);
    
    // Add reference to shadow in userData
    screen.userData.shadowMesh = shadow;
    
    // Add subtle glow effect for modern screens
    const glowGeometry = new THREE.PlaneGeometry(width + 0.05, height + 0.05);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x3366cc,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = 0.001; // Just in front of the screen
    glowMesh.visible = false; // Hidden by default, shown when selected
    
    screen.add(glowMesh);
    screen.userData.glowMesh = glowMesh;
}

// Create a fallback texture when CSS3D content is unavailable
function createFallbackTexture({ text = "Loading...", width = 512, height = 512, spinnerSize = 40 }) {
    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Add loading text
    ctx.font = `${Math.floor(height/12)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#555555';
    ctx.fillText(text, width/2, height/2 + spinnerSize);
    
    // Draw spinner
    const centerX = width/2;
    const centerY = height/2 - spinnerSize;
    const outerRadius = spinnerSize;
    const innerRadius = spinnerSize * 0.8;
    
    // Draw spinner background
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f0f0';
    ctx.fill();
    
    // Draw spinner segments
    const segments = 12;
    for (let i = 0; i < segments; i++) {
        const startAngle = (i / segments) * Math.PI * 2;
        const endAngle = ((i + 0.8) / segments) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        
        // Vary opacity to create spinning effect
        const opacity = 0.1 + (i / segments) * 0.8;
        ctx.fillStyle = `rgba(51, 102, 204, ${opacity})`;
        ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Add animation to spinner
    const animateSpinner = () => {
        // Clear spinner area
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
            centerX - outerRadius - 5, 
            centerY - outerRadius - 5, 
            outerRadius * 2 + 10, 
            outerRadius * 2 + 10
        );
        
        // Redraw spinner background
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        
        // Get current time for rotation
        const now = Date.now() / 1000;
        
        // Draw rotated spinner segments
        for (let i = 0; i < segments; i++) {
            const rotation = now * 2; // 2 radians per second
            const startAngle = rotation + (i / segments) * Math.PI * 2;
            const endAngle = rotation + ((i + 0.8) / segments) * Math.PI * 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            
            // Vary opacity to create spinning effect
            const opacity = 0.1 + (i / segments) * 0.8;
            ctx.fillStyle = `rgba(51, 102, 204, ${opacity})`;
            ctx.fill();
        }
        
        // Update texture
        texture.needsUpdate = true;
        
        // Continue animation
        requestAnimationFrame(animateSpinner);
    };
    
    // Start animation
    animateSpinner();
    
    return texture;
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

// Create a screen with enhanced UI elements
function enhancedCreateScreen(dimensions, texture) {
    const { width, height } = dimensions;
    
    // Create main geometry and material for the screen content
    const screenGeometry = new THREE.PlaneGeometry(width, height);
    let screenMaterial;
    
    if (texture) {
        screenMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
    } else {
        // Default white material if no texture provided
        screenMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
    }
    
    // Create main screen mesh
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    
    // Add black border behind screen for visual depth
    const borderGeometry = new THREE.PlaneGeometry(width + 0.02, height + 0.02);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x222222,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.z = -0.001; // Slightly behind the screen
    screen.add(border);
    
    // Define drag handle height (top 15% of screen)
    const handleHeight = height * 0.15;
    screen.userData.dragHandleHeight = handleHeight;
    
    // Create drag handle at top of screen
    const handleGeometry = new THREE.PlaneGeometry(width, handleHeight);
    
    // Create canvas for drag handle with title
    const handleCanvas = document.createElement('canvas');
    handleCanvas.width = 512;
    handleCanvas.height = Math.floor(512 * (handleHeight / width));
    const handleCtx = handleCanvas.getContext('2d');
    
    // Create gradient background for handle
    const gradient = handleCtx.createLinearGradient(0, 0, 0, handleCanvas.height);
    gradient.addColorStop(0, '#3366cc');
    gradient.addColorStop(1, '#2255aa');
    handleCtx.fillStyle = gradient;
    
    // Draw rounded rectangle
    const cornerRadius = 10;
    handleCtx.beginPath();
    handleCtx.moveTo(cornerRadius, 0);
    handleCtx.lineTo(handleCanvas.width - cornerRadius, 0);
    handleCtx.quadraticCurveTo(handleCanvas.width, 0, handleCanvas.width, cornerRadius);
    handleCtx.lineTo(handleCanvas.width, handleCanvas.height);
    handleCtx.lineTo(0, handleCanvas.height);
    handleCtx.lineTo(0, cornerRadius);
    handleCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
    handleCtx.closePath();
    handleCtx.fill();
    
    // Add title text
    handleCtx.font = 'bold 24px Arial';
    handleCtx.textAlign = 'center';
    handleCtx.textBaseline = 'middle';
    handleCtx.fillStyle = '#ffffff';
    handleCtx.fillText('Drag Here', handleCanvas.width / 2, handleCanvas.height / 2);
    
    // Create texture from canvas
    const handleTexture = new THREE.CanvasTexture(handleCanvas);
    
    // Create material for handle
    const handleMaterial = new THREE.MeshBasicMaterial({
        map: handleTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create handle mesh
    const dragHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    dragHandle.position.set(0, height / 2 - handleHeight / 2, 0.001); // Position at top of screen
    
    // Add important user data for interaction
    dragHandle.userData = {
        type: 'dragHandle',
        screen: screen,
        draggable: true,
        handleHeight: handleHeight
    };
    
    screen.add(dragHandle);
    
    // Create close button (top right corner)
    const buttonSize = Math.min(width * 0.12, height * 0.12);
    const buttonGeometry = new THREE.PlaneGeometry(buttonSize, buttonSize);
    
    // Create canvas for close button
    const closeCanvas = document.createElement('canvas');
    closeCanvas.width = 128;
    closeCanvas.height = 128;
    const closeCtx = closeCanvas.getContext('2d');
    
    // Draw red circular background
    closeCtx.fillStyle = '#dd3333';
    closeCtx.beginPath();
    closeCtx.arc(64, 64, 60, 0, Math.PI * 2);
    closeCtx.fill();
    
    // Draw X
    closeCtx.strokeStyle = '#ffffff';
    closeCtx.lineWidth = 8;
    closeCtx.beginPath();
    closeCtx.moveTo(40, 40);
    closeCtx.lineTo(88, 88);
    closeCtx.moveTo(88, 40);
    closeCtx.lineTo(40, 88);
    closeCtx.stroke();
    
    // Create texture from canvas
    const closeButtonTexture = new THREE.CanvasTexture(closeCanvas);
    
    // Create material for button
    const closeButtonMaterial = new THREE.MeshBasicMaterial({
        map: closeButtonTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create button mesh
    const closeButton = new THREE.Mesh(buttonGeometry, closeButtonMaterial);
    closeButton.position.set(width / 2 - buttonSize / 2, height / 2 - handleHeight / 2, 0.002); // Position at top-right
    
    // Add user data for interaction handling
    closeButton.userData = {
        type: 'button',
        action: 'closeScreen',
        parent: screen
    };
    
    screen.add(closeButton);
    
    // Create minimize button (next to close button)
    const minimizeCanvas = document.createElement('canvas');
    minimizeCanvas.width = 128;
    minimizeCanvas.height = 128;
    const minCtx = minimizeCanvas.getContext('2d');
    
    // Draw yellow circular background
    minCtx.fillStyle = '#ffcc00';
    minCtx.beginPath();
    minCtx.arc(64, 64, 60, 0, Math.PI * 2);
    minCtx.fill();
    
    // Draw minimize icon
    minCtx.strokeStyle = '#ffffff';
    minCtx.lineWidth = 8;
    minCtx.beginPath();
    minCtx.moveTo(40, 64);
    minCtx.lineTo(88, 64);
    minCtx.stroke();
    
    // Create texture from canvas
    const minimizeButtonTexture = new THREE.CanvasTexture(minimizeCanvas);
    
    // Create material for button
    const minimizeButtonMaterial = new THREE.MeshBasicMaterial({
        map: minimizeButtonTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create button mesh
    const minimizeButton = new THREE.Mesh(buttonGeometry, minimizeButtonMaterial);
    minimizeButton.position.set(width / 2 - buttonSize * 1.8, height / 2 - handleHeight / 2, 0.002); // Position at top-right
    
    // Add user data for interaction handling
    minimizeButton.userData = {
        type: 'button',
        action: 'minimizeScreen',
        parent: screen
    };
    
    screen.add(minimizeButton);
    
    return screen;
}

// Select a screen and highlight it
export function selectScreen(screen) {
    if (!screen) return;
    
    console.log("Selecting screen:", screen.userData.id);
    
    // Deselect previously selected screen
    screens.forEach(s => {
        if (s.userData) {
            s.userData.selected = false;
            
            // Reset border color
            const borderMesh = s.children.find(child => 
                child.geometry && 
                child.geometry.type === 'PlaneGeometry' && 
                Math.abs(child.position.z - (-0.001)) < 0.0001);
                
            if (borderMesh) {
                borderMesh.material.color.set(0x222222);
            }
            
            // Hide glow effect
            if (s.userData.glowMesh) {
                s.userData.glowMesh.visible = false;
            }
        }
    });
    
    // Select the new screen
    screen.userData.selected = true;
    
    // Highlight border
    const borderMesh = screen.children.find(child => 
        child.geometry && 
        child.geometry.type === 'PlaneGeometry' && 
        Math.abs(child.position.z - (-0.001)) < 0.0001);
        
    if (borderMesh) {
        borderMesh.material.color.set(0x3366cc);
    }
    
    // Show glow effect
    if (screen.userData.glowMesh) {
        screen.userData.glowMesh.visible = true;
    }
    
    // Animate scale slightly to provide visual feedback
    animateScreenScale(screen, 1.03, 0.3, true);
    
    // Make sure CSS3D object is in sync
    if (screen.userData.css3dObject) {
        screen.userData.css3dObject.position.copy(screen.position);
        screen.userData.css3dObject.quaternion.copy(screen.quaternion);
        screen.userData.css3dObject.scale.copy(screen.scale);
        
        // Define updateCSS3DPosition function if not already defined
        if (!screen.userData.updateCSS3DPosition) {
            screen.userData.updateCSS3DPosition = () => {
                screen.userData.css3dObject.position.copy(screen.position);
                screen.userData.css3dObject.quaternion.copy(screen.quaternion);
                screen.userData.css3dObject.scale.copy(screen.scale);
            };
        }
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
    
    // Check if type includes a YouTube video ID
    if (typeof screenType === 'string' && screenType.includes('youtube:')) {
        const videoId = screenType.split(':')[1];
        return createYouTubeScreen(videoId, position);
    }
    
    // Create appropriate screen based on type
    switch(screenType.toLowerCase()) {
        case 'youtube':
            return createYouTubeScreen('dQw4w9WgXcQ', position); // Default video
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