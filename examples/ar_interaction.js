// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { screens, selectScreen, updateKeyboardPosition, createNewBrowserScreen } from './ar_screens.js';
import { virtualKeyboard, showNotification, toggleModeButton, controlPanel } from './ar_ui.js';
import { videoElement, duration } from './ar_media.js';

// Touch interaction variables
let touchEnabled = true;
let initialTouchPosition = new THREE.Vector2();
let currentTouchPosition = new THREE.Vector2();
let isTouchMovingScreen = false;
let isRotatingScreen = false;
let lastTapTime = 0;
let screenOffset = new THREE.Vector3();
let initialRotation = new THREE.Euler();
let initialMousePosition = new THREE.Vector2();
// Multi-touch variables
let initialPinchDistance = 0;
let initialScale = new THREE.Vector3(1, 1, 1);
let isPinching = false;

// Variables for drag handle functionality
let isDraggingHandle = false;
let draggedScreen = null;
let dragOffset = new THREE.Vector3();

// Import necessary video functions
let videoControlFunctions = {
    togglePlayback: null,
    toggleMute: null
};

// Setup event listeners
export function setupEventListeners() {
    // Controller events
    controller.addEventListener('select', onSelect);
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    
    // Touch events
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);
}

// Handle controller selection start
function onSelectStart(event) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Check for button intersections
    const buttons = findAllButtons();
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
        // Visual feedback for button press
        const buttonObj = getButtonFromIntersect(buttonIntersects[0].object);
        if (buttonObj) {
            const originalColor = buttonObj.material.color.clone();
            buttonObj.material.color.set(0x4FC3F7); // Highlight color
            setTimeout(() => {
                buttonObj.material.color.copy(originalColor);
            }, 200);
        }
    }
}

// Get button object from potentially nested mesh
function getButtonFromIntersect(object) {
    // If we hit the button directly
    if (object.userData && object.userData.type === 'button') {
        return object;
    }
    
    // If we hit a child of a button (like the icon)
    if (object.parent && object.parent.userData && object.parent.userData.type === 'button') {
        return object.parent;
    }
    
    // If we hit a grandchild of a button
    if (object.parent && object.parent.parent && 
        object.parent.parent.userData && 
        object.parent.parent.userData.type === 'button') {
        return object.parent.parent;
    }
    
    return null;
}

// Handle controller selection end
function onSelectEnd(event) {
    if (isPlacingScreen && newScreen) {
        // Finalize the placement of the new screen
        isPlacingScreen = false;
        newScreen = null;
        console.log("Screen placed successfully");
        return;
    }
}

// Handle controller selection
function onSelect(event) {
    // Raycast to detect interactive elements
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // First, check for button interactions
    const buttons = findAllButtons();
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
        const buttonObj = getButtonFromIntersect(buttonIntersects[0].object);
        if (buttonObj) {
            handleButtonAction(buttonObj);
            return;
        }
    }
    
    // Then check for screen selection
    const screenIntersects = raycaster.intersectObjects(screens, true);
    
    if (screenIntersects.length > 0) {
        const screenObj = getScreenFromIntersect(screenIntersects[0].object);
        if (screenObj) {
            selectScreen(screenObj);
            
            // If in move mode, start moving
            if (isMoveModeActive) {
                isTouchMovingScreen = true;
            }
            
            // If in rotate mode, start rotating
            if (isRotateModeActive) {
                isRotatingScreen = true;
                initialRotation.copy(screenObj.rotation);
            }
        }
    }
}

