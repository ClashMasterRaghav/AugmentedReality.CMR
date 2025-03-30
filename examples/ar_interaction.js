// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { screens, selectScreen, updateKeyboardPosition, createNewBrowserScreen, toggleResize } from './ar_screens.js';
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

// Variables for resize handle functionality
let isResizing = false;
let resizedScreen = null;
let initialResizePosition = new THREE.Vector2();
let initialScreenSize = new THREE.Vector2();

// Import necessary video functions
let videoControlFunctions = {
    togglePlayback: null,
    toggleMute: null
};

// Variables for pinch-to-resize gesture
let pinchStartScale = null;
let pinchScreen = null;
let lastPinchDistance = 0;
let resizeStartTime = 0;
let isShowingResizeUI = false;

// Setup event listeners
export function setupEventListeners() {
    // Controller events
    controller.addEventListener('select', onSelect);
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    
    // Touch-based interaction (for AR on mobile)
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);
    
    // Add multitouch pinch-to-resize support
    renderer.domElement.addEventListener('gesturestart', onGestureStart, false);
    renderer.domElement.addEventListener('gesturechange', onGestureChange, false);
    renderer.domElement.addEventListener('gestureend', onGestureEnd, false);
    
    console.log("Event listeners set up");
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
    
    // Create visual feedback
    createButtonFeedback(button);
    
    // Get the action and execute it
    const action = button.userData.action;
    
    switch(action) {
        case 'playButton':
            // Toggle video playback
            import('./ar_media.js').then(mediaModule => {
                if (mediaModule.toggleVideoPlayback) {
                    mediaModule.toggleVideoPlayback();
                } else {
                    console.error("Video playback function not found");
                }
            });
            break;
            
        case 'volumeButton':
        case 'mutedButton':
            // Toggle video mute
            import('./ar_media.js').then(mediaModule => {
                if (mediaModule.toggleVideoMute) {
                    mediaModule.toggleVideoMute();
                } else {
                    console.error("Video mute function not found");
                }
            });
            break;
            
        case 'createScreen':
            createNewScreen();
            break;
            
        case 'moveScreen':
            toggleMoveMode(button);
            break;
            
        case 'rotateScreen':
            toggleRotateMode(button);
            break;
            
        case 'newScreen':
            createNewScreen();
            break;
            
        case 'deleteScreen':
            // Delete the last interacted screen
            deleteLastScreen();
            break;
    }
    
    // Provide haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
}

// Create visual feedback for button press
function createButtonFeedback(button) {
    if (!button) return;
    
    // Store original properties
    const originalColor = button.material ? button.material.color.clone() : new THREE.Color(0x333333);
    const originalScale = button.scale.clone();
    
    // Create burst effect
    const burstGeometry = new THREE.CircleGeometry(button.userData.size || 0.05, 32);
    const burstMaterial = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const burst = new THREE.Mesh(burstGeometry, burstMaterial);
    burst.scale.set(0.8, 0.8, 1);
    burst.position.z = -0.001;
    button.add(burst);
    
    // Scale up button for press effect
    button.scale.multiplyScalar(1.15);
    
    // Change color for feedback
    if (button.material) {
        button.material.color.set(0x4fc3f7);
    }
    
    // Create ripple effect
    const rippleGeometry = new THREE.CircleGeometry(button.userData.size || 0.05, 32);
    const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthTest: true
    });
    
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    ripple.scale.set(1, 1, 1);
    ripple.position.z = -0.002;
    button.add(ripple);
    
    // Animate feedback effects
    const startTime = performance.now();
    const duration = 400; // ms
    
    function animateFeedback() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Button scale animation (press and release)
            if (progress < 0.3) {
                // Press down phase
                button.scale.lerp(new THREE.Vector3(1.15, 1.15, 1), 0.3);
            } else {
                // Release phase
                button.scale.lerp(originalScale, 0.2);
            }
            
            // Burst effect
            if (progress < 0.5) {
                // Initial burst
                burst.scale.set(0.8 + progress * 0.4, 0.8 + progress * 0.4, 1);
                burstMaterial.opacity = 0.7 * (1 - progress * 2);
            }
            
            // Ripple effect
            ripple.scale.set(1 + progress, 1 + progress, 1);
            rippleMaterial.opacity = 0.6 * (1 - progress);
            
            // Color transition
            if (button.material) {
                const t = progress < 0.5 ? progress * 2 : 1 - (progress - 0.5) * 2;
                button.material.color.lerp(originalColor, 1 - t);
            }
            
            requestAnimationFrame(animateFeedback);
        } else {
            // Clean up
            button.scale.copy(originalScale);
            if (button.material) {
                button.material.color.copy(originalColor);
            }
            button.remove(burst);
            button.remove(ripple);
            burstMaterial.dispose();
            rippleMaterial.dispose();
            burstGeometry.dispose();
            rippleGeometry.dispose();
        }
    }
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
    
    requestAnimationFrame(animateFeedback);
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

