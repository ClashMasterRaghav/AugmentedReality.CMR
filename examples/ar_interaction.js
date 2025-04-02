// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { 
    screens, selectScreen, updateKeyboardPosition, createNewBrowserScreen,
    createYouTubeScreen, createDuckDuckGoScreen, createGoogleMapsScreen, createElectronAppScreen
} from './ar_screens.js';
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

// Panel dragging variables
let isPanelBeingDragged = false;
let panelDragOffset = new THREE.Vector3();
let initialPanelPosition = new THREE.Vector3();
let initialPanelQuaternion = new THREE.Quaternion();

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

// Get button from an intersected object
function getButtonFromIntersect(object) {
    // If object is a button, return it directly
    if (object.userData && object.userData.type === 'button') {
        console.log("Direct button hit:", object.userData.action);
        return object;
    }
    
    // Check if the parent is a button (common for icon meshes)
    if (object.parent && object.parent.userData && object.parent.userData.type === 'button') {
        console.log("Parent button hit:", object.parent.userData.action);
        return object.parent;
    }
    
    // Check if the grandparent is a button (for nested structures)
    if (object.parent && object.parent.parent && 
        object.parent.parent.userData && object.parent.parent.userData.type === 'button') {
        console.log("Grandparent button hit:", object.parent.parent.userData.action);
        return object.parent.parent;
    }
    
    // Traverse up to find a button (up to 5 levels)
    let current = object;
    let level = 0;
    
    while (current.parent && level < 5) {
        current = current.parent;
        level++;
        
        if (current.userData && current.userData.type === 'button') {
            console.log(`Found button at level ${level}:`, current.userData.action);
            return current;
        }
    }
    
    // Special handling for screen video control buttons
    if (object.parent) {
        // Check if we're inside a screen
        let screen = null;
        let target = object.parent;
        
        // Traverse up to find the screen
        for (let i = 0; i < 5; i++) {
            if (!target) break;
            
            if (target.userData && target.userData.type === 'screen') {
                screen = target;
                break;
            }
            target = target.parent;
        }
        
        if (screen) {
            // If we found a screen, check its direct children for buttons
            for (let i = 0; i < screen.children.length; i++) {
                const child = screen.children[i];
                if (child.userData && child.userData.type === 'button') {
                    // Check if this button contains our hit object
                    let foundObject = false;
                    
                    // Check if the hit object is this button or a descendant
                    child.traverse((obj) => {
                        if (obj === object) {
                            foundObject = true;
                        }
                    });
                    
                    if (foundObject) {
                        console.log("Found screen button via traversal:", child.userData.action);
                        return child;
                    }
                    
                    // Check distance from hit point to button (for near misses)
                    if (object.worldToLocal && child.getWorldPosition) {
                        const hitPoint = new THREE.Vector3();
                        object.getWorldPosition(hitPoint);
                        
                        const buttonPoint = new THREE.Vector3();
                        child.getWorldPosition(buttonPoint);
                        
                        const distance = hitPoint.distanceTo(buttonPoint);
                        if (distance < 0.05) { // If within 5cm
                            console.log("Found nearby button:", child.userData.action, "distance:", distance);
                            return child;
                        }
                    }
                }
            }
        }
    }
    
    console.log("No button found from intersect");
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
    console.log(`Checking for interactions with ${buttons.length} buttons`);
    
    // Use a larger threshold for better button detection
    raycaster.params.Line.threshold = 0.1;
    raycaster.params.Points.threshold = 0.1;
    
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
        console.log(`Ray intersected with ${buttonIntersects.length} button objects`);
        
        // Get closest intersection
        const intersection = buttonIntersects[0];
        console.log(`Closest intersection: distance=${intersection.distance.toFixed(3)}, object=${intersection.object.uuid.substring(0,8)}`);
        
        const buttonObj = getButtonFromIntersect(intersection.object);
        if (buttonObj) {
            console.log(`Found button: action=${buttonObj.userData.action}`);
            handleButtonAction(buttonObj);
            return;
        } else {
            console.log("Button parent not found from intersection");
        }
    } else {
        console.log("No button intersections found");
    }
    
    // Then check for screen selection
    const screenIntersects = raycaster.intersectObjects(screens, true);
    
    if (screenIntersects.length > 0) {
        const screenObj = getScreenFromIntersect(screenIntersects[0].object);
        if (screenObj) {
            console.log(`Selected screen: ID=${screenObj.userData.id}`);
            // Select screen and update global selectedScreen
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

// Handle different button actions
function handleButtonAction(button) {
    if (!button || !button.userData || !button.userData.action) return;
    
    const action = button.userData.action;
    
    // Handle different button actions
    switch (action) {
        case 'newScreen':
            createNewScreenInFrontOfCamera();
            break;
            
        case 'deleteScreen':
            deleteLastScreen();
            break;
            
        case 'toggleDragMode':
            toggleDragMode(button);
            break;
            
        case 'moveMode':
            toggleMoveMode(button);
            break;
            
        case 'rotateMode':
            toggleRotateMode(button);
            break;
            
        case 'selectScreenType':
            if (button.userData.screenType) {
                createScreenWithType(button.userData.screenType);
            }
            break;
            
        case 'playButton':
            if (videoControlFunctions.togglePlayback) {
                videoControlFunctions.togglePlayback();
            }
            break;
            
        case 'volumeButton':
            if (videoControlFunctions.toggleMute) {
                videoControlFunctions.toggleMute();
            }
            break;
            
        default:
            console.log("Unhandled button action:", action);
    }
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(50); // Short vibration for button press
    }
}

// Create a new screen in front of camera - helper for button action
function createNewScreenInFrontOfCamera() {
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    // Position screen in front of camera at a consistent distance of 1.5m (same as initial screen)
    const screenPosition = cameraPosition.clone().add(cameraDirection.multiplyScalar(1.5));
    
    // Create new screen at this position
    const newScreen = createNewBrowserScreen(screenPosition);
    
    // Make it face the camera
    newScreen.lookAt(camera.position);
    
    // Ensure consistent scale
    newScreen.scale.set(1.0, 1.0, 1.0);
    
    // Add visual feedback
    createModeChangeIndicator('New Screen Created');
    
    // Select this screen
    selectScreen(newScreen);
    
    console.log("Created new screen in front of camera");
    
    return newScreen;
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
    
    // Get control panel buttons more explicitly
    const controlPanels = scene.children.filter(obj => 
        obj.userData && obj.userData.type === 'controlPanel');
    
    console.log(`Found ${controlPanels.length} control panels`);
    
    controlPanels.forEach((panel, panelIndex) => {
        const panelButtons = [];
        panel.children.forEach(child => {
            if (child.userData && child.userData.type === 'button') {
                panelButtons.push(child);
                buttons.push(child);
            }
        });
        console.log(`Panel ${panelIndex}: Found ${panelButtons.length} buttons`);
    });
    
    // Get screen buttons
    const screenButtons = [];
    screens.forEach((screen, screenIndex) => {
        const buttonsForThisScreen = [];
        screen.children.forEach(child => {
            if (child.userData && child.userData.type === 'button') {
                buttonsForThisScreen.push(child);
                buttons.push(child);
                screenButtons.push(child);
                
                // Ensure button is always interactive by setting renderOrder
                child.renderOrder = 10; // Higher renderOrder ensures it renders on top
            }
        });
        if (buttonsForThisScreen.length > 0) {
            console.log(`Screen ${screenIndex}: Found ${buttonsForThisScreen.length} buttons`);
        }
    });
    
    console.log(`Found total ${buttons.length} buttons (${buttons.length - screenButtons.length} panel + ${screenButtons.length} screen)`);
    
    return buttons;
}

// Touch start handler
function onTouchStart(event) {
    // Get normalized touch coordinates
    const touch = event.touches[0];
    const touchX = (touch.clientX / window.innerWidth) * 2 - 1;
    const touchY = -((touch.clientY / window.innerHeight) * 2 - 1);
    touchPos.set(touchX, touchY);
    
    // Store current touch position for calculations
    initialTouchPosition.set(touchX, touchY);
    currentTouchPosition.set(touchX, touchY);
    
    // Setup raycaster
    raycaster.setFromCamera(touchPos, camera);
    
    // Check if virtual keyboard is active and handle key press
    if (virtualKeyboard && virtualKeyboard.visible) {
        const keyIntersects = raycaster.intersectObject(virtualKeyboard, true);
        if (keyIntersects.length > 0) {
            const key = getButtonFromIntersect(keyIntersects[0].object);
            if (key && key.userData && key.userData.key) {
                // Highlight the key and handle the keypress
                selectedKey = key;
                if (key.userData.originalColor) {
                    key.material.color.setHex(key.userData.hoverColor || 0xffcc00);
                }
                
                // Provide haptic feedback for key press
                if (navigator.vibrate) {
                    navigator.vibrate(20); // Very short vibration for key tap
                }
                
                console.log("Keyboard key pressed:", key.userData.key);
                // Key handling in onTouchEnd
            }
            return;
        }
    }
    
    // First priority: check if we're touching the control panel or its buttons
    // Control panel always works regardless of drag mode
    const panelIntersects = raycaster.intersectObject(controlPanel, true);
    if (panelIntersects.length > 0) {
        // Find if we've hit a button on the control panel
        const button = getButtonFromIntersect(panelIntersects[0].object);
        if (button) {
            console.log("Control panel button touched:", button.userData.action);
            selectedButton = button;
            
            // Visual feedback - highlight button
            if (button.material && button.userData.hoverColor) {
                // Store original color if needed
                if (!button.userData.originalColor) {
                    button.userData.originalColor = button.material.color ? 
                        button.material.color.getHex() : 0xffffff;
                }
                
                if (button.material.color) {
                    button.material.color.setHex(button.userData.hoverColor);
                } else if (button.material.map) {
                    // For textured buttons, scale up slightly instead
                    button.scale.set(1.05, 1.05, 1.05);
                }
            }
            
            return;
        }
        
        // Check if we've hit the drag handle
        const dragHandle = panelIntersects.find(intersect => 
            intersect.object.userData && 
            (intersect.object.userData.type === 'dragHandle' || 
             intersect.object.userData.isPartOfDragHandle))?.object;
             
        if (dragHandle) {
            console.log("Control panel drag handle touched");
            isControlPanelDragging = true;
            
            // Store initial positions for the drag
            initialDragPoint.copy(panelIntersects[0].point);
            initialPanelPosition.copy(controlPanel.position);
            initialPanelRotation.copy(controlPanel.rotation);
            
            // Visualize the drag handle being touched
            if (dragHandle && dragHandle.material) {
                // Store original color if not already stored
                if (!dragHandle.userData.originalColor) {
                    dragHandle.userData.originalColor = dragHandle.material.color.getHex();
                }
                
                // Highlight with hover color
                if (dragHandle.userData.hoverColor) {
                    dragHandle.material.color.setHex(dragHandle.userData.hoverColor);
                } else {
                    dragHandle.material.color.set(0x81D4FA);
                }
                
                // Add slight scale-up effect
                dragHandle.scale.set(1.05, 1.05, 1.05);
            }
            
            // Add visual feedback
            createModeChangeIndicator('Panel Unlocked - Drag to Position');
            
            return;
        }
    }
    
    // Identify all screens close to our touch ray
    const screenIntersections = [];
    
    // Cast ray against all screens to find potential candidates
    screens.forEach(screen => {
        // Use a more generous ray for each screen
        const intersects = raycaster.intersectObject(screen, true);
        if (intersects.length > 0) {
            // Store information about the hit including distance
            screenIntersections.push({
                screen: screen,
                distance: intersects[0].distance,
                object: intersects[0].object,
                point: intersects[0].point // Store intersection point
            });
        }
    });
    
    // Sort by distance so we prioritize closer screens
    screenIntersections.sort((a, b) => a.distance - b.distance);
    
    // PRIORITY 1: Check for button interactions - always process control panel buttons
    const buttons = findAllButtons();
    console.log("Checking", buttons.length, "buttons for intersection");
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
        const button = getButtonFromIntersect(buttonIntersects[0].object);
        if (button) {
            console.log("Button touched:", button.userData.action);
            selectedButton = button;
            
            // Visual feedback - highlight button
            if (button.material && button.userData.hoverColor) {
                // Store original color if needed
                if (!button.userData.originalColor) {
                    button.userData.originalColor = button.material.color ? 
                        button.material.color.getHex() : 0xffffff;
                }
                
                if (button.material.color) {
                    button.material.color.setHex(button.userData.hoverColor);
                } else if (button.material.map) {
                    // For textured buttons, scale up slightly instead
                    button.scale.set(1.05, 1.05, 1.05);
                }
            }
            
            return;
        }
    }
    
    // If we have screen intersections, decide what to do based on the current mode
    if (screenIntersections.length > 0) {
        const closestHit = screenIntersections[0];
        
        // Check if we're in drag mode (controlled by the toggle)
        if (window.dragModeEnabled) {
            console.log("Drag mode enabled - initiating screen drag");
            
            // Find the closest screen to our touch ray
            const screenToSelect = closestHit.screen;
            setSelectedScreen(screenToSelect);
            
            // Track the interaction start point and screen's initial position
            isDraggingScreen = true;
            initialDragPoint.copy(closestHit.point);
            initialScreenPosition.copy(screenToSelect.position);
            initialScreenRotation.copy(screenToSelect.rotation);
            
            // Visual feedback for drag start
            flashScreenHighlight(screenToSelect);
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([15, 15, 30]); // Drag pattern
            }
            
            return; // Skip button interaction in drag mode
        }
        // INTERACT MODE: Allow normal screen interaction but disable dragging
        else {
            // PRIORITY 1: Check for button interactions on the screen
            const hitObject = closestHit.object;
            
            // Debug what we've hit
            console.log("Hit object:", hitObject.userData ? hitObject.userData.type : "unknown");
            
            // Check if we hit a button
            if (hitObject.userData && hitObject.userData.type === 'button') {
                console.log("Screen button touched:", hitObject.userData.action);
                selectedButton = hitObject;
                
                // Visual feedback - highlight button
                if (hitObject.material && hitObject.userData.hoverColor) {
                    // Store original color if needed
                    if (!hitObject.userData.originalColor) {
                        hitObject.userData.originalColor = hitObject.material.color ? 
                            hitObject.material.color.getHex() : 0xffffff;
                    }
                    
                    if (hitObject.material.color) {
                        hitObject.material.color.setHex(hitObject.userData.hoverColor);
                    } else if (hitObject.material.map) {
                        // For textured buttons, scale up slightly instead
                        hitObject.scale.set(1.05, 1.05, 1.05);
                    }
                }
                
                return;
            }
            
            // Select the hit screen
            const screenToSelect = getScreenFromIntersect(hitObject);
            if (screenToSelect) {
                setSelectedScreen(screenToSelect);
                flashScreenHighlight(screenToSelect);
            }
        }
    }
}