// Get screen object from potentially nested mesh
function getScreenFromIntersect(object) {
    if (!object) {
        console.log("getScreenFromIntersect: No object provided");
        return null;
    }
    
    console.log("getScreenFromIntersect: Checking object", object.uuid);
    console.log("Object userData:", object.userData ? JSON.stringify(object.userData) : "none");
    
    // First check if we hit the interaction plane
    if (object.userData && object.userData.type === 'interactionPlane' && object.userData.screen) {
        console.log("Found interaction plane with screen reference");
        return object.userData.screen;
    }
    
    // If we hit the screen directly
    if (object.userData && object.userData.type === 'screen') {
        console.log("Found screen directly");
        return object;
    }
    
    // Find parent screen by walking up the hierarchy
    let parent = object.parent;
    let depth = 0;
    
    while (parent && depth < 5) { // Limit depth to avoid infinite loops
        depth++;
        console.log("Checking parent at depth", depth, parent.uuid);
        console.log("Parent userData:", parent.userData ? JSON.stringify(parent.userData) : "none");
        
        if (parent.userData && parent.userData.type === 'screen') {
            console.log("Found screen at parent level", depth);
            return parent;
        }
        if (parent.userData && parent.userData.type === 'interactionPlane' && parent.userData.screen) {
            console.log("Found interaction plane at parent level", depth);
            return parent.userData.screen;
        }
        parent = parent.parent;
    }
    
    // Last resort - check if this is one of the screen objects in our array
    for (let i = 0; i < screens.length; i++) {
        if (screens[i].uuid === object.uuid) {
            console.log("Found screen by matching UUID in screens array");
            return screens[i];
        }
    }
    
    console.log("No screen found from intersection");
    return null;
}

// Handle button actions
function handleButtonAction(button) {
    if (!button || !button.userData) return;
    
    console.log("Button action:", button.userData.action);
    
    const action = button.userData.action;
    let screen = null;
    
    // Find associated screen
    if (button.userData.screen) {
        screen = button.userData.screen;
    } else if (selectedScreen) {
        screen = selectedScreen;
    }
    
    // Play/pause button
    if (action === 'playButton' && screen) {
        // Check if video control function exists
        if (videoControlFunctions.togglePlayback) {
            // Toggle playback
            videoControlFunctions.togglePlayback();
            console.log("Toggle video playback");
            
            // Visual feedback
            const iconMesh = button.children[0];
            if (iconMesh) {
                // Apply a quick scale animation
                iconMesh.scale.set(1.2, 1.2, 1.2);
                setTimeout(() => {
                    iconMesh.scale.set(1, 1, 1);
                }, 150);
            }
            
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        } else {
            console.error("Video playback function not found");
        }
    }
    // Volume/mute button
    else if (action === 'volumeButton' && screen) {
        // Check if mute function exists
        if (videoControlFunctions.toggleMute) {
            // Toggle mute
            videoControlFunctions.toggleMute();
            console.log("Toggle video mute");
            
            // Visual feedback
            const iconMesh = button.children[0];
            if (iconMesh) {
                // Apply a quick scale animation
                iconMesh.scale.set(1.2, 1.2, 1.2);
                setTimeout(() => {
                    iconMesh.scale.set(1, 1, 1);
                }, 150);
            }
            
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        } else {
            console.error("Video mute function not found");
        }
    }
    
    // Original functionality for other buttons
    else if (action === 'createScreen') {
        createNewScreen();
    } else if (action === 'moveScreen') {
        toggleMoveMode(button);
    } else if (action === 'rotateScreen') {
        toggleRotateMode(button);
    } else if (action === 'newScreen') {
        createNewScreen();
    }
}

// Create a new screen
function createNewScreen() {
    // Create a new screen in front of the user's view
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromQuaternion(camera.quaternion);
    
    const position = new THREE.Vector3(0, 0, -1.0);
    position.applyMatrix4(matrix);
    position.add(camera.position);
    
    // Create the new screen
    const newScreen = createNewBrowserScreen(position);
    console.log("New screen created!");
    
    // Make it face the user
    newScreen.lookAt(camera.position);
}

