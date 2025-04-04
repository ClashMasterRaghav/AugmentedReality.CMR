// Control Panel component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen } from "./ar_screens.js";

// Create a control panel for AR interface
export function createControlPanel(position = new THREE.Vector3(0, 0, -1), size = { width: 0.8, height: 0.5 }) {
    console.log("Creating AR Control Panel");
    
    // Constants for panel measurements
    const panelWidth = size.width;
    const panelHeight = size.height;
    const cornerRadius = 0.025;
    const topDragWidth = panelWidth * 0.7; // Wide drag area for better touchscreen interaction
    
    // Create control panel container
    const controlPanel = new THREE.Group();
    controlPanel.position.copy(position);
    controlPanel.userData = {
        type: "controlPanel",
        isInteractive: true,
        isSelected: false,
        isDraggable: true
    };
    
    // Create the main panel with rounded corners
    const panelGeometry = createRoundedRectGeometry(panelWidth, panelHeight, cornerRadius);
    
    // Create panel material with gradient background
    const panelMaterial = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
    });
    
    // Generate the gradient texture
    const gradientTexture = createGradientTexture('#1a237e', '#7986cb');  // Deep blue to lighter blue
    panelMaterial.map = gradientTexture;
    
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panelMesh.renderOrder = 1000;
    controlPanel.add(panelMesh);
    
    // Create a drag handle at the top of the panel
    const dragHandleGeometry = new THREE.PlaneGeometry(topDragWidth, 0.05);
    const dragHandleMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    
    const dragHandle = new THREE.Mesh(dragHandleGeometry, dragHandleMaterial);
    dragHandle.position.set(0, panelHeight / 2 - 0.03, 0.001);
    dragHandle.userData = {
        type: "dragHandle",
        parentPanel: controlPanel
    };
    controlPanel.add(dragHandle);
    controlPanel.userData.dragHandle = dragHandle;
    
    // Add drag indicator dots
    addDragIndicator(controlPanel, panelHeight, dragHandle);
    
    // Invisible larger hit area for better touch interaction with the drag handle
    const fullPanelHitArea = new THREE.Mesh(
        new THREE.PlaneGeometry(panelWidth, panelHeight),
        new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.0
        })
    );
    
    fullPanelHitArea.position.set(0, 0, 0.002);
    fullPanelHitArea.userData = {
        type: "dragHitArea",
        parentPanel: controlPanel
    };
    controlPanel.add(fullPanelHitArea);
    
    // Add panel to scene
    scene.add(controlPanel);
    
    // Track panel for interaction
    window.arApp = window.arApp || {};
    window.arApp.controlPanel = controlPanel;
    
    console.log("Control Panel created");
    
    return controlPanel;
}

// Create a rounded rectangle geometry
function createRoundedRectGeometry(width, height, radius) {
    const shape = new THREE.Shape();
    
    // Start at top left corner
    shape.moveTo(-width / 2 + radius, height / 2);
    
    // Top edge
    shape.lineTo(width / 2 - radius, height / 2);
    
    // Top right corner
    shape.quadraticCurveTo(
        width / 2, height / 2,
        width / 2, height / 2 - radius
    );
    
    // Right edge
    shape.lineTo(width / 2, -height / 2 + radius);
    
    // Bottom right corner
    shape.quadraticCurveTo(
        width / 2, -height / 2,
        width / 2 - radius, -height / 2
    );
    
    // Bottom edge
    shape.lineTo(-width / 2 + radius, -height / 2);
    
    // Bottom left corner
    shape.quadraticCurveTo(
        -width / 2, -height / 2,
        -width / 2, -height / 2 + radius
    );
    
    // Left edge
    shape.lineTo(-width / 2, height / 2 - radius);
    
    // Top left corner
    shape.quadraticCurveTo(
        -width / 2, height / 2,
        -width / 2 + radius, height / 2
    );
    
    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
}

