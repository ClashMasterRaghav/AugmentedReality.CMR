// ui.js - Handles user interface elements for the AR experience
import * as THREE from 'three';
import { createBrowserScreen } from './screens.js';

// Global UI elements
let controlPanel = null;
let virtualKeyboard = null;

// UI state
let isMoveModeActive = false;
let isRotateModeActive = false;
let isResizeModeActive = false;

// Create and initialize UI components
export function createUI(scene, camera, renderer) {
    createControlPanel(scene, camera);
}

// Create the main control panel
function createControlPanel(scene, camera) {
    // Panel size and position
    const panelWidth = 0.3;
    const panelHeight = 0.2;
    
    // Create panel group
    controlPanel = new THREE.Group();
    
    // Create panel background with rounded corners using a canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Draw panel with glassmorphism style
    const cornerRadius = 30;
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(canvas.width - cornerRadius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    ctx.lineTo(canvas.width, canvas.height - cornerRadius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    ctx.lineTo(cornerRadius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    
    // Glass effect with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(60, 65, 92, 0.85)');
    gradient.addColorStop(1, 'rgba(30, 35, 60, 0.85)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add subtle highlight at the top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(20, 20, canvas.width - 40, 1);
    
    // Create panel mesh
    const panelTexture = new THREE.CanvasTexture(canvas);
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    controlPanel.add(panelMesh);
    
    // Title text
    addTextToPanel(controlPanel, "Control Panel", 0, panelHeight/2 - 0.03, 0.015);
    
    // Add buttons for various functions
    const buttonSpacing = 0.055;
    const buttonY = -0.02;
    
    // Add Screen button
    const addButton = createButton(
        controlPanel, 
        "Add Screen", 
        -panelWidth/2 + 0.07, 
        buttonY,
        0x2255aa,
        () => createBrowserScreen(scene, camera)
    );
    
    // Move button
    const moveButton = createButton(
        controlPanel, 
        "Move", 
        -panelWidth/2 + 0.07, 
        buttonY - buttonSpacing,
        0x22aa55,
        () => toggleMoveMode()
    );
    
    // Rotate button
    const rotateButton = createButton(
        controlPanel, 
        "Rotate", 
        panelWidth/2 - 0.07, 
        buttonY,
        0xaa5522,
        () => toggleRotateMode()
    );
    
    // Resize button
    const resizeButton = createButton(
        controlPanel, 
        "Resize", 
        panelWidth/2 - 0.07, 
        buttonY - buttonSpacing,
        0xaa2255,
        () => toggleResizeMode()
    );
    
    // Set initial position
    controlPanel.position.set(0, -0.3, -0.8);
    controlPanel.lookAt(camera.position);
    
    // Add to scene
    scene.add(controlPanel);
    
    // Make panel follow the camera at a distance with smooth delay
    controlPanel.userData = {
        type: 'ui',
        followCamera: true,
        initialDistance: new THREE.Vector3(0, -0.3, -0.8)
    };
    
    console.log("Created control panel");
    return controlPanel;
}

// Create a button with text and action
function createButton(parent, text, x, y, color = 0x3366cc, action = null) {
    // Button group
    const button = new THREE.Group();
    
    // Button size
    const buttonWidth = 0.12;
    const buttonHeight = 0.04;
    
    // Create button background
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw rounded rectangle
    const cornerRadius = 20;
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(canvas.width - cornerRadius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    ctx.lineTo(canvas.width, canvas.height - cornerRadius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    ctx.lineTo(cornerRadius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    
    // Convert hex color to RGB
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    // Fill button
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
    ctx.fill();
    
    // Add highlight
    const gradientH = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradientH.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradientH.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradientH.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradientH;
    ctx.fill();
    
    // Create button mesh
    const buttonTexture = new THREE.CanvasTexture(canvas);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        map: buttonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const buttonGeometry = new THREE.PlaneGeometry(buttonWidth, buttonHeight);
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonMesh.position.set(x, y, 0.001);
    button.add(buttonMesh);
    
    // Add text
    addTextToPanel(button, text, 0, 0, 0.009, 0.002);
    
    // Add user data for interaction
    buttonMesh.userData = {
        type: 'button',
        action: action,
        isInteractive: true,
        hoverColor: new THREE.Color(color).multiplyScalar(1.2),
        normalColor: new THREE.Color(color),
        originalMaterial: buttonMaterial.clone()
    };
    
    // Add button to parent
    parent.add(button);
    
    return button;
}

// Add text to panel
function addTextToPanel(parent, text, x, y, size = 0.02, z = 0.001) {
    // Create text using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    const fontSize = Math.floor(canvas.height * 0.4);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create material with texture
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create text plane
    const textWidth = size * 5; // Adjust based on text length
    const textHeight = size * 1.2;
    const geometry = new THREE.PlaneGeometry(textWidth, textHeight);
    const textMesh = new THREE.Mesh(geometry, material);
    
    // Position text
    textMesh.position.set(x, y, z);
    
    // Add to parent
    parent.add(textMesh);
    
    return textMesh;
}

// Mode toggle functions
function toggleMoveMode() {
    isMoveModeActive = !isMoveModeActive;
    isRotateModeActive = false;
    isResizeModeActive = false;
    
    console.log(`Move mode ${isMoveModeActive ? 'activated' : 'deactivated'}`);
    showNotification(`Move Mode ${isMoveModeActive ? 'On' : 'Off'}`);
    
    updateButtonStates();
}

function toggleRotateMode() {
    isRotateModeActive = !isRotateModeActive;
    isMoveModeActive = false;
    isResizeModeActive = false;
    
    console.log(`Rotate mode ${isRotateModeActive ? 'activated' : 'deactivated'}`);
    showNotification(`Rotate Mode ${isRotateModeActive ? 'On' : 'Off'}`);
    
    updateButtonStates();
}

function toggleResizeMode() {
    isResizeModeActive = !isResizeModeActive;
    isMoveModeActive = false;
    isRotateModeActive = false;
    
    console.log(`Resize mode ${isResizeModeActive ? 'activated' : 'deactivated'}`);
    showNotification(`Resize Mode ${isResizeModeActive ? 'On' : 'Off'}`);
    
    updateButtonStates();
}

// Update button states based on active modes
function updateButtonStates() {
    // Implementation will depend on how we want to visually indicate active state
}

// Get active mode
export function getActiveMode() {
    if (isMoveModeActive) return 'move';
    if (isRotateModeActive) return 'rotate';
    if (isResizeModeActive) return 'resize';
    return null;
}

// Get control panel
export function getControlPanel() {
    return controlPanel;
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add type-specific styling
    switch(type) {
        case 'error':
            notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            break;
        case 'success':
            notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
            break;
        default:
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    }
    
    // Add to container
    container.appendChild(notification);
    
    // Remove after animation completes
    setTimeout(() => {
        if (notification.parentNode === container) {
            container.removeChild(notification);
        }
    }, 3000);
}

// Update UI elements
export function updateUI(camera) {
    // Update control panel position to follow camera
    if (controlPanel && controlPanel.userData.followCamera) {
        // Get desired position in front of camera
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        
        const targetPosition = new THREE.Vector3();
        targetPosition.copy(camera.position)
            .add(direction.multiplyScalar(0.8));
        
        // Add offset for comfort
        targetPosition.y -= 0.3;
        
        // Apply smooth interpolation
        controlPanel.position.lerp(targetPosition, 0.1);
        
        // Make panel face the camera
        controlPanel.lookAt(camera.position);
    }
} 