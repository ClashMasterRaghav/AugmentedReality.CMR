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
let videoTexture; // Texture for video playback
let videoElement; // HTML video element
let isMoveModeActive = false; // Flag to track if move mode is active
let isRotateModeActive = false; // Flag to track if rotate mode is active
let rotationSpeed = 0.05; // Speed of rotation
let initialRotation = new THREE.Vector2(); // Store initial rotation
let isRotating = false; // Flag to track if rotation is in progress
let isMovingControlPanel = false;
let controlPanel = null;

init();
animate();

// Add a new variable for video mute state
let isVideoMuted = true; // Start with video muted

// Update the init function to fix video setup
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

    // Setup video texture - FIX VIDEO DISPLAY
    videoElement = document.getElementById('videoElement');
    videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    
    // Start video (will be muted initially)
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.play().catch(e => console.error("Video play error:", e));

    // AR Button with session end event handling
    const arButton = ARButton.createButton(renderer, {
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    });
    
    document.body.appendChild(arButton);
    
    // Add event listener for session end
    renderer.xr.addEventListener('sessionend', function() {
        console.log("AR session ended");
        // Reload the page to return to initial state
        window.location.reload();
    });

    // Load font for text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
        // Create UI controls once font is loaded
        createControlPanel();
        createVirtualKeyboard();
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

    // Pointer for interaction - SMALLER SIZE
    const geometry = new THREE.SphereGeometry(0.005, 16, 16); // Reduced size
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan for better visibility
    const pointer = new THREE.Mesh(geometry, material);
    pointer.position.z = -0.1;
    controller.add(pointer);

    // Create a default browser window
    createNewBrowserScreen(new THREE.Vector3(0, 0, -1.2)); // Position further back

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Add touch event listeners
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);
}

