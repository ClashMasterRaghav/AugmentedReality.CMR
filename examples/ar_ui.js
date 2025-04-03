// UI elements and controls for AR experience
import * as THREE from 'three';
import { scene, camera, renderer, controller } from './ar_core.js';
import { createNewBrowserScreen, screens, selectScreen } from './ar_screens.js';

// Global UI elements
export let controlPanel = null;
export let virtualKeyboard = null;

// UI interaction states
export let isMoveModeActive = false;
export let isRotateModeActive = false;
export let isResizeModeActive = false;

// Export notification functions explicitly at the top level
export function createNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // Create DOM notification
    createDOMNotification(message, type);
    
    // Create 3D notification if renderer is available
    if (renderer && camera) {
        create3DNotification(message, type);
    }
}

// Alias for backward compatibility
export const showNotification = createNotification;

// Initialize UI elements
export function initUI() {
    // Don't create control panel here, setupControlPanel will handle it
    createVirtualKeyboard();
}

// Create a notification in the DOM
function createDOMNotification(message, type = 'info') {
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
        case 'warning':
            notification.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
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

// Create a 3D notification in space
function create3DNotification(message, type = 'info') {
    if (!camera) return;
    
    // Create canvas for the notification
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Set background color based on type
    let bgColor;
    switch(type) {
        case 'error':
            bgColor = 'rgba(255, 0, 0, 0.7)';
            break;
        case 'success':
            bgColor = 'rgba(0, 255, 0, 0.7)';
            break;
        case 'warning':
            bgColor = 'rgba(255, 165, 0, 0.7)';
            break;
        default:
            bgColor = 'rgba(0, 0, 0, 0.7)';
    }
    
    // Draw rounded rectangle background (compatible with all browsers)
    context.fillStyle = bgColor;
    // Use path drawing instead of roundRect for better compatibility
    context.beginPath();
    context.moveTo(20, 0);
    context.lineTo(canvas.width - 20, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, 20);
    context.lineTo(canvas.width, canvas.height - 20);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - 20, canvas.height);
    context.lineTo(20, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - 20);
    context.lineTo(0, 20);
    context.quadraticCurveTo(0, 0, 20, 0);
    context.closePath();
    context.fill();
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create notification panel
    const geometry = new THREE.PlaneGeometry(0.5, 0.125);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const notificationMesh = new THREE.Mesh(geometry, material);
    
    // Position notification in front of camera
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const position = new THREE.Vector3();
    position.copy(camera.position).add(direction.multiplyScalar(1));
    position.y += 0.2; // Position above eye level
    
    notificationMesh.position.copy(position);
    notificationMesh.quaternion.copy(camera.quaternion);
    
    // Add to scene
    scene.add(notificationMesh);
    
    // Remove after timeout
    setTimeout(() => {
        scene.remove(notificationMesh);
        material.dispose();
        geometry.dispose();
        texture.dispose();
    }, 3000);
}

