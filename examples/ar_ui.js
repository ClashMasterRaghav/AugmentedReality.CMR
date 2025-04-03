// UI elements and controls for AR experience
import * as THREE from 'three';
import { scene, camera, renderer, controller } from './ar_core.js';
import { createNewBrowserScreen, screens, selectScreen } from './ar_screens.js';
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from './ar_default_screen.js';

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
    createControlPanel();
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

// Create a minimalist control panel with modern design
export function createControlPanel() {
    // Create panel group
    controlPanel = new THREE.Group();
    
    // Control panel dimensions - smaller than normal screens
    const panelWidth = 0.4;
    const panelHeight = 0.2;
    const position = new THREE.Vector3(0, 0, 0);
    
    // Use the enhancedCreateScreen function from default screen
    const screenTitle = "Control Panel";
    
    // Create a canvas texture for the control panel background
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 256;
    const bgCtx = bgCanvas.getContext('2d');
    
    // Create gradient background
    const gradient = bgCtx.createLinearGradient(0, 0, 0, bgCanvas.height);
    gradient.addColorStop(0, '#1a1a2e'); // Dark blue at top
    gradient.addColorStop(1, '#16213e'); // Darker blue at bottom
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    // Add subtle pattern
    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * bgCanvas.width;
        const y = Math.random() * bgCanvas.height;
        const size = Math.random() * 3 + 1;
        bgCtx.beginPath();
        bgCtx.arc(x, y, size, 0, Math.PI * 2);
        bgCtx.fill();
    }
    
    // Create glass effect
    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    bgCtx.beginPath();
    if (bgCtx.roundRect) {
        bgCtx.roundRect(20, 20, bgCanvas.width - 40, bgCanvas.height - 40, 20);
    } else {
        // Fallback for browsers without roundRect
        roundRect(bgCtx, 20, 20, bgCanvas.width - 40, bgCanvas.height - 40, 20);
    }
    bgCtx.fill();
    
    // Add subtle border
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    bgCtx.lineWidth = 2;
    bgCtx.beginPath();
    if (bgCtx.roundRect) {
        bgCtx.roundRect(20, 20, bgCanvas.width - 40, bgCanvas.height - 40, 20);
    } else {
        // Fallback for browsers without roundRect
        roundRect(bgCtx, 20, 20, bgCanvas.width - 40, bgCanvas.height - 40, 20);
    }
    bgCtx.stroke();
    
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    
    // Use the enhanced screen creation function
    const panel = enhancedCreateScreen(
        position,
        { x: panelWidth, y: panelHeight },
        screenTitle,
        bgTexture
    );
    
    // Add custom userData
    panel.userData = { 
        type: "controlPanel",
        isControlPanel: true,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1)
    };
    
    // Add drop shadow for depth
    addDropShadow(panel, panelWidth, panelHeight);
    
    // Add to control panel group
    controlPanel.add(panel);
    
    // Define button layout
    const buttonSize = 0.05;
    const buttonSpacing = 0.08;
    
    // Create icons
    const icons = [
        { action: 'newScreen', position: new THREE.Vector2(-buttonSpacing, 0), iconSrc: 'examples/textures/ar_icons/add.png' },
        { action: 'deleteScreen', position: new THREE.Vector2(0, 0), iconSrc: 'examples/textures/ar_icons/delete.png' },
        { action: 'moveMode', position: new THREE.Vector2(buttonSpacing, 0), iconSrc: 'examples/textures/ar_icons/move.png' }
    ];
    
    // Add buttons to the panel
    icons.forEach(icon => {
        const buttonGeometry = new THREE.CircleGeometry(buttonSize / 2, 32);
        
        // Create button background with gradient
        const buttonCanvas = document.createElement('canvas');
        buttonCanvas.width = 128;
        buttonCanvas.height = 128;
        const buttonCtx = buttonCanvas.getContext('2d');
        
        // Fill with gradient
        const buttonGradient = buttonCtx.createRadialGradient(64, 64, 20, 64, 64, 64);
        buttonGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        buttonGradient.addColorStop(1, 'rgba(200, 200, 255, 0.8)');
        buttonCtx.fillStyle = buttonGradient;
        buttonCtx.beginPath();
        buttonCtx.arc(64, 64, 64, 0, Math.PI * 2);
        buttonCtx.fill();
        
        // Add subtle border
        buttonCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        buttonCtx.lineWidth = 2;
        buttonCtx.beginPath();
        buttonCtx.arc(64, 64, 62, 0, Math.PI * 2);
        buttonCtx.stroke();
        
        const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            map: buttonTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.position.set(icon.position.x, -0.04, 0.005);
        button.renderOrder = 1050;
        
        // Add icon to button
        const iconTexture = createButtonIconWithImg(icon.action, icon.iconSrc);
        
        // Create icon mesh
        const iconGeometry = new THREE.CircleGeometry(buttonSize / 2 * 0.7, 32);
        const iconMaterial = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.001;
        iconMesh.renderOrder = 1051;
        
        // Set up button information
        button.userData = {
            type: 'button',
            action: icon.action,
            originalColor: new THREE.Color(1, 1, 1),
            hoverColor: new THREE.Color(0.9, 0.9, 1),
            activeColor: new THREE.Color(0.4, 0.8, 1),
            inactiveColor: new THREE.Color(1, 1, 1),
            isActive: false
        };
        
        // Add icon to button
        button.add(iconMesh);
        
        // Add button to panel
        panel.add(button);
    });
    
    // Run entrance animation
    animateScreenEntrance(panel);
    
    // Add control panel to scene
    scene.add(controlPanel);
    
    console.log("Control panel created and added to scene");
    
    return controlPanel;
}