// Update the createControlPanel function
function createControlPanel() {
    const panel = new THREE.Group();
    controlPanel = panel; // Store reference to control panel
    
    // Panel background with modern design - smaller size
    const panelGeometry = new THREE.PlaneGeometry(0.25, 0.20); // Reduced size
    const panelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1a1a2e, // Darker, more modern background
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9 // More solid appearance
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panelMesh.userData = { type: 'panelBackground' }; // For hit detection
    panel.add(panelMesh);
    
    // Add subtle rounded corners effect with multiple overlays
    const cornerRadius = 0.01;
    const cornerGeometry = new THREE.PlaneGeometry(0.25 - cornerRadius*2, 0.20 - cornerRadius*2);
    const cornerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1a1a2e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const cornerMesh = new THREE.Mesh(cornerGeometry, cornerMaterial);
    cornerMesh.position.z = 0.0005;
    panel.add(cornerMesh);
    
    // Add modern gradient effect
    const gradientGeometry = new THREE.PlaneGeometry(0.25, 0.20);
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 256;
    gradientCanvas.height = 200;
    const gradCtx = gradientCanvas.getContext('2d');
    const gradient = gradCtx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(26, 26, 46, 0.9)');
    gradient.addColorStop(1, 'rgba(40, 40, 80, 0.9)');
    gradCtx.fillStyle = gradient;
    gradCtx.fillRect(0, 0, 256, 200);
    
    const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
    const gradientMaterial = new THREE.MeshBasicMaterial({
        map: gradientTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
    gradientMesh.position.z = 0.001;
    panel.add(gradientMesh);
    
    // Add panel title
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 256;
    titleCanvas.height = 40;
    const titleCtx = titleCanvas.getContext('2d');
    titleCtx.fillStyle = '#ffffff';
    titleCtx.font = 'bold 18px Arial';
    titleCtx.textAlign = 'center';
    titleCtx.textBaseline = 'middle';
    titleCtx.fillText('AR CONTROLS', 128, 20);
    
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleGeometry = new THREE.PlaneGeometry(0.20, 0.03);
    const titleMaterial = new THREE.MeshBasicMaterial({
        map: titleTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(0, 0.085, 0.002);
    panel.add(titleMesh);
    
    // Add move panel handle with icon
    const handleGeometry = new THREE.PlaneGeometry(0.24, 0.025);
    const handleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x3a3a5e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const handleMesh = new THREE.Mesh(handleGeometry, handleMaterial);
    handleMesh.position.set(0, 0.085, 0.0015);
    handleMesh.userData = { type: 'panelHandle' }; // For hit detection
    panel.add(handleMesh);
    
    // Add handle icon (drag dots)
    const handleIconCanvas = document.createElement('canvas');
    handleIconCanvas.width = 256;
    handleIconCanvas.height = 30;
    const handleCtx = handleIconCanvas.getContext('2d');
    handleCtx.fillStyle = '#aaaaaa';
    // Draw 6 dots in the center
    for (let i = 0; i < 6; i++) {
        handleCtx.beginPath();
        handleCtx.arc(108 + i * 8, 15, 2, 0, Math.PI * 2);
        handleCtx.fill();
    }
    
    const handleIconTexture = new THREE.CanvasTexture(handleIconCanvas);
    const handleIconGeometry = new THREE.PlaneGeometry(0.05, 0.015);
    const handleIconMaterial = new THREE.MeshBasicMaterial({
        map: handleIconTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const handleIconMesh = new THREE.Mesh(handleIconGeometry, handleIconMaterial);
    handleIconMesh.position.set(0, 0.085, 0.002);
    panel.add(handleIconMesh);
    
    // Smaller button size for modern look with better hitbox
    const buttonGeometry = new THREE.PlaneGeometry(0.20, 0.04);
    // Create invisible larger hitbox geometry for buttons
    const hitboxGeometry = new THREE.PlaneGeometry(0.22, 0.045);
    
    // New Screen button
    const newScreenButton = new THREE.Mesh(buttonGeometry, new THREE.MeshBasicMaterial({ 
        color: 0x4488ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    }));
    newScreenButton.position.set(0, 0.045, 0.001);
    newScreenButton.userData = { type: 'button', action: 'newScreen' };
    panel.add(newScreenButton);
    
    // New Screen button hitbox (invisible but larger for better interaction)
    const newScreenHitbox = new THREE.Mesh(hitboxGeometry, new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0.0
    }));
    newScreenHitbox.position.set(0, 0.045, 0.0005);
    newScreenHitbox.userData = { type: 'hitbox', action: 'newScreen' };
    panel.add(newScreenHitbox);
    
    // New Screen button label
    const buttonCanvas = document.createElement('canvas');
    buttonCanvas.width = 256;
    buttonCanvas.height = 64;
    const btnCtx = buttonCanvas.getContext('2d');
    btnCtx.fillStyle = '#ffffff';
    btnCtx.font = 'bold 22px Arial';
    btnCtx.textAlign = 'center';
    btnCtx.textBaseline = 'middle';
    btnCtx.fillText('+ New Screen', 128, 32);
    
    const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
    const buttonLabelGeometry = new THREE.PlaneGeometry(0.19, 0.035);
    const buttonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: buttonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const buttonLabel = new THREE.Mesh(buttonLabelGeometry, buttonLabelMaterial);
    buttonLabel.position.set(0, 0.045, 0.002);
    panel.add(buttonLabel);
    
    // Move Screen button with toggle functionality - grey when inactive
    const moveButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x777777, // Grey when inactive
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const moveScreenButton = new THREE.Mesh(buttonGeometry, moveButtonMaterial);
    moveScreenButton.position.set(0, 0.0, 0.001);
    moveScreenButton.userData = { 
        type: 'button',
        action: 'moveScreen',
        isToggle: true,
        isActive: false
    };
    panel.add(moveScreenButton);
    
    // Move Screen button hitbox
    const moveScreenHitbox = new THREE.Mesh(hitboxGeometry, new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0.0
    }));
    moveScreenHitbox.position.set(0, 0.0, 0.0005);
    moveScreenHitbox.userData = { type: 'hitbox', action: 'moveScreen' };
    panel.add(moveScreenHitbox);
    
    // Move Screen button label
    const moveButtonCanvas = document.createElement('canvas');
    moveButtonCanvas.width = 256;
    moveButtonCanvas.height = 64;
    const moveBtnCtx = moveButtonCanvas.getContext('2d');
    moveBtnCtx.fillStyle = '#ffffff';
    moveBtnCtx.font = 'bold 22px Arial';
    moveBtnCtx.textAlign = 'center';
    moveBtnCtx.textBaseline = 'middle';
    moveBtnCtx.fillText('Move Screen', 128, 32);
    
    const moveButtonTexture = new THREE.CanvasTexture(moveButtonCanvas);
    const moveButtonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: moveButtonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const moveButtonLabel = new THREE.Mesh(buttonLabelGeometry, moveButtonLabelMaterial);
    moveButtonLabel.position.set(0, 0.0, 0.002);
    panel.add(moveButtonLabel);
    
    // Rotate Screen button - grey when inactive
    const rotateButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x777777, // Grey when inactive
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const rotateScreenButton = new THREE.Mesh(buttonGeometry, rotateButtonMaterial);
    rotateScreenButton.position.set(0, -0.045, 0.001);
    rotateScreenButton.userData = { 
        type: 'button',
        action: 'rotateScreen',
        isToggle: true,
        isActive: false
    };
    panel.add(rotateScreenButton);
    
    // Rotate Screen button hitbox
    const rotateScreenHitbox = new THREE.Mesh(hitboxGeometry, new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0.0
    }));
    rotateScreenHitbox.position.set(0, -0.045, 0.0005);
    rotateScreenHitbox.userData = { type: 'hitbox', action: 'rotateScreen' };
    panel.add(rotateScreenHitbox);
    
    // Rotate Screen button label
    const rotateButtonCanvas = document.createElement('canvas');
    rotateButtonCanvas.width = 256;
    rotateButtonCanvas.height = 64;
    const rotateBtnCtx = rotateButtonCanvas.getContext('2d');
    rotateBtnCtx.fillStyle = '#ffffff';
    rotateBtnCtx.font = 'bold 22px Arial';
    rotateBtnCtx.textAlign = 'center';
    rotateBtnCtx.textBaseline = 'middle';
    rotateBtnCtx.fillText('Rotate Screen', 128, 32);
    
    const rotateButtonTexture = new THREE.CanvasTexture(rotateButtonCanvas);
    const rotateButtonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: rotateButtonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const rotateButtonLabel = new THREE.Mesh(buttonLabelGeometry, rotateButtonLabelMaterial);
    rotateButtonLabel.position.set(0, -0.045, 0.002);
    panel.add(rotateButtonLabel);
    
    // Toggle Audio button
    const audioButtonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x777777, // Grey when muted
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const audioButton = new THREE.Mesh(buttonGeometry, audioButtonMaterial);
    audioButton.position.set(0, -0.09, 0.001);
    audioButton.userData = { 
        type: 'button',
        action: 'toggleAudio',
        isToggle: true,
        isActive: false
    };
    panel.add(audioButton);
    
    // Audio button hitbox
    const audioButtonHitbox = new THREE.Mesh(hitboxGeometry, new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0.0
    }));
    audioButtonHitbox.position.set(0, -0.09, 0.0005);
    audioButtonHitbox.userData = { type: 'hitbox', action: 'toggleAudio' };
    panel.add(audioButtonHitbox);
    
    // Audio button label
    const audioButtonCanvas = document.createElement('canvas');
    audioButtonCanvas.width = 256;
    audioButtonCanvas.height = 64;
    const audioBtnCtx = audioButtonCanvas.getContext('2d');
    audioBtnCtx.fillStyle = '#ffffff';
    audioBtnCtx.font = 'bold 22px Arial';
    audioBtnCtx.textAlign = 'center';
    audioBtnCtx.textBaseline = 'middle';
    audioBtnCtx.fillText('Unmute Video', 128, 32);
    
    const audioButtonTexture = new THREE.CanvasTexture(audioButtonCanvas);
    const audioButtonLabelMaterial = new THREE.MeshBasicMaterial({ 
        map: audioButtonTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const audioButtonLabel = new THREE.Mesh(buttonLabelGeometry, audioButtonLabelMaterial);
    audioButtonLabel.position.set(0, -0.09, 0.002);
    panel.add(audioButtonLabel);
    
    // Position the control panel in front of the user
    panel.position.set(0, -0.15, -0.5); // Moved forward and slightly down
    panel.rotation.x = -Math.PI / 8; // Tilt slightly up
    panel.userData = { 
        type: 'controlPanel',
        audioLabel: audioButtonLabel, // Store reference to audio label for updating
        isMovable: true // Flag to indicate this panel can be moved
    };
    scene.add(panel);
}

function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.2)) {
    const browserWindow = new THREE.Group();
    
    // Browser background with improved design
    const browserGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const browserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const browserPanel = new THREE.Mesh(browserGeometry, browserMaterial);
    browserWindow.add(browserPanel);
    
    // Create border with improved design
    const borderGeometry = new THREE.PlaneGeometry(0.82, 0.62);
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2196F3, // Blue border
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
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
    
    // Address bar with improved design
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
    urlCtx.fillText(`AR Video Screen ${screens.length + 1}`, 10, 20);
    
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
    
    // Content area with video
    const contentGeometry = new THREE.PlaneGeometry(0.76, 0.46);
    const contentMaterial = new THREE.MeshBasicMaterial({ 
        map: videoTexture,
        side: THREE.DoubleSide
    });
    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.position.y = -0.03;
    contentPanel.position.z = 0.001;
    browserWindow.add(contentPanel);
    
    // Position the window
    browserWindow.position.copy(position);
    browserWindow.userData = { 
        type: 'screen', 
        id: screens.length, 
        isSelected: false,
        content: `Video Screen ${screens.length + 1}`
    };
    
    scene.add(browserWindow);
    screens.push(browserWindow);
    
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
            const screenPos = selectedScreen.position.clone();
            virtualKeyboard.position.set(screenPos.x, screenPos.y - 0.45, screenPos.z + 0.02);
            virtualKeyboard.lookAt(camera.position);
            virtualKeyboard.rotation.x = -Math.PI / 8;
        }
    }
}

