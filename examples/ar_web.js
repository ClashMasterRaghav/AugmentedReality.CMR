import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

let camera, scene, renderer;
let controller, controllerGrip;
let virtualKeyboard;
let font;
let raycaster = new THREE.Raycaster();
let workingMatrix = new THREE.Matrix4();
let selectedKey = null;
let screens = []; // Array to store multiple screen objects
let selectedScreen = null; // Currently selected screen
let isPlacingScreen = false; // Flag to indicate if user is currently placing a screen
let newScreen = null; // Reference to a new screen being placed
let isMovingScreen = false; // Flag to indicate if user is currently moving a screen
let touchEnabled = true; // Flag to enable touch controls
let initialTouchPosition = new THREE.Vector2(); // Store initial touch position
let isTouchMoving = false; // Flag to track if touch movement is in progress
// New variables for enhanced features
let fabButton; // Floating action button for adding screens
let isDraggingScreen = false; // Flag for direct screen dragging
let screenOffset = new THREE.Vector3(); // Offset for screen dragging
let isResizingScreen = false; // Flag for screen resizing
let screenMenu; // Context menu for screen operations
let floatingUI; // Group for floating UI elements that follow the user
// Controls for rotation, tilt, and zoom
let isRotatingScreen = false; // Flag for screen rotation
let isTiltingScreen = false; // Flag for screen tilting
let rotationHandle; // Rotation handle reference
let tiltHandle; // Tilt handle reference
let initialRotation = new THREE.Euler(); // Store initial rotation
let initialTilt = new THREE.Euler(); // Store initial tilt
let videoTexture; // Video texture for funny looping video

init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // AR Button
    document.body.appendChild(ARButton.createButton(renderer));

    // Load font for text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
        // Create UI controls once font is loaded
        createFloatingUI();
        createVirtualKeyboard();
        
        // Load video texture for funny loop
        loadVideoTexture();
    });

    // Controller setup
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    scene.add(controller);

    // Controller model
    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip = renderer.xr.getControllerGrip(0);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    scene.add(controllerGrip);

    // Pointer for interaction
    const geometry = new THREE.SphereGeometry(0.01, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pointer = new THREE.Mesh(geometry, material);
    pointer.position.z = -0.1;
    controller.add(pointer);

    // Create a default browser window
    createNewBrowserScreen();

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Add touch event listeners
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);
}

// Load a funny looping video
function loadVideoTexture() {
    const video = document.createElement('video');
    video.src = 'https://cdn.glitch.global/3e633414-27f7-41c1-a4c5-f307ecb4e51d/funny-cat.mp4?v=1651234680945';
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    
    // Start playing video once it's loaded enough
    video.addEventListener('canplaythrough', () => {
        video.play();
    });
    
    // Create video texture
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    
    // Update existing screens with video
    screens.forEach(screen => {
        addVideoToScreen(screen);
    });
}

// Add video to a screen
function addVideoToScreen(screen) {
    if (!videoTexture) return;
    
    // Video container
    const videoGeometry = new THREE.PlaneGeometry(0.25, 0.15);
    const videoMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide
    });
    const videoPanel = new THREE.Mesh(videoGeometry, videoMaterial);
    videoPanel.position.set(0.25, 0.1, 0.002); // Position beside text
    videoPanel.userData = { type: 'video' };
    screen.add(videoPanel);
}

