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

// Panel drag variables
let isDraggingPanel = false;
let draggedPanel = null;
let panelDragOffset = new THREE.Vector3();
let lastRayDirection = new THREE.Vector3();
let lastRayOrigin = new THREE.Vector3();

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
    
    // Save ray origin and direction for dragging calculations
    lastRayOrigin.copy(raycaster.ray.origin);
    lastRayDirection.copy(raycaster.ray.direction);
    
    // Check for panel drag handle intersections
    const panelHandles = getPanelDragHandles();
    const handleIntersects = raycaster.intersectObjects(panelHandles, true);
    
    if (handleIntersects.length > 0) {
        const handle = handleIntersects[0].object;
        const panel = handle.userData.panel;
        
        if (panel) {
            console.log("Starting panel drag");
            
            // Set the dragging state
            isDraggingPanel = true;
            draggedPanel = panel;
            draggedPanel.userData.isBeingDragged = true;
            
            // Store the panel's current position
            draggedPanel.userData.originalDragPosition = draggedPanel.position.clone();
            
            // Calculate the drag offset - where on the panel we grabbed
            panelDragOffset.copy(handleIntersects[0].point).sub(draggedPanel.position);
            
            // Visual feedback - highlight the drag handle
            handle.material.opacity = 0.2;
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
            
            return;
        }
    }
    
    // Check for button intersections (if not dragging panel)
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
    console.log("Finding button from intersect object:", object.uuid.substring(0, 8));
    
    // If we hit the button directly
    if (object.userData && object.userData.type === 'button') {
        console.log("→ Direct button hit:", object.userData.action);
        return object;
    }
    
    // If we hit a child of a button (like the icon)
    if (object.parent && object.parent.userData && object.parent.userData.type === 'button') {
        console.log("→ Button parent hit:", object.parent.userData.action);
        return object.parent;
    }
    
    // If we hit a grandchild of a button
    if (object.parent && object.parent.parent && 
        object.parent.parent.userData && 
        object.parent.parent.userData.type === 'button') {
        console.log("→ Button grandparent hit:", object.parent.parent.userData.action);
        return object.parent.parent;
    }
    
    // Deeper search up to 5 levels up
    let current = object;
    let depth = 0;
    const maxDepth = 5;
    
    while (current && depth < maxDepth) {
        if (current.userData && current.userData.type === 'button') {
            console.log(`→ Button found at depth ${depth}:`, current.userData.action);
            return current;
        }
        current = current.parent;
        depth++;
    }
    
    // Search by traversing children of control panel
    const controlPanels = scene.children.filter(obj => 
        obj.userData && obj.userData.type === 'controlPanel');
    
    if (controlPanels.length > 0) {
        const panel = controlPanels[0];
        const buttonChildren = panel.children.filter(child => 
            child.userData && child.userData.type === 'button');
        
        // Check if any of these buttons contain our object
        for (const btn of buttonChildren) {
            if (btn === object || btn.children.some(child => child === object)) {
                console.log("→ Button found via panel traversal:", btn.userData.action);
                return btn;
            }
        }
    }
    
    console.log("→ No button found from intersect");
    return null;
}

// Handle controller selection end
function onSelectEnd(event) {
    // Reset panel dragging
    if (isDraggingPanel && draggedPanel) {
        console.log("Ending panel drag");
        
        // Reset opacity of drag handle
        const handle = draggedPanel.children.find(child => 
            child.userData && child.userData.type === 'dragHandle');
        
        if (handle) {
            handle.material.opacity = 0.01;
        }
        
        // Save the current position as the new default position
        draggedPanel.userData.originalPosition = draggedPanel.position.clone();
        
        // Reset dragging state
        draggedPanel.userData.isBeingDragged = false;
        isDraggingPanel = false;
        draggedPanel = null;
        
        return;
    }
    
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
    // If we're currently dragging the panel, don't process other selections
    if (isDraggingPanel) {
        return;
    }
    
    // Raycast to detect interactive elements
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // First, check for panel drag handle interactions
    const panelHandles = getPanelDragHandles();
    const handleIntersects = raycaster.intersectObjects(panelHandles, true);
    
    if (handleIntersects.length > 0) {
        // Don't process further interactions if we're clicking on the panel drag area
        return;
    }
    
    // Next, check for button interactions
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

// Handle button actions
function handleButtonAction(button) {
    if (!button || !button.userData) return;
    
    console.log("Button action triggered:", button.userData.action);
    
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
    } else if (action === 'deleteScreen') {
        console.log("Delete screen button pressed - calling deleteLastScreen()");
        // Delete the last interacted screen
        deleteLastScreen();
        
        // Visual feedback
        const iconMesh = button.children[0];
        if (iconMesh) {
            // Apply a quick scale animation
            iconMesh.scale.set(1.2, 1.2, 1.2);
            setTimeout(() => {
                iconMesh.scale.set(1, 1, 1);
            }, 150);
        }
        
        // Additional haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([30, 20, 30]);
        }
    } else {
        console.log("Unknown button action:", action);
    }
}

