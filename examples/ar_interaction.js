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
    event.preventDefault();
    
    // Get touch position
    const touch = event.touches[0];
    const touchX = (touch.clientX / window.innerWidth) * 2 - 1;
    const touchY = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // Store touch start position for drag reference
    touchStartX = touchX;
    touchStartY = touchY;
    
    // Log touch start for debugging
    console.log("TOUCH START at:", touchX, touchY);
    
    // Update raycaster with touch position and camera
    raycaster.setFromCamera(new THREE.Vector2(touchX, touchY), camera);
    
    // INCREASE THRESHOLD for better detection
    raycaster.params.Line.threshold = 0.1;
    raycaster.params.Points.threshold = 0.1;
    
    // Search for intersections with all objects - increased tolerance
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Show visual feedback at touch point
    showTouchFeedback(touch.clientX, touch.clientY);
    
    // Log all intersections for debugging
    console.log("Found intersections:", intersects.length);
    if (intersects.length > 0) {
        console.log("First intersection type:", intersects[0].object.userData.type);
    }
    
    // If we hit something in the scene
    if (intersects.length > 0) {
        // Check if we hit a drag handle (top bar)
        intersectedDragHandle = findObjectWithType(intersects, 'dragHandle');
        
        if (intersectedDragHandle) {
            console.log("DRAG HANDLE TOUCHED!");
            isDragging = true;
            
            // Get screen number from drag handle
            const screenNumber = intersectedDragHandle.userData.screenNumber;
            
            // Find corresponding screen in screens array
            for (let i = 0; i < screens.length; i++) {
                if (screens[i].number === screenNumber) {
                    intersectedScreen = screens[i].group;
                    break;
                }
            }
            
            // Visual feedback - change color to bright green
            intersectedDragHandle.material.color.set(0x00ff00);
            
            // Haptic feedback for successful grab
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
            
            // Store the original position of the screen for reference
            if (intersectedScreen) {
                originalPosition.copy(intersectedScreen.position);
                
                // Store the original scale
                if (intersectedScreen.userData && intersectedScreen.userData.originalScale) {
                    originalScale.copy(intersectedScreen.userData.originalScale);
                } else {
                    originalScale.set(1, 1, 1);
                }
                
                console.log("Screen grabbed:", screenNumber);
                console.log("Original position:", originalPosition);
            }
        }
        // Check if we hit a button
        else {
            const button = findObjectWithType(intersects, 'button');
            if (button) {
                console.log("BUTTON PRESSED:", button.userData.action);
                handleButtonAction(button);
            }
            // Check if we hit a progress bar for video seeking
            else {
                const progressBar = findObjectWithType(intersects, 'progressBar');
                if (progressBar) {
                    console.log("PROGRESS BAR TOUCHED!");
                    handleProgressBarTouch(progressBar, intersects[0].point.x);
                }
                // If we hit any part of a screen, allow dragging from anywhere
                else {
                    const screenBackground = findObjectWithType(intersects, 'screen');
                    if (screenBackground) {
                        console.log("SCREEN BACKGROUND TOUCHED - ALLOWING DRAG");
                        isDragging = true;
                        
                        // Get screen number
                        const screenNumber = screenBackground.userData.screenNumber;
                        
                        // Find corresponding screen in screens array
                        for (let i = 0; i < screens.length; i++) {
                            if (screens[i].number === screenNumber) {
                                intersectedScreen = screens[i].group;
                                break;
                            }
                        }
                        
                        // Visual feedback
                        if (navigator.vibrate) {
                            navigator.vibrate(50);
                        }
                        
                        // Store original position and scale
                        if (intersectedScreen) {
                            originalPosition.copy(intersectedScreen.position);
                            
                            if (intersectedScreen.userData && intersectedScreen.userData.originalScale) {
                                originalScale.copy(intersectedScreen.userData.originalScale);
                            } else {
                                originalScale.set(1, 1, 1);
                            }
                            
                            console.log("Screen grabbed from background:", screenNumber);
                        }
                    }
                }
            }
        }
    }
    // If we didn't hit any object, check if we should create a new screen
    else {
        // Create a new screen at touch point if user pressed hard/long enough
        // This will be detected in touchend event for better reliability
        isTouchStarted = true;
    }
}

// Show visual feedback at touch point
function showTouchFeedback(x, y) {
    // Create a temporary bright circle at touch point
    const feedback = document.createElement('div');
    feedback.style.position = 'fixed';
    feedback.style.width = '30px';
    feedback.style.height = '30px';
    feedback.style.borderRadius = '50%';
    feedback.style.backgroundColor = 'rgba(0, 255, 255, 0.7)';
    feedback.style.left = (x - 15) + 'px';
    feedback.style.top = (y - 15) + 'px';
    feedback.style.zIndex = '9999';
    feedback.style.pointerEvents = 'none';
    document.body.appendChild(feedback);
    
    // Animate and remove
    setTimeout(() => {
        feedback.style.transition = 'all 0.3s';
        feedback.style.opacity = '0';
        feedback.style.transform = 'scale(1.5)';
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 300);
    }, 50);
}