// Replace the control panel with a floating UI that follows the user
function createFloatingUI() {
    // Create a group for all floating UI elements
    floatingUI = new THREE.Group();
    
    // Create Floating Action Button (FAB) for adding screens
    const fabGeometry = new THREE.CircleGeometry(0.05, 32);
    const fabMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4CAF50, // Green color
        side: THREE.DoubleSide
    });
    fabButton = new THREE.Mesh(fabGeometry, fabMaterial);
    
    // Create plus icon for the FAB
    const plusCanvas = document.createElement('canvas');
    plusCanvas.width = 128;
    plusCanvas.height = 128;
    const plusCtx = plusCanvas.getContext('2d');
    plusCtx.fillStyle = '#ffffff';
    plusCtx.fillRect(54, 24, 20, 80); // Vertical bar
    plusCtx.fillRect(24, 54, 80, 20); // Horizontal bar
    
    const plusTexture = new THREE.CanvasTexture(plusCanvas);
    const plusGeometry = new THREE.CircleGeometry(0.04, 32);
    const plusMaterial = new THREE.MeshBasicMaterial({ 
        map: plusTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const plusIcon = new THREE.Mesh(plusGeometry, plusMaterial);
    plusIcon.position.z = 0.001;
    
    fabButton.add(plusIcon);
    fabButton.userData = { type: 'button', action: 'newScreen' };
    
    // Add a subtle shadow/glow effect to make the FAB stand out
    const glowGeometry = new THREE.CircleGeometry(0.06, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.001;
    fabButton.add(glow);
    
    // Position the FAB in the lower right corner of the user's view
    fabButton.position.set(0.2, -0.2, -0.5);
    floatingUI.add(fabButton);
    
    // Create a tooltip for the FAB
    const tooltipCanvas = document.createElement('canvas');
    tooltipCanvas.width = 256;
    tooltipCanvas.height = 64;
    const tooltipCtx = tooltipCanvas.getContext('2d');
    tooltipCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    tooltipCtx.roundRect(0, 0, 256, 64, 10);
    tooltipCtx.fill();
    tooltipCtx.fillStyle = '#ffffff';
    tooltipCtx.font = '20px Arial';
    tooltipCtx.textAlign = 'center';
    tooltipCtx.textBaseline = 'middle';
    tooltipCtx.fillText('Add New Screen', 128, 32);
    
    const tooltipTexture = new THREE.CanvasTexture(tooltipCanvas);
    const tooltipGeometry = new THREE.PlaneGeometry(0.2, 0.05);
    const tooltipMaterial = new THREE.MeshBasicMaterial({ 
        map: tooltipTexture,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.9
    });
    const tooltip = new THREE.Mesh(tooltipGeometry, tooltipMaterial);
    tooltip.position.set(0.2, -0.12, -0.5); // Position above the FAB
    tooltip.visible = false; // Hide initially
    fabButton.userData.tooltip = tooltip;
    floatingUI.add(tooltip);
    
    // Add the floating UI to the scene
    scene.add(floatingUI);
}

function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.2)) {
    const browserWindow = new THREE.Group();
    
    // Browser background with border
    const browserGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const browserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const browserPanel = new THREE.Mesh(browserGeometry, browserMaterial);
    browserWindow.add(browserPanel);
    
    // Create border by adding a slightly larger background panel
    const borderGeometry = new THREE.PlaneGeometry(0.82, 0.62);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2196F3, // Blue border
        side: THREE.DoubleSide
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    browserWindow.add(borderPanel);
    
    // Address bar background
    const addressBarGeometry = new THREE.PlaneGeometry(0.76, 0.06);
    const addressBarMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xf0f0f0,
        side: THREE.DoubleSide
    });
    const addressBar = new THREE.Mesh(addressBarGeometry, addressBarMaterial);
    addressBar.position.y = 0.25;
    addressBar.position.z = 0.001;
    browserWindow.add(addressBar);
    
    // Add url text
    const urlCanvas = document.createElement('canvas');
    urlCanvas.width = 380;
    urlCanvas.height = 30;
    const urlCtx = urlCanvas.getContext('2d');
    urlCtx.fillStyle = '#000000';
    urlCtx.font = '20px Arial';
    urlCtx.fillText(`example.com/screen${screens.length + 1}`, 10, 20);
    
    const urlTexture = new THREE.CanvasTexture(urlCanvas);
    const urlGeometry = new THREE.PlaneGeometry(0.38, 0.03);
    const urlMaterial = new THREE.MeshBasicMaterial({ 
        map: urlTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const urlMesh = new THREE.Mesh(urlGeometry, urlMaterial);
    urlMesh.position.set(-0.15, 0.25, 0.002);
    browserWindow.add(urlMesh);
    
    // Content area with example content
    const contentGeometry = new THREE.PlaneGeometry(0.76, 0.46);
    const texture = createBrowserContentTexture(screens.length + 1);
    const contentMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide
    });
    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.position.y = -0.03;
    contentPanel.position.z = 0.001;
    browserWindow.add(contentPanel);
    
    // Add close button
    const closeButtonGeometry = new THREE.CircleGeometry(0.02, 32);
    const closeButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff5252, // Red color
        side: THREE.DoubleSide
    });
    const closeButton = new THREE.Mesh(closeButtonGeometry, closeButtonMaterial);
    closeButton.position.set(0.37, 0.28, 0.002);
    closeButton.userData = { type: 'button', action: 'closeScreen' };
    browserWindow.add(closeButton);
    
    // Add X icon to close button
    const xCanvas = document.createElement('canvas');
    xCanvas.width = 64;
    xCanvas.height = 64;
    const xCtx = xCanvas.getContext('2d');
    xCtx.strokeStyle = '#ffffff';
    xCtx.lineWidth = 6;
    xCtx.beginPath();
    xCtx.moveTo(16, 16);
    xCtx.lineTo(48, 48);
    xCtx.moveTo(48, 16);
    xCtx.lineTo(16, 48);
    xCtx.stroke();
    
    const xTexture = new THREE.CanvasTexture(xCanvas);
    const xGeometry = new THREE.CircleGeometry(0.015, 32);
    const xMaterial = new THREE.MeshBasicMaterial({ 
        map: xTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const xIcon = new THREE.Mesh(xGeometry, xMaterial);
    xIcon.position.set(0.37, 0.28, 0.003);
    browserWindow.add(xIcon);
    
    // Add resize handle
    const resizeHandleGeometry = new THREE.PlaneGeometry(0.04, 0.04);
    const resizeHandleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x9e9e9e,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const resizeHandle = new THREE.Mesh(resizeHandleGeometry, resizeHandleMaterial);
    resizeHandle.position.set(0.38, -0.28, 0.002);
    resizeHandle.userData = { type: 'button', action: 'resizeScreen' };
    browserWindow.add(resizeHandle);
    
    // Add resize icon
    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = 64;
    resizeCanvas.height = 64;
    const resizeCtx = resizeCanvas.getContext('2d');
    resizeCtx.strokeStyle = '#ffffff';
    resizeCtx.lineWidth = 4;
    resizeCtx.beginPath();
    // Draw diagonal lines in the corner
    resizeCtx.moveTo(32, 48);
    resizeCtx.lineTo(48, 32);
    resizeCtx.moveTo(24, 48);
    resizeCtx.lineTo(48, 24);
    resizeCtx.moveTo(16, 48);
    resizeCtx.lineTo(48, 16);
    resizeCtx.stroke();
    
    const resizeTexture = new THREE.CanvasTexture(resizeCanvas);
    const resizeIconGeometry = new THREE.PlaneGeometry(0.03, 0.03);
    const resizeIconMaterial = new THREE.MeshBasicMaterial({ 
        map: resizeTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const resizeIcon = new THREE.Mesh(resizeIconGeometry, resizeIconMaterial);
    resizeIcon.position.set(0.38, -0.28, 0.003);
    browserWindow.add(resizeIcon);
    
    // Add rotation handle
    const rotationHandleGeometry = new THREE.CircleGeometry(0.02, 32);
    const rotationHandleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2196F3, // Blue color
        side: THREE.DoubleSide
    });
    rotationHandle = new THREE.Mesh(rotationHandleGeometry, rotationHandleMaterial);
    rotationHandle.position.set(-0.38, 0.28, 0.002);
    rotationHandle.userData = { type: 'button', action: 'rotateScreen' };
    browserWindow.add(rotationHandle);
    
    // Add rotation icon
    const rotationCanvas = document.createElement('canvas');
    rotationCanvas.width = 64;
    rotationCanvas.height = 64;
    const rotationCtx = rotationCanvas.getContext('2d');
    rotationCtx.strokeStyle = '#ffffff';
    rotationCtx.lineWidth = 4;
    rotationCtx.beginPath();
    rotationCtx.arc(32, 32, 20, 0, 1.5 * Math.PI);
    rotationCtx.moveTo(32, 12);
    rotationCtx.lineTo(25, 18);
    rotationCtx.moveTo(32, 12);
    rotationCtx.lineTo(39, 18);
    rotationCtx.stroke();
    
    const rotationTexture = new THREE.CanvasTexture(rotationCanvas);
    const rotationIconGeometry = new THREE.CircleGeometry(0.015, 32);
    const rotationIconMaterial = new THREE.MeshBasicMaterial({ 
        map: rotationTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const rotationIcon = new THREE.Mesh(rotationIconGeometry, rotationIconMaterial);
    rotationIcon.position.set(-0.38, 0.28, 0.003);
    browserWindow.add(rotationIcon);
    
    // Add tilt handle
    const tiltHandleGeometry = new THREE.CircleGeometry(0.02, 32);
    const tiltHandleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF9800, // Orange color
        side: THREE.DoubleSide
    });
    tiltHandle = new THREE.Mesh(tiltHandleGeometry, tiltHandleMaterial);
    tiltHandle.position.set(-0.38, -0.28, 0.002);
    tiltHandle.userData = { type: 'button', action: 'tiltScreen' };
    browserWindow.add(tiltHandle);
    
    // Add tilt icon
    const tiltCanvas = document.createElement('canvas');
    tiltCanvas.width = 64;
    tiltCanvas.height = 64;
    const tiltCtx = tiltCanvas.getContext('2d');
    tiltCtx.strokeStyle = '#ffffff';
    tiltCtx.lineWidth = 4;
    tiltCtx.beginPath();
    tiltCtx.moveTo(22, 22);
    tiltCtx.lineTo(42, 42);
    tiltCtx.moveTo(22, 22);
    tiltCtx.lineTo(12, 32);
    tiltCtx.moveTo(42, 42);
    tiltCtx.lineTo(52, 32);
    tiltCtx.stroke();
    
    const tiltTexture = new THREE.CanvasTexture(tiltCanvas);
    const tiltIconGeometry = new THREE.CircleGeometry(0.015, 32);
    const tiltIconMaterial = new THREE.MeshBasicMaterial({ 
        map: tiltTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const tiltIcon = new THREE.Mesh(tiltIconGeometry, tiltIconMaterial);
    tiltIcon.position.set(-0.38, -0.28, 0.003);
    browserWindow.add(tiltIcon);
    
    // Position the window
    browserWindow.position.copy(position);
    browserWindow.userData = { 
        type: 'screen', 
        id: screens.length, 
        isSelected: false,
        content: `Screen ${screens.length + 1} Content`,
        originalScale: new THREE.Vector3(1, 1, 1), // Store original scale for resizing
        initialRotation: new THREE.Euler() // Store initial rotation for rotation
    };
    
    scene.add(browserWindow);
    screens.push(browserWindow);
    
    // Add video if available
    if (videoTexture) {
        addVideoToScreen(browserWindow);
    }
    
    // Set this as the selected screen
    selectScreen(browserWindow);
    
    return browserWindow;
}

function createBrowserContentTexture(screenNumber) {
    // Create a canvas to draw browser content
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 460;
    
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw header
    ctx.fillStyle = '#000000';
    ctx.font = '32px Arial';
    ctx.fillText(`AR Screen ${screenNumber}`, 20, 50);
    
    // Draw content
    ctx.font = '20px Arial';
    ctx.fillText('This is a multi-screen AR browsing experience.', 20, 100);
    ctx.fillText('You can create multiple screens and place them anywhere.', 20, 130);
    
    // Draw feature box
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(20, 180, 720, 200);
    
    ctx.fillStyle = '#000000';
    ctx.font = '24px Arial';
    ctx.fillText('Screen features:', 40, 210);
    
    ctx.font = '18px Arial';
    ctx.fillText('• Selectable screen with highlighted border', 40, 250);
    ctx.fillText('• Movable to any position in AR space', 40, 280);
    ctx.fillText(`• Screen ID: ${screenNumber}`, 40, 310);
    ctx.fillText('• Persistent across AR sessions', 40, 340);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Enhanced touch handling for direct screen manipulation
function onTouchStart(event) {
    if (!touchEnabled || !event.touches[0]) return;
    
    event.preventDefault();
    
    // Store initial touch position
    initialTouchPosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    
    // Cast ray from touch position
    raycaster.setFromCamera(initialTouchPosition, camera);
    
    // Check for FAB button interaction
    const fabIntersects = raycaster.intersectObject(fabButton);
    if (fabIntersects.length > 0) {
        // Create a new screen in front of the camera
        const position = new THREE.Vector3(0, 0, -1.2);
        position.applyMatrix4(camera.matrixWorld);
        
        newScreen = createNewBrowserScreen(position);
        
        // Visual feedback for button press
        const originalColor = fabButton.material.color.clone();
        fabButton.material.color.set(0x8BC34A); // Lighter green for feedback
        setTimeout(() => {
            fabButton.material.color.copy(originalColor);
        }, 200);
        return;
    }
    
    // Check for screen interaction
    let screenIntersects = [];
    screens.forEach(screen => {
        // Check all interactive elements of the screen
        const screenParts = screen.children.filter(child => 
            child.userData && (child.userData.type === 'button' || !child.userData.type));
        
        const intersects = raycaster.intersectObjects(screenParts);
        if (intersects.length > 0) {
            // Store the screen and the specific intersected part
            intersects.forEach(intersect => {
                intersect.object.parent = screen; // Ensure the parent reference is set
                screenIntersects.push(intersect);
            });
        }
    });
    
    // Sort by distance
    screenIntersects.sort((a, b) => a.distance - b.distance);
    
    if (screenIntersects.length > 0) {
        const intersect = screenIntersects[0];
        const screen = intersect.object.parent;
        const part = intersect.object;
        
        // Select the screen first
        selectScreen(screen);
        
        // Check if we clicked a special button
        if (part.userData && part.userData.type === 'button') {
            if (part.userData.action === 'closeScreen') {
                // Remove the screen
                scene.remove(screen);
                screens = screens.filter(s => s !== screen);
                if (selectedScreen === screen) {
                    selectedScreen = screens.length > 0 ? screens[screens.length - 1] : null;
                    if (selectedScreen) {
                        selectScreen(selectedScreen);
                    }
                }
                return;
            }
            
            if (part.userData.action === 'resizeScreen') {
                // Start resizing the screen
                isResizingScreen = true;
                return;
            }
            
            if (part.userData.action === 'rotateScreen') {
                // Start rotating the screen
                isRotatingScreen = true;
                // Store initial rotation
                initialRotation.copy(selectedScreen.rotation);
                return;
            }
            
            if (part.userData.action === 'tiltScreen') {
                // Start tilting the screen
                isTiltingScreen = true;
                // Store initial tilt
                initialTilt.copy(selectedScreen.rotation);
                return;
            }
        }
        
        // Otherwise start dragging the screen
        isDraggingScreen = true;
        
        // Calculate the offset from the touch point to the screen center
        // This ensures we drag from the point we touched, not from the center
        const intersectionPoint = intersect.point.clone();
        screenOffset.copy(screen.position).sub(intersectionPoint);
        
        return;
    }
}

function onTouchMove(event) {
    if (!touchEnabled || !event.touches[0]) return;
    
    event.preventDefault();
    
    // Get current touch position
    const currentTouchPosition = new THREE.Vector2(
        (event.touches[0].clientX / window.innerWidth) * 2 - 1,
        -(event.touches[0].clientY / window.innerHeight) * 2 + 1
    );
    
    // Update raycaster with new touch position
    raycaster.setFromCamera(currentTouchPosition, camera);
    
    if (isDraggingScreen && selectedScreen) {
        // Get the ray's intersection with the z-plane of the screen
        const planeNormal = new THREE.Vector3(0, 0, 1);
        planeNormal.applyQuaternion(camera.quaternion);
        
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(planeNormal, selectedScreen.position);
        
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        
        // Move the screen to the new position, accounting for the initial offset
        selectedScreen.position.copy(intersectionPoint.add(screenOffset));
        
        // Update keyboard position if visible
        if (virtualKeyboard && virtualKeyboard.visible) {
            updateKeyboardPosition();
        }
        
        return;
    }
    
    if (isResizingScreen && selectedScreen) {
        // Get ray intersection with screen plane
        const planeNormal = new THREE.Vector3(0, 0, 1);
        planeNormal.applyQuaternion(selectedScreen.quaternion);
        
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(planeNormal, selectedScreen.position);
        
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        
        // Calculate distance from screen center to touch point
        const distanceX = Math.abs(intersectionPoint.x - selectedScreen.position.x);
        const distanceY = Math.abs(intersectionPoint.y - selectedScreen.position.y);
        
        // Calculate new scale (with some constraints)
        const newScaleX = Math.max(0.5, Math.min(2.0, distanceX * 2.5));
        const newScaleY = Math.max(0.5, Math.min(2.0, distanceY * 2.5));
        
        // Apply new scale
        selectedScreen.scale.set(newScaleX, newScaleY, 1);
        
        return;
    }
    
    if (isRotatingScreen && selectedScreen) {
        // Get ray intersection with screen plane
        const planeNormal = new THREE.Vector3(0, 0, 1);
        planeNormal.applyQuaternion(camera.quaternion);
        
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(planeNormal, selectedScreen.position);
        
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        
        // Calculate angle between initial and current positions
        const screenCenter = selectedScreen.position.clone();
        const initialVector = new THREE.Vector2(0, 1); // Up vector as reference
        const currentVector = new THREE.Vector2(
            intersectionPoint.x - screenCenter.x,
            intersectionPoint.y - screenCenter.y
        ).normalize();
        
        // Calculate angle between vectors
        let angle = Math.atan2(currentVector.y, currentVector.x) - Math.atan2(initialVector.y, initialVector.x);
        
        // Apply rotation around z-axis (can add more axes for more complex rotation)
        selectedScreen.rotation.z = angle;
        
        return;
    }
    
    if (isTiltingScreen && selectedScreen) {
        // Get ray intersection with screen plane
        const planeNormal = new THREE.Vector3(0, 0, 1);
        planeNormal.applyQuaternion(camera.quaternion);
        
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(planeNormal, selectedScreen.position);
        
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        
        // Calculate tilt based on vertical distance from center
        const screenCenter = selectedScreen.position.clone();
        const verticalDelta = intersectionPoint.y - screenCenter.y;
        
        // Apply tilt around x-axis
        const tiltAmount = verticalDelta * 2; // Scale factor for more pronounced tilt
        selectedScreen.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, tiltAmount));
        
        return;
    }
}

function onTouchEnd(event) {
    isDraggingScreen = false;
    isResizingScreen = false;
    isRotatingScreen = false;
    isTiltingScreen = false;
    isTouchMoving = false;
    isMovingScreen = false;
}

function updateKeyboardPosition() {
    if (!selectedScreen || !virtualKeyboard) return;
    
    const screenPos = selectedScreen.position.clone();
    const screenScale = selectedScreen.scale.clone();
    
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

function createVirtualKeyboard() {
    virtualKeyboard = new THREE.Group();
    
    // Keyboard background
    const keyboardGeometry = new THREE.PlaneGeometry(0.8, 0.3);
    const keyboardMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide
    });
    const keyboardPanel = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    virtualKeyboard.add(keyboardPanel);
    
    // Create keyboard keys
    const rows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '/']
    ];
    
    const keySize = 0.05;
    const keySpacing = 0.01;
    const keyGeometry = new THREE.PlaneGeometry(keySize, keySize);
    const keyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444,
        side: THREE.DoubleSide
    });
    const keyHoverMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x666666,
        side: THREE.DoubleSide
    });
    
    // Track keys for interaction
    const keys = [];
    
    // Create rows of keys
    rows.forEach((row, rowIndex) => {
        const rowWidth = row.length * (keySize + keySpacing) - keySpacing;
        const startX = -rowWidth / 2;
        
        row.forEach((key, keyIndex) => {
            const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial.clone());
            const x = startX + keyIndex * (keySize + keySpacing);
            const y = 0.12 - rowIndex * (keySize + keySpacing);
            keyMesh.position.set(x, y, 0.001);
            
            // Store key data for interaction
            keyMesh.userData = { 
                type: 'key',
                key: key,
                originalMaterial: keyMesh.material,
                hoverMaterial: keyHoverMaterial.clone()
            };
            keys.push(keyMesh);
            
            virtualKeyboard.add(keyMesh);
            
            // Add key label using canvas texture
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 64;
            labelCanvas.height = 64;
            const labelCtx = labelCanvas.getContext('2d');
            labelCtx.fillStyle = '#ffffff';
            labelCtx.font = '32px Arial';
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
            labelMesh.position.set(x, y, 0.002);
            virtualKeyboard.add(labelMesh);
        });
    });
    
    // Add space bar
    const spaceBarGeometry = new THREE.PlaneGeometry(0.3, keySize);
    const spaceBar = new THREE.Mesh(spaceBarGeometry, keyMaterial.clone());
    spaceBar.position.set(0, -0.12, 0.001);
    spaceBar.userData = { 
        type: 'key',
        key: ' ',
        originalMaterial: spaceBar.material,
        hoverMaterial: keyHoverMaterial.clone()
    };
    keys.push(spaceBar);
    virtualKeyboard.add(spaceBar);
    
    // Add "SPACE" label for space bar
    const spaceCanvas = document.createElement('canvas');
    spaceCanvas.width = 200;
    spaceCanvas.height = 50;
    const spaceCtx = spaceCanvas.getContext('2d');
    spaceCtx.fillStyle = '#ffffff';
    spaceCtx.font = '24px Arial';
    spaceCtx.textAlign = 'center';
    spaceCtx.textBaseline = 'middle';
    spaceCtx.fillText('SPACE', 100, 25);
    
    const spaceTexture = new THREE.CanvasTexture(spaceCanvas);
    const spaceLabelGeometry = new THREE.PlaneGeometry(0.2, 0.03);
    const spaceLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: spaceTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const spaceLabelMesh = new THREE.Mesh(spaceLabelGeometry, spaceLabelMaterial);
    spaceLabelMesh.position.set(0, -0.12, 0.002);
    virtualKeyboard.add(spaceLabelMesh);
    
    // Store the keys array for interaction
    virtualKeyboard.userData = { type: 'keyboard', keys: keys };
    
    // Position the keyboard below the browser window and bring it forward
    virtualKeyboard.position.set(0, -0.45, -0.78);
    virtualKeyboard.rotation.x = -Math.PI / 8;
    virtualKeyboard.visible = false; // Hide keyboard initially
    scene.add(virtualKeyboard);
}