// Create a control panel
export function createControlPanel() {
    // If a control panel already exists, don't create another one
    if (controlPanel && scene.children.includes(controlPanel)) {
        console.log("Control panel already exists - not creating a new one");
        return controlPanel;
    }
    
    console.log("Creating control panel");
    controlPanel = new THREE.Group();
    controlPanel.name = "controlPanel";
    // Add a userData type to help identify control panels for cleanup
    controlPanel.userData = {
        type: 'controlPanel',
        isDragging: false,
        manuallyPositioned: false
    };
    
    // Create panel body
    const panelWidth = 0.5;
    const panelHeight = 0.3;
    const panelDepth = 0.01;
    
    // Create a rounded rectangle texture for the panel
    const panelTexture = createRoundedRectTexture(
        512, 512, 
        30, // Corner radius 
        'rgba(10, 20, 40, 0.6)', // Main panel color - transparent dark blue
        'rgba(30, 80, 140, 0.7)', // Gradient color - lighter blue
        2, // Border size
        'rgba(70, 140, 230, 0.8)' // Border color - highlight blue
    );
    
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false  // This helps with transparency rendering
    });
    
    // Create a subtle background glow effect
    const glowSize = 30; // Size of the glow effect
    const glowTexture = createGlowTexture(
        512 + glowSize*2, 
        512 + glowSize*2, 
        'rgba(40, 120, 200, 0.15)' // Light blue glow
    );
    
    const glowMaterial = new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
    });
    
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    
    // Add slight larger glow behind panel
    const glowGeometry = new THREE.PlaneGeometry(panelWidth * 1.15, panelHeight * 1.15);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.005; // Position slightly behind the panel
    
    controlPanel.add(glowMesh);
    controlPanel.add(panelMesh);
    
    // Add buttons to control panel
    const buttonSize = panelHeight / 6;
    const smallButtonSize = buttonSize * 1.3; // Make buttons slightly larger for better touch targets
    const spacing = smallButtonSize * 2.1; // Increased spacing for better separation
    
    // Add the buttons for YouTube, Search, Maps, and App at the bottom of the panel
    const buttonY = -panelHeight/2 + smallButtonSize * 1.2; // Position near bottom, with margin
    const buttonStartX = -spacing * 1.5; // Start position for the first button
    
    // Create and add YouTube button
    const youtubeIcon = loadTexture('examples/textures/ar_icons/youtube.png');
    createUIButton(
        controlPanel,
        'YouTube',
        buttonStartX, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'youtube' },
        youtubeIcon
    );
    
    // Create and add Search button
    const searchIcon = loadTexture('examples/textures/ar_icons/DuckDuckGo_logo.png');
    createUIButton(
        controlPanel,
        'Search',
        buttonStartX + spacing, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'duckduckgo' },
        searchIcon
    );
    
    // Create and add Maps button
    const mapsIcon = loadTexture('examples/textures/ar_icons/satellite-earth.png');
    createUIButton(
        controlPanel,
        'Maps',
        buttonStartX + spacing * 2, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'googlemapssatellite' },
        mapsIcon
    );
    
    // Create and add App button
    const appIcon = loadTexture('examples/textures/ar_icons/app-window.png');
    createUIButton(
        controlPanel,
        'App',
        buttonStartX + spacing * 3, 
        buttonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'selectScreenType', screenType: 'electronapp' },
        appIcon
    );
    
    // Add the Add and Delete buttons at the top of the panel
    const topButtonY = panelHeight/2 - smallButtonSize * 1.2; // Position near top, with margin
    
    // Create and add Add button
    const addIcon = loadTexture('examples/textures/ar_icons/plus.png');
    createUIButton(
        controlPanel,
        'Add',
        buttonStartX + spacing * 0.5, 
        topButtonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'addScreen' },
        addIcon
    );
    
    // Create and add Delete button
    const deleteIcon = loadTexture('examples/textures/ar_icons/trash.png');
    createUIButton(
        controlPanel,
        'Delete',
        buttonStartX + spacing * 2.5, 
        topButtonY,
        smallButtonSize,
        'handleButtonAction',
        { action: 'deleteScreen' },
        deleteIcon
    );
    
    // Add control panel to scene and return it
    scene.add(controlPanel);
    return controlPanel;
}

// Create modern, clean button icons
function createButtonIcon(buttonIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Higher resolution for better quality
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Load and use actual PNG icons instead of drawing them
    const iconLoader = new THREE.TextureLoader();
    let iconPath = '';
    
    // Determine which icon to load
    switch(buttonIndex) {
        case 0: // New Screen button
            iconPath = 'examples/textures/ar_icons/add.png';
            break;
        case 1: // Delete button
            iconPath = 'examples/textures/ar_icons/delete.png';
            break;
        case 2: // YouTube icon
            iconPath = 'examples/textures/ar_icons/youtube.png';
            break;
        case 3: // DuckDuckGo icon
            iconPath = 'examples/textures/ar_icons/DuckDuckGo_logo.png';
            break;
        case 4: // Google Maps icon
            iconPath = 'examples/textures/ar_icons/maps.png';
            break;
        case 5: // Electron icon
            iconPath = 'examples/textures/ar_icons/electron_app.png';
            break;
        default:
            // If no matching icon, create a placeholder
            ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(128, 128, 90, 0, Math.PI * 2);
        ctx.fill();
        
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
    }
    
    // Return the loaded texture directly
    return iconLoader.load(iconPath);
}

