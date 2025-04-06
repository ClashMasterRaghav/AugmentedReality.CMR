// screens.js - Handles creation and management of AR screens
import * as THREE from 'three';

// Array to store all created screens
let screens = [];
let selectedScreen = null;

// Create and initialize screens
export function createScreens(scene, camera, videoTexture) {
    // Create initial video screen
    createVideoScreen(scene, camera, videoTexture, new THREE.Vector3(0, 0, -1.5));
}

// Create a video screen
function createVideoScreen(scene, camera, videoTexture, position = new THREE.Vector3(0, 0, -1.5)) {
    // Create screen container
    const screenContainer = new THREE.Group();
    screenContainer.position.copy(position);
    
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    
    // Create screen mesh with video texture
    const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
        map: videoTexture,
        side: THREE.DoubleSide
    });
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    screenContainer.add(screenMesh);
    
    // Add border for better visibility
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.05, screenHeight + 0.05);
    const borderMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    borderMesh.position.z = -0.01;
    screenContainer.add(borderMesh);
    
    // Add top bar for dragging
    const topBarGeometry = new THREE.PlaneGeometry(screenWidth, 0.1);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x222222,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    topBar.position.y = screenHeight/2 + 0.05;
    topBar.userData = { 
        type: 'dragHandle',
        screen: screenContainer
    };
    screenContainer.add(topBar);
    
    // Add close button
    addCloseButton(screenContainer, screenWidth, screenHeight);
    
    // Add user data for identification
    screenContainer.userData = {
        type: 'screen',
        id: screens.length,
        contentType: 'video',
        isSelected: false,
        isInteractive: true
    };
    
    // Add screen to scene and tracking array
    scene.add(screenContainer);
    screens.push(screenContainer);
    
    // Add entrance animation
    animateScreenEntrance(screenContainer);
    
    console.log(`Created video screen with ID: ${screenContainer.userData.id}`);
    
    // Select this screen
    selectScreen(screenContainer);
    
    return screenContainer;
}

