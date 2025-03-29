// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { screens, selectScreen, updateKeyboardPosition, createNewBrowserScreen } from './ar_screens.js';
import { virtualKeyboard, showNotification, toggleModeButton, controlPanel } from './ar_ui.js';
import { toggleVideoPlayback, toggleVideoMute, videoElement, duration } from './ar_media.js';

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
    const action = button.userData.action;
    console.log("Button action:", action);
    
    // Control panel buttons
    if (action === 'newScreen') {
        createNewScreen();
    } else if (action === 'moveScreen') {
        toggleMoveMode(button);
    } else if (action === 'rotateScreen') {
        toggleRotateMode(button);
    }
    
    // Screen video control buttons
    else if (action === 'playButton') {
        toggleVideoPlayback();
    } else if (action === 'volumeButton') {
        toggleVideoMute();
    } else if (action === 'resizeButton') {
        toggleResize(button.userData.screen);
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

// Touch start handler
function onTouchStart(event) {
    event.preventDefault();
    
    console.log("Touch start detected");
    
    // Single touch handling
    const touch = event.touches[0];
    
    if (!touch) {
        console.log("No valid touch point");
        return;
    }
    
    console.log("Processing single touch");
    
    // Convert touch to normalized device coordinates
    initialTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    currentTouchPosition.copy(initialTouchPosition);
    
    console.log("Touch position:", initialTouchPosition.x.toFixed(3), initialTouchPosition.y.toFixed(3));
    
    // Update raycaster
    raycaster.setFromCamera(initialTouchPosition, camera);
    
    // Double tap detection
    const now = performance.now();
    const doubleTapDetected = (now - lastTapTime) < 300;
    lastTapTime = now;
    
    // FIRST CHECK FOR DRAG HANDLES
    // Create a list of all drag handles in the scene
    const dragHandles = [];
    screens.forEach(screen => {
        if (screen.userData && screen.userData.dragHandle) {
            dragHandles.push(screen.userData.dragHandle);
        }
    });
    
    console.log("Checking for drag handles:", dragHandles.length);
    const handleIntersects = raycaster.intersectObjects(dragHandles, true);
    
    if (handleIntersects.length > 0) {
        const hitObject = handleIntersects[0].object;
        console.log("Hit a drag handle or its child:", hitObject.uuid);
        
        // Find the actual handle (might be the child icon)
        let dragHandle = hitObject;
        if (hitObject.parent && hitObject.parent.userData && hitObject.parent.userData.type === 'dragHandle') {
            dragHandle = hitObject.parent;
        }
        
        // Get the screen this handle belongs to
        const screen = dragHandle.userData.screen;
        if (screen) {
            console.log("Starting drag on screen:", screen.userData.id);
            
            // Set up drag state
            isDraggingHandle = true;
            draggedScreen = screen;
            
            // Preserve original scale if not already stored
            if (!screen.userData.originalScale) {
                screen.userData.originalScale = screen.scale.clone();
            } else {
                // Restore original scale when starting drag
                screen.scale.copy(screen.userData.originalScale);
            }
            
            // Select this screen
            selectScreen(screen);
            selectedScreen = screen;
            
            // Calculate offset from screen position to touch point
            // This ensures the screen doesn't jump when starting to drag
            const intersectionPoint = handleIntersects[0].point;
            dragOffset.copy(screen.position).sub(intersectionPoint);
            
            // Visual feedback - make handle "glow"
            const originalColor = dragHandle.material.color.clone();
            dragHandle.material.color.set(0x00ff00); // Bright green
            
            // Scale up slightly for visual feedback
            dragHandle.scale.set(1.2, 1.2, 1.2);
            
            // Reset after a moment
            setTimeout(() => {
                if (isDraggingHandle) {
                    dragHandle.material.color.set(0x4CAF50); // Back to regular green but maintain scale
                } else {
                    dragHandle.material.color.copy(originalColor);
                    dragHandle.scale.set(1, 1, 1);
                }
            }, 300);
            
            // Provide haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(40);
            }
            
            createModeChangeIndicator('Dragging Screen');
            return;
        }
    }
    
    // Check for button intersections if not dragging
    const buttons = findAllButtons();
    console.log("Checking", buttons.length, "buttons for intersection");
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
        const buttonObj = getButtonFromIntersect(buttonIntersects[0].object);
        if (buttonObj) {
            console.log("Button touched:", buttonObj.userData.action);
            
            // Visual feedback
            const originalColor = buttonObj.material.color.clone();
            buttonObj.material.color.set(0x4FC3F7);
            
            // Scale up and back for button press effect
            const originalScale = buttonObj.scale.clone();
            buttonObj.scale.multiplyScalar(1.2);
            
            setTimeout(() => {
                buttonObj.material.color.copy(originalColor);
                buttonObj.scale.copy(originalScale);
            }, 200);
            
            // Provide haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(40);
            }
            
            // Handle the button action
            handleButtonAction(buttonObj);
            return;
        }
    }
    
    // Rest of code for regular screen interaction...
    // Check for screen intersections
    const screenObjects = [];
    screens.forEach((screen, index) => {
        console.log("Adding screen", index, "to detection list");
        screenObjects.push(screen);
        screen.children.forEach(child => {
            if (child.isMesh) {
                screenObjects.push(child);
            }
        });
    });
    
    const screenIntersects = raycaster.intersectObjects(screenObjects, true);
    
    if (screenIntersects.length > 0) {
        const screenObj = getScreenFromIntersect(screenIntersects[0].object);
        if (screenObj) {
            console.log("Screen touched:", screenObj.userData.id);
            
            // Select the screen
            selectScreen(screenObj);
            selectedScreen = screenObj;
            
            // Double tap to toggle resize
            if (doubleTapDetected) {
                console.log("Double tap detected, toggling resize");
                toggleResize(screenObj);
                
                // Provide haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate([30, 20, 30]);
                }
                
                createModeChangeIndicator('Size Changed');
                return;
            }
            
            // Flash highlight around selected screen
            flashScreenHighlight(screenObj);
            createModeChangeIndicator('Screen Selected');
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

// Touch move handler
function onTouchMove(event) {
    // EXTREME VERBOSE LOGGING FOR DEBUGGING
    console.log("===== TOUCH MOVE EVENT =====");
    console.log("Number of touches:", event.touches.length);
    console.log("isDraggingHandle:", isDraggingHandle);
    console.log("draggedScreen:", draggedScreen ? draggedScreen.userData.id : "none");
    
    // Always prevent default to avoid browser gestures
    event.preventDefault();
    
    // Make sure we have a valid touch point
    const touch = event.touches[0];
    if (!touch) {
        console.log("No valid touch point");
        return;
    }
    
    // Convert touch to normalized device coordinates
    const previousTouchPosition = currentTouchPosition.clone();
    currentTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    currentTouchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    console.log("Touch position:", 
        currentTouchPosition.x.toFixed(3), 
        currentTouchPosition.y.toFixed(3));
    console.log("Previous position:", 
        previousTouchPosition.x.toFixed(3), 
        previousTouchPosition.y.toFixed(3));
    console.log("Delta:", 
        (currentTouchPosition.x - previousTouchPosition.x).toFixed(3),
        (currentTouchPosition.y - previousTouchPosition.y).toFixed(3));
    
    // Handle dragging via the drag handle
    if (isDraggingHandle && draggedScreen) {
        console.log("ATTEMPTING TO MOVE SCREEN");
        
        try {
            // Preserve original scale
            if (draggedScreen.userData && draggedScreen.userData.originalScale) {
                // Ensure scale doesn't change during movement
                draggedScreen.scale.copy(draggedScreen.userData.originalScale);
            }
            
            // SIMPLE DIRECT MOVEMENT APPROACH - Should work regardless of raycasting
            // Calculate movement delta from touch
            const deltaX = currentTouchPosition.x - previousTouchPosition.x;
            const deltaY = currentTouchPosition.y - previousTouchPosition.y;
            
            // Get camera's right and up vectors for moving in screen space
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            
            // Scale for more noticeable movement
            const moveScale = 0.15; // Slightly increase sensitivity
            
            // Create movement vector
            const movement = new THREE.Vector3()
                .addScaledVector(cameraRight, deltaX * moveScale)
                .addScaledVector(cameraUp, deltaY * moveScale);
            
            console.log("Direct movement vector:", 
                movement.x.toFixed(5),
                movement.y.toFixed(5),
                movement.z.toFixed(5));
            
            // Apply movement directly
            draggedScreen.position.add(movement);
            
            // Make screen face the camera
            draggedScreen.lookAt(camera.position);
            
            // Create visual feedback
            createMoveIndicator(draggedScreen.position.clone(), 0.03);
            
            // No need for the raycasting approach since direct movement works well
            
        } catch (error) {
            console.error("Error in drag movement:", error);
        }
        
        return;
    }
    
    // Handle other touch interactions as before...
    if (isRotatingScreen) {
        console.log("Rotating screen");
        rotateScreenWithTouch();
    }
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

// Touch end handler
function onTouchEnd(event) {
    // Check if we were dragging with the handle
    if (isDraggingHandle && draggedScreen) {
        console.log("Finished dragging screen:", draggedScreen.userData.id);
        
        // Reset the drag handle appearance
        if (draggedScreen.userData.dragHandle) {
            draggedScreen.userData.dragHandle.material.color.set(0x4CAF50);
            draggedScreen.userData.dragHandle.scale.set(1, 1, 1);
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
    isPinching = false;
}

// Progress bar touch handler
function handleProgressBarTouch(screen, point) {
    if (!screen) return;
    
    // Calculate progress based on touch position
    const progressBar = screen.children.find(child => 
        child.material && 
        child.material.color.getHex() === 0x444444 && 
        child.position.y === -0.21);
    
    if (progressBar) {
        // Get local point in the progress bar's coordinate system
        const localPoint = progressBar.worldToLocal(point.clone());
        
        // Calculate progress (from -0.5 to 0.5 local coordinates)
        const progress = (localPoint.x + 0.5) / 1;
        
        // Update video time
        updateVideoTime(progress);
    }
}

// Update video time based on progress
function updateVideoTime(progress) {
    if (!videoElement) return;
    
    // Clamp progress to 0-1 range
    progress = Math.max(0, Math.min(1, progress));
    
    // Set video time
    const newTime = duration * progress;
    videoElement.currentTime = newTime;
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