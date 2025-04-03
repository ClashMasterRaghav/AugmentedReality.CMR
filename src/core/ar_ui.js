// UI elements and controls for AR experience
import * as THREE from 'three';
import { createRoundedRectTexture, createGlowTexture, showNotification } from './ar_utils.js';
import { createNewBrowserScreen, createYouTubeScreen, createGoogleMapsScreen } from './ar_screens.js';
import { deleteLastScreen } from './ar_interaction.js';

// Global UI elements
let controlPanel = null;
let buttons = [];
let virtualKeyboard = null;

// Initialize UI elements
export async function initUI() {
    // Create control panel if it doesn't exist yet
    if (!controlPanel && window.scene) {
        createControlPanel();
    }
    
    console.log("UI initialized");
}

// Update UI elements each frame
export function updateUI() {
    // Animate control panel
    if (controlPanel) {
        // Simple hover animation
        controlPanel.position.y += Math.sin(Date.now() * 0.002) * 0.0005;
    }
}

// Create main control panel
export function createControlPanel() {
    // Check if scene is available
    if (!window.scene) {
        console.error("Cannot create control panel - scene not initialized");
        return null;
    }
    
    // Create panel geometry
    const panelWidth = 0.6;
    const panelHeight = 0.2;
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    
    // Create panel material with rounded rectangle texture
    const panelTexture = createRoundedRectTexture(
        512, 
        256, 
        40, 
        '#2A2A2A', 
        '#4fc3f7',
        2
    );
    
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create panel mesh
    controlPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    
    // Position in front of camera if available
    if (window.camera) {
        const cameraPosition = new THREE.Vector3();
        window.camera.getWorldPosition(cameraPosition);
        
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(window.camera.quaternion);
        
        // Position control panel in front of camera
        const panelPosition = cameraPosition.clone().add(
            cameraDirection.multiplyScalar(1)
        );
        
        // Position slightly below eye level
        panelPosition.y -= 0.3;
        
        controlPanel.position.copy(panelPosition);
        
        // Make panel face the camera
        controlPanel.lookAt(cameraPosition);
    } else {
        // Fallback position if camera not available
        controlPanel.position.set(0, -0.5, -1);
    }
    
    controlPanel.userData.type = 'controlPanel';
    controlPanel.userData.isDraggable = true;
    
    // Add to scene
    window.scene.add(controlPanel);
    
    // Ensure panel is visible in console log
    console.log("Control panel created at position:", controlPanel.position);
    
    // Add buttons to panel
    addButtonToPanel(controlPanel, 'add', 'Add Screen', -0.2, 0, 0.08, handleAddButtonClick);
    addButtonToPanel(controlPanel, 'delete', 'Delete Screen', 0, 0, 0.08, handleDeleteButtonClick);
    addButtonToPanel(controlPanel, 'youtube', 'YouTube', 0.2, 0, 0.08, handleYouTubeButtonClick);
    
    showNotification("Control panel created", "success");
    
    return controlPanel;
}

// Add a button to the panel
function addButtonToPanel(panel, id, label, x, y, radius, clickHandler) {
    // Create button geometry
    const buttonGeometry = new THREE.CircleGeometry(radius, 32);
    
    // Create button texture
    const buttonTexture = createButtonTexture(id, label);
    
    // Create button material
    const buttonMaterial = new THREE.MeshBasicMaterial({
        map: buttonTexture,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });
    
    // Create button mesh
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(x, y, 0.001); // Slightly above panel
    button.userData.type = 'button';
    button.userData.id = id;
    button.userData.label = label;
    button.userData.action = 'handleButtonAction';
    button.userData.actionData = { action: id };
    button.userData.parent = panel;
    
    // Add to panel
    panel.add(button);
    
    // Add button to global array for tracking
    buttons.push(button);
    
    return button;
}

