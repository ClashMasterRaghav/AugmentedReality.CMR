import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.158.0/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let controller;
let reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;
let windowCount = 0;

// Array of window content options
const windowContents = [
    {
        name: "Calendar",
        color: "#4285F4",
        icon: "📅"
    },
    {
        name: "Email",
        color: "#DB4437",
        icon: "📧"
    },
    {
        name: "Notes",
        color: "#F4B400",
        icon: "📝"
    },
    {
        name: "Browser",
        color: "#0F9D58",
        icon: "🌐"
    }
];

init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Add lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Add directional light for better visibility
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.setAnimationLoop(animate);
    container.appendChild(renderer.domElement);

    // Add AR button
    const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    });
    document.body.appendChild(arButton);

    // Create reticle for placement
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Controller setup
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Add window button
    document.getElementById('addWindowButton').addEventListener('click', function() {
        if (reticle.visible) {
            createWindow();
        }
    });

    window.addEventListener('resize', onWindowResize);
}

function createCanvasTexture(content) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const context = canvas.getContext('2d');

    // Window background
    context.fillStyle = content.color;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Window titlebar
    context.fillStyle = '#333333';
    context.fillRect(0, 0, canvas.width, 40);
    
    // Close button
    context.fillStyle = '#ff5555';
    context.beginPath();
    context.arc(20, 20, 10, 0, Math.PI * 2);
    context.fill();
    
    // Minimize button
    context.fillStyle = '#ffbb33';
    context.beginPath();
    context.arc(50, 20, 10, 0, Math.PI * 2);
    context.fill();
    
    // Maximize button
    context.fillStyle = '#55cc55';
    context.beginPath();
    context.arc(80, 20, 10, 0, Math.PI * 2);
    context.fill();

    // Window title
    context.fillStyle = 'white';
    context.font = 'bold 24px Arial';
    context.fillText(content.name, 100, 28);

    // Window content
    context.fillStyle = 'white';
    context.font = 'bold 120px Arial';
    context.textAlign = 'center';
    context.fillText(content.icon, canvas.width / 2, canvas.height / 2 + 40);

    // Add some text content
    context.font = '24px Arial';
    context.fillText(`${content.name} Content`, canvas.width / 2, canvas.height - 80);
    
    return new THREE.CanvasTexture(canvas);
}

function createWindow() {
    windowCount++;
    const contentType = windowContents[windowCount % windowContents.length];
    
    // Create window
    const windowTexture = createCanvasTexture(contentType);
    const windowMaterial = new THREE.MeshBasicMaterial({ map: windowTexture, side: THREE.DoubleSide });
    
    // Create window with 4:3 aspect ratio
    const windowGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    
    // Position the window at the reticle location
    windowMesh.position.setFromMatrixPosition(reticle.matrix);
    
    // Add a small vertical offset to make it at eye level
    windowMesh.position.y += 0.3;
    
    // Orient the window to face the user but stay upright
    const lookAtPoint = new THREE.Vector3();
    lookAtPoint.setFromMatrixPosition(camera.matrixWorld);
    lookAtPoint.y = windowMesh.position.y; // Keep it upright
    windowMesh.lookAt(lookAtPoint);
    
    scene.add(windowMesh);
    
    // Add window frame
    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const frameGeometry = new THREE.BoxGeometry(0.84, 0.64, 0.02);
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.copy(windowMesh.position);
    frameMesh.position.z -= 0.01; // Place slightly behind window
    frameMesh.quaternion.copy(windowMesh.quaternion);
    scene.add(frameMesh);
    
    console.log(`Window ${windowCount} created at position:`, windowMesh.position);
}

function onSelect() {
    if (reticle.visible) {
        createWindow();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.render(scene, camera);
    
    // Only do hit test if in an AR session
    if (renderer.xr.isPresenting) {
        updateHitTest();
    }
}

function updateHitTest() {
    // Check if session exists and hit test source is needed
    const session = renderer.xr.getSession();
    
    if (session && hitTestSourceRequested === false) {
        session.requestReferenceSpace('viewer').then(function(referenceSpace) {
            session.requestHitTestSource({ space: referenceSpace }).then(function(source) {
                hitTestSource = source;
            });
        });
        
        session.addEventListener('end', function() {
            hitTestSourceRequested = false;
            hitTestSource = null;
        });
        
        hitTestSourceRequested = true;
    }
    
    // If hit test source exists, perform hit test
    if (hitTestSource) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        hitTestSource.getHitTestResults(referenceSpace).then(function(results) {
            if (results.length) {
                const hit = results[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
            } else {
                reticle.visible = false;
            }
        });
    }
}
