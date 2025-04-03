// Main AR application entry point
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { initCSS3DRenderer, updateCSS3DRenderer, createNewBrowserScreen, createYouTubeScreen } from './core/ar_screens.js';
import { showNotification } from './core/ar_utils.js';
import { updateMedia } from './core/ar_media.js';
import { createControlPanel } from './core/ar_ui.js';

let container;
let camera, scene, renderer;
let controller;

// Frame counter for optimizing updates
let frameCount = 0;

init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create scene
    scene = new THREE.Scene();
    
    // Make scene available globally
    window.scene = scene;

    // Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.position.set(0, 1.6, 0); // Set at eye level
    window.camera = camera;

    // Add lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Initialize renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    window.renderer = renderer;

    // CSS3D renderer for web content
    initCSS3DRenderer();

    // Add a red debug sphere to confirm scene visibility
    const debugSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    debugSphere.position.set(0, 0, -1);
    scene.add(debugSphere);
    console.log("Added debug sphere to scene");

    // Create AR button - kept simple and standard
    document.body.appendChild(
        ARButton.createButton(renderer, {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.getElementById('ui-container') || document.body }
        })
    );

    // Controller
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Session events
    renderer.xr.addEventListener('sessionstart', () => {
        console.log("XR session started");
        showNotification("AR session started. Tap to place objects.", "success");
        
        // Create control panel on session start
        setTimeout(() => {
            try {
                const panel = createControlPanel();
                console.log("Created control panel:", panel);
                
                // Create screen right away
                const screen = createNewBrowserScreen();
                if (screen) {
                    // Position directly in front of camera
                    const cameraDirection = new THREE.Vector3(0, 0, -1);
                    cameraDirection.applyQuaternion(camera.quaternion);
                    
                    const screenPosition = camera.position.clone().add(
                        cameraDirection.multiplyScalar(2.3)
                    );
                    
                    screen.position.copy(screenPosition);
                    screen.lookAt(camera.position);
                    console.log("Created test screen at:", screenPosition);
                }
            } catch (error) {
                console.error("Error in session start:", error);
            }
        }, 1000);
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function onSelect() {
    // Create a screen at a fixed position in the world space, rather than attached to controller
    try {
        // Get camera position for reference, but don't position screens relative to it
        const cameraPosition = camera.position.clone();
        
        // Generate a fixed position in front of where the user is looking
        // But far enough away to be visible
        const screenPosition = new THREE.Vector3(
            // Add some randomness to x-position so screens don't all stack
            THREE.MathUtils.randFloat(-1, 1),
            // Position at roughly eye level
            THREE.MathUtils.randFloat(-0.5, 0.5),
            // Fixed distance in front
            -3
        );
        
        console.log("Creating screen at fixed position:", screenPosition);
        
        // Create a YouTube screen at the fixed position
        const videoId = 'dQw4w9WgXcQ'; // Rick Roll
        const testScreen = createYouTubeScreen(videoId, screenPosition);
        
        // Make sure it doesn't follow the camera
        if (testScreen.userData) {
            testScreen.userData.fixedPosition = true;
        }
        
        // Add a red marker sphere to show where the screen was placed
        const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(screenPosition);
        scene.add(marker);
        
        showNotification("Screen created at fixed position", "success");
    } catch (error) {
        console.error("Error creating screen:", error);
        showNotification("Failed to create screen: " + error.message, "error");
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
    frameCount++;
    
    // Update CSS3D renderer
    updateCSS3DRenderer();
    
    // Update media
    if (frameCount % 2 === 0) {
        try {
            updateMedia();
        } catch (error) {
            // Silent fail
        }
    }
    
    renderer.render(scene, camera);
}

// Export items needed by other modules
export { scene, camera, renderer, controller }; 