// Function to handle touch move for dragging
function onTouchMove(event) {
    event.preventDefault();
    
    // Only process if we're dragging a screen
    if (isDragging && intersectedScreen) {
        console.log("DRAGGING SCREEN");
        
        // Get touch position
        const touch = event.touches[0];
        const touchX = (touch.clientX / window.innerWidth) * 2 - 1;
        const touchY = -(touch.clientY / window.innerHeight) * 2 + 1;
        
        // Calculate movement delta
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;
        
        // Create movement vector in camera space
        const movementSpeed = 0.8; // INCREASED SPEED for better responsiveness
        const movement = new THREE.Vector3(
            deltaX * movementSpeed,
            deltaY * movementSpeed,
            0
        );
        
        // Transform movement to world space based on camera orientation
        const cameraMatrix = new THREE.Matrix4();
        camera.updateMatrixWorld();
        cameraMatrix.extractRotation(camera.matrixWorld);
        movement.applyMatrix4(cameraMatrix);
        
        // Update screen position
        intersectedScreen.position.copy(originalPosition).add(movement);
        
        // Visual feedback during dragging
        showDragFeedback();
        
        // Ensure screen remains visible
        ensureScreenVisibility(intersectedScreen);
        
        // Update touch position
        touchStartX = touchX;
        touchStartY = touchY;
        originalPosition.copy(intersectedScreen.position);
    }
}

// Show feedback during dragging
function showDragFeedback() {
    // Add a temporary bright outline to the dragged screen
    if (intersectedScreen && !dragVisualFeedback) {
        // Try to find the border/outline of the screen to highlight
        intersectedScreen.traverse(child => {
            if (child instanceof THREE.LineSegments) {
                // Store original color
                originalBorderColor = child.material.color.clone();
                // Change to bright cyan
                child.material.color.set(0x00ffff);
                dragVisualFeedback = child;
            }
        });
    }
}

// Make sure screen stays in view
function ensureScreenVisibility(screen) {
    // Get the camera's forward direction
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    // Get vector from camera to screen
    const cameraToScreen = new THREE.Vector3();
    cameraToScreen.subVectors(screen.position, camera.position);
    
    // Check if screen is behind the camera
    const dotProduct = cameraToScreen.dot(cameraDirection);
    
    // If screen is behind camera, move it in front
    if (dotProduct < 0) {
        console.log("Screen was behind camera - repositioning");
        
        // Position the screen 1 meter in front of the camera
        const newPosition = new THREE.Vector3();
        newPosition.copy(camera.position).add(cameraDirection.multiplyScalar(1));
        screen.position.copy(newPosition);
        
        // Ensure screen faces the camera
        screen.lookAt(camera.position);
        
        // Haptic feedback to notify user
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }
    
    // Check if screen is too far from the camera (>5 meters)
    const distanceToCamera = cameraToScreen.length();
    if (distanceToCamera > 5) {
        console.log("Screen too far - bringing closer");
        
        // Move the screen closer to the camera
        const direction = cameraToScreen.normalize();
        const newPosition = new THREE.Vector3();
        newPosition.copy(camera.position).add(direction.multiplyScalar(2));
        screen.position.copy(newPosition);
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
}

// Function to handle touch end
function onTouchEnd(event) {
    event.preventDefault();
    
    console.log("TOUCH END");
    
    // Reset drag handle color if we were dragging
    if (isDragging && intersectedDragHandle) {
        intersectedDragHandle.material.color.set(intersectedDragHandle.userData.originalColor || '#444444');
    }
    
    // Reset any drag visual feedback
    if (dragVisualFeedback && originalBorderColor) {
        dragVisualFeedback.material.color.copy(originalBorderColor);
        dragVisualFeedback = null;
    }
    
    // If no drag and touch started, this might be a tap to create screen
    if (!isDragging && isTouchStarted) {
        console.log("TAP DETECTED - CREATING NEW SCREEN");
        
        // Position the new screen 1 meter in front of the camera
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        const newScreenPosition = new THREE.Vector3();
        newScreenPosition.copy(camera.position).add(cameraDirection.multiplyScalar(1));
        
        // Create new screen
        console.log("Creating new screen at position:", newScreenPosition);
        createNewBrowserScreen(newScreenPosition);
        
        // Haptic feedback for screen creation
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 100]);
        }
    }
    
    // Reset all interaction state
    isDragging = false;
    isTouchStarted = false;
    intersectedDragHandle = null;
    intersectedScreen = null;
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

// Handle touch on progress bar
function handleProgressBarTouch(progressBar, x) {
    if (!videoElement) return;
    
    // Make sure this is a progress bar
    if (progressBar.userData.type !== 'progressBar' && !progressBar.userData.isBackground) {
        return;
    }
    
    // Get screen from user data
    const screenNumber = progressBar.userData.screenNumber;
    const screen = screens.find(s => s.group.userData.screenNumber === screenNumber);
    
    if (!screen) return;
    
    // Get intersection point relative to progress bar
    const point = progressBar.worldToLocal(progressBar.position).clone();
    
    // Convert to local space of progress bar
    progressBar.updateMatrixWorld();
    const inverseMatrix = new THREE.Matrix4().copy(progressBar.matrixWorld).invert();
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