// Create a texture for a button
function createButtonTexture(id, label) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#4fc3f7';
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add icon based on id
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let icon = '+';
    switch(id) {
        case 'add':
            icon = '+';
            break;
        case 'delete':
            icon = '×';
            break;
        case 'youtube':
            icon = '▶';
            break;
        case 'maps':
            icon = '🌍';
            break;
        default:
            icon = id.charAt(0).toUpperCase();
    }
    
    ctx.fillText(icon, 64, 64);
    
    // Add label below
    ctx.font = '16px Arial';
    ctx.fillText(label, 64, 100);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Set button hover state
export function setButtonHover(button, isHovered) {
    if (!button || !button.material) return;
    
    if (isHovered) {
        // Apply hover effect
        button.material.opacity = 1;
        button.scale.set(1.1, 1.1, 1.1);
    } else {
        // Remove hover effect
        button.material.opacity = 0.9;
        button.scale.set(1, 1, 1);
    }
}

// Set button pressed state
export function setButtonPressed(button, isPressed) {
    if (!button || !button.material) return;
    
    if (isPressed) {
        // Apply pressed effect
        button.material.opacity = 0.8;
        button.scale.set(0.9, 0.9, 0.9);
        
        // Add small delay then trigger click handler
        if (button.userData && button.userData.action) {
            if (button.userData.clickHandled) return;
            
            button.userData.clickHandled = true;
            
            // Visual feedback for button press
            const originalPosition = button.position.z;
            button.position.z -= 0.005;
            
            // Reset after small delay
            setTimeout(() => {
                if (button) {
                    button.position.z = originalPosition;
                }
            }, 100);
        }
    } else {
        // Remove pressed effect
        button.material.opacity = 1;
        button.scale.set(1, 1, 1);
        
        // Reset click handled flag
        if (button.userData) {
            button.userData.clickHandled = false;
        }
    }
}

// Button handlers
function handleAddButtonClick() {
    // Create new screen in front of camera
    if (window.camera) {
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(window.camera.quaternion);
        
        const position = new THREE.Vector3();
        window.camera.getWorldPosition(position);
        
        // Create screen 1.5 meters in front
        const screenPosition = position.clone().add(cameraDirection.multiplyScalar(1.5));
        
        // Create browser screen
        const screen = createNewBrowserScreen();
        if (screen) {
            screen.position.copy(screenPosition);
            
            // Look at camera
            screen.lookAt(position);
            
            // Add slight random rotation
            screen.rotateY(Math.random() * 0.2 - 0.1);
            
            showNotification("New screen created", "success");
        }
    }
}

function handleDeleteButtonClick() {
    deleteLastScreen();
}

function handleYouTubeButtonClick() {
    // Create YouTube screen in front of camera
    if (window.camera) {
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(window.camera.quaternion);
        
        const position = new THREE.Vector3();
        window.camera.getWorldPosition(position);
        
        // Create screen 1.5 meters in front
        const screenPosition = position.clone().add(cameraDirection.multiplyScalar(1.5));
        
        // Grab a random YouTube video ID (Rick roll for now)
        const videoId = 'dQw4w9WgXcQ';
        
        // Create YouTube screen
        const screen = createYouTubeScreen(videoId);
        if (screen) {
            screen.position.copy(screenPosition);
            
            // Look at camera
            screen.lookAt(position);
            
            // Add slight random rotation
            screen.rotateY(Math.random() * 0.2 - 0.1);
            
            showNotification("YouTube screen created", "success");
        }
    }
}