// Toggle move mode
function toggleMoveMode(button) {
    isMoveModeActive = !isMoveModeActive;
    
    // Update button color based on active state
    button.material.color.set(isMoveModeActive ? 
        button.userData.activeColor || 0x44cc88 : 
        button.userData.inactiveColor || 0x777777);
    
    // Store the button state directly in the userData
    button.userData.isActive = isMoveModeActive;
    
    // Deactivate rotate mode if move is active
    if (isMoveModeActive) {
        isRotateModeActive = false;
        
        // Find and update rotate button
        const rotateButton = findButtonByAction('rotateScreen');
        if (rotateButton) {
            rotateButton.material.color.set(rotateButton.userData.inactiveColor || 0x777777);
            rotateButton.userData.isActive = false;
        }
    }
    
    // Update control panel state in UI module (if available)
    if (typeof toggleModeButton === 'function') {
        toggleModeButton('move');
    }
    
    // Visual feedback for mode change
    createModeChangeIndicator(isMoveModeActive ? 'Move Mode Activated' : 'Move Mode Deactivated');
    
    console.log("Move mode:", isMoveModeActive ? "activated" : "deactivated");
}

// Toggle rotate mode
function toggleRotateMode(button) {
    isRotateModeActive = !isRotateModeActive;
    
    // Update button color based on active state
    button.material.color.set(isRotateModeActive ? 
        button.userData.activeColor || 0xf39c12 : 
        button.userData.inactiveColor || 0x777777);
    
    // Store the button state directly in the userData
    button.userData.isActive = isRotateModeActive;
    
    // Deactivate move mode if rotate is active
    if (isRotateModeActive) {
        isMoveModeActive = false;
        
        // Find and update move button
        const moveButton = findButtonByAction('moveScreen');
        if (moveButton) {
            moveButton.material.color.set(moveButton.userData.inactiveColor || 0x777777);
            moveButton.userData.isActive = false;
        }
    }
    
    // Update control panel state in UI module (if available)
    if (typeof toggleModeButton === 'function') {
        toggleModeButton('rotate');
    }
    
    // Visual feedback for mode change
    createModeChangeIndicator(isRotateModeActive ? 'Rotate Mode Activated' : 'Rotate Mode Deactivated');
    
    console.log("Rotate mode:", isRotateModeActive ? "activated" : "deactivated");
}