// Create a screen type selector with buttons for different content types
function createScreenTypeSelector(parent, offsetX = 0, offsetY = -0.05, buttonSize = 0.04) {
    // Create a panel for content type selection
    const selectorGroup = new THREE.Group();
    
    // Create a background panel for the selector
    const panelWidth = 0.40; // Increase width to ensure all buttons fit
    const panelHeight = 0.15; // Taller panel for larger buttons
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    
    // Create a texture for the selector panel
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 512;
    panelCanvas.height = 256; // Taller canvas
    const panelCtx = panelCanvas.getContext('2d');
    
    // Draw panel background with glass morphism style
    const cornerRadius = 40;
    panelCtx.beginPath();
    panelCtx.moveTo(cornerRadius, 0);
    panelCtx.lineTo(panelCanvas.width - cornerRadius, 0);
    panelCtx.quadraticCurveTo(panelCanvas.width, 0, panelCanvas.width, cornerRadius);
    panelCtx.lineTo(panelCanvas.width, panelCanvas.height - cornerRadius);
    panelCtx.quadraticCurveTo(panelCanvas.width, panelCanvas.height, panelCanvas.width - cornerRadius, panelCanvas.height);
    panelCtx.lineTo(cornerRadius, panelCanvas.height);
    panelCtx.quadraticCurveTo(0, panelCanvas.height, 0, panelCanvas.height - cornerRadius);
    panelCtx.lineTo(0, cornerRadius);
    panelCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
    panelCtx.closePath();
    
    // Matching gradient to control panel but slightly more transparent
    const gradient = panelCtx.createLinearGradient(0, 0, 0, panelCanvas.height);
    gradient.addColorStop(0, 'rgba(70, 75, 102, 0.80)'); // Slightly lighter than control panel
    gradient.addColorStop(1, 'rgba(40, 45, 70, 0.80)'); // Slightly lighter than control panel
    panelCtx.fillStyle = gradient;
    panelCtx.fill();
    
    // Add glass effect highlight
    panelCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    panelCtx.beginPath();
    panelCtx.moveTo(cornerRadius, 0);
    panelCtx.lineTo(panelCanvas.width - cornerRadius, 0);
    panelCtx.quadraticCurveTo(panelCanvas.width, 0, panelCanvas.width, cornerRadius);
    panelCtx.lineTo(panelCanvas.width, panelCanvas.height/3);
    panelCtx.lineTo(0, panelCanvas.height/3);
    panelCtx.lineTo(0, cornerRadius);
    panelCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
    panelCtx.closePath();
    panelCtx.fill();
    
    // Add title with modern font
    panelCtx.fillStyle = '#ffffff';
    panelCtx.font = '600 18px Inter, SF Pro Display, Arial';
    panelCtx.textAlign = 'center';
    panelCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    panelCtx.shadowBlur = 2;
    panelCtx.shadowOffsetX = 1;
    panelCtx.shadowOffsetY = 1;
    panelCtx.fillText('SCREEN TYPES', panelCanvas.width/2, 28);
    panelCtx.shadowBlur = 0;
    
    // Add subtle divider line
    panelCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    panelCtx.lineWidth = 1;
    panelCtx.beginPath();
    panelCtx.moveTo(panelCanvas.width/2 - 100, 38);
    panelCtx.lineTo(panelCanvas.width/2 + 100, 38);
    panelCtx.stroke();
    
    // Add subtle border with gradient to match control panel
    const borderGradient = panelCtx.createLinearGradient(0, 0, panelCanvas.width, panelCanvas.height);
    borderGradient.addColorStop(0, 'rgba(180, 190, 255, 0.7)'); // Light purple-blue
    borderGradient.addColorStop(0.5, 'rgba(120, 140, 220, 0.5)'); // Medium purple-blue
    borderGradient.addColorStop(1, 'rgba(90, 100, 180, 0.7)'); // Darker purple-blue
    panelCtx.strokeStyle = borderGradient;
    panelCtx.lineWidth = 2;
    panelCtx.stroke();
    
    // Create texture for panel
    const panelTexture = new THREE.CanvasTexture(panelCanvas);
    panelTexture.needsUpdate = true;
    
    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panelMesh.renderOrder = 1004;
    selectorGroup.add(panelMesh);
    
    // Add a solid background blocking plane behind the panel to fix interaction issues
    const blockingGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const blockingMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: false,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const blockingMesh = new THREE.Mesh(blockingGeometry, blockingMaterial);
    blockingMesh.position.z = -0.003;
    blockingMesh.renderOrder = 1002; // Below panel but above glow
    blockingMesh.visible = false; // Invisible but still blocks raycasts
    selectorGroup.add(blockingMesh);
    
    // Add subtle glow behind the panel
    const glowGeometry = new THREE.PlaneGeometry(panelWidth + 0.01, panelHeight + 0.01);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x6495ED, // Cornflower blue glow (matching control panel)
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.002;
    glowMesh.renderOrder = 1003;
    selectorGroup.add(glowMesh);
    
    // Create type selection buttons (4 buttons in a row)
    const buttonTypes = ['youtube', 'duckduckgo', 'maps', 'electron'];
    const buttonIcons = [2, 3, 4, 5]; // indices for the createButtonIcon function
    const buttonColors = [0xE62117, 0xDE5833, 0x4285F4, 0x47848F]; // colors matching each service
    
    // BIGGER button size for better touch targets
    const smallButtonSize = buttonSize * 2.0; // Increased from 1.3 to 2.0 for larger icons
    const spacing = smallButtonSize * 1.5; // Adjust spacing to fit all buttons
    const startX = -spacing * 1.5; // Starting position for first button
    const buttonY = 0; // Center buttons vertically
    
    buttonTypes.forEach((type, index) => {
        // Load icon directly instead of creating button canvas
        const iconTexture = createButtonIcon(buttonIcons[index]);
        
        // Create icon as a plane geometry - no circle background
        const iconGeometry = new THREE.PlaneGeometry(smallButtonSize, smallButtonSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const button = new THREE.Mesh(iconGeometry, iconMaterial);
        // Position with adjusted Y coordinate
        button.position.set(startX + spacing * index, buttonY, 0.004); // In front of blocking plane
        button.renderOrder = 1005;
        button.userData = {
            type: 'button',
            action: 'selectScreenType',
            screenType: buttonTypes[index],
            hoverColor: new THREE.Color(buttonColors[index]).lerp(new THREE.Color(0xFFFFFF), 0.3), // Lighter version for hover
            activeColor: buttonColors[index],
            inactiveColor: buttonColors[index],
            originalColor: buttonColors[index],
            isToggle: false,
            isActive: true
        };
        
        // Add label below each button
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 48;
        const labelCtx = labelCanvas.getContext('2d');
        
        // Clear canvas and add text with shadow
        labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        
        labelCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        labelCtx.shadowBlur = 4;
        labelCtx.shadowOffsetX = 1;
        labelCtx.shadowOffsetY = 1;
        
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = 'bold 16px Inter, SF Pro Display, Arial';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        
        // Choose appropriate text for each button
        let labelText;
        switch(index) {
            case 0: labelText = 'YouTube'; break;
            case 1: labelText = 'Search'; break;
            case 2: labelText = 'Maps'; break;
            case 3: labelText = 'App'; break;
        }
        
        labelCtx.fillText(labelText, labelCanvas.width / 2, labelCanvas.height / 2);
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(smallButtonSize * 1.2, smallButtonSize * 0.4);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.set(0, -smallButtonSize * 0.7, 0.002);
        labelMesh.renderOrder = 1006;
        button.add(labelMesh);
        
        selectorGroup.add(button);
    });
    
    // Position the selector panel relative to the parent
    selectorGroup.position.set(offsetX, offsetY - 0.08, 0.01); // Reduce gap between panels
    parent.add(selectorGroup);
    
    return selectorGroup;
}

// Create a virtual keyboard
export function createVirtualKeyboard() {
    virtualKeyboard = new THREE.Group();
    
    // Keyboard background
    const keyboardGeometry = new THREE.PlaneGeometry(0.8, 0.3);
    const keyboardMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const keyboardMesh = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    virtualKeyboard.add(keyboardMesh);
    
    // Add glow border
    const borderGeometry = new THREE.PlaneGeometry(0.82, 0.32);
    const borderMaterial = new THREE.MeshBasicMaterial({
        color: 0x4FC3F7,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    borderMesh.position.z = -0.001;
    virtualKeyboard.add(borderMesh);
    
    // Create keys
    const keyRows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '.'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '?', '!']
    ];
    
    const keySize = 0.07;
    const keyMargin = 0.005;
    const rowOffsetY = 0.12;
    
    keyRows.forEach((row, rowIndex) => {
        const offsetY = rowOffsetY - (rowIndex * (keySize + keyMargin));
        
        row.forEach((key, keyIndex) => {
            // Calculate key position
            const offsetX = -0.36 + (keyIndex * (keySize + keyMargin));
            
            // Create key background
            const keyGeometry = new THREE.PlaneGeometry(keySize, keySize);
            const keyMaterial = new THREE.MeshBasicMaterial({
                color: 0x555555,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
            keyMesh.position.set(offsetX, offsetY, 0.001);
            keyMesh.userData = {
                type: 'key',
                value: key
            };
            virtualKeyboard.add(keyMesh);
            
            // Create key label
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 64;
            labelCanvas.height = 64;
            const labelCtx = labelCanvas.getContext('2d');
            labelCtx.fillStyle = '#ffffff';
            labelCtx.font = 'bold 48px Arial';
            labelCtx.textAlign = 'center';
            labelCtx.textBaseline = 'middle';
            labelCtx.fillText(key, 32, 32);
            
            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelGeometry = new THREE.PlaneGeometry(keySize * 0.8, keySize * 0.8);
            const labelMaterial = new THREE.MeshBasicMaterial({
                map: labelTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
            labelMesh.position.z = 0.001;
            keyMesh.add(labelMesh);
        });
    });
    
    // Add special keys
    const specialKeys = [
        { label: '⌫', value: 'Backspace', width: 0.15, x: 0.3, y: -0.12 },
        { label: '↵', value: 'Enter', width: 0.15, x: 0.3, y: 0 },
        { label: '␣', value: 'Space', width: 0.4, x: 0, y: -0.24 }
    ];
    
    specialKeys.forEach(specialKey => {
        const keyGeometry = new THREE.PlaneGeometry(specialKey.width, keySize);
        const keyMaterial = new THREE.MeshBasicMaterial({
            color: 0x2196F3,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
        keyMesh.position.set(specialKey.x, specialKey.y, 0.001);
        keyMesh.userData = {
            type: 'key',
            value: specialKey.value
        };
        virtualKeyboard.add(keyMesh);
        
        // Create key label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 64;
        labelCanvas.height = 64;
        const labelCtx = labelCanvas.getContext('2d');
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = 'bold 48px Arial';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        labelCtx.fillText(specialKey.label, 32, 32);
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(specialKey.width * 0.8, keySize * 0.8);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.z = 0.001;
        keyMesh.add(labelMesh);
    });
    
    // Hide keyboard initially
    virtualKeyboard.visible = false;
    scene.add(virtualKeyboard);
}

// Toggle mode buttons (move, rotate, resize)
export function toggleModeButton(mode) {
    if (!controlPanel) return;
    
    const buttons = controlPanel.children.filter(child => 
        child.userData && child.userData.type === 'button');
    
    let buttonIndex;
    switch(mode) {
        case 'move':
            buttonIndex = 1;
            isMoveModeActive = !isMoveModeActive;
            isRotateModeActive = false;
            isResizeModeActive = false;
            break;
        case 'rotate':
            buttonIndex = 2;
            isRotateModeActive = !isRotateModeActive;
            isMoveModeActive = false;
            isResizeModeActive = false;
            break;
        case 'resize':
            buttonIndex = 3;
            isResizeModeActive = !isResizeModeActive;
            isMoveModeActive = false;
            isRotateModeActive = false;
            break;
    }
    
    if (buttonIndex !== undefined && buttons[buttonIndex]) {
        const button = buttons[buttonIndex];
        const isActive = mode === 'move' ? isMoveModeActive : 
                       mode === 'rotate' ? isRotateModeActive : 
                       isResizeModeActive;
        
        // Update button color based on active state
        button.material.color.set(isActive ? 0x44cc88 : 0x777777);
        button.userData.originalColor = isActive ? 0x44cc88 : 0x777777;
        
        // Update other buttons to inactive
        buttons.forEach((otherButton, idx) => {
            if (idx !== buttonIndex && idx !== 0) { // Skip the New Screen button
                otherButton.material.color.set(0x777777);
                otherButton.userData.originalColor = 0x777777;
            }
        });
    }
}

// Update UI elements
export function updateUI() {
    // Update control panel position
    if (controlPanel && controlPanel.userData.update) {
        controlPanel.userData.update();
    }
    
    // Update button hover effects
    if (controlPanel && controlPanel.children) {
        const buttons = controlPanel.children.filter(child => 
            child.userData && child.userData.type === 'button');
            
        buttons.forEach(button => {
            // Reset color if not being interacted with
            if (!button.userData.isHovered && !button.userData.isPressed) {
                button.material.color.set(button.userData.originalColor);
            }
        });
    }
}

// Set button hover state
export function setButtonHover(button, isHovered) {
    if (!button || !button.userData) return;
    
    button.userData.isHovered = isHovered;
    
    if (isHovered) {
        button.material.color.set(button.userData.hoverColor);
    } else if (!button.userData.isPressed) {
        button.material.color.set(button.userData.originalColor);
    }
}

// Set button pressed state
export function setButtonPressed(button, isPressed) {
    if (!button || !button.userData) return;
    
    button.userData.isPressed = isPressed;
    
    if (isPressed) {
        // Visual feedback - darken the button
        const color = new THREE.Color(button.userData.originalColor);
        color.multiplyScalar(0.7);
        button.material.color.copy(color);
    } else if (button.userData.isHovered) {
        button.material.color.set(button.userData.hoverColor);
    } else {
        button.material.color.set(button.userData.originalColor);
    }
}

// Position control panel in front of user
export function setupControlPanel() {
    // First, check if there's already a control panel in the scene
    // If we have a reference but it's not actually in the scene, clear it
    if (controlPanel && !scene.children.includes(controlPanel)) {
        console.log("Control panel reference exists but not in scene - recreating");
        controlPanel = null;
    }
    
    // Remove ALL existing control panels from the scene to prevent duplicates
    const existingPanels = scene.children.filter(obj => 
        obj.userData && obj.userData.type === 'controlPanel');
    
    if (existingPanels.length > 0) {
        console.log(`Found ${existingPanels.length} control panel(s), removing all and creating a fresh one`);
        // Remove all existing panels
        existingPanels.forEach(panel => {
            scene.remove(panel);
        });
        // Clear our reference since we're creating a fresh one
        controlPanel = null;
    }
    
    // Create a new control panel
    console.log("Creating new control panel");
    createControlPanel();
    
    // Position the control panel appropriately
    if (controlPanel) {
    // Position in front and below the user
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    const targetPosition = new THREE.Vector3();
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Ensure the direction is always away from the camera
        const distance = -0.6; // Negative distance to move away from camera
        targetPosition.copy(camera.position).add(cameraForward.multiplyScalar(distance));
        
        // Always keep panel below the user's view
        targetPosition.y = camera.position.y - 0.4;
        
        // Set position directly - no lerping needed for initial positioning
        controlPanel.position.copy(targetPosition);
        
        // Update panel rotation to face user
        controlPanel.lookAt(camera.position);
    
    // Keep panel facing the user but upright
    const euler = new THREE.Euler().setFromQuaternion(controlPanel.quaternion);
    euler.x = 0; // Keep panel upright (no tilt)
    euler.z = 0; // No roll
    controlPanel.quaternion.setFromEuler(euler);
    }
}

// Add gentle floating animation to the control panel to make it look more interactive
export function floatAnimation() {
    if (!controlPanel) return;
    
    const time = Date.now(); // Get current time in milliseconds
    
    // SIGNIFICANTLY REDUCE the amplitude - make it barely noticeable
    const amplitude = 0.00003; // Reduced from 0.0003 to 0.00003 (10x less)
    
    // Very slight floating motion effect
    controlPanel.position.y += Math.sin(time * 0.001) * amplitude;
    
    // Update glow effect to match the reduced floating
    const glowMesh = controlPanel.children.find(child => 
        child.material && child.material.blending === THREE.AdditiveBlending);
    
    if (glowMesh) {
        // Use a much more subtle glow
        glowMesh.material.opacity = 0.03 + Math.sin(time * 0.0005) * 0.01;
    }
}