// Helper function for rounded rectangle
function roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

// Create button icons with image loading and fallback
function createButtonIconWithImg(type, iconPath) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Immediately create a fallback icon since some images might be missing
    createFallbackButtonIcon(type, ctx);
    
    // Create a new image
    const img = new Image();
    
    // Load the image
    img.src = iconPath;
    
    // Handle image load
    img.onload = function() {
        // Clear the fallback icon
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image centered on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        console.log("Successfully loaded icon for:", type);
        
        if (iconMaterial) {
            iconMaterial.map.needsUpdate = true;
        }
    };
    
    // Handle image load error with fallback - already drawn, just log the error
    img.onerror = function() {
        console.error(`Failed to load icon: ${iconPath}, using fallback for type: ${type}`);
    };
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create fallback button icons
function createFallbackButtonIcon(type, ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, 128, 128);
    
    switch(type) {
        case 'newScreen':
            // Plus icon
            ctx.fillStyle = '#4ecca3';
            ctx.beginPath();
            ctx.rect(32, 56, 64, 16);
            ctx.rect(56, 32, 16, 64);
            ctx.fill();
            break;
            
        case 'deleteScreen':
            // Trash/delete icon
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            // Trash lid
            ctx.rect(32, 34, 64, 8);
            ctx.rect(48, 26, 32, 8);
            // Trash can
            ctx.rect(40, 42, 48, 60);
            // Lines in trash can
            ctx.fillRect(52, 50, 4, 44);
            ctx.fillRect(72, 50, 4, 44);
            ctx.fill();
            break;
            
        case 'moveMode':
            // Move arrows icon
            ctx.fillStyle = '#3d84a8';
            // Draw up arrow
            ctx.beginPath();
            ctx.moveTo(64, 16);
            ctx.lineTo(44, 36);
            ctx.lineTo(84, 36);
            ctx.closePath();
            ctx.fill();
            
            // Draw right arrow
            ctx.beginPath();
            ctx.moveTo(112, 64);
            ctx.lineTo(92, 44);
            ctx.lineTo(92, 84);
            ctx.closePath();
            ctx.fill();
            
            // Draw down arrow
            ctx.beginPath();
            ctx.moveTo(64, 112);
            ctx.lineTo(44, 92);
            ctx.lineTo(84, 92);
            ctx.closePath();
            ctx.fill();
            
            // Draw left arrow
            ctx.beginPath();
            ctx.moveTo(16, 64);
            ctx.lineTo(36, 44);
            ctx.lineTo(36, 84);
            ctx.closePath();
            ctx.fill();
            break;
            
        default:
            // Generic icon
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(type.charAt(0).toUpperCase() + type.slice(1), 64, 64);
            break;
    }
}

// Create a screen type selector with buttons for different content types
function createScreenTypeSelector(parent, offsetX = 0, offsetY = -0.05, buttonSize = 0.04) {
    // Create a panel for content type selection
    const selectorGroup = new THREE.Group();
    
    // Create a background panel for the selector
    const panelWidth = 0.26;
    const panelHeight = 0.12; // Taller panel for larger buttons
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
    const smallButtonSize = buttonSize * 1.1; // Increase from 1.0 to 1.1 (larger)
    const spacing = smallButtonSize * 2.2; // Space between buttons
    const startX = -spacing * 1.5; // Starting position for first button
    const buttonY = -0.01; // Move buttons down slightly within the panel
    
    buttonTypes.forEach((type, index) => {
        // Create button canvas for gradient effect
        const buttonCanvas = document.createElement('canvas');
        buttonCanvas.width = 128;
        buttonCanvas.height = 128;
        const buttonCtx = buttonCanvas.getContext('2d');
        
        // Create gradient fill
        const buttonGradient = buttonCtx.createRadialGradient(64, 64, 20, 64, 50, 64);
        const baseColor = new THREE.Color(buttonColors[index]);
        const r = Math.floor(baseColor.r * 255);
        const g = Math.floor(baseColor.g * 255);
        const b = Math.floor(baseColor.b * 255);
        
        buttonGradient.addColorStop(0, `rgb(${r + 40}, ${g + 40}, ${b + 40})`); // Lighter center
        buttonGradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`); // Original color at edges
        
        buttonCtx.fillStyle = buttonGradient;
        buttonCtx.beginPath();
        buttonCtx.arc(64, 64, 64, 0, Math.PI * 2);
        buttonCtx.fill();
        
        // Add subtle inner shadow
        buttonCtx.shadowBlur = 10;
        buttonCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        buttonCtx.shadowOffsetX = 2;
        buttonCtx.shadowOffsetY = 2;
        buttonCtx.beginPath();
        buttonCtx.arc(64, 64, 62, 0, Math.PI * 2);
        buttonCtx.stroke();
        buttonCtx.shadowBlur = 0;
        
        const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
        
        // Create button with texture
        const buttonGeometry = new THREE.CircleGeometry(smallButtonSize / 2, 32);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            map: buttonTexture,
            transparent: false,
            side: THREE.DoubleSide
        });
        
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        // Position with adjusted Y coordinate
        button.position.set(startX + spacing * index, buttonY, 0.003);
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
        
        // Add button shadow for depth
        const shadowGeometry = new THREE.CircleGeometry(smallButtonSize / 2 * 1.05, 32);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowMesh.position.z = -0.001;
        shadowMesh.renderOrder = 1004;
        button.add(shadowMesh);
        
        // Add icon to button - LARGER
        const iconSize = smallButtonSize * 0.8; // Keep at 0.8
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, // Default white color until texture loads
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
        iconMesh.position.z = 0.004;
        iconMesh.renderOrder = 1006;
        button.add(iconMesh);
        
        // Direct loading of icons using image files rather than indices
        const iconPaths = {
            0: 'examples/textures/ar_icons/youtube.png',
            1: 'examples/textures/ar_icons/DuckDuckGo_logo.png',
            2: 'examples/textures/ar_icons/maps.png',
            3: 'examples/textures/ar_icons/electron_app.png'
        };
        
        // Load the icon texture directly using the file path
        const img = new Image();
        img.onload = function() {
            // Create a canvas to draw the icon
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Draw image centered on canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Apply to icon material
            iconMaterial.map = texture;
            iconMaterial.needsUpdate = true;
        };
        
        img.onerror = function() {
            console.error("Error loading icon image for button: " + index);
            // Fallback to text icon
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.font = '80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(buttonTypes[index].substring(0, 1).toUpperCase(), 128, 128);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            iconMaterial.map = texture;
            iconMaterial.needsUpdate = true;
        };
        
        // Set image source to the appropriate path for this button
        img.src = iconPaths[index];
        
        // Add label for each button with text shadow for better readability
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 48; // Taller for better quality
        const labelCtx = labelCanvas.getContext('2d');
        
        // Clear canvas and add text with shadow
        labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        
        labelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        labelCtx.shadowBlur = 3;
        labelCtx.shadowOffsetX = 1;
        labelCtx.shadowOffsetY = 1;
        
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = '600 14px Inter, SF Pro Display, Arial'; // Use consistent font with control panel
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
        labelCtx.shadowBlur = 0;
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelGeometry = new THREE.PlaneGeometry(smallButtonSize * 1.8, smallButtonSize * 0.6);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.set(0, -smallButtonSize * 0.8, 0.002);
        labelMesh.renderOrder = 1006;
        button.add(labelMesh);
        
        selectorGroup.add(button);
    });
    
    // Position the selector panel relative to the parent
    selectorGroup.position.set(offsetX, offsetY - 0.13, 0.01); // Lower position
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
    if (!controlPanel) {
        console.error("Cannot set up control panel - control panel is null");
        return;
    }
    
    console.log("Setting up control panel position");
    
    // Only reposition if not being dragged AND not previously manually positioned
    if (controlPanel.userData.isDragging || controlPanel.userData.manuallyPositioned) {
        console.log("Control panel is being dragged or was manually positioned - not repositioning");
        return;
    }
    
    // Position in front and below the user
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    const position = new THREE.Vector3();
    position.copy(camera.position).add(cameraDirection.multiplyScalar(-0.6)); // Further from user (0.6m instead of 0.4m)
    
    // Position BELOW the default screen position
    position.y -= 0.3; // Position it a bit higher than before to ensure it's visible
    
    // Update panel position and rotation
    controlPanel.position.copy(position);
    controlPanel.lookAt(camera.position);
    
    // Keep panel facing the user but upright
    const euler = new THREE.Euler().setFromQuaternion(controlPanel.quaternion);
    euler.x = 0; // Keep panel upright (no tilt)
    euler.z = 0; // No roll
    controlPanel.quaternion.setFromEuler(euler);
    
    // Ensure the control panel is visible
    controlPanel.visible = true;
    
    console.log("Control panel positioned at:", position);
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