// Touch move handler updated for drag modes
function onTouchMove(event) {
    // Skip processing if no active touch
    if (event.touches.length === 0) return;
    
    // Get normalized touch coordinates
    const touch = event.touches[0];
    const touchX = (touch.clientX / window.innerWidth) * 2 - 1;
    const touchY = -((touch.clientY / window.innerHeight) * 2 - 1);
    
    // Update current touch position
    currentTouchPosition.set(touchX, touchY);
    
    // Calculate delta from last position
    const deltaX = touchX - touchPos.x;
    const deltaY = touchY - touchPos.y;
    
    // Update the stored touch position
    touchPos.set(touchX, touchY);
    
    // Update raycaster with new touch position
    raycaster.setFromCamera(touchPos, camera);
    
    // Handle control panel dragging - always enabled regardless of mode
    if (isControlPanelDragging && controlPanel) {
        // Calculate the hit point in 3D space
        const hitTestResults = raycaster.intersectObjects(scene.children, true);
        
        // Use the hit point if ray intersects something, otherwise use a point in front of the camera
        let targetPoint;
        if (hitTestResults.length > 0) {
            targetPoint = hitTestResults[0].point;
        } else {
            // Fall back to a point in front of the camera
            const cameraPosition = new THREE.Vector3();
            camera.getWorldPosition(cameraPosition);
            const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            targetPoint = cameraPosition.clone().addScaledVector(cameraDirection, 0.5);
        }
        
        // Calculate the move delta
        const moveDelta = new THREE.Vector3().subVectors(targetPoint, initialDragPoint);
        
        // Create a new position by adding the move delta to the initial position
        const newPosition = initialPanelPosition.clone().add(moveDelta);
        
        // Apply position with smoothing
        controlPanel.position.lerp(newPosition, 0.3);
        
        // Make the panel face the camera
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.negate(); // Panel should face camera, so negate the direction
        
        // Create a target rotation
        const targetRotation = new THREE.Euler().setFromQuaternion(
            new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1), // Panel's forward direction
                cameraDirection // Direction panel should face
            )
        );
        
        // Apply rotation with smoothing
        controlPanel.rotation.x = THREE.MathUtils.lerp(controlPanel.rotation.x, targetRotation.x, 0.2);
        controlPanel.rotation.y = THREE.MathUtils.lerp(controlPanel.rotation.y, targetRotation.y, 0.2);
        controlPanel.rotation.z = THREE.MathUtils.lerp(controlPanel.rotation.z, targetRotation.z, 0.2);
        
        return;
    }
    
    // Handle screen dragging when in drag mode
    if (isDraggingScreen && selectedScreen && window.dragModeEnabled) {
        moveScreenWithTouch();
        return;
    }
}

