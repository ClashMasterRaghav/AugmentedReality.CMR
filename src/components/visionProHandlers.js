// visionProHandlers.js - Apple Vision Pro hand tracking and gesture support
import * as THREE from 'three';

// Hand tracking state
let isHandTrackingEnabled = false;
let leftHand = null;
let rightHand = null;
let scene = null;
let camera = null;
let renderer = null;

// Hand gesture detection
const gestures = {
    pinch: { active: false, startTime: 0, duration: 0 },
    spread: { active: false, startTime: 0, duration: 0 },
    fist: { active: false, startTime: 0, duration: 0 },
    point: { active: false, startTime: 0, duration: 0 },
    wave: { active: false, startTime: 0, duration: 0 }
};

// Initialize Vision Pro hand tracking
export function appleVisionProHandTracking(sceneRef, cameraRef, rendererRef) {
    scene = sceneRef;
    camera = cameraRef;
    renderer = rendererRef;
    
    // Check if running on Apple Vision Pro / visionOS
    const isVisionOS = checkForVisionOS();
    
    if (!isVisionOS) {
        console.log("Not running on visionOS - hand tracking features disabled");
        return false;
    }
    
    console.log("Initializing Apple Vision Pro hand tracking");
    
    try {
        // Check for hand tracking support in WebXR
        setupHandTracking();
        return true;
    } catch (error) {
        console.error("Error initializing hand tracking:", error);
        return false;
    }
}

// Check if running on visionOS
function checkForVisionOS() {
    // Check for visionOS user agent
    const isVisionOS = /visionOS/.test(navigator.userAgent) || 
                      (/AppleWebKit/.test(navigator.userAgent) && /AppleVision/.test(navigator.userAgent));
    
    // For development, enable for Safari or Chrome if needed
    const forceDev = false; // Set to true to test hand features on desktop browsers
    
    return isVisionOS || forceDev;
}

// Set up hand tracking using WebXR
function setupHandTracking() {
    if (!renderer || !renderer.xr) {
        console.error("WebXR not initialized");
        return;
    }
    
    // Try to use the WebXR Hand Input module if available
    if ('XRHand' in window) {
        isHandTrackingEnabled = true;
        
        console.log("WebXR Hand Input API available");
        
        // Create visual representations for hands
        createHandVisualizers();
        
        // Set up hand tracking session
        const sessionInit = {
            requiredFeatures: ['hand-tracking'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        };
        
        // Listen for XR session to update hand data
        renderer.xr.addEventListener('sessionstart', () => {
            const session = renderer.xr.getSession();
            
            // Set up reference spaces
            session.requestReferenceSpace('local').then(refSpace => {
                // Set up hand tracking
                setupHandTrackingInSession(session, refSpace);
            });
        });
        
        // Show notification about hand tracking
        showHandTrackingNotification();
    } else {
        console.log("WebXR Hand Input API not available");
        
        // Fall back to basic controller input
        setupBasicVisionProInput();
    }
}

// Set up hand tracking in XR session
function setupHandTrackingInSession(session, refSpace) {
    // Check for hand input sources
    session.addEventListener('inputsourceschange', event => {
        for (let source of event.added) {
            if (source.hand) {
                console.log("Hand input source detected:", source.handedness);
                
                if (source.handedness === 'left') {
                    leftHand = source;
                } else if (source.handedness === 'right') {
                    rightHand = source;
                }
            }
        }
        
        for (let source of event.removed) {
            if (source.hand) {
                console.log("Hand input source removed:", source.handedness);
                
                if (source.handedness === 'left') {
                    leftHand = null;
                } else if (source.handedness === 'right') {
                    rightHand = null;
                }
            }
        }
    });
    
    // Set up frame handler for hand tracking
    session.requestAnimationFrame((time, frame) => {
        handleHandTracking(time, frame, refSpace);
    });
}

// Handle hand tracking data each frame
function handleHandTracking(time, frame, refSpace) {
    const session = frame.session;
    
    // Request next frame
    session.requestAnimationFrame((newTime, newFrame) => {
        handleHandTracking(newTime, newFrame, refSpace);
    });
    
    // Process hand input
    if (leftHand) {
        processHandInput(leftHand, 'left', frame, refSpace);
    }
    
    if (rightHand) {
        processHandInput(rightHand, 'right', frame, refSpace);
    }
}

// Process hand input data
function processHandInput(hand, handedness, frame, refSpace) {
    // Get hand data
    const handData = frame.getJointPose(hand.hand.WRIST, refSpace);
    
    if (!handData) return;
    
    // Update hand visualizer position
    updateHandVisualizer(handedness, handData);
    
    // Detect gestures
    const gesture = detectGesture(hand, frame, refSpace);
    
    if (gesture) {
        // Trigger appropriate action based on gesture
        handleGesture(gesture, handedness, handData.transform.position);
    }
}

// Create visual representations for hands
function createHandVisualizers() {
    // Create hand visualizer meshes
    const leftHandGroup = new THREE.Group();
    leftHandGroup.name = 'leftHand';
    leftHandGroup.visible = false;
    scene.add(leftHandGroup);
    
    const rightHandGroup = new THREE.Group();
    rightHandGroup.name = 'rightHand';
    rightHandGroup.visible = false;
    scene.add(rightHandGroup);
    
    // Create joint markers for each hand
    createJointMarkers(leftHandGroup, 0x6666ff); // Blue for left hand
    createJointMarkers(rightHandGroup, 0xff6666); // Red for right hand
}

// Create joint markers for hand visualization
function createJointMarkers(handGroup, color) {
    // Create markers for main joints
    const joints = ['wrist', 'thumb', 'index', 'middle', 'ring', 'pinky'];
    
    for (let joint of joints) {
        const geometry = new THREE.SphereGeometry(0.01, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.name = joint;
        handGroup.add(marker);
    }
    
    // Create connections between joints
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5
    });
    
    const lines = new THREE.Line(lineGeometry, lineMaterial);
    lines.name = 'connections';
    handGroup.add(lines);
}

