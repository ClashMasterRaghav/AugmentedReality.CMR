import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

let camera, scene, renderer;
let controller, controllerGrip;
let browserWindow, virtualKeyboard;
let font;
let raycaster = new THREE.Raycaster();
let workingMatrix = new THREE.Matrix4();
let selectedKey = null;

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
        // Create browser UI once font is loaded
        createBrowserWindow();
        createVirtualKeyboard();
    });

    // Create browser and keyboard without waiting for font
    // We'll update them with text when the font loads
    createBrowserWindow();
    createVirtualKeyboard();

    // Controller setup
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
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

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
}

function createBrowserWindow() {
    browserWindow = new THREE.Group();
    
    // Browser background
    const browserGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const browserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const browserPanel = new THREE.Mesh(browserGeometry, browserMaterial);
    browserWindow.add(browserPanel);
    
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
    
    // Add url text using canvas texture instead of TextGeometry
    const urlCanvas = document.createElement('canvas');
    urlCanvas.width = 380;
    urlCanvas.height = 30;
    const urlCtx = urlCanvas.getContext('2d');
    urlCtx.fillStyle = '#000000';
    urlCtx.font = '20px Arial';
    urlCtx.fillText('example.com', 10, 20);
    
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
    const texture = createBrowserContentTexture();
    const contentMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide
    });
    const contentPanel = new THREE.Mesh(contentGeometry, contentMaterial);
    contentPanel.position.y = -0.03;
    contentPanel.position.z = 0.001;
    browserWindow.add(contentPanel);
    
    // Position the window in front of the user - moved closer
    browserWindow.position.set(0, 0, -0.8);
    scene.add(browserWindow);
}

function createBrowserContentTexture() {
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
    ctx.fillText('Immersive AR Browser', 20, 50);
    
    // Draw content
    ctx.font = '20px Arial';
    ctx.fillText('This is a demonstration of an AR-based web browsing experience.', 20, 100);
    ctx.fillText('In a full implementation, this would render actual web content.', 20, 130);
    
    // Draw feature box
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(20, 180, 720, 200);
    
    ctx.fillStyle = '#000000';
    ctx.font = '24px Arial';
    ctx.fillText('Features to implement:', 40, 210);
    
    ctx.font = '18px Arial';
    ctx.fillText('• Real web content rendering', 40, 250);
    ctx.fillText('• Interaction with links and forms', 40, 280);
    ctx.fillText('• Multiple browser windows', 40, 310);
    ctx.fillText('• Spatial arrangements', 40, 340);
    
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
    virtualKeyboard.userData = { keys: keys };
    
    // Position the keyboard below the browser window and bring it forward
    virtualKeyboard.position.set(0, -0.45, -0.78); // Moved forward, less embedded in screen
    virtualKeyboard.rotation.x = -Math.PI / 8; // Reduced angle for better visibility
    scene.add(virtualKeyboard);
}

function onSelect(event) {
    // Raycast to detect interactive elements
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Check for keyboard key intersections
    if (virtualKeyboard && virtualKeyboard.userData.keys) {
        const intersects = raycaster.intersectObjects(virtualKeyboard.userData.keys);
        
        if (intersects.length > 0) {
            const key = intersects[0].object;
            console.log(`Key pressed: ${key.userData.key}`);
            
            // Visual feedback on key press
            const flashColor = new THREE.Color(0x00ff00);
            const originalColor = key.userData.originalMaterial.color.clone();
            
            key.material.color.copy(flashColor);
            
            // Reset color after brief flash
            setTimeout(() => {
                key.material.color.copy(originalColor);
            }, 200);
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
    // Update browser position to follow user if needed
    
    // Highlight keys when hovered
    if (controller && virtualKeyboard && virtualKeyboard.userData.keys) {
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
    
    renderer.render(scene, camera);
}