// Move screen based on touch movement
function moveScreenWithTouch() {
    if (!selectedScreen) return;
    
    // Calculate movement based on touch delta
    const touchDelta = new THREE.Vector2(
        currentTouchPosition.x - initialTouchPosition.x,
        currentTouchPosition.y - initialTouchPosition.y
    );
    
    // Create a temporary camera-aligned plane to project movement
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    
    // Calculate movement vectors scaled by a factor to make dragging more responsive
    const moveFactor = 1.5; // Increase factor for more responsive movement
    
    // Create movement vector from touch delta
    const moveVector = new THREE.Vector3()
        .add(cameraRight.clone().multiplyScalar(touchDelta.x * moveFactor))
        .add(cameraUp.clone().multiplyScalar(touchDelta.y * moveFactor));
    
    // Apply movement to the screen's position
    const newPosition = initialScreenPosition.clone().add(moveVector);
    
    // Constrain y-position to reasonable bounds to prevent floating too high or going through floor
    newPosition.y = Math.max(0.2, Math.min(2.0, newPosition.y));
    
    // Apply position with slight smoothing
    selectedScreen.position.lerp(newPosition, 0.7);
    
    // Always make screen face the camera for better visibility
    const lookDirection = camera.position.clone().sub(selectedScreen.position).normalize();
    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1), // Screen forward direction
        lookDirection // Direction to camera
    );
    
    // Apply rotation with slight smoothing
    selectedScreen.quaternion.slerp(targetQuaternion, 0.3);
    
    // Create a visual indicator for movement
    createMoveIndicator(selectedScreen.position.clone(), 0.05);
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
    // Handle end of control panel dragging
    if (isPanelBeingDragged && controlPanel) {
        console.log("Finished dragging control panel");
        
        // Reset the drag handle appearance
        const dragHandle = controlPanel.children.find(
            child => child.userData && child.userData.isDragArea
        );
        
        if (dragHandle) {
            // Restore original color
            if (dragHandle.userData.originalColor) {
                dragHandle.material.color.setHex(dragHandle.userData.originalColor);
            }
            
            // Reset scale
            dragHandle.scale.set(1.0, 1.0, 1.0);
        }
        
        // Save the current position and mark panel as manually positioned
        controlPanel.userData.isDragging = false;
        controlPanel.userData.manuallyPositioned = true; // Mark as manually positioned to prevent auto repositioning
        isPanelBeingDragged = false;
        
        // Create visual feedback
        createModeChangeIndicator('Panel Position Locked');
        
        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([20, 10, 20]); // Pattern for "release" feel
        }
        
        // Slight bounce animation
        const finalPosition = controlPanel.position.clone();
        
        const bounceAnimation = () => {
            // More noticeable bounce effect like screen dragging
            controlPanel.position.y += 0.015;
            
            setTimeout(() => {
                // Smoothly settle back to final position
                controlPanel.position.lerp(finalPosition, 0.3);
            }, 100);
        };
        
        bounceAnimation();
        return;
    }
    
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
    isPinching = false;
}