// Handle gesture start for pinch events
function onGestureStart(event) {
    // Prevent default to avoid browser handling (like zoom)
    event.preventDefault();
    
    // We'll use our custom touch-based implementation instead
}

// Handle gesture change for pinch events
function onGestureChange(event) {
    // Prevent default to avoid browser handling
    event.preventDefault();
    
    // We'll use our custom touch-based implementation instead
}

// Handle gesture end for pinch events
function onGestureEnd(event) {
    // Prevent default
    event.preventDefault();
    
    // We'll use our custom touch-based implementation instead
}

// Handle touch start events
function onTouchStart(event) {
    if (!isARMode) return;
    
    // Get touch points
    const touches = event.touches;
    
    // Check for pinch gesture (2 fingers)
    if (touches.length === 2) {
        // Calculate initial distance between touches
        const touch1 = new THREE.Vector2(touches[0].clientX, touches[0].clientY);
        const touch2 = new THREE.Vector2(touches[1].clientX, touches[1].clientY);
        lastPinchDistance = touch1.distanceTo(touch2);
        
        // Find screen under the midpoint of the two touches
        const midpoint = new THREE.Vector2(
            (touch1.x + touch2.x) / 2,
            (touch1.y + touch2.y) / 2
        );
        
        // Convert to NDC
        const normalizedPoint = new THREE.Vector2(
            (midpoint.x / window.innerWidth) * 2 - 1,
            -(midpoint.y / window.innerHeight) * 2 + 1
        );
        
        // Raycasting to find screen
        raycaster.setFromCamera(normalizedPoint, camera);
        const intersects = raycaster.intersectObjects(screens, true);
        
        // Look for a screen in the intersections
        for (const intersect of intersects) {
            const screen = getScreenFromIntersect(intersect.object);
            if (screen) {
                console.log("Pinch gesture started on screen:", screen.userData.id);
                isPinching = true;
                pinchScreen = screen;
                pinchStartScale = screen.scale.clone();
                resizeStartTime = Date.now();
                
                // Highlight the screen to indicate resizing
                flashScreenHighlight(screen, 0x4488ff); // Blue highlight for resize
                
                // Enable resize visuals
                toggleResize(screen, true);
                
                // Create a resize indicator
                createResizeIndicator(midpoint);
                isShowingResizeUI = true;
                
                // Select this screen
                selectScreen(screen);
                
                // Provide haptic feedback to indicate resize mode
                if (navigator.vibrate) {
                    navigator.vibrate([15, 15]);
                }
                
                return;
            }
        }
    }
    
    // For single touch, check for resize handle interaction first
    const touch = event.touches[0];
    const normalizedPoint = new THREE.Vector2(
        (touch.clientX / window.innerWidth) * 2 - 1,
        -(touch.clientY / window.innerHeight) * 2 + 1
    );
    
    raycaster.setFromCamera(normalizedPoint, camera);
    const intersects = raycaster.intersectObjects(screens, true);
    
    // Check for resize handle intersection
    for (const intersect of intersects) {
        if (intersect.object.userData && intersect.object.userData.type === 'resizeHandle') {
            // We've clicked on a resize handle
            const screen = intersect.object.userData.screen || getScreenFromIntersect(intersect.object);
            if (screen) {
                isResizing = true;
                resizedScreen = screen;
                initialResizePosition.set(touch.clientX, touch.clientY);
                initialScreenSize.set(
                    screen.userData.width || 1, 
                    screen.userData.height || 0.6
                );
                
                // Save initial scale
                initialScale.copy(screen.scale);
                
                // Highlight the screen
                flashScreenHighlight(screen, 0x4488ff); // Blue highlight for resize
                
                // Enable resize visuals
                toggleResize(screen, true);
                
                // Create resize indicator
                createResizeIndicator(new THREE.Vector2(touch.clientX, touch.clientY));
                isShowingResizeUI = true;
                
                // Select this screen
                selectScreen(screen);
                
                // Provide haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(20);
                }
                
                return;
            }
        }
    }
    
    // If not resizing, use the original touch handling
    handleSingleTouch(event);
}