// Toggle resize for a screen
function toggleResize(screen) {
    if (!screen) return;
    
    // Check current scale
    const currentScale = screen.scale.x;
    
    // Store original scale if not already stored
    if (!screen.userData.hasOwnProperty('originalScale')) {
        screen.userData.originalScale = screen.scale.clone();
    }
    
    // Toggle between sizes
    if (Math.abs(currentScale - 1.0) < 0.1) {
        // Scale up to 1.5x
        screen.scale.set(1.5, 1.5, 1);
        
        // Create visual feedback for resize
        createModeChangeIndicator('Screen Enlarged');
    } else if (Math.abs(currentScale - 1.5) < 0.1) {
        // Scale up to 2.0x
        screen.scale.set(2.0, 2.0, 1);
        
        // Create visual feedback for resize
        createModeChangeIndicator('Screen Maximized');
    } else {
        // Return to original scale
        screen.scale.set(1.0, 1.0, 1);
        
        // Create visual feedback for resize
        createModeChangeIndicator('Screen Reset');
    }
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// Toggle fullscreen for a screen (kept for backward compatibility)
function toggleFullscreen(screen) {
    if (!screen) return;
    
    // Scale the screen up or down
    if (screen.scale.x === 1) {
        // Scale up to simulate fullscreen
        screen.userData.originalScale = screen.scale.clone();
        screen.scale.set(1.5, 1.5, 1);
        
        // Move forward slightly
        screen.userData.originalPosition = screen.position.clone();
        screen.position.z += 0.2;
        
        // Create visual feedback
        createModeChangeIndicator('Fullscreen Mode');
    } else {
        // Return to original scale
        if (screen.userData.originalScale) {
            screen.scale.copy(screen.userData.originalScale);
        } else {
            screen.scale.set(1, 1, 1);
        }
        
        // Return to original position
        if (screen.userData.originalPosition) {
            screen.position.copy(screen.userData.originalPosition);
        }
        
        // Create visual feedback
        createModeChangeIndicator('Normal Mode');
    }
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// Find a button by action
function findButtonByAction(action) {
    const buttons = findAllButtons();
    return buttons.find(button => 
        button.userData && 
        button.userData.action === action);
}

// Find all buttons in the scene with improved detection
function findAllButtons() {
    let buttons = [];
    
    // Get control panel buttons
    const controlPanels = scene.children.filter(obj => 
        obj.userData && obj.userData.type === 'controlPanel');
    
    controlPanels.forEach(panel => {
        panel.children.forEach(child => {
            if (child.userData && child.userData.type === 'button') {
                buttons.push(child);
            }
        });
    });
    
    // Get screen buttons
    screens.forEach(screen => {
        screen.children.forEach(child => {
            if (child.userData && child.userData.type === 'button') {
                buttons.push(child);
                
                // Ensure button is always interactive by setting renderOrder
                child.renderOrder = 10; // Higher renderOrder ensures it renders on top
            }
        });
    });
    
    return buttons;
}

// Touch start handler - improved detection for AR
function onTouchStart(event) {
    if (!renderer.xr.isPresenting) return;
    
    // Always prevent default to avoid browser gestures
    event.preventDefault();
    
    // Get the first touch
    const touch = event.touches[0];
    if (!touch) return;
    
    // Store touch position
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    
    // Convert touch to normalized device coordinates
    const touchPosition = new THREE.Vector2();
    touchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    touchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // Raycasting for interaction
    const raycaster = new THREE.Raycaster();
    
    // Update the picking ray for XR cameras
    if (renderer.xr.isPresenting) {
        renderer.xr.getCamera(camera);
        raycaster.setFromCamera(touchPosition, camera);
    }
    
    console.log("Touch detected in AR mode, casting ray");
    
    // First try to find a drag handle for direct screen movement
    const allObjects = [];
    scene.traverse(object => {
        if (object.isMesh) {
            allObjects.push(object);
        }
    });
    
    // Get all intersections, not just the closest one
    const intersects = raycaster.intersectObjects(allObjects, false);
    
    console.log(`Found ${intersects.length} intersection(s)`);
    
    // First check if we hit a drag handle
    let dragHandleHit = null;
    for (const intersect of intersects) {
        const object = intersect.object;
        if (object.userData && object.userData.type === 'dragHandle') {
            dragHandleHit = object;
            console.log("Found drag handle:", object);
            break;
        }
    }
    
    if (dragHandleHit) {
        // Get the screen from the drag handle
        const screenNumber = dragHandleHit.userData.screenNumber;
        
        // Find the screen object
        let screenFound = null;
        scene.traverse(object => {
            if (object.userData && 
                object.userData.type === 'screenGroup' && 
                object.userData.screenNumber === screenNumber) {
                screenFound = object;
            }
        });
        
        if (screenFound) {
            console.log("Starting drag for screen:", screenNumber);
            
            // Set as intersected screen
            intersectedScreen = screenFound;
            isDragging = true;
            
            // Visual feedback - highlight drag handle
            dragHandleHit.material.color.set(0x00ff00);
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([10, 10, 20]);
            }
            
            // Create visual indicator for feedback
            createMoveIndicator(dragHandleHit.position.clone(), 0.05);
            return;
        }
    }
    
    // Check if we hit a progress bar or button
    for (const intersect of intersects) {
        const object = intersect.object;
        
        // Check for progress bar
        if (object.userData && object.userData.type === 'progressBar') {
            console.log("Progress bar touched");
            handleProgressBarTouch(intersect);
            return;
        }
        
        // Check for buttons
        if (object.userData && object.userData.type === 'button') {
            console.log("Button touched:", object.userData.action);
            handleButtonAction(object);
            return;
        }
    }
    
    // If we reach here, check if we hit any part of the screen
    // This allows dragging from anywhere on the screen, not just the top bar
    let screenHit = null;
    for (const intersect of intersects) {
        const object = intersect.object;
        const userData = object.userData;
        
        // Check if this is part of a screen
        if (userData && (userData.type === 'screen' || userData.screenNumber !== undefined)) {
            // Found a screen component
            let screenNumber = userData.screenNumber;
            
            // Find the screen object
            scene.traverse(sceneObj => {
                if (sceneObj.userData && 
                    sceneObj.userData.type === 'screenGroup' && 
                    sceneObj.userData.screenNumber === screenNumber) {
                    screenHit = sceneObj;
                }
            });
            
            if (screenHit) {
                console.log("Screen touched:", screenNumber);
                break;
            }
        }
    }
    
    if (screenHit) {
        // Allow dragging from the top 2/3 of the screen
        const screenHeight = screenHit.userData.screenHeight || 0.84375;
        const touchPoint = intersects[0].point.clone();
        const localY = screenHit.worldToLocal(touchPoint).y;
        
        // Check if touch is in top 2/3 of screen
        if (localY > -screenHeight/3) {
            console.log("Drag from screen area activated");
            
            // Set as intersected screen
            intersectedScreen = screenHit;
            isDragging = true;
            
            // Visual feedback
            createMoveIndicator(intersects[0].point.clone(), 0.05);
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        }
    }
}

// Flash a highlight effect around a selected screen
function flashScreenHighlight(screen) {
    // Find the border or create one if it doesn't exist
    let highlightMesh = screen.children.find(child => 
        child.userData && child.userData.isHighlight);
    
    if (!highlightMesh) {
        // Get screen dimensions (use the first plane geometry as reference)
        const screenMesh = screen.children.find(child => 
            child.geometry && child.geometry.type === 'PlaneGeometry');
        
        let width = 1.05;
        let height = 0.8;
        
        if (screenMesh && screenMesh.geometry) {
            // Extract dimensions from existing geometry
            const size = new THREE.Vector3();
            screenMesh.geometry.computeBoundingBox();
            screenMesh.geometry.boundingBox.getSize(size);
            
            // Scale slightly larger than the original screen
            width = size.x * 1.05;
            height = size.y * 1.05;
        }
        
        // Create highlight mesh
        const glowGeometry = new THREE.PlaneGeometry(width, height);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        
        highlightMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        highlightMesh.position.z = -0.01;
        highlightMesh.userData = { isHighlight: true };
        screen.add(highlightMesh);
    }
    
    // Animate the highlight
    let opacity = 0;
    const fadeIn = () => {
        opacity += 0.1;
        highlightMesh.material.opacity = opacity;
        
        if (opacity < 0.6) {
            requestAnimationFrame(fadeIn);
        } else {
            // Fade out
            const fadeOut = () => {
                opacity -= 0.1;
                highlightMesh.material.opacity = opacity;
                
                if (opacity > 0) {
                    requestAnimationFrame(fadeOut);
                }
            };
            requestAnimationFrame(fadeOut);
        }
    };
    
    requestAnimationFrame(fadeIn);
}

// Touch move handler - make the movement more responsive and direct
function onTouchMove(event) {
    // Skip if not in AR mode
    if (!renderer.xr.isPresenting) return;
    
    event.preventDefault();
    
    // Get the first touch from the event
    const touch = event.touches[0];
    
    // Calculate movement since last touch
    const movementX = touch.clientX - lastTouchX;
    const movementY = touch.clientY - lastTouchY;
    
    // Update last position
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    
    // Handle screen dragging
    if (intersectedScreen && isDragging) {
        // Get the screen group
        const screenGroup = intersectedScreen;
        
        // Scale for movement sensitivity - INCREASED for better responsiveness
        const moveScale = 0.8; // Even higher value for more responsive movement
        
        // Copy current position
        const currentPosition = screenGroup.position.clone();
        
        // Calculate movement in camera space based on touch movement
        const movement = new THREE.Vector3(
            -movementX * moveScale * 0.01,
            movementY * moveScale * 0.01,
            0
        );
        
        // Apply camera rotation to movement
        movement.applyQuaternion(camera.quaternion);
        
        // Apply movement
        screenGroup.position.add(movement);
        
        // Save original scale if not already saved
        if (!screenGroup.userData.originalScale) {
            screenGroup.userData.originalScale = screenGroup.scale.clone();
        }
        
        // Ensure scale is maintained during drag
        if (screenGroup.userData.originalScale) {
            screenGroup.scale.copy(screenGroup.userData.originalScale);
        }
        
        // Make screen always face the camera
        screenGroup.lookAt(camera.position);
        
        // Add visual feedback for movement
        createMoveIndicator(screenGroup.position.clone(), 0.04);
        
        // Provide haptic feedback occasionally
        if (Math.random() < 0.05 && navigator.vibrate) {
            navigator.vibrate(15);
        }
        
        console.log("Moving screen:", screenGroup.userData.screenNumber, "to position:", screenGroup.position);
    }
}

// Helper function to make sure a screen is always visible
function ensureScreenVisibility(screen) {
    if (!screen || !camera) return;
    
    // Get camera position
    const cameraPos = camera.position.clone();
    const screenPos = screen.position.clone();
    
    // Calculate vector from camera to screen
    const camToScreen = screenPos.clone().sub(cameraPos);
    const distance = camToScreen.length();
    
    // If screen is too far, move it closer
    if (distance > 3) {
        // Normalize and set to ideal distance
        camToScreen.normalize().multiplyScalar(2);
        screen.position.copy(cameraPos.clone().add(camToScreen));
        console.log("Adjusted screen position - too far");
    }
    
    // If screen is too close, move it farther
    if (distance < 0.5) {
        camToScreen.normalize().multiplyScalar(1);
        screen.position.copy(cameraPos.clone().add(camToScreen));
        console.log("Adjusted screen position - too close");
    }
    
    // Make sure screen faces the camera
    screen.lookAt(camera.position);
}

// When touch ends, ensure screen is visible
function onTouchEnd(event) {
    if (!renderer.xr.isPresenting) return;
    
    // Clear any dragging flags
    isDragging = false;
    
    if (intersectedScreen) {
        const screen = intersectedScreen;
        
        // Make sure screen scale is preserved
        if (screen.userData.originalScale) {
            screen.scale.copy(screen.userData.originalScale);
        }
        
        // Make the screen face the camera
        screen.lookAt(camera.position);
        
        // Ensure the screen is at a good distance and visible
        ensureScreenVisibility(screen);
        
        // Add subtle "settle" animation when dropping
        const startPosition = screen.position.clone();
        const startY = startPosition.y;
        const endPosition = startPosition.clone();
        
        // Slight drop and bounce
        let timer = 0;
        const duration = 300;
        const maxDrop = 0.03;
        
        const dropAnimation = () => {
            timer += 16;
            const progress = Math.min(timer / duration, 1);
            
            // Drop then bounce using a sine curve
            const bounce = Math.sin(progress * Math.PI) * maxDrop;
            screen.position.y = startY - bounce;
            
            // When done, restore position
            if (progress < 1) {
                requestAnimationFrame(dropAnimation);
            } else {
                // Complete animation with a slight upward bounce
                const upAnimation = () => {
                    timer += 16;
                    const upProgress = Math.min((timer - duration) / 200, 1);
                    screen.position.y = startY - maxDrop + (maxDrop * upProgress);
                    
                    if (upProgress < 1) {
                        requestAnimationFrame(upAnimation);
                    } else {
                        // Final position snap
                        screen.position.y = startY;
                    }
                };
                requestAnimationFrame(upAnimation);
            }
        };
        
        requestAnimationFrame(dropAnimation);
    }
    
    // Reset interaction state
    intersectedScreen = null;
    
    // Reset touch tracking
    lastTouchX = 0;
    lastTouchY = 0;
}

// Override to create a more visible move indicator
function createMoveIndicator(position, size) {
    // Create a bright pulsing sphere
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // Bright cyan
        transparent: true,
        opacity: 0.8,
        depthTest: false // Always show on top
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.copy(position);
    indicator.renderOrder = 999; // Render on top of everything
    scene.add(indicator);
    
    // Add animation for the indicator
    let opacity = 0.8;
    let scale = 1.0;
    let timer = 0;
    
    function fadeOut() {
        timer += 0.05;
        opacity = Math.max(0, 0.8 - timer);
        scale = Math.min(1.5, 1.0 + timer * 0.5);
        
        indicator.material.opacity = opacity;
        indicator.scale.set(scale, scale, scale);
        
        if (opacity > 0) {
            requestAnimationFrame(fadeOut);
        } else {
            scene.remove(indicator);
            geometry.dispose();
            material.dispose();
        }
    }
    
    requestAnimationFrame(fadeOut);
    
    return indicator;
}

// Handle touch on progress bar
function handleProgressBarTouch(intersection) {
    if (!videoElement) return;
    
    const object = intersection.object;
    
    // Make sure this is a progress bar
    if (object.userData.type !== 'progressBar' && !object.userData.isBackground) {
        return;
    }
    
    // Get screen from user data
    const screenNumber = object.userData.screenNumber;
    const screen = screens.find(s => s.group.userData.screenNumber === screenNumber);
    
    if (!screen) return;
    
    // Get intersection point relative to progress bar
    const point = intersection.point.clone();
    
    // Convert to local space of progress bar
    object.updateMatrixWorld();
    const inverseMatrix = new THREE.Matrix4().copy(object.matrixWorld).invert();
    point.applyMatrix4(inverseMatrix);
    
    // Calculate the progress based on X position (-0.45 to 0.45)
    const progressBarWidth = screen.group.userData.screenWidth * 0.9;
    const progressStart = -progressBarWidth / 2;
    const progressEnd = progressBarWidth / 2;
    
    // Calculate normalized position (0 to 1)
    const normalizedPosition = (point.x - progressStart) / (progressEnd - progressStart);
    const clampedPosition = Math.max(0, Math.min(1, normalizedPosition));
    
    // Set video time
    const newTime = clampedPosition * duration;
    videoElement.currentTime = newTime;
    
    // Provide haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

// Create a floating text indicator for mode changes
function createModeChangeIndicator(message) {
    // Create a canvas for the text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Draw the text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(50, 150, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(0.3, 0.075);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    
    // Position above the control panel
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    indicator.position.copy(camera.position).add(cameraDirection.multiplyScalar(-0.5));
    indicator.position.y += 0.15; // Position above control panel
    indicator.quaternion.copy(camera.quaternion);
    
    scene.add(indicator);
    
    // Fade out and remove
    const startTime = performance.now();
    const duration = 1500; // 1.5 seconds
    
    function fadeOut() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
            if (progress > 0.7) {
                // Start fading out in the last 30% of time
                material.opacity = 0.9 * (1 - ((progress - 0.7) / 0.3));
            }
            
            // Float upward slightly
            indicator.position.y += 0.0002;
            
            requestAnimationFrame(fadeOut);
        } else {
            scene.remove(indicator);
            material.dispose();
            geometry.dispose();
            texture.dispose();
        }
    }
    
    requestAnimationFrame(fadeOut);
}