// Handle progress bar touch for video seeking
function handleProgressBarTouch(screen, point) {
    // Progress bar has been removed, so this function no longer needs to do anything
    // Keeping the function to maintain code structure in case we need to reimplement
    return false;
}

// Update video time based on progress
function updateVideoTime(progress) {
    // Progress bar has been removed, so this function no longer needs to do anything
    // Keeping the function to maintain code structure in case we need to reimplement
}

// Create a floating text indicator for mode changes
function createModeChangeIndicator(message) {
    // Create a group for the indicator
    const indicator = new THREE.Group();
    
    // Create background plane
    const bgWidth = 0.3; // Wider for longer messages
    const bgHeight = 0.08;
    const backgroundGeometry = new THREE.PlaneGeometry(bgWidth, bgHeight);
    
    // Create canvas for background texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw background with gradient and rounded corners
    const cornerRadius = 20;
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(canvas.width - cornerRadius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    ctx.lineTo(canvas.width, canvas.height - cornerRadius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    ctx.lineTo(cornerRadius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(40, 40, 70, 0.9)');
    gradient.addColorStop(1, 'rgba(20, 20, 40, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add border
    ctx.strokeStyle = 'rgba(120, 120, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Measure text to possibly adjust canvas size
    const textMetrics = ctx.measureText(message);
    
    // Draw text centered
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,  // Start invisible for fade-in
        side: THREE.DoubleSide
    });
    
    // Create mesh and add to indicator group
    const background = new THREE.Mesh(backgroundGeometry, material);
    indicator.add(background);
    
    // Position indicator in front of the camera
    indicator.position.set(0, 0.1, -0.5);
    indicator.lookAt(camera.position);
    scene.add(indicator);
    
    // Fade in animation
    let opacity = 0;
    const fadeIn = () => {
        opacity += 0.05;
        material.opacity = opacity;
        
        if (opacity < 1) {
            requestAnimationFrame(fadeIn);
        } else {
            // Once fully visible, start a delay before fade out
            setTimeout(() => {
                // Fade out animation
                const fadeOut = () => {
                    opacity -= 0.05;
                    material.opacity = opacity;
                    
                    if (opacity > 0) {
                        requestAnimationFrame(fadeOut);
                    } else {
                        // Remove from scene when fully invisible
                        scene.remove(indicator);
                        material.dispose();
                    }
                };
                
                requestAnimationFrame(fadeOut);
            }, 2000);  // Show for 2 seconds before fading out
        }
    };
    
    requestAnimationFrame(fadeIn);
    
    return indicator;
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
export function deleteLastScreen() {
    console.log("deleteLastScreen function called");
    
    // If no screens, do nothing
    if (!screens || screens.length === 0) {
        console.log("No screens to delete");
        createModeChangeIndicator('No Screens to Delete');
        return false;
    }
    
    // Get the current selected screen from the imported module variable
    let screenToDelete = selectedScreen;
    
    console.log("Current selectedScreen:", screenToDelete ? 
                (screenToDelete.userData ? screenToDelete.userData.id : "unknown") : 
                "null");
    
    // Verify we have a selected screen to delete
    if (!screenToDelete) {
        console.log("No screen selected for deletion, selecting most recent one");
        // If there's no selected screen, select the last created one (as fallback)
        if (screens.length > 0) {
            screenToDelete = screens[screens.length - 1];
            console.log("Selected most recent screen:", screenToDelete.userData.id);
            // Make sure it's visually marked as selected
            selectScreen(screenToDelete);
        } else {
            return false;
        }
    }
    
    // Log which screen is being deleted
    console.log("Deleting selected screen with ID:", screenToDelete.userData ? screenToDelete.userData.id : "unknown");
    
    // Create visual deletion effect
    createDeletionEffect(screenToDelete.position.clone());
    
    // Remove from scene
    scene.remove(screenToDelete);
    
    // Remove from screens array
    const index = screens.indexOf(screenToDelete);
    if (index > -1) {
        screens.splice(index, 1);
        console.log("Screen removed from screens array. Remaining screens:", screens.length);
    }
    
    // After deleting the selected screen, select a new one if available
    if (screens.length > 0) {
        // Select the next available screen (last in array)
        const newSelectedScreen = screens[screens.length - 1];
        console.log("Selecting new screen:", newSelectedScreen.userData.id);
        selectScreen(newSelectedScreen);
        // Don't need to set selectedScreen as selectScreen does this
    } else {
        // No screens left
        console.log("No screens left, clearing selection");
        selectScreen(null);
    }
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate([30, 20, 40]); // Pattern for "delete" feel
    }
    
    const screenId = screenToDelete.userData && screenToDelete.userData.id !== undefined ? 
        screenToDelete.userData.id : 'unknown';
    createModeChangeIndicator(`Screen ${screenId} Deleted`);
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

// Show onboarding instruction about draggable panel
export function showControlPanelInstructions() {
    setTimeout(() => {
        createModeChangeIndicator('Drag the blue panel to reposition controls');
    }, 3000); // Show after a delay to let the user get oriented
}

// Toggle between drag mode and interact mode for screens
function toggleDragMode(button) {
    // Toggle the state
    const isActive = !button.userData.isActive;
    button.userData.isActive = isActive;
    
    // Update the global drag mode state
    window.dragModeEnabled = isActive;
    
    // Update the toggle appearance
    const knobX = isActive ? button.userData.rightPosition : button.userData.leftPosition;
    
    // Animate the knob movement
    const startX = button.position.x;
    const endX = knobX;
    const duration = 150; // ms
    const startTime = performance.now();
    
    function animateKnob(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Use easing function for smoother movement
        const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
        
        button.position.x = startX + (endX - startX) * easedProgress;
        
        if (progress < 1) {
            requestAnimationFrame(animateKnob);
        }
    }
    
    requestAnimationFrame(animateKnob);
    
    // Update color of toggle background to indicate state
    // Find the toggle background (parent's child that's not the button)
    const toggleBackground = button.parent.children.find(child => 
        child !== button && 
        child.geometry && 
        child.geometry.type === 'PlaneGeometry' &&
        Math.abs(child.position.y - button.position.y) < 0.01);
    
    if (toggleBackground && toggleBackground.material && toggleBackground.material.map) {
        // Create new background canvas with updated colors
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        
        // Draw rounded rectangle
        const toggleRadius = 40;
        ctx.beginPath();
        ctx.moveTo(toggleRadius, 0);
        ctx.lineTo(canvas.width - toggleRadius, 0);
        ctx.arcTo(canvas.width, 0, canvas.width, toggleRadius, toggleRadius);
        ctx.arcTo(canvas.width, canvas.height, canvas.width - toggleRadius, canvas.height, toggleRadius);
        ctx.lineTo(toggleRadius, canvas.height);
        ctx.arcTo(0, canvas.height, 0, canvas.height - toggleRadius, toggleRadius);
        ctx.arcTo(0, 0, toggleRadius, 0, toggleRadius);
        ctx.closePath();
        
        // Use gradient color based on state
        let gradient;
        if (isActive) {
            // DRAG mode - purple/blue gradient
            gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, 'rgba(80, 80, 130, 0.7)');
            gradient.addColorStop(1, 'rgba(120, 100, 180, 0.8)');
        } else {
            // INTERACT mode - gray/blue gradient
            gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, 'rgba(80, 80, 100, 0.7)');
            gradient.addColorStop(1, 'rgba(60, 60, 80, 0.7)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add highlight based on state
        const activePosition = isActive ? 0.7 : 0.3;
        
        // Add subtle glow to the active side
        ctx.fillStyle = `rgba(255, 255, 255, ${isActive ? 0.15 : 0.1})`;
        ctx.beginPath();
        ctx.arc(canvas.width * activePosition, canvas.height/2, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Add subtle inner shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Add labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '600 14px Inter, SF Pro Display, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Make the active label brighter
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('INTERACT', canvas.width * 0.3, canvas.height * 0.5);
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('DRAG', canvas.width * 0.7, canvas.height * 0.5);
        
        // Update the texture
        const newTexture = new THREE.CanvasTexture(canvas);
        toggleBackground.material.map.dispose();
        toggleBackground.material.map = newTexture;
        toggleBackground.material.needsUpdate = true;
    }
    
    // Change the button mode
    button.userData.mode = isActive ? 'drag' : 'interact';
    
    // Create visual indicator
    createModeChangeIndicator(isActive ? 'DRAG MODE: Screens are draggable' : 'INTERACT MODE: Screens are interactive');
    
    // Debug
    console.log(`Drag mode ${isActive ? 'enabled' : 'disabled'}`);
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(50); // Short vibration for toggle
    }
} 