// Handle pinch resize during touch move
function handlePinchResize(event) {
    const touches = event.touches;
    
    // Calculate current distance between touches
    const touch1 = new THREE.Vector2(touches[0].clientX, touches[0].clientY);
    const touch2 = new THREE.Vector2(touches[1].clientX, touches[1].clientY);
    const currentDistance = touch1.distanceTo(touch2);
    
    // Calculate scale factor based on change in distance
    const scaleFactor = currentDistance / lastPinchDistance;
    
    // Add easing when scale changes direction
    let easedScaleFactor = scaleFactor;
    if ((scaleFactor > 1 && lastScaleFactor < 1) || 
        (scaleFactor < 1 && lastScaleFactor > 1)) {
        // Smooth the transition when changing direction
        easedScaleFactor = 1 + (scaleFactor - 1) * 0.7;
    }
    
    // Store for next comparison
    lastScaleFactor = scaleFactor;
    lastPinchDistance = currentDistance;
    
    // Apply scale with constraints
    if (pinchScreen && pinchStartScale) {
        // Calculate new scale based on accumulated factor from start
        const elapsedTime = Date.now() - resizeStartTime;
        const adjustedFactor = Math.pow(easedScaleFactor, Math.min(1, elapsedTime / 300));
        
        // Calculate new scale
        const newScale = pinchScreen.scale.clone().multiplyScalar(adjustedFactor);
        
        // Constrain scaling to reasonable limits
        const minScale = 0.3;
        const maxScale = 2.5;
        
        newScale.x = Math.max(minScale, Math.min(maxScale, newScale.x));
        newScale.y = Math.max(minScale, Math.min(maxScale, newScale.y));
        newScale.z = 1; // Keep z scale unchanged
        
        // Apply scale with smoothing
        pinchScreen.scale.lerp(newScale, 0.2);
        
        // Update original scale in userData to persist the change
        pinchScreen.userData.originalScale = pinchScreen.scale.clone();
        
        // Update midpoint for resize indicator
        const midpoint = new THREE.Vector2(
            (touch1.x + touch2.x) / 2,
            (touch1.y + touch2.y) / 2
        );
        updateResizeIndicator(midpoint, scaleFactor > 1 ? 'grow' : 'shrink');
        
        // Provide subtle haptic feedback for significant changes
        if (navigator.vibrate && Math.abs(scaleFactor - 1) > 0.05) {
            const intensity = Math.min(20, Math.abs(scaleFactor - 1) * 100);
            navigator.vibrate(Math.round(intensity));
        }
        
        // Show current scale as a percentage
        const scalePercent = Math.round(pinchScreen.scale.x * 100 / pinchStartScale.x);
        updateResizeText(`${scalePercent}%`);
    }
}