// Create a virtual keyboard for text input
export function createVirtualKeyboard() {
    // Check if scene is available
    if (!window.scene) {
        console.error("Cannot create virtual keyboard - scene not initialized");
        return null;
    }
    
    // Create keyboard container
    const keyboardWidth = 1;
    const keyboardHeight = 0.4;
    const keyboardGeometry = new THREE.PlaneGeometry(keyboardWidth, keyboardHeight);
    
    // Create keyboard texture
    const keyboardTexture = createKeyboardTexture();
    
    // Create keyboard material
    const keyboardMaterial = new THREE.MeshBasicMaterial({
        map: keyboardTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create keyboard mesh
    virtualKeyboard = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    virtualKeyboard.position.set(0, -0.8, -1);
    virtualKeyboard.userData.type = 'virtualKeyboard';
    virtualKeyboard.visible = false; // Hide initially
    
    // Add to scene
    window.scene.add(virtualKeyboard);
    
    return virtualKeyboard;
}

// Create keyboard texture
function createKeyboardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Draw keyboard background
    ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw keyboard keys
    const keys = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', 'DEL']
    ];
    
    const keyWidth = 80;
    const keyHeight = 80;
    const keySpacing = 10;
    const startX = 50;
    const startY = 50;
    
    // Draw each row of keys
    for (let row = 0; row < keys.length; row++) {
        const rowOffset = row === 2 ? 20 : 0; // Offset for ASDF row
        
        for (let col = 0; col < keys[row].length; col++) {
            const x = startX + rowOffset + col * (keyWidth + keySpacing);
            const y = startY + row * (keyHeight + keySpacing);
            
            // Draw key background
            ctx.fillStyle = 'rgba(80, 80, 80, 0.9)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            
            // Rounded rectangle for key
            const radius = 8;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + keyWidth - radius, y);
            ctx.quadraticCurveTo(x + keyWidth, y, x + keyWidth, y + radius);
            ctx.lineTo(x + keyWidth, y + keyHeight - radius);
            ctx.quadraticCurveTo(x + keyWidth, y + keyHeight, x + keyWidth - radius, y + keyHeight);
            ctx.lineTo(x + radius, y + keyHeight);
            ctx.quadraticCurveTo(x, y + keyHeight, x, y + keyHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x + radius, y);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
            
            // Draw key letter
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(keys[row][col], x + keyWidth / 2, y + keyHeight / 2);
        }
    }
    
    // Draw spacebar
    const spacebarWidth = 400;
    const spacebarHeight = 60;
    const spacebarX = canvas.width / 2 - spacebarWidth / 2;
    const spacebarY = startY + 4 * (keyHeight + keySpacing);
    
    // Spacebar background
    ctx.fillStyle = 'rgba(80, 80, 80, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    
    // Rounded rectangle for spacebar
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(spacebarX + radius, spacebarY);
    ctx.lineTo(spacebarX + spacebarWidth - radius, spacebarY);
    ctx.quadraticCurveTo(spacebarX + spacebarWidth, spacebarY, spacebarX + spacebarWidth, spacebarY + radius);
    ctx.lineTo(spacebarX + spacebarWidth, spacebarY + spacebarHeight - radius);
    ctx.quadraticCurveTo(spacebarX + spacebarWidth, spacebarY + spacebarHeight, spacebarX + spacebarWidth - radius, spacebarY + spacebarHeight);
    ctx.lineTo(spacebarX + radius, spacebarY + spacebarHeight);
    ctx.quadraticCurveTo(spacebarX, spacebarY + spacebarHeight, spacebarX, spacebarY + spacebarHeight - radius);
    ctx.lineTo(spacebarX, spacebarY + radius);
    ctx.quadraticCurveTo(spacebarX, spacebarY, spacebarX + radius, spacebarY);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // Label for spacebar
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPACE', spacebarX + spacebarWidth / 2, spacebarY + spacebarHeight / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Toggle keyboard visibility
export function toggleVirtualKeyboard() {
    if (!virtualKeyboard) {
        virtualKeyboard = createVirtualKeyboard();
    }
    
    if (virtualKeyboard) {
        virtualKeyboard.visible = !virtualKeyboard.visible;
        
        // Position in front of camera when shown
        if (virtualKeyboard.visible && window.camera) {
            // Get camera position and direction
            const cameraPosition = new THREE.Vector3();
            window.camera.getWorldPosition(cameraPosition);
            
            const cameraDirection = new THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(window.camera.quaternion);
            
            // Position keyboard in front and below camera
            const keyboardPosition = cameraPosition.clone().add(cameraDirection.multiplyScalar(1));
            keyboardPosition.y -= 0.4; // Position below center
            
            virtualKeyboard.position.copy(keyboardPosition);
            
            // Orient keyboard to face camera
            virtualKeyboard.lookAt(cameraPosition);
        }
    }
    
    return virtualKeyboard?.visible || false;
} 