// Create a gradient texture
function createGradientTexture(colorTop, colorBottom) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBottom);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Add drag indicator dots to show the panel is draggable
function addDragIndicator(panel, panelHeight, dragHandle) {
    const dotSpacing = 0.02;
    const dotRadius = 0.003;
    const numDots = 3;
    
    for (let i = 0; i < numDots; i++) {
        const dotGeometry = new THREE.CircleGeometry(dotRadius, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        const xPos = (i - Math.floor(numDots / 2)) * dotSpacing;
        
        dot.position.set(xPos, panelHeight / 2 - 0.03, 0.002);
        panel.add(dot);
    }
}

// Create screen type selector buttons
export function createScreenTypeSelector(controlPanel, buttonSize = 0.1) {
    console.log("Creating screen type selector buttons");
    
    // Create button container
    const buttonContainer = new THREE.Group();
    
    // Position the container within the control panel
    const panelWidth = controlPanel.children[0].geometry.parameters.width || 0.8;
    const panelHeight = controlPanel.children[0].geometry.parameters.height || 0.5;
    
    buttonContainer.position.set(0, 0, 0.002);
    controlPanel.add(buttonContainer);
    
    // Increase button size for easier touch interaction
    const smallButtonSize = buttonSize * 2.0; // Significantly larger button size for better touch
    
    // Button configuration with direct paths to icons
    const iconPaths = [
        'examples/textures/ar_icons/youtube.png',            // YouTube
        'examples/textures/ar_icons/DuckDuckGo_logo.png',    // DuckDuckGo
        'examples/textures/ar_icons/maps.png',               // Maps
        'examples/textures/ar_icons/electron_app.png'        // Electron App
    ];
    
    // Button labels
    const buttonLabels = ['YouTube', 'Search', 'Maps', 'App'];
    
    // Create 4 buttons (2x2 grid)
    const spacing = smallButtonSize * 1.2;
    const positions = [
        new THREE.Vector2(-spacing / 2, spacing / 2),   // Top left
        new THREE.Vector2(spacing / 2, spacing / 2),    // Top right
        new THREE.Vector2(-spacing / 2, -spacing / 2),  // Bottom left
        new THREE.Vector2(spacing / 2, -spacing / 2)    // Bottom right
    ];
    
    // Create each button with icon
    for (let i = 0; i < 4; i++) {
        const button = createIconButton(
            smallButtonSize,
            iconPaths[i],
            buttonLabels[i],
            i
        );
        
        button.position.set(positions[i].x, positions[i].y, 0);
        buttonContainer.add(button);
    }
    
    return buttonContainer;
}

// Create a button with an icon and label
function createIconButton(size, iconPath, label, index) {
    // Create button container
    const button = new THREE.Group();
    button.userData = {
        type: 'button',
        buttonType: 'screenTypeSelector',
        index: index,
        isInteractive: true,
        isSelected: false,
        action: getButtonAction(index) // Add action property for easier identification
    };
    
    // Create button background (circle)
    const bgGeometry = new THREE.CircleGeometry(size / 2, 32);
    const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
    });
    
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.renderOrder = 1001;
    button.add(bgMesh);
    
    // Create invisible larger hitbox for better interaction
    const hitboxGeometry = new THREE.CircleGeometry(size / 1.5, 32); // 50% larger hitbox
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide
    });
    
    const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitboxMesh.renderOrder = 1000;
    // Copy userData from button to hitbox for interaction
    hitboxMesh.userData = {
        type: 'button',
        buttonType: 'screenTypeSelector',
        index: index,
        isInteractive: true,
        isSelected: false,
        action: getButtonAction(index)
    };
    button.add(hitboxMesh);
    
    // Create button icon using texture loader
    const texture = createButtonTexture(size, iconPath, index);
    
    // Create icon mesh
    const iconGeometry = new THREE.PlaneGeometry(size * 0.8, size * 0.8);
    const iconMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
    iconMesh.position.z = 0.001;
    iconMesh.renderOrder = 1002;
    button.add(iconMesh);
    
    // Add label below the button
    addButtonLabel(button, label, size);
    
    return button;
}

// Helper function to determine button action based on index
function getButtonAction(index) {
    switch(index) {
        case 0: return 'youtube';
        case 1: return 'duckduckgo';
        case 2: return 'maps';
        case 3: return 'electron';
        default: return 'unknown';
    }
}

// Create a texture for the button icon
function createButtonTexture(size, iconPath, index) {
    // Create a canvas for the icon
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a gradient background
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    // Customize gradient colors based on button type
    switch (index) {
        case 0: // YouTube
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, '#990000');
            break;
        case 1: // DuckDuckGo
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#eeeeee');
            break;
        case 2: // Maps
            gradient.addColorStop(0, '#4285F4');
            gradient.addColorStop(1, '#185ABC');
            break;
        case 3: // Electron
            gradient.addColorStop(0, '#2F3241');
            gradient.addColorStop(1, '#1A1B23');
            break;
        default:
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#dddddd');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load and draw the icon image
    const img = new Image();
    img.src = iconPath;
    
    // Handle both successful load and error
    img.onload = function() {
        // Draw the image centered
        ctx.drawImage(
            img,
            canvas.width / 2 - img.width / 2,
            canvas.height / 2 - img.height / 2,
            img.width,
            img.height
        );
        
        // Update the texture
        texture.needsUpdate = true;
    };
    
    img.onerror = function() {
        // If image fails to load, draw a text icon as fallback
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let iconText = '';
        switch (index) {
            case 0: iconText = 'YT'; break;
            case 1: iconText = 'S'; break;
            case 2: iconText = 'M'; break;
            case 3: iconText = 'A'; break;
            default: iconText = '?';
        }
        
        // Draw icon text
        ctx.fillText(iconText, canvas.width / 2, canvas.height / 2);
        
        // Update the texture
        texture.needsUpdate = true;
    };
    
    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Add a text label below the button
function addButtonLabel(button, labelText, buttonSize) {
    // Create a canvas for the label
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set text properties
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw the label text
    ctx.fillText(labelText, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create label mesh
    const labelGeometry = new THREE.PlaneGeometry(buttonSize * 1.2, buttonSize * 0.4);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.set(0, -buttonSize * 0.7, 0.001);
    labelMesh.renderOrder = 1002;
    
    button.add(labelMesh);
} 