// Handle resizing with resize handle
function handleResizeHandle(event) {
    if (!isResizing || !resizedScreen) return;
    
    const touch = event.touches[0];
    const currentPosition = new THREE.Vector2(touch.clientX, touch.clientY);
    
    // Calculate the delta from the initial position
    const deltaX = (currentPosition.x - initialResizePosition.x) / window.innerWidth;
    const deltaY = (currentPosition.y - initialResizePosition.y) / window.innerHeight;
    
    // Calculate new scale factors (increased sensitivity)
    const scaleX = initialScale.x * (1 + deltaX * 2.5);
    const scaleY = initialScale.y * (1 - deltaY * 2.5); // Invert Y for natural feeling
    
    // Apply constraints
    const minScale = 0.3;
    const maxScale = 2.5;
    
    const newScale = new THREE.Vector3(
        Math.max(minScale, Math.min(maxScale, scaleX)),
        Math.max(minScale, Math.min(maxScale, scaleY)),
        1
    );
    
    // Apply scale with smoothing
    resizedScreen.scale.lerp(newScale, 0.2);
    
    // Update original scale in userData
    resizedScreen.userData.originalScale = resizedScreen.scale.clone();
    
    // Update resize indicator
    updateResizeIndicator(currentPosition, deltaX > 0 ? 'grow' : 'shrink');
    
    // Show current scale
    const scalePercent = Math.round(resizedScreen.scale.x * 100 / initialScale.x);
    updateResizeText(`${scalePercent}%`);
    
    // Provide subtle haptic feedback
    const scaleDelta = Math.abs(resizedScreen.scale.x - initialScale.x);
    if (navigator.vibrate && scaleDelta > 0.01) {
        navigator.vibrate(Math.min(15, scaleDelta * 50));
    }
}

// Handle touch move events
function onTouchMove(event) {
    if (!isARMode) return;
    
    // Prevent default behavior to avoid scrolling
    event.preventDefault();
    
    // Check for pinch gesture
    if (isPinching && event.touches.length === 2) {
        handlePinchResize(event);
        return;
    }
    
    // Check for resize handle drag
    if (isResizing && resizedScreen) {
        handleResizeHandle(event);
        return;
    }
    
    // Otherwise use standard touch move handling
    handleStandardTouchMove(event);
}

// Function to handle standard single-touch operations
function handleSingleTouch(event) {
    // Get the first touch
    const touch = event.touches[0];
    
    // Convert touch to normalized device coordinates
    const normalizedPoint = new THREE.Vector2(
        (touch.clientX / window.innerWidth) * 2 - 1,
        -(touch.clientY / window.innerHeight) * 2 + 1
    );
    
    // Set up raycaster
    raycaster.setFromCamera(normalizedPoint, camera);
    
    // Check for intersections with screens
    const intersects = raycaster.intersectObjects(screens, true);
    
    // Handle screen interaction
    handleScreenInteraction(intersects, normalizedPoint, touch);
}

// Function to handle standard touch move (separating from pinch handling)
function handleStandardTouchMove(event) {
    // Get the first touch
    const touch = event.touches[0];
    
    // Exit if we're not actively dragging anything
    if (!isDraggingHandle && !isRotatingScreen) return;
    
    // Convert touch to normalized device coordinates
    const normalizedPoint = new THREE.Vector2(
        (touch.clientX / window.innerWidth) * 2 - 1,
        -(touch.clientY / window.innerHeight) * 2 + 1
    );
    
    // Handle moving screen with touch
    if (isDraggingHandle && draggedScreen) {
        moveScreenWithTouch();
    }
    
    // Handle rotating screen with touch
    if (isRotatingScreen && selectedScreen) {
        rotateScreenWithTouch();
    }
}

// Create a resize indicator
function createResizeIndicator(position) {
    // Check if there's already an indicator
    if (scene.userData.resizeIndicator) {
        scene.remove(scene.userData.resizeIndicator);
    }
    
    // Create indicator
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw resize indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw diagonal arrows
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 4;
    
    // Top-left to bottom-right arrow
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(96, 96);
    ctx.stroke();
    
    // Arrow heads
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(32, 42);
    ctx.moveTo(32, 32);
    ctx.lineTo(42, 32);
    ctx.moveTo(96, 96);
    ctx.lineTo(96, 86);
    ctx.moveTo(96, 96);
    ctx.lineTo(86, 96);
    ctx.stroke();
    
    // Bottom-left to top-right arrow
    ctx.beginPath();
    ctx.moveTo(32, 96);
    ctx.lineTo(96, 32);
    ctx.stroke();
    
    // Arrow heads
    ctx.beginPath();
    ctx.moveTo(32, 96);
    ctx.lineTo(32, 86);
    ctx.moveTo(32, 96);
    ctx.lineTo(42, 96);
    ctx.moveTo(96, 32);
    ctx.lineTo(96, 42);
    ctx.moveTo(96, 32);
    ctx.lineTo(86, 32);
    ctx.stroke();
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.15, 0.15, 1);
    
    // Position in world space
    const vector = new THREE.Vector3();
    vector.set(
        (position.x / window.innerWidth) * 2 - 1,
        -(position.y / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);
    
    // Position sprite in front of camera
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance * 0.8));
    sprite.position.copy(pos);
    
    scene.add(sprite);
    scene.userData.resizeIndicator = sprite;
}