// Add close button to screen
function addCloseButton(screenContainer, screenWidth, screenHeight) {
    // Close button in the top-right corner
    const closeSize = 0.08;
    const closeGeometry = new THREE.PlaneGeometry(closeSize, closeSize);
    
    // Create close button texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    // Draw X
    context.fillStyle = '#FF4444';
    context.beginPath();
    context.arc(32, 32, 32, 0, 2 * Math.PI);
    context.fill();
    
    context.strokeStyle = 'white';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(20, 20);
    context.lineTo(44, 44);
    context.moveTo(44, 20);
    context.lineTo(20, 44);
    context.stroke();
    
    const closeTexture = new THREE.CanvasTexture(canvas);
    const closeMaterial = new THREE.MeshBasicMaterial({
        map: closeTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const closeButton = new THREE.Mesh(closeGeometry, closeMaterial);
    closeButton.position.set(screenWidth/2 - closeSize/2, screenHeight/2 + 0.05, 0.01);
    closeButton.userData = {
        type: 'closeButton',
        screen: screenContainer
    };
    
    screenContainer.add(closeButton);
    return closeButton;
}

// Create a web browser screen
export function createBrowserScreen(scene, camera, position = new THREE.Vector3(0, 0, -1.5)) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    
    // Create screen container
    const screenContainer = new THREE.Group();
    screenContainer.position.copy(position);
    
    // Create iframe texture (simulation)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const context = canvas.getContext('2d');
    
    // Draw simulated browser content
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Address bar
    context.fillStyle = '#f0f0f0';
    context.fillRect(0, 0, canvas.width, 40);
    
    // URL text
    context.fillStyle = '#333';
    context.font = '16px Arial';
    context.fillText('https://example.com', 50, 25);
    
    // Some content
    context.fillStyle = '#333';
    context.font = '24px Arial';
    context.fillText('Web Content', canvas.width/2 - 80, 100);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide
    });
    
    // Create screen mesh
    const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    const screenMesh = new THREE.Mesh(screenGeometry, material);
    screenContainer.add(screenMesh);
    
    // Add border
    const borderGeometry = new THREE.PlaneGeometry(screenWidth + 0.05, screenHeight + 0.05);
    const borderMaterial = new THREE.MeshBasicMaterial({
        color: 0x3366cc, // Blue for browser
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    borderMesh.position.z = -0.01;
    screenContainer.add(borderMesh);
    
    // Add top bar
    const topBarGeometry = new THREE.PlaneGeometry(screenWidth, 0.1);
    const topBarMaterial = new THREE.MeshBasicMaterial({
        color: 0x2255aa,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
    topBar.position.y = screenHeight/2 + 0.05;
    topBar.userData = { 
        type: 'dragHandle',
        screen: screenContainer
    };
    screenContainer.add(topBar);
    
    // Add close button
    addCloseButton(screenContainer, screenWidth, screenHeight);
    
    // Add user data
    screenContainer.userData = {
        type: 'screen',
        id: screens.length,
        contentType: 'browser',
        isSelected: false,
        isInteractive: true
    };
    
    // Add to scene and tracking array
    scene.add(screenContainer);
    screens.push(screenContainer);
    
    // Add entrance animation
    animateScreenEntrance(screenContainer);
    
    console.log(`Created browser screen with ID: ${screenContainer.userData.id}`);
    
    // Select this screen
    selectScreen(screenContainer);
    
    return screenContainer;
}

// Animate screen entrance
function animateScreenEntrance(screen) {
    // Save original position
    const targetPosition = screen.position.clone();
    
    // Start from below and scaled down
    screen.position.y -= 0.5;
    screen.scale.set(0.5, 0.5, 0.5);
    screen.rotation.x = 0.2;
    
    // Animate to final position
    const startTime = Date.now();
    const duration = 500; // ms
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out function
        const easeOut = function(t) {
            return 1 - Math.pow(1 - t, 3);
        };
        
        const t = easeOut(progress);
        
        // Update position, scale and rotation
        screen.position.y = targetPosition.y - 0.5 * (1 - t);
        screen.scale.set(0.5 + 0.5 * t, 0.5 + 0.5 * t, 0.5 + 0.5 * t);
        screen.rotation.x = 0.2 * (1 - t);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Select a screen
export function selectScreen(screen) {
    // Deselect previous screen
    if (selectedScreen) {
        selectedScreen.userData.isSelected = false;
        
        // Find and update border color
        selectedScreen.children.forEach(child => {
            if (child.material && child.geometry.type === 'PlaneGeometry' && 
                child.geometry.parameters.width > 0.9) {
                // Assuming this is the border
                child.material.color.set(0x444444);
                child.material.opacity = 0.8;
            }
        });
    }
    
    // Select new screen
    selectedScreen = screen;
    selectedScreen.userData.isSelected = true;
    
    // Find and update border color
    selectedScreen.children.forEach(child => {
        if (child.material && child.geometry.type === 'PlaneGeometry' && 
            child.geometry.parameters.width > 0.9) {
            // Assuming this is the border
            child.material.color.set(0x00ffff);
            child.material.opacity = 1.0;
        }
    });
    
    console.log(`Selected screen ID: ${selectedScreen.userData.id}`);
}

// Get all screens
export function getScreens() {
    return screens;
}

// Get selected screen
export function getSelectedScreen() {
    return selectedScreen;
}

// Remove a screen
export function removeScreen(screen) {
    const index = screens.indexOf(screen);
    if (index !== -1) {
        // Remove from scene
        scene.remove(screen);
        
        // Remove from tracking array
        screens.splice(index, 1);
        
        console.log(`Removed screen ID: ${screen.userData.id}`);
        
        // If we removed the selected screen, select another one if available
        if (selectedScreen === screen && screens.length > 0) {
            selectScreen(screens[0]);
        } else if (screens.length === 0) {
            selectedScreen = null;
        }
    }
} 