function onSelectStart(event) {
    if (isPlacingScreen || isMovingScreen) {
        // We're in placement mode, so select start begins the commitment
        return;
    }
}

function onSelectEnd(event) {
    if (isPlacingScreen && newScreen) {
        // Finalize the placement of the new screen
        isPlacingScreen = false;
        newScreen = null;
        return;
    }
    
    if (isMovingScreen && selectedScreen) {
        // Finalize the movement of the selected screen
        isMovingScreen = false;
        return;
    }
}

function onSelect(event) {
    // Raycast to detect interactive elements
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    if (isPlacingScreen) {
        // Finalize placement of new screen
        isPlacingScreen = false;
        newScreen = null;
        return;
    }
    
    if (isMovingScreen) {
        // Finalize movement of selected screen
        isMovingScreen = false;
        return;
    }
    
    if (isMovingControlPanel) {
        // Finalize movement of control panel
        isMovingControlPanel = false;
        return;
    }
    
    // Check for screen selection
    const screenIntersects = raycaster.intersectObjects(screens.map(screen => screen.children[0])); // Intersect with main panel
    
    if (screenIntersects.length > 0) {
        const selectedObject = screenIntersects[0].object;
        const screen = selectedObject.parent;
        selectScreen(screen);
        return;
    }
    
    // Check for control panel interactions
    const controlPanels = scene.children.filter(obj => obj.userData && obj.userData.type === 'controlPanel');
    
    // First check for panel handle (for moving the panel)
    const panelHandles = [];
    controlPanels.forEach(panel => {
        const handles = panel.children.filter(obj => obj.userData && obj.userData.type === 'panelHandle');
        panelHandles.push(...handles);
    });
    
    const handleIntersects = raycaster.intersectObjects(panelHandles);
    if (handleIntersects.length > 0) {
        const handle = handleIntersects[0].object;
        const panel = handle.parent;
        
        if (panel.userData.isMovable) {
            isMovingControlPanel = true;
            // Visual feedback
            handle.material.color.set(0x5a5a8e); // Highlight color
            setTimeout(() => {
                handle.material.color.set(0x3a3a5e); // Reset color
            }, 200);
        }
        return;
    }
    
    // Check for hitbox interactions (larger invisible areas for better interaction)
    const hitboxes = [];
    controlPanels.forEach(panel => {
        const boxes = panel.children.filter(obj => obj.userData && obj.userData.type === 'hitbox');
        hitboxes.push(...boxes);
    });
    
    const hitboxIntersects = raycaster.intersectObjects(hitboxes);
    if (hitboxIntersects.length > 0) {
        const hitbox = hitboxIntersects[0].object;
        const action = hitbox.userData.action;
        const panel = hitbox.parent;
        
        // Find the actual button that corresponds to this hitbox
        const button = panel.children.find(obj => 
            obj.userData && 
            obj.userData.type === 'button' && 
            obj.userData.action === action
        );
        
        if (!button) return;
        
        // Handle button actions
        if (action === 'newScreen') {
            // Start placing a new screen
            isPlacingScreen = true;
            
            // Create a new screen at controller position + direction
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(controller.matrixWorld);
            const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
            position.addScaledVector(direction, 0.8);
            
            newScreen = createNewBrowserScreen(position);
            
            // Visual feedback for button press
            const originalColor = button.material.color.clone();
            button.material.color.set(0x4CAF50);
            setTimeout(() => {
                button.material.color.copy(originalColor);
            }, 200);
            
            return;
        }
        
        if (action === 'moveScreen') {
            // Toggle move mode
            if (button.userData.isToggle) {
                button.userData.isActive = !button.userData.isActive;
                isMoveModeActive = button.userData.isActive;
                
                // Update button color based on state
                if (button.userData.isActive) {
                    button.material.color.set(0x4CAF50); // Green when active
                    
                    // Deactivate rotate mode if it's active
                    if (isRotateModeActive) {
                        const rotateButtons = scene.children
                            .filter(obj => obj.userData && obj.userData.type === 'controlPanel')
                            .flatMap(panel => panel.children.filter(obj => obj.userData && obj.userData.action === 'rotateScreen'));
                        
                        if (rotateButtons.length > 0) {
                            rotateButtons[0].userData.isActive = false;
                            rotateButtons[0].material.color.set(0x777777); // Grey when inactive
                            isRotateModeActive = false;
                        }
                    }
                    
                    // If a screen is selected, start moving it immediately
                    if (selectedScreen) {
                        isMovingScreen = true;
                    }
                } else {
                    button.material.color.set(0x777777); // Grey when inactive
                    isMovingScreen = false; // Stop any ongoing movement
                }
            }
            
            return;
        }
        
        if (button.userData.action === 'rotateScreen') {
            // Toggle rotate mode
            if (button.userData.isToggle) {
                button.userData.isActive = !button.userData.isActive;
                isRotateModeActive = button.userData.isActive;
                
                // Update button color based on state
                if (button.userData.isActive) {
                    button.material.color.set(0x4CAF50); // Green when active
                    
                    // Deactivate move mode if it's active
                    if (isMoveModeActive) {
                        const moveButtons = scene.children
                            .filter(obj => obj.userData && obj.userData.type === 'controlPanel')
                            .flatMap(panel => panel.children.filter(obj => obj.userData && obj.userData.action === 'moveScreen'));
                        
                        if (moveButtons.length > 0) {
                            moveButtons[0].userData.isActive = false;
                            moveButtons[0].material.color.set(0x777777); // Grey when inactive
                            isMoveModeActive = false;
                            isMovingScreen = false;
                        }
                    }
                } else {
                    button.material.color.set(0x777777); // Grey when inactive
                    isRotating = false; // Stop any ongoing rotation
                }
            }
            
            return;
        }
        
        if (button.userData.action === 'toggleAudio') {
            // Toggle video audio
            isVideoMuted = !isVideoMuted;
            videoElement.muted = isVideoMuted;
            
            // Update button state
            button.userData.isActive = !isVideoMuted;
            
            // Update button color based on state
            if (!isVideoMuted) {
                button.material.color.set(0x4CAF50); // Green when unmuted
            } else {
                button.material.color.set(0x777777); // Grey when muted
            }
            
            // Update button label
            const panel = scene.children.find(obj => obj.userData && obj.userData.type === 'controlPanel');
            if (panel && panel.userData.audioLabel) {
                const labelCanvas = document.createElement('canvas');
                labelCanvas.width = 256;
                labelCanvas.height = 64;
                const labelCtx = labelCanvas.getContext('2d');
                labelCtx.fillStyle = '#ffffff';
                labelCtx.font = 'bold 22px Arial';
                labelCtx.textAlign = 'center';
                labelCtx.textBaseline = 'middle';
                labelCtx.fillText(isVideoMuted ? 'Unmute Video' : 'Mute Video', 128, 32);
                
                const labelTexture = new THREE.CanvasTexture(labelCanvas);
                panel.userData.audioLabel.material.map = labelTexture;
                panel.userData.audioLabel.material.map.needsUpdate = true;
            }
            
            return;
        }
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
    // Update video texture if video is playing
    if (videoElement && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        videoTexture.needsUpdate = true;
    }

    // Handle screen placement or movement with controller
    if ((isPlacingScreen && newScreen) || (isMovingScreen && selectedScreen && !isTouchMoving)) {
        const target = isPlacingScreen ? newScreen : selectedScreen;
        
        // Get controller position and direction
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Set position in front of controller
        const targetPosition = position.clone().addScaledVector(direction, 0.8);
        target.position.copy(targetPosition);
        
        // Make screen face the user
        target.lookAt(camera.position);
    }
    
    // Handle control panel movement
    if (isMovingControlPanel && controlPanel) {
        // Get controller position and direction
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Set position in front of controller, but closer
        const targetPosition = position.clone().addScaledVector(direction, 0.5);
        controlPanel.position.copy(targetPosition);
        
        // Make panel face the user
        controlPanel.lookAt(camera.position);
        // Adjust tilt
        controlPanel.rotation.x -= Math.PI / 8;
    }
    
    // Handle screen rotation with controller
    if (isRotateModeActive && selectedScreen && !isRotating) {
        // Get controller movement
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        // Extract controller orientation
        const controllerDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Apply rotation based on controller movement
        // This is a simple implementation - you might want to refine this
        selectedScreen.rotation.y += controllerDirection.x * rotationSpeed;
        selectedScreen.rotation.x += controllerDirection.y * rotationSpeed;
    }
    
    // Highlight keys when hovered
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

function onTouchStart(event) {
    if (!touchEnabled || !event.touches[0]) return;
    
    event.preventDefault();
    
    // Store initial touch position
    initialTouchPosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    
    // Cast ray from touch position
    raycaster.setFromCamera(initialTouchPosition, camera);
    
    // Check for screen selection
    const screenIntersects = raycaster.intersectObjects(screens.map(screen => screen.children[0]));
    
    if (screenIntersects.length > 0) {
        const selectedObject = screenIntersects[0].object;
        const screen = selectedObject.parent;
        selectScreen(screen);
        
        // Start moving or rotating based on active mode
        if (isMoveModeActive) {
            isTouchMoving = true;
        } else if (isRotateModeActive) {
            isRotating = true;
            // Store initial rotation
            if (selectedScreen) {
                initialRotation.x = selectedScreen.rotation.x;
                initialRotation.y = selectedScreen.rotation.y;
            }
        }
        return;
    }
    
    // Check for control panel handle (for moving the panel)
    const controlPanels = scene.children.filter(obj => obj.userData && obj.userData.type === 'controlPanel');
    const panelHandles = [];
    controlPanels.forEach(panel => {
        const handles = panel.children.filter(obj => obj.userData && obj.userData.type === 'panelHandle');
        panelHandles.push(...handles);
    });
    
    const handleIntersects = raycaster.intersectObjects(panelHandles);
    if (handleIntersects.length > 0) {
        const handle = handleIntersects[0].object;
        const panel = handle.parent;
        
        if (panel.userData.isMovable) {
            isMovingControlPanel = true;
            // Visual feedback
            handle.material.color.set(0x5a5a8e); // Highlight color
        }
        return;
    }
    
    // Check for hitbox interactions
    const hitboxes = [];
    controlPanels.forEach(panel => {
        const boxes = panel.children.filter(obj => obj.userData && obj.userData.type === 'hitbox');
        hitboxes.push(...boxes);
    });
    
    const hitboxIntersects = raycaster.intersectObjects(hitboxes);
    
    if (controlIntersects.length > 0) {
        const button = controlIntersects[0].object;
        
        // Handle button actions
        if (button.userData.action === 'newScreen') {
            // Create a new screen in front of the camera
            const position = new THREE.Vector3(0, 0, -1.2);
            position.applyMatrix4(camera.matrixWorld);
            
            newScreen = createNewBrowserScreen(position);
            
            // Visual feedback for button press
            const originalColor = button.material.color.clone();
            button.material.color.set(0x4CAF50);
            setTimeout(() => {
                button.material.color.copy(originalColor);
            }, 200);
        }
        
        if (button.userData.action === 'moveScreen' && selectedScreen) {
            // Start moving the selected screen
            isMovingScreen = true;
            
            // Visual feedback for button press
            const originalColor = button.material.color.clone();
            button.material.color.set(0x4CAF50);
            setTimeout(() => {
                button.material.color.copy(originalColor);
            }, 200);
            
            return;
        }
        
        if (button.userData.action === 'rotateScreen') {
            // Toggle rotate mode
            if (button.userData.isToggle) {
                button.userData.isActive = !button.userData.isActive;
                isRotateModeActive = button.userData.isActive;
                
                // Update button color based on state
                if (button.userData.isActive) {
                    button.material.color.set(0x4CAF50); // Green when active
                    
                    // Deactivate move mode if it's active
                    if (isMoveModeActive) {
                        const moveButtons = scene.children
                            .filter(obj => obj.userData && obj.userData.type === 'controlPanel')
                            .flatMap(panel => panel.children.filter(obj => obj.userData && obj.userData.action === 'moveScreen'));
                        
                        if (moveButtons.length > 0) {
                            moveButtons[0].userData.isActive = false;
                            moveButtons[0].material.color.set(0x777777); // Grey when inactive
                            isMoveModeActive = false;
                            isMovingScreen = false;
                        }
                    }
                } else {
                    button.material.color.set(0x777777); // Grey when inactive
                    isRotating = false; // Stop any ongoing rotation
                }
            }
            
            return;
        }
        
        if (button.userData.action === 'toggleAudio') {
            // Toggle video audio
            isVideoMuted = !isVideoMuted;
            videoElement.muted = isVideoMuted;
            
            // Update button state
            button.userData.isActive = !isVideoMuted;
            
            // Update button color based on state
            if (!isVideoMuted) {
                button.material.color.set(0x4CAF50); // Green when unmuted
            } else {
                button.material.color.set(0x777777); // Grey when muted
            }
            
            // Update button label
            const panel = scene.children.find(obj => obj.userData && obj.userData.type === 'controlPanel');
            if (panel && panel.userData.audioLabel) {
                const labelCanvas = document.createElement('canvas');
                labelCanvas.width = 256;
                labelCanvas.height = 64;
                const labelCtx = labelCanvas.getContext('2d');
                labelCtx.fillStyle = '#ffffff';
                labelCtx.font = 'bold 22px Arial';
                labelCtx.textAlign = 'center';
                labelCtx.textBaseline = 'middle';
                labelCtx.fillText(isVideoMuted ? 'Unmute Video' : 'Mute Video', 128, 32);
                
                const labelTexture = new THREE.CanvasTexture(labelCanvas);
                panel.userData.audioLabel.material.map = labelTexture;
                panel.userData.audioLabel.material.map.needsUpdate = true;
            }
        }
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
    
    // Calculate movement delta
    const deltaX = currentTouchPosition.x - initialTouchPosition.x;
    const deltaY = currentTouchPosition.y - initialTouchPosition.y;
    
    // Update screen position if we're moving a screen with touch
    if (isTouchMoving && selectedScreen) {
        // Scale the movement to make it more natural
        const movementScale = 2.0;
        selectedScreen.position.x += deltaX * movementScale;
        selectedScreen.position.y += deltaY * movementScale;
    }
    
    // Update control panel position if we're moving it
    if (isMovingControlPanel && controlPanel) {
        // Scale the movement to make it more natural
        const movementScale = 1.5;
        controlPanel.position.x += deltaX * movementScale;
        controlPanel.position.y += deltaY * movementScale;
    }
    
    // Update screen rotation if we're rotating a screen with touch
    if (isRotating && selectedScreen) {
        // Scale the rotation to make it more natural
        const rotationScale = 2.0;
        selectedScreen.rotation.y += deltaX * rotationScale;
        selectedScreen.rotation.x += deltaY * rotationScale;
    }
    
    // Update initial position for next move
    initialTouchPosition.copy(currentTouchPosition);
}

function onTouchEnd(event) {
    isTouchMoving = false;
    isRotating = false;
    isMovingControlPanel = false;
    
    // Reset panel handle color if we were moving a panel
    if (controlPanel) {
        const handle = controlPanel.children.find(obj => obj.userData && obj.userData.type === 'panelHandle');
        if (handle) {
            handle.material.color.set(0x3a3a5e);
        }
    }
}