// Update resize indicator
function updateResizeIndicator(position, type) {
    const indicator = scene.userData.resizeIndicator;
    if (!indicator) return;
    
    // Update position
    const vector = new THREE.Vector3();
    vector.set(
        (position.x / window.innerWidth) * 2 - 1,
        -(position.y / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);
    
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance * 0.8));
    indicator.position.copy(pos);
    
    // Update visual based on grow/shrink
    if (type === 'grow') {
        indicator.scale.lerp(new THREE.Vector3(0.18, 0.18, 1), 0.3);
    } else {
        indicator.scale.lerp(new THREE.Vector3(0.12, 0.12, 1), 0.3);
    }
}

// Touch end handler
function onTouchEnd(event) {
    // Clean up resize UI
    if (isShowingResizeUI) {
        // Remove the resize indicator
        if (scene.userData.resizeIndicator) {
            scene.remove(scene.userData.resizeIndicator);
            delete scene.userData.resizeIndicator;
        }
        
        // Remove text indicator if it exists
        if (scene.userData.resizeIndicator && 
            scene.userData.resizeIndicator.userData && 
            scene.userData.resizeIndicator.userData.textSprite) {
            scene.remove(scene.userData.resizeIndicator.userData.textSprite);
        }
        
        isShowingResizeUI = false;
        
        // Show resize complete notification
        if (isPinching || isResizing) {
            createModeChangeIndicator('Resize Complete');
        }
    }
    
    // Reset resize state
    if (isPinching || isResizing) {
        // Save state
        if (pinchScreen) {
            pinchScreen.userData.originalScale = pinchScreen.scale.clone();
            // Disable resize visuals
            toggleResize(pinchScreen, false);
        }
        if (resizedScreen) {
            resizedScreen.userData.originalScale = resizedScreen.scale.clone();
            // Disable resize visuals
            toggleResize(resizedScreen, false);
        }
        
        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    }
    
    // Reset resize flags
    isPinching = false;
    pinchScreen = null;
    pinchStartScale = null;
    isResizing = false;
    resizedScreen = null;
    
    // Check if we were dragging with the handle
    if (isDraggingHandle && draggedScreen) {
        console.log("Finished dragging screen:", draggedScreen.userData.id);
        
        // Reset the drag handle appearance if it exists
        if (draggedScreen.userData.dragHandle) {
            // Just reset the color without changing scale for top bar
            draggedScreen.userData.dragHandle.material.color.set(0x333333); // Reset to original dark color
        }
        
        // Save the current position in userData
        draggedScreen.userData.originalPosition = draggedScreen.position.clone();
        
        // Ensure scale is preserved
        if (draggedScreen.userData.originalScale) {
            draggedScreen.scale.copy(draggedScreen.userData.originalScale);
        }
        
        // Provide haptic feedback for completing the drag
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }
        
        // Create a subtle "settle" animation when dropping the screen
        const originalPosition = draggedScreen.position.clone();
        
        // Slight drop effect
        const dropAnimation = () => {
            const downPos = originalPosition.clone();
            downPos.y -= 0.01;  // Move slightly down
            draggedScreen.position.lerp(downPos, 0.5);
            
            setTimeout(() => {
                // Bounce back up
                const upAnimation = () => {
                    draggedScreen.position.lerp(originalPosition, 0.3);
                };
                requestAnimationFrame(upAnimation);
            }, 100);
        };
        requestAnimationFrame(dropAnimation);
        
        // Show a brief confirmation
        createModeChangeIndicator('Position Saved');
        
        // Reset dragging state
        isDraggingHandle = false;
        draggedScreen = null;
    }
    
    // Reset other flags
    isTouchMovingScreen = false;
    isRotatingScreen = false;
}