// Update hand visualizer with new position data
function updateHandVisualizer(handedness, handData) {
    const handGroup = scene.getObjectByName(handedness + 'Hand');
    
    if (!handGroup) return;
    
    // Make hand visible when we have data
    handGroup.visible = true;
    
    // Update wrist position
    const wrist = handGroup.getObjectByName('wrist');
    if (wrist && handData) {
        const position = handData.transform.position;
        wrist.position.set(position.x, position.y, position.z);
    }
    
    // Update other joint positions would go here if we had full joint data
    // For now, just position the hand at the wrist
}

// Detect hand gestures
function detectGesture(hand, frame, refSpace) {
    // This is a simplified version - actual implementation would need joint positions
    // to accurately detect gestures
    
    // For now, return a null gesture
    return null;
}

// Handle detected gestures
function handleGesture(gesture, handedness, position) {
    switch(gesture) {
        case 'pinch':
            console.log(`${handedness} hand pinch gesture detected`);
            // Trigger selection event similar to controller select
            break;
            
        case 'spread':
            console.log(`${handedness} hand spread gesture detected`);
            // Could be used for menu opening
            break;
            
        case 'fist':
            console.log(`${handedness} hand fist gesture detected`);
            // Could be used for grabbing objects
            break;
            
        case 'point':
            console.log(`${handedness} hand point gesture detected`);
            // Could be used for raycasting/pointing
            break;
            
        case 'wave':
            console.log(`${handedness} hand wave gesture detected`);
            // Could be used for dismissing UI elements
            break;
    }
}

// Fallback for devices that support visionOS but not full hand tracking
function setupBasicVisionProInput() {
    console.log("Setting up basic Vision Pro input (no hand tracking)");
    
    // Use eye tracking if available
    if (window.XREyeTracking) {
        console.log("Eye tracking available");
        setupEyeTracking();
    }
    
    // Fall back to standard controller input
    // which is already handled by the main interaction system
}

// Set up eye tracking if available
function setupEyeTracking() {
    // This would be implemented if the visionOS WebXR API exposes eye tracking
    // Currently placeholder for future implementation
}

// Show notification about hand tracking status
function showHandTrackingNotification() {
    // Create notification
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    if (isHandTrackingEnabled) {
        notification.textContent = "Vision Pro hand tracking enabled";
        notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
    } else {
        notification.textContent = "Vision Pro hand tracking not available";
        notification.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
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