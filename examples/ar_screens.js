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
    
    // Browser background - main content area
    const browserGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const browserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const browserPanel = new THREE.Mesh(browserGeometry, browserMaterial);
    browserWindow.add(browserPanel);
    
    // Screen border with improved design
    const borderGeometry = new THREE.PlaneGeometry(0.82, 0.62);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2196F3, // Blue border
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    browserWindow.add(borderPanel);
    
    // Add a subtle shadow effect
    const shadowGeometry = new THREE.PlaneGeometry(0.84, 0.64);
    const shadowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2
    });
    const shadowPanel = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPanel.position.z = -0.003;
    browserWindow.add(shadowPanel);
    
    // Simple header bar
    const headerGeometry = new THREE.PlaneGeometry(0.8, 0.08);
    const headerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1a73e8, // Google blue color
        side: THREE.DoubleSide
    });
    const headerBar = new THREE.Mesh(headerGeometry, headerMaterial);
    headerBar.position.y = 0.26;
    headerBar.position.z = 0.001;
    browserWindow.add(headerBar);
    
    // Create title for the screen
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 512;
    titleCanvas.height = 64;
    const titleCtx = titleCanvas.getContext('2d');
    titleCtx.fillStyle = '#ffffff';
    titleCtx.font = 'bold 28px Arial';
    titleCtx.textAlign = 'center';
    titleCtx.textBaseline = 'middle';
    titleCtx.fillText(`Screen ${screens.length + 1}`, 256, 32);
    
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleGeometry = new THREE.PlaneGeometry(0.7, 0.06);
    const titleMaterial = new THREE.MeshBasicMaterial({ 
        map: titleTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(0, 0.26, 0.002);
    browserWindow.add(titleMesh);
    
    // Content area with video
    const contentGeometry = new THREE.PlaneGeometry(0.76, 0.5);
    
    // Check if video texture is available, otherwise use static content
    const contentMaterial = videoTexture ? 
        new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide }) :
        new THREE.MeshBasicMaterial({ 
            map: createFallbackTexture(screens.length + 1),
            side: THREE.DoubleSide
        });
        
    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.position.y = 0;
    contentPanel.position.z = 0.001;
    browserWindow.add(contentPanel);
    
    // Position the window
    browserWindow.position.copy(position);
    browserWindow.userData = { 
        type: 'screen', 
        id: screens.length, 
        isSelected: false,
        content: `Video Screen ${screens.length + 1}`,
        originalScale: new THREE.Vector3(1, 1, 1)
    };
    
    scene.add(browserWindow);
    screens.push(browserWindow);
    
    // Set this as the selected screen
    selectScreen(browserWindow);
    
    return browserWindow;
}

// Create a fallback texture when video is not available
function createFallbackTexture(screenNumber) {
    // Create a canvas to draw fallback content
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw header
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(0, 0, canvas.width, 60);
    
    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Screen ${screenNumber}`, canvas.width/2, 40);
    
    // Draw content area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 80, canvas.width - 40, canvas.height - 100);
    
    // Draw message
    ctx.fillStyle = '#333333';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading video content...', canvas.width/2, 200);
    ctx.font = '18px Arial';
    ctx.fillText('Touch the screen to interact', canvas.width/2, 240);
    
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