// Handle progress bar touch for video seeking (updated to work with timeline)
function handleProgressBarTouch(screen, point) {
    if (!screen || !screen.userData || !screen.userData.controls) return false;
    
    // Find the timeline
    const timeline = screen.userData.controls.timeline;
    
    if (!timeline) return false;
    
    // Convert world point to local screen coordinates
    let localPoint = point.clone();
    screen.worldToLocal(localPoint);
    
    // Convert to timeline local coordinates
    let timelineLocalPoint = localPoint.clone();
    timeline.worldToLocal(timelineLocalPoint);
    
    // Get timeline width
    const timelineWidth = timeline.geometry.parameters.width;
    
    // Check if hit is within timeline area
    if (Math.abs(timelineLocalPoint.y) < 0.02 && 
        timelineLocalPoint.x >= -timelineWidth/2 && 
        timelineLocalPoint.x <= timelineWidth/2) {
        
        // Calculate progress based on x position (0-1)
        const progress = (timelineLocalPoint.x + timelineWidth/2) / timelineWidth;
        
        // Update video time
        updateVideoTime(progress);
        
        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(15);
        }
        
        return true;
    }
    
    return false;
}

// Update video time based on progress
function updateVideoTime(progress) {
    import('./ar_media.js').then(mediaModule => {
        if (mediaModule.updateVideoTime) {
            mediaModule.updateVideoTime(progress);
        } else {
            console.error("updateVideoTime function not found in media module");
        }
    }).catch(error => {
        console.error("Error importing media module:", error);
    });
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

// Function to delete the last interacted screen (most recently selected)
function deleteLastScreen() {
    // If no screens, do nothing
    if (!screens || screens.length === 0) {
        console.log("No screens to delete");
        createModeChangeIndicator('No Screens to Delete');
        return false;
    }
    
    // Get the screen to delete (either the selected one or the last one in the array)
    const screenToDelete = selectedScreen || screens[screens.length - 1];
    
    if (!screenToDelete) {
        console.log("No screen selected for deletion");
        return false;
    }
    
    console.log("Deleting screen with ID:", screenToDelete.userData ? screenToDelete.userData.id : "unknown");
    
    // Create visual deletion effect
    createDeletionEffect(screenToDelete.position.clone());
    
    // Remove from scene
    scene.remove(screenToDelete);
    
    // Remove from screens array
    const index = screens.indexOf(screenToDelete);
    if (index > -1) {
        screens.splice(index, 1);
    }
    
    // If the selected screen was deleted, reset selectedScreen
    if (selectedScreen === screenToDelete) {
        selectedScreen = screens.length > 0 ? screens[screens.length - 1] : null;
        
        // If we have a new selected screen, select it
        if (selectedScreen) {
            selectScreen(selectedScreen);
        }
    }
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate([30, 20, 40]); // Pattern for "delete" feel
    }
    
    createModeChangeIndicator('Screen Deleted');
    return true;
}

// Create deletion visual effect
function createDeletionEffect(position) {
    // Create particles for deletion effect
    const particleCount = 20;
    const particleGroup = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 0.02 + 0.01;
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random()),
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Random position within screen bounds
        particle.position.set(
            position.x + (Math.random() - 0.5) * 0.5,
            position.y + (Math.random() - 0.5) * 0.5,
            position.z + (Math.random() - 0.5) * 0.1
        );
        
        // Random velocity
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
        
        particleGroup.add(particle);
    }
    
    scene.add(particleGroup);
    
    // Animate particles
    const startTime = performance.now();
    const duration = 1000; // 1 second
    
    function animateParticles() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
            // Update each particle
            particleGroup.children.forEach(particle => {
                // Move based on velocity
                particle.position.add(particle.userData.velocity);
                
                // Fade out
                particle.material.opacity = 0.8 * (1 - progress);
                
                // Rotate
                particle.rotation.x += 0.01;
                particle.rotation.y += 0.01;
            });
            
            requestAnimationFrame(animateParticles);
        } else {
            // Clean up
            particleGroup.children.forEach(particle => {
                particle.geometry.dispose();
                particle.material.dispose();
            });
            scene.remove(particleGroup);
        }
    }
    
    requestAnimationFrame(animateParticles);
}

