// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { screens, selectScreen, updateKeyboardPosition, createNewBrowserScreen } from './ar_screens.js';
import { virtualKeyboard, showNotification, toggleModeButton, controlPanel } from './ar_ui.js';
import { videoElement, duration, updateVideoProgress } from './ar_media.js';

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

// Handle touch start event
export function onTouchStart(event) {
    // Get the first touch
    const touch = event.touches[0];
    
    // Remember touch start position for movement calculations
    touchStartPosition.x = touch.clientX;
    touchStartPosition.y = touch.clientY;
    
    // Convert touch position to normalized position (-1 to 1)
    const normalizedPosition = new THREE.Vector2(
        (touch.clientX / window.innerWidth) * 2 - 1,
        -(touch.clientY / window.innerHeight) * 2 + 1
    );
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(normalizedPosition, camera);
    
    // First, try to detect control buttons or progress bar
    const allObjects = scene.children;
    let hitButton = false;

    // Variables to store what we've hit
    let intersectedDragHandle = null;
    let intersectedScreen = null;
    
    // First, look specifically for drag handles and interactive controls with higher precision
    const intersections = raycaster.intersectObjects(allObjects, true);
    for (const intersection of intersections) {
        const object = intersection.object;
        
        // Check if we hit a button, progress bar, or other control
        if (object.userData.type === 'button' && object.userData.action) {
            console.log("Touched button:", object.userData.action);
            object.material.color.set(0xaaaaaa); // Visual feedback
            object.userData.isPressed = true;
            if (vibrateAvailable) navigator.vibrate(20); // Haptic feedback
            hitButton = true;
            if (object.userData.action === 'progressBar') {
                console.log("Handling progress bar touch");
                handleProgressBarTouch(object, intersection.point);
            }
            break;
        }
        
        // Check if we hit a drag handle directly
        if (object.userData.type === 'dragHandle' && object.userData.isDraggable) {
            console.log("Direct drag handle hit:", object.userData.action);
            intersectedDragHandle = object;
            intersectedScreen = object.userData.screen;
            
            // Visual feedback for grab
            object.material.color.set(0x4CAF50); // Green to indicate active
            if (vibrateAvailable) navigator.vibrate([20, 30, 40]); // Haptic pattern for grab
            
            // Store reference to the dragged handle
            currentDragHandle = object;
            isDragging = true;
            hitButton = true;
            break;
        }
    }
    
    // If we didn't hit a button or drag handle directly, check if we hit a screen area that's draggable
    if (!hitButton) {
        // Find all screen objects
        for (const intersection of intersections) {
            const object = intersection.object;
            
            // Check if this is a screen or part of a screen
            let screen = findScreenFromObject(object);
            
            if (screen) {
                const screenHeight = 0.75; // Standard screen height
                const hitPoint = intersection.point.clone();
                
                // Convert world point to local point relative to the screen
                screen.worldToLocal(hitPoint);
                
                // Check if the hit is in the top 2/3 draggable area of the screen
                if (screen.userData.draggableArea && 
                    hitPoint.y <= screen.userData.draggableArea.top && 
                    hitPoint.y >= screen.userData.draggableArea.bottom) {
                    
                    console.log("Hit in draggable area of screen:", screen.userData.id, "at y=", hitPoint.y);
                    
                    // Create virtual drag handle if none exists
                    if (screen.userData.dragHandle) {
                        intersectedDragHandle = screen.userData.dragHandle;
                        intersectedScreen = screen;
                        
                        // Visual feedback
                        screen.userData.dragHandle.material.color.set(0x4CAF50); // Green to indicate active
                        if (vibrateAvailable) navigator.vibrate([20, 30, 40]); // Haptic pattern for grab
                        
                        // Store reference to the dragged handle
                        currentDragHandle = screen.userData.dragHandle;
                        isDragging = true;
                        
                        // Store original scale on start drag to ensure we preserve it
                        if (intersectedScreen && !intersectedScreen.userData.originalScaleStored) {
                            intersectedScreen.userData.originalScale = intersectedScreen.scale.clone();
                            intersectedScreen.userData.originalScaleStored = true;
                        }
                        break;
                    }
                }
            }
        }
    }
    
    // If we're not interacting with any control or drag handle, check if we hit a screen for content interaction
    if (!hitButton && !isDragging) {
        for (const intersection of intersections) {
            const object = intersection.object;
            
            // Check if this is a screen
            const screen = findScreenFromObject(object);
            
            if (screen) {
                // Handle general screen touch (like content selection)
                console.log("Touched screen content:", screen.userData.id);
                selectScreen(screen);
                break;
            }
        }
    }
}

// Utility to find the screen object associated with any child mesh
function findScreenFromObject(object) {
    let current = object;
    
    // Traverse up the parent chain
    while (current) {
        if (current.userData && current.userData.type === 'screen') {
            return current;
        }
        current = current.parent;
    }
    
    return null;
}