// Create a new screen
function createNewScreen() {
    // Create a new screen in front of the user's view
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromQuaternion(camera.quaternion);
    
    // Use -1.5 to match the default screen distance (instead of -1.0)
    const position = new THREE.Vector3(0, 0, -1.5);
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
    event.preventDefault();
    
    console.log("Touch start detected in AR");
    
    // Single touch handling
    const touch = event.touches[0];
    
    if (!touch) {
        console.log("No valid touch point");
        return;
    }
    
    // Convert touch to normalized device coordinates
    initialTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    currentTouchPosition.copy(initialTouchPosition);
    
    console.log("Touch position:", initialTouchPosition.x.toFixed(3), initialTouchPosition.y.toFixed(3));
    
    // Update raycaster
    raycaster.setFromCamera(initialTouchPosition, camera);
    
    // PRIORITY 0: Check for panel drag handle interactions
    const panelHandles = getPanelDragHandles();
    const handleIntersects = raycaster.intersectObjects(panelHandles, true);
    
    if (handleIntersects.length > 0) {
        const handle = handleIntersects[0].object;
        const panel = handle.userData.panel;
        
        if (panel) {
            console.log("Starting panel drag via touch");
            
            // Set the dragging state
            isDraggingPanel = true;
            draggedPanel = panel;
            draggedPanel.userData.isBeingDragged = true;
            
            // Store the panel's current position
            draggedPanel.userData.originalDragPosition = draggedPanel.position.clone();
            
            // Calculate the drag offset - where on the panel we grabbed
            panelDragOffset.copy(handleIntersects[0].point).sub(draggedPanel.position);
            
            // Visual feedback - highlight the drag handle
            handle.material.opacity = 0.2;
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
            
            return;
        }
    }
    
    // Continue with the rest of the touch handling...
    // [rest of the existing onTouchStart function]
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

// Touch move handler - update to support panel dragging
function onTouchMove(event) {
    // Always prevent default to avoid browser gestures
    event.preventDefault();
    
    // Make sure we have a valid touch point
    const touch = event.touches[0];
    if (!touch) {
        return;
    }
    
    // Convert touch to normalized device coordinates
    const previousTouchPosition = currentTouchPosition.clone();
    currentTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    currentTouchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // Handle panel dragging
    if (isDraggingPanel && draggedPanel) {
        raycaster.setFromCamera(currentTouchPosition, camera);
        
        // Get ray direction and position
        const rayOrigin = raycaster.ray.origin.clone();
        const rayDirection = raycaster.ray.direction.clone();
        
        // Calculate drag position at a fixed distance
        const rayLength = 0.8; // Fixed distance for dragging
        const dragPoint = rayOrigin.clone().add(rayDirection.multiplyScalar(rayLength));
        
        // Update panel position, with smooth transition
        draggedPanel.position.lerp(dragPoint, 0.5);
        
        // Keep panel facing the user
        draggedPanel.lookAt(camera.position);
        
        return;
    }
    
    // Handle screen dragging
    if (isDraggingHandle && draggedScreen) {
        // Continue with existing screen dragging logic
        // [existing dragging code]
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
    const movementSpeed = 4.0;
    
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

// Touch end handler - update to support panel dragging
function onTouchEnd(event) {
    // Handle panel dragging end
    if (isDraggingPanel && draggedPanel) {
        console.log("Ending panel drag via touch");
        
        // Reset opacity of drag handle
        const handle = draggedPanel.children.find(child => 
            child.userData && child.userData.type === 'dragHandle');
        
        if (handle) {
            handle.material.opacity = 0.01;
        }
        
        // Save the current position as the new default position
        draggedPanel.userData.originalPosition = draggedPanel.position.clone();
        
        // Reset dragging state
        draggedPanel.userData.isBeingDragged = false;
        isDraggingPanel = false;
        draggedPanel = null;
        
        // Provide haptic feedback for completing the drag
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }
        
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

// Get all panel drag handles in the scene
function getPanelDragHandles() {
    const handles = [];
    
    // Find control panel drag handles
    scene.traverse(object => {
        if (object.userData && object.userData.type === 'dragHandle' && object.userData.isDraggable) {
            handles.push(object);
        }
    });
    
    return handles;
}

// Update in render loop - add this to the end of your existing render function in ar_core.js
export function updatePanelDragging() {
    if (isDraggingPanel && draggedPanel) {
        // Get controller position and direction
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Calculate drag position
        const rayLength = 0.8; // Fixed distance for dragging
        const dragPoint = position.clone().addScaledVector(direction, rayLength);
        
        // Update panel position, accounting for the initial grab offset
        const targetPosition = dragPoint.clone().sub(panelDragOffset);
        
        // Smoothly move to target position
        draggedPanel.position.lerp(targetPosition, 0.3);
        
        // Keep panel facing the user
        draggedPanel.lookAt(camera.position);
    }
} 