// Rotate screen based on touch movement
function rotateScreenWithTouch() {
    if (!selectedScreen) return;
    
    // Calculate deltas from initial position
    const deltaX = currentTouchPosition.x - initialMousePosition.x;
    const deltaY = currentTouchPosition.y - initialMousePosition.y;
    
    // Apply rotation - Y axis movement controls X rotation and vice versa
    selectedScreen.rotation.x = initialRotation.x + (deltaY * 2);
    selectedScreen.rotation.y = initialRotation.y + (deltaX * 2);
    
    // Limit rotation angles
    selectedScreen.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, selectedScreen.rotation.x));
}

// Move screen based on touch movement
function moveScreenWithTouch() {
    if (!selectedScreen) return;
    
    // Create more direct movement with less complexity
    // Use a simplified approach that always works
    
    // Get the camera's forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // Calculate the touch delta
    const touchDelta = new THREE.Vector2(
        currentTouchPosition.x - initialTouchPosition.x,
        currentTouchPosition.y - initialTouchPosition.y
    );
    
    // Scale the movement (adjust multiplier as needed)
    const movementSpeed = 2.0;
    
    // Create movement vector in world space
    const movement = new THREE.Vector3()
        .addScaledVector(right, touchDelta.x * movementSpeed)
        .addScaledVector(new THREE.Vector3(0, 1, 0), touchDelta.y * movementSpeed);
    
    // Apply movement directly
    selectedScreen.position.add(movement);
    
    // Ensure screen always faces the camera
    selectedScreen.lookAt(camera.position);
    
    // Keep the screen at a reasonable distance
    const distanceToCamera = selectedScreen.position.distanceTo(camera.position);
    if (distanceToCamera < 0.5 || distanceToCamera > 5) {
        // Get direction from camera to screen
        const direction = selectedScreen.position.clone().sub(camera.position).normalize();
        
        // Set new position at ideal distance
        const idealDistance = THREE.MathUtils.clamp(distanceToCamera, 0.5, 5);
        selectedScreen.position.copy(camera.position.clone().add(direction.multiplyScalar(idealDistance)));
    }
    
    // Optional: Add visual feedback
    createMoveIndicator(selectedScreen.position.clone(), 0.03);
    
    // Update control panel if needed
    if (controlPanel && controlPanel.userData && controlPanel.userData.update) {
        controlPanel.userData.update();
    }
}

// Create a visual indicator for movement feedback
function createMoveIndicator(position, size) {
    // Create a small dot that fades quickly
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.3
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.copy(position);
    
    // Add to scene
    scene.add(indicator);
    
    // Animate fading out
    const startTime = performance.now();
    const duration = 200; // 200ms
    
    function fadeOut() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
            material.opacity = 0.3 * (1 - progress);
            indicator.scale.x = 1 - (progress * 0.5);
            indicator.scale.y = 1 - (progress * 0.5);
            indicator.scale.z = 1 - (progress * 0.5);
            requestAnimationFrame(fadeOut);
        } else {
            scene.remove(indicator);
            geometry.dispose();
            material.dispose();
        }
    }
    
    requestAnimationFrame(fadeOut);
}

// Update resize indicator text
function updateResizeText(text) {
    const indicator = scene.userData.resizeIndicator;
    if (!indicator || !text) return;
    
    // Update the text if we already have a text sprite
    if (indicator.userData && indicator.userData.textSprite) {
        const textSprite = indicator.userData.textSprite;
        
        // Update the canvas with new text
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#48f';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, canvas.width/2, canvas.height/2);
        
        // Update the texture
        if (textSprite.material.map) {
            textSprite.material.map.dispose();
        }
        textSprite.material.map = new THREE.CanvasTexture(canvas);
        textSprite.material.needsUpdate = true;
        
        return;
    }
    
    // Create a new text sprite if it doesn't exist
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#48f';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.15, 0.1, 1);
    
    // Position above the resize indicator
    sprite.position.copy(indicator.position);
    sprite.position.y += 0.15;
    
    scene.add(sprite);
    
    // Store a reference to the text sprite
    indicator.userData = indicator.userData || {};
    indicator.userData.textSprite = sprite;
} 