// Handle touch move event
export function onTouchMove(event) {
    // Prevent default behavior to avoid page scrolling
    event.preventDefault();
    
    // If we're not dragging, do nothing
    if (!isDragging || !currentDragHandle) {
        return;
    }
    
    // Get the first touch
    const touch = event.touches[0];
    
    // Calculate movement since last touch
    const moveX = touch.clientX - touchStartPosition.x;
    const moveY = touch.clientY - touchStartPosition.y;
    
    // Update touch position for next frame
    touchStartPosition.x = touch.clientX;
    touchStartPosition.y = touch.clientY;
    
    // Find the associated screen
    const screen = currentDragHandle.userData.screen;
    
    // Ensure we have a screen to move
    if (!screen) {
        console.warn("No screen found for drag handle");
        return;
    }
    
    // Move the screen more responsively in AR
    const moveScale = 0.35; // Higher sensitivity for better response in AR
    
    // Move the screen directly based on touch movement
    screen.position.x += moveX * moveScale * 0.01;
    screen.position.y += moveY * moveScale * 0.01;
    
    // Ensure we preserve the original scale
    if (screen.userData.originalScale) {
        screen.scale.copy(screen.userData.originalScale);
    }
    
    // Log the movement for debugging
    //console.log(`Moving screen ${screen.userData.id} by ${moveX * moveScale * 0.01}, ${moveY * moveScale * 0.01}`);
}

// Handle touch end event
export function onTouchEnd(event) {
    // Check if we were dragging
    if (isDragging && currentDragHandle) {
        // Reset drag handle appearance
        currentDragHandle.material.color.set(0x2C3E50); // Reset to original dark color
        
        // Get the associated screen
        const screen = currentDragHandle.userData.screen;
        
        // Ensure we have a screen
        if (screen) {
            // Ensure we preserve the original scale
            if (screen.userData.originalScale) {
                screen.scale.copy(screen.userData.originalScale);
                
                // Add a subtle "settle" animation
                const startPosition = screen.position.clone();
                const endPosition = startPosition.clone();
                endPosition.y -= 0.01; // Slight drop
                
                // Animate the screen position for a subtle "settle" effect
                const startTime = Date.now();
                const duration = 200; // milliseconds
                
                function animateSettle() {
                    const elapsedTime = Date.now() - startTime;
                    const progress = Math.min(elapsedTime / duration, 1);
                    
                    // First half: drop slightly
                    if (progress < 0.5) {
                        const dropProgress = progress * 2; // Scale to 0-1 range
                        screen.position.lerpVectors(startPosition, endPosition, dropProgress);
                    } 
                    // Second half: bounce back up
                    else {
                        const bounceProgress = (progress - 0.5) * 2; // Scale to 0-1 range
                        screen.position.lerpVectors(endPosition, startPosition, bounceProgress);
                    }
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateSettle);
                    }
                }
                
                // Start the animation
                animateSettle();
            }
        }
    }
    
    // Reset all button states
    const allObjects = scene.children;
    allObjects.forEach(object => {
        if (object.userData && object.userData.type === 'button' && object.userData.isPressed) {
            object.material.color.set(0xffffff); // Reset to white
            object.userData.isPressed = false;
            
            // Handle button action
            handleButtonAction(object);
        }
    });
    
    // Reset dragging state
    isDragging = false;
    currentDragHandle = null;
}

// Handle progress bar touch
function handleProgressBarTouch(progressBar, hitPoint) {
    const screen = findScreenFromObject(progressBar);
    if (!screen || !videoElement) return;
    
    // Convert world position to screen-local position
    const localPoint = hitPoint.clone();
    screen.worldToLocal(localPoint);
    
    // Calculate position relative to progress bar (which is 0.96 * screenWidth)
    const screenWidth = 1.0;
    const progressBarWidth = screenWidth * 0.96;
    
    // Map from local position to 0-1 range
    // The progress bar spans from -progressBarWidth/2 to progressBarWidth/2
    const normalizedX = (localPoint.x + (progressBarWidth/2)) / progressBarWidth;
    const progress = Math.max(0, Math.min(1, normalizedX));
    
    console.log(`Seeking to ${progress * 100}% of video`);
    
    // Seek the video
    if (videoElement && isFinite(videoElement.duration)) {
        videoElement.currentTime = videoElement.duration * progress;
        
        // Update progress bar immediately for better responsiveness
        if (screen.userData.controls && screen.userData.controls.progressBar) {
            screen.userData.controls.progress = progress;
            
            // Call the updateVideoProgress function if available
            if (typeof updateVideoProgress === 'function') {
                updateVideoProgress(
                    screen.userData.controls.progressBar, 
                    progress,
                    screen
                );
            }
        }
    }
    
    // Provide haptic feedback
    if (vibrateAvailable) navigator.vibrate(30);
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

// Setup function to be called with imports
export function setupVideoControls(mediaModule) {
    if (mediaModule) {
        // Store references to functions rather than redefining them
        videoControlFunctions.togglePlayback = mediaModule.toggleVideoPlayback;
        videoControlFunctions.toggleMute = mediaModule.toggleVideoMute;
        console.log("Video controls setup complete");
    }
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