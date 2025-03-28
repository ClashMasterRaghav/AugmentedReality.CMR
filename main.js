import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.158.0/examples/jsm/webxr/ARButton.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { DeviceOrientationControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/DeviceOrientationControls.js';
import { XRControllerModelFactory } from 'https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js';
import { VRButton } from 'https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js';
import { TrackballControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/TrackballControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/FBXLoader.js';
import { EffectComposer } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js';
import { CSS3DRenderer } from 'https://unpkg.com/three@0.158.0/examples/jsm/renderers/CSS3DRenderer.js';

// Debug logger
function debug(message) {
    console.log(message);
    const debugElement = document.getElementById('info');
    if (debugElement) {
        debugElement.textContent = message;
    }
}

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

debug("Starting initialization...");

try {
    init();
    animate();
} catch (error) {
    debug("Error during initialization: " + error.message);
    console.error(error);
}

function init() {
    debug("Creating scene and camera...");
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    debug("Adding lights...");
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    debug("Setting up renderer...");
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    debug("Creating AR button...");
    try {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
                if (supported) {
                    debug("AR is supported! Creating AR button...");
                    
                    const arButton = ARButton.createButton(renderer, {
                        requiredFeatures: ['hit-test'],
                        optionalFeatures: ['dom-overlay'],
                        domOverlay: { root: document.body }
                    });
                    document.body.appendChild(arButton);
                    
                    debug("AR button created. Click it to start AR session.");
                } else {
                    debug("AR is NOT supported on this device or browser!");
                }
            }).catch(err => {
                debug("Error checking AR support: " + err.message);
            });
        } else {
            debug("WebXR not available in this browser");
        }
    } catch (error) {
        debug("Error setting up AR: " + error.message);
    }

    debug("Creating reticle...");
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    debug("Setting up controller...");
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    debug("Setting up Add Window button...");
    document.getElementById('addWindowButton').addEventListener('click', function() {
        debug("Add Window button clicked");
        // Add test window even if reticle isn't visible (for debugging)
        createTestWindow();
    });

    debug("Adding resize listener...");
    window.addEventListener('resize', onWindowResize);
    
    // Add a test cube to verify rendering is working
    debug("Adding test cube...");
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    cube.position.set(0, 0, -1);
    scene.add(cube);
    
    debug("Initialization complete!");
}

function createTestWindow() {
    // This function creates a window in front of the camera
    // even if AR isn't working, for testing purposes
    windowCount++;
    const contentType = windowContents[windowCount % windowContents.length];
    
    debug("Creating test window " + windowCount);
    
    const windowTexture = createCanvasTexture(contentType);
    const windowMaterial = new THREE.MeshBasicMaterial({ map: windowTexture, side: THREE.DoubleSide });
    const windowGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    
    // Place window in front of camera
    windowMesh.position.set(0, 0, -1);
    
    scene.add(windowMesh);
    debug("Test window created at position: " + JSON.stringify(windowMesh.position));
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
    
    debug("Creating window " + windowCount);
    
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
    debug("Window created at position: " + JSON.stringify(windowMesh.position));
}

function onSelect() {
    debug("Select event triggered");
    if (reticle.visible) {
        createWindow();
    } else {
        debug("Reticle not visible - can't place window");
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
        
        // Only do hit test if in an AR session
        if (renderer.xr.isPresenting) {
            updateHitTest();
        }
    });
}

function updateHitTest() {
    // Check if session exists and hit test source is needed
    const session = renderer.xr.getSession();
    
    if (session && hitTestSourceRequested === false) {
        session.requestReferenceSpace('viewer').then(function(referenceSpace) {
            session.requestHitTestSource({ space: referenceSpace }).then(function(source) {
                hitTestSource = source;
                debug("Hit test source created");
            }).catch(err => {
                debug("Error creating hit test source: " + err.message);
            });
        }).catch(err => {
            debug("Error requesting reference space: " + err.message);
        });
        
        session.addEventListener('end', function() {
            debug("AR session ended");
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
                debug("Surface detected");
            } else {
                reticle.visible = false;
                debug("No surface detected");
            }
        }).catch(err => {
            debug("Error getting hit test results: " + err.message);
        });
    }
}