function selectScreen(screen) {
    // Deselect previously selected screen
    if (selectedScreen) {
        // Change border color back to normal
        selectedScreen.children[1].material.color.set(0x2196F3);
        selectedScreen.userData.isSelected = false;
    }
    
    // Select new screen
    selectedScreen = screen;
    
    if (selectedScreen) {
        // Highlight border for selected screen
        selectedScreen.children[1].material.color.set(0x4CAF50); // Green for selected
        selectedScreen.userData.isSelected = true;
        
        // Position keyboard under selected screen if needed
        if (virtualKeyboard) {
            updateKeyboardPosition();
        }
    }
}

// Enhanced controller interaction
function onSelect(event) {
    // Raycast to detect interactive elements
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Check for FAB button interaction
    const fabIntersects = raycaster.intersectObject(fabButton);
    if (fabIntersects.length > 0) {
        // Create a new screen at controller position + direction
        isPlacingScreen = true;
        
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        position.addScaledVector(direction, 0.8);
        
        newScreen = createNewBrowserScreen(position);
        
        // Visual feedback for button press
        const originalColor = fabButton.material.color.clone();
        fabButton.material.color.set(0x8BC34A); // Lighter green for feedback
        setTimeout(() => {
            fabButton.material.color.copy(originalColor);
        }, 200);
        
        return;
    }
    
    // Check for screen interaction - checking all parts of all screens
    let screenIntersects = [];
    screens.forEach(screen => {
        // Check all interactive elements of the screen
        const screenParts = screen.children.filter(child => 
            child.userData && (child.userData.type === 'button' || !child.userData.type));
        
        const intersects = raycaster.intersectObjects(screenParts);
        if (intersects.length > 0) {
            // Store the screen and the specific intersected part
            intersects.forEach(intersect => {
                intersect.object.parent = screen; // Ensure the parent reference is set
                screenIntersects.push(intersect);
            });
        }
    });
    
    // Sort by distance
    screenIntersects.sort((a, b) => a.distance - b.distance);
    
    if (screenIntersects.length > 0) {
        const intersect = screenIntersects[0];
        const screen = intersect.object.parent;
        const part = intersect.object;
        
        // Select the screen first
        selectScreen(screen);
        
        // Check if we clicked a special button
        if (part.userData && part.userData.type === 'button') {
            if (part.userData.action === 'closeScreen') {
                // Remove the screen
                scene.remove(screen);
                screens = screens.filter(s => s !== screen);
                if (selectedScreen === screen) {
                    selectedScreen = screens.length > 0 ? screens[screens.length - 1] : null;
                    if (selectedScreen) {
                        selectScreen(selectedScreen);
                    }
                }
                return;
            }
            
            if (part.userData.action === 'resizeScreen') {
                // Start resizing the screen
                isResizingScreen = true;
                return;
            }
            
            if (part.userData.action === 'rotateScreen') {
                // Start rotating the screen
                isRotatingScreen = true;
                // Store initial rotation
                initialRotation.copy(selectedScreen.rotation);
                return;
            }
            
            if (part.userData.action === 'tiltScreen') {
                // Start tilting the screen
                isTiltingScreen = true;
                // Store initial tilt
                initialTilt.copy(selectedScreen.rotation);
                return;
            }
        }
        
        // Otherwise start dragging the screen
        isDraggingScreen = true;
        
        // Calculate the offset from the touch point to the screen center
        // This ensures we drag from the point we touched, not from the center
        const intersectionPoint = intersect.point.clone();
        screenOffset.copy(screen.position).sub(intersectionPoint);
        
        return;
    }
    
    // Check for keyboard key intersections
    if (virtualKeyboard && virtualKeyboard.visible && virtualKeyboard.userData.keys) {
        const keyIntersects = raycaster.intersectObjects(virtualKeyboard.userData.keys);
        
        if (keyIntersects.length > 0) {
            const key = keyIntersects[0].object;
            console.log(`Key pressed: ${key.userData.key}`);
            
            // Visual feedback on key press
            const flashColor = new THREE.Color(0x00ff00);
            const originalColor = key.userData.originalMaterial.color.clone();
            
            key.material.color.copy(flashColor);
            
            // Reset color after brief flash
            setTimeout(() => {
                key.material.color.copy(originalColor);
            }, 200);
            
            return;
        }
    }
}