// Helper function to find a screen from a drag handle
function findScreenFromDragHandle(dragHandle) {
    // Direct reference in userData
    if (dragHandle.userData && dragHandle.userData.screen) {
        return dragHandle.userData.screen;
    }
    
    // Search for screen by UUID
    if (dragHandle.userData && dragHandle.userData.screenUUID) {
        for (let i = 0; i < screens.length; i++) {
            if (screens[i].uuid === dragHandle.userData.screenUUID) {
                return screens[i];
            }
        }
    }
    
    // Try to find by traversing upwards in the scene graph
    let parent = dragHandle.parent;
    while (parent) {
        if (parent.userData && parent.userData.type === 'screen') {
            return parent;
        }
        parent = parent.parent;
    }
    
    // Last resort - check if this handle is a direct child of any screen
    for (let i = 0; i < screens.length; i++) {
        for (let j = 0; j < screens[i].children.length; j++) {
            if (screens[i].children[j] === dragHandle) {
                return screens[i];
            }
        }
    }
    
    console.warn("Could not find screen for drag handle:", dragHandle.uuid);
    return null;
}

// Setup function to be called with imports
export function setupVideoControls(mediaModule) {
    if (mediaModule) {
        // Store references to functions rather than redefining them
        videoControlFunctions.togglePlayback = mediaModule.toggleVideoPlayback;
        videoControlFunctions.toggleMute = mediaModule.toggleVideoMute;
        console.log("Video controls setup complete");
    }
} 