function onSelectStart(event) {
    // This would handle the start of a controller selection
    // For advanced cases like showing tooltip on hover before selection
    
    // Show tooltip for FAB on hover
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    const fabIntersects = raycaster.intersectObject(fabButton);
    if (fabIntersects.length > 0 && fabButton.userData.tooltip) {
        fabButton.userData.tooltip.visible = true;
    }
}

function onSelectEnd(event) {
    // Reset states when controller selection ends
    isDraggingScreen = false;
    isResizingScreen = false;
    isRotatingScreen = false;
    isTiltingScreen = false;
    isPlacingScreen = false;
    isMovingScreen = false;
    
    // Hide tooltip
    if (fabButton && fabButton.userData.tooltip) {
        fabButton.userData.tooltip.visible = false;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    // Update floating UI to always face the user and stay in view
    if (floatingUI) {
        // Position the floating UI to follow the camera
        const cameraWorldPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraWorldPosition);
        
        // Calculate position relative to camera view
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        floatingUI.position.copy(cameraWorldPosition);
        floatingUI.position.addScaledVector(cameraDirection, -0.5); // Position it 0.5 units in front
        
        // Shift to bottom right corner
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(camera.quaternion);
        
        floatingUI.position.addScaledVector(right, 0.2);
        floatingUI.position.addScaledVector(up, -0.2);
        
        // Make it face the user
        floatingUI.lookAt(cameraWorldPosition);
    }
    
    // Handle screen dragging with controller
    if (isDraggingScreen && selectedScreen) {
        // Get controller position
        const controllerPosition = new THREE.Vector3();
        controllerPosition.setFromMatrixPosition(controller.matrixWorld);
        
        // Get controller direction
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Cast ray from controller
        raycaster.ray.origin.copy(controllerPosition);
        raycaster.ray.direction.copy(direction);
        
        // Create a plane perpendicular to the camera view
        const planeNormal = new THREE.Vector3(0, 0, 1);
        planeNormal.applyQuaternion(camera.quaternion);
        
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(planeNormal, selectedScreen.position);
        
        // Get intersection point with plane
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        
        // Move the screen to the new position, considering the initial offset
        selectedScreen.position.copy(intersectionPoint.add(screenOffset));
        
        // Update keyboard position if visible
        if (virtualKeyboard && virtualKeyboard.visible) {
            updateKeyboardPosition();
        }
    }
    
    // Handle screen resizing with controller
    if (isResizingScreen && selectedScreen) {
        // Get controller position
        const controllerPosition = new THREE.Vector3();
        controllerPosition.setFromMatrixPosition(controller.matrixWorld);
        
        // Calculate distance from screen center to controller
        const distanceX = Math.abs(controllerPosition.x - selectedScreen.position.x);
        const distanceY = Math.abs(controllerPosition.y - selectedScreen.position.y);
        
        // Calculate new scale (with constraints)
        const newScaleX = Math.max(0.5, Math.min(2.0, distanceX * 2.5));
        const newScaleY = Math.max(0.5, Math.min(2.0, distanceY * 2.5));
        
        // Apply new scale
        selectedScreen.scale.set(newScaleX, newScaleY, 1);
    }
    
    // Handle screen rotation with controller
    if (isRotatingScreen && selectedScreen) {
        // Get controller position
        const controllerPosition = new THREE.Vector3();
        controllerPosition.setFromMatrixPosition(controller.matrixWorld);
        
        // Calculate angle between screen center and controller
        const screenCenter = selectedScreen.position.clone();
        const direction = new THREE.Vector2(
            controllerPosition.x - screenCenter.x,
            controllerPosition.y - screenCenter.y
        ).normalize();
        
        // Calculate rotation angle
        const angle = Math.atan2(direction.y, direction.x) - Math.PI/2;
        
        // Apply rotation around z-axis
        selectedScreen.rotation.z = angle;
    }
    
    // Handle screen tilting with controller
    if (isTiltingScreen && selectedScreen) {
        // Get controller position
        const controllerPosition = new THREE.Vector3();
        controllerPosition.setFromMatrixPosition(controller.matrixWorld);
        
        // Calculate tilt based on vertical distance from center
        const screenCenter = selectedScreen.position.clone();
        const verticalDelta = controllerPosition.y - screenCenter.y;
        
        // Apply tilt around x-axis
        const tiltAmount = verticalDelta * 2; // Scale factor for more pronounced tilt
        selectedScreen.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, tiltAmount));
    }
    
    // Handle keyboard key hover effects
    if (controller && virtualKeyboard && virtualKeyboard.visible && virtualKeyboard.userData.keys) {
        // Reset previously selected key if any
        if (selectedKey) {
            selectedKey.material.copy(selectedKey.userData.originalMaterial);
            selectedKey = null;
        }
        
        // Check for key hovering
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        const intersects = raycaster.intersectObjects(virtualKeyboard.userData.keys);
        
        if (intersects.length > 0) {
            selectedKey = intersects[0].object;
            selectedKey.material.copy(selectedKey.userData.hoverMaterial);
        }
    }
    
    // Update screen highlight effects
    screens.forEach(screen => {
        if (screen.userData.isSelected) {
            // Subtle pulsing effect for selected screen's border
            const time = Date.now() * 0.001;
            const pulseIntensity = 0.1 * Math.sin(time * 2) + 0.9;
            screen.children[1].material.color.setRGB(0.3 * pulseIntensity, 0.8 * pulseIntensity, 0.3 * pulseIntensity);
        }
    });
    
    renderer.render(scene, camera);
}