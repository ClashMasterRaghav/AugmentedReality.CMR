// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMovingScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { screens, selectScreen, updateKeyboardPosition } from './ar_screens.js';
import { virtualKeyboard, showNotification } from './ar_ui.js';

// Touch interaction variables
let touchEnabled = true;
let initialTouchPosition = new THREE.Vector2();
let isTouchMoving = false;
let isDraggingScreen = false;
let isRotatingScreen = false;
let isTiltingScreen = false;
let isResizingScreen = false;
let screenOffset = new THREE.Vector3();
let initialRotation = new THREE.Euler();
let initialTilt = new THREE.Euler();

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
    if (isPlacingScreen || isMovingScreen) {
        // We're in placement mode, so select start begins the commitment
        return;
    }
    
    // Show tooltip for any hovered buttons
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Check for button intersections
    const buttons = findButtonsInScene();
    const buttonIntersects = raycaster.intersectObjects(buttons);
    
    if (buttonIntersects.length > 0) {
        const button = buttonIntersects[0].object;
        if (button.userData.tooltip) {
            button.userData.tooltip.visible = true;
        }
    }
}

// Handle controller selection end
function onSelectEnd(event) {
    if (isPlacingScreen && newScreen) {
        // Finalize the placement of the new screen
        isPlacingScreen = false;
        newScreen = null;
        showNotification("Screen placed successfully");
        return;
    }
    
    if (isMovingScreen && selectedScreen) {
        // Finalize the movement of the selected screen
        isMovingScreen = false;
        showNotification("Screen moved successfully");
        return;
    }
    
    // Reset interaction states
    isDraggingScreen = false;
    isRotatingScreen = false;
    isTiltingScreen = false;
    isResizingScreen = false;
    
    // Hide any visible tooltips
    const buttons = findButtonsInScene();
    buttons.forEach(button => {
        if (button.userData.tooltip) {
            button.userData.tooltip.visible = false;
        }
    });
}

// Handle controller selection
function onSelect(event) {
    // Raycast to detect interactive elements
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    if (isPlacingScreen) {
        // Finalize placement of new screen
        isPlacingScreen = false;
        newScreen = null;
        return;
    }
    
    if (isMovingScreen) {
        // Finalize movement of selected screen
        isMovingScreen = false;
        return;
    }
    
    // Check for screen selection - intersect with main panel
    const screenIntersects = raycaster.intersectObjects(screens.map(screen => screen.children[0]));
    
    if (screenIntersects.length > 0) {
        const selectedObject = screenIntersects[0].object;
        const screen = selectedObject.parent;
        selectScreen(screen);
        return;
    }
    
    // Check for keyboard key intersections
    if (virtualKeyboard && virtualKeyboard.visible && virtualKeyboard.userData.keys) {
        const keyIntersects = raycaster.intersectObjects(virtualKeyboard.userData.keys);
        
        if (keyIntersects.length > 0) {
            const key = keyIntersects[0].object;
            console.log(`Key pressed: ${key.userData.key}`);
            
            // Visual feedback on key press
            const flashColor = new THREE.Color(0x00ff00);
            const originalColor = key.userData.originalMaterial.color.clone();
            
            key.material.color.copy(flashColor);
            
            // Reset color after brief flash
            setTimeout(() => {
                key.material.color.copy(originalColor);
            }, 200);
            
            return;
        }
    }
    
    // Check for control panel button interactions
    const controlPanels = scene.children.filter(obj => obj.userData && obj.userData.type === 'controlPanel');
    let controlIntersects = [];
    
    controlPanels.forEach(panel => {
        // Get all button children
        const buttons = panel.children.filter(obj => obj.userData && obj.userData.type === 'button');
        const buttonIntersects = raycaster.intersectObjects(buttons);
        controlIntersects = controlIntersects.concat(buttonIntersects);
    });
    
    if (controlIntersects.length > 0) {
        const button = controlIntersects[0].object;
        
        // Handle button actions
        handleButtonAction(button);
    }
    
    // Check for screen button interactions (like rotate, resize, close buttons)
    let screenButtonIntersects = [];
    screens.forEach(screen => {
        const buttons = screen.children.filter(obj => obj.userData && obj.userData.type === 'button');
        const buttonIntersects = raycaster.intersectObjects(buttons);
        
        buttonIntersects.forEach(intersect => {
            intersect.object.parent = screen; // Ensure the parent reference is set
            screenButtonIntersects.push(intersect);
        });
    });
    
    // Sort by distance
    screenButtonIntersects.sort((a, b) => a.distance - b.distance);
    
    if (screenButtonIntersects.length > 0) {
        const intersect = screenButtonIntersects[0];
        const screen = intersect.object.parent;
        const button = intersect.object;
        
        // Select the screen first
        selectScreen(screen);
        
        // Handle the button action
        handleScreenButtonAction(button, screen);
    }
}

// Handle control panel button actions
function handleButtonAction(button) {
    console.log("Handling button action:", button.userData.action);
    
    // Check the button's action
    if (button.userData.action === 'newScreen') {
        // Start placing a new screen
        isPlacingScreen = true;
        
        // Create a new screen in front of the user's view
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(camera.quaternion);
        
        const position = new THREE.Vector3(0, 0, -1.0);
        position.applyMatrix4(matrix);
        position.add(camera.position);
        
        // Create the new screen
        newScreen = createNewBrowserScreen(position);
        showNotification("New screen created!");
        
        // Make it face the user
        newScreen.lookAt(camera.position);
        
        // Finalize placement immediately for touch
        isPlacingScreen = false;
        
        // Visual feedback for button press
        const originalColor = button.material.color.clone();
        button.material.color.set(0x4CAF50);
        setTimeout(() => {
            button.material.color.copy(originalColor);
        }, 200);
        
        return;
    }
    
    if (button.userData.action === 'moveScreen') {
        // Always toggle move mode regardless of selected screen
        isMoveModeActive = !isMoveModeActive;
        button.userData.isActive = isMoveModeActive;
        
        // Update button color based on state
        if (isMoveModeActive) {
            button.material.color.set(0x44cc88); // Green when active
            
            // Deactivate rotate mode
            isRotateModeActive = false;
            
            // Find rotate button and update its color
            const rotateButtons = findButtonsByAction('rotateScreen');
            rotateButtons.forEach(rotateButton => {
                rotateButton.material.color.set(0x777777); // Grey when inactive
                rotateButton.userData.isActive = false;
            });
            
            showNotification("Move mode activated");
        } else {
            button.material.color.set(0x777777); // Grey when inactive
            showNotification("Move mode deactivated");
        }
        return;
    }
    
    if (button.userData.action === 'rotateScreen') {
        // Always toggle rotate mode regardless of selected screen
        isRotateModeActive = !isRotateModeActive;
        button.userData.isActive = isRotateModeActive;
        
        // Update button color based on state
        if (isRotateModeActive) {
            button.material.color.set(0xf39c12); // Orange when active
            
            // Deactivate move mode
            isMoveModeActive = false;
            
            // Find move button and update its color
            const moveButtons = findButtonsByAction('moveScreen');
            moveButtons.forEach(moveButton => {
                moveButton.material.color.set(0x777777); // Grey when inactive
                moveButton.userData.isActive = false;
            });
            
            showNotification("Rotate mode activated");
        } else {
            button.material.color.set(0x777777); // Grey when inactive
            showNotification("Rotate mode deactivated");
        }
        return;
    }
    
    if (button.userData.action === 'endAR') {
        // End the AR session
        if (renderer.xr.isPresenting) {
            renderer.xr.getSession().end();
        }
        return;
    }
}

// Handle screen-specific button actions (rotate, tilt, resize, close)
function handleScreenButtonAction(button, screen) {
    if (button.userData.action === 'closeScreen') {
        // Remove the screen
        scene.remove(screen);
        screens.splice(screens.indexOf(screen), 1);
        
        // Update selected screen
        if (selectedScreen === screen) {
            selectedScreen = screens.length > 0 ? screens[screens.length - 1] : null;
            if (selectedScreen) {
                selectScreen(selectedScreen);
            }
        }
        
        showNotification("Screen removed");
        return;
    }
    
    if (button.userData.action === 'rotateScreen') {
        // Start rotating the screen
        isRotatingScreen = true;
        
        // Store initial rotation
        initialRotation.copy(screen.rotation);
        
        showNotification("Rotating screen...");
        return;
    }
    
    if (button.userData.action === 'tiltScreen') {
        // Start tilting the screen
        isTiltingScreen = true;
        
        // Store initial tilt
        initialTilt.copy(screen.rotation);
        
        showNotification("Tilting screen...");
        return;
    }
    
    if (button.userData.action === 'resizeScreen') {
        // Start resizing the screen
        isResizingScreen = true;
        
        showNotification("Resizing screen...");
        return;
    }
}

// Reset all toggle buttons except the specified one
function resetToggleButtons(exceptAction) {
    const controlPanels = scene.children.filter(obj => obj.userData && obj.userData.type === 'controlPanel');
    
    controlPanels.forEach(panel => {
        const toggleButtons = panel.children.filter(obj => 
            obj.userData && 
            obj.userData.type === 'button' && 
            obj.userData.isToggle &&
            obj.userData.action !== exceptAction
        );
        
        toggleButtons.forEach(button => {
            if (button.userData.action === 'moveScreen') {
                button.material.color.set(0x44cc88);
                button.userData.isActive = false;
            } else if (button.userData.action === 'rotateScreen') {
                button.material.color.set(0xf39c12);
                button.userData.isActive = false;
            }
        });
    });
}

// Find all interactive buttons in the scene
function findButtonsInScene() {
    let buttons = [];
    
    // Get control panel buttons
    const controlPanels = scene.children.filter(obj => obj.userData && obj.userData.type === 'controlPanel');
    controlPanels.forEach(panel => {
        const panelButtons = panel.children.filter(obj => obj.userData && obj.userData.type === 'button');
        buttons = buttons.concat(panelButtons);
    });
    
    // Get screen buttons
    screens.forEach(screen => {
        const screenButtons = screen.children.filter(obj => obj.userData && obj.userData.type === 'button');
        buttons = buttons.concat(screenButtons);
    });
    
    // Get floating action buttons
    const fabButtons = scene.children.filter(obj => obj.userData && obj.userData.type === 'button');
    buttons = buttons.concat(fabButtons);
    
    return buttons;
}

// Find buttons by action
function findButtonsByAction(action) {
    const buttons = findButtonsInScene();
    return buttons.filter(button => button.userData && button.userData.action === action);
}

// Touch start handler
function onTouchStart(event) {
    if (!touchEnabled || !event.touches[0]) return;
    
    event.preventDefault();
    
    console.log("Touch start detected");
    
    // Store initial touch position
    initialTouchPosition.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    
    // Cast ray from touch position
    raycaster.setFromCamera(initialTouchPosition, camera);
    
    // First check for button touches - prioritize UI interaction
    
    // Check for control panel button interactions
    const controlPanels = scene.children.filter(obj => obj.userData && obj.userData.type === 'controlPanel');
    let controlIntersects = [];
    
    controlPanels.forEach(panel => {
        // Get all button children
        const buttons = panel.children.filter(obj => obj.userData && obj.userData.type === 'button');
        const buttonIntersects = raycaster.intersectObjects(buttons);
        controlIntersects = controlIntersects.concat(buttonIntersects);
    });
    
    if (controlIntersects.length > 0) {
        const button = controlIntersects[0].object;
        console.log("Control button touched:", button.userData.action);
        
        // Show visual feedback
        const originalColor = button.material.color.clone();
        button.material.color.set(0xffffff);
        setTimeout(() => {
            button.material.color.copy(originalColor);
        }, 200);
        
        // Handle button actions
        handleButtonAction(button);
        return; // Stop processing other touches
    }
    
    // Check for screen button interactions (like rotate, resize, close buttons)
    let screenButtonIntersects = [];
    screens.forEach(screen => {
        const buttons = screen.children.filter(obj => obj.userData && obj.userData.type === 'button');
        const buttonIntersects = raycaster.intersectObjects(buttons);
        
        buttonIntersects.forEach(intersect => {
            intersect.object.parent = screen; // Ensure the parent reference is set
            screenButtonIntersects.push(intersect);
        });
    });
    
    // Sort by distance
    screenButtonIntersects.sort((a, b) => a.distance - b.distance);
    
    if (screenButtonIntersects.length > 0) {
        const intersect = screenButtonIntersects[0];
        const screen = intersect.object.parent;
        const button = intersect.object;
        console.log("Screen button touched:", button.userData.action);
        
        // Select the screen first
        selectScreen(screen);
        
        // Show visual feedback
        const originalColor = button.material.color.clone();
        button.material.color.set(0xffffff);
        setTimeout(() => {
            button.material.color.copy(originalColor);
        }, 200);
        
        // Handle the button action
        handleScreenButtonAction(button, screen);
        return; // Stop processing other touches
    }
    
    // Check for screen selection
    const screenIntersects = raycaster.intersectObjects(screens.map(screen => screen.children[0]));
    
    if (screenIntersects.length > 0) {
        const selectedObject = screenIntersects[0].object;
        const screen = selectedObject.parent;
        
        console.log("Screen touched, modes:", isMoveModeActive ? "Move" : "", isRotateModeActive ? "Rotate" : "");
        
        // Select the screen first
        selectScreen(screen);
        
        if (isMoveModeActive) {
            // Direct screen dragging mode
            isDraggingScreen = true;
            
            // Calculate the offset from the touch point to the screen center
            const intersectionPoint = screenIntersects[0].point.clone();
            screenOffset.copy(screen.position).sub(intersectionPoint);
            
            showNotification("Moving screen...");
        } 
        else if (isRotateModeActive) {
            // Start rotating the screen
            isRotatingScreen = true;
            
            // Store initial rotation
            initialRotation.copy(screen.rotation);
            
            showNotification("Rotating screen...");
        }
        else {
            // Default to moving when neither mode is active for better usability
            isDraggingScreen = true;
            
            // Calculate the offset from the touch point to the screen center
            const intersectionPoint = screenIntersects[0].point.clone();
            screenOffset.copy(screen.position).sub(intersectionPoint);
            
            showNotification("Moving screen...");
        }
        return;
    }
}

// Touch move handler
function onTouchMove(event) {
    if (!touchEnabled || !event.touches[0]) return;
    
    event.preventDefault();
    
    // Get current touch position
    const currentTouchPosition = new THREE.Vector2(
        (event.touches[0].clientX / window.innerWidth) * 2 - 1,
        -(event.touches[0].clientY / window.innerHeight) * 2 + 1
    );
    
    // Calculate movement delta
    const deltaX = currentTouchPosition.x - initialTouchPosition.x;
    const deltaY = currentTouchPosition.y - initialTouchPosition.y;
    
    // Update screen based on interaction type
    if ((isDraggingScreen || isTouchMoving) && selectedScreen) {
        console.log("Dragging screen");
        
        // Get ray intersection with z-plane
        raycaster.setFromCamera(currentTouchPosition, camera);
        
        // Create a plane parallel to the camera view
        const planeNormal = new THREE.Vector3(0, 0, 1);
        planeNormal.applyQuaternion(camera.quaternion);
        
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(planeNormal, selectedScreen.position);
        
        const intersectionPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
            // Move the screen to the new position, accounting for the initial offset
            selectedScreen.position.copy(intersectionPoint.add(screenOffset));
            
            // Update keyboard position if visible
            if (virtualKeyboard && virtualKeyboard.visible) {
                updateKeyboardPosition(selectedScreen);
            }
        }
    }
    
    if (isRotatingScreen && selectedScreen) {
        console.log("Rotating screen");
        
        // Calculate rotation based on finger movement
        // X movement controls Y rotation (left/right)
        // Y movement controls X rotation (up/down)
        selectedScreen.rotation.y += deltaX * 2.0;
        selectedScreen.rotation.x += deltaY * 2.0;
        
        // Limit rotation angles to avoid extreme angles
        selectedScreen.rotation.x = THREE.MathUtils.clamp(
            selectedScreen.rotation.x,
            -Math.PI / 2,  // Limit to 90 degrees up
            Math.PI / 2    // Limit to 90 degrees down
        );
    }
    
    if (isTiltingScreen && selectedScreen) {
        console.log("Tilting screen");
        
        // Scale the movement for tilting
        const tiltAmount = deltaY * 2.0;
        
        // Apply tilt with constraints (limit to reasonable angles)
        selectedScreen.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, initialTilt.x + tiltAmount));
    }
    
    if (isResizingScreen && selectedScreen) {
        console.log("Resizing screen");
        
        // Scale the movement for resizing
        const scaleX = Math.max(0.5, Math.min(2.0, selectedScreen.scale.x + deltaX * 2.0));
        const scaleY = Math.max(0.5, Math.min(2.0, selectedScreen.scale.y + deltaY * 2.0));
        
        // Apply scaling
        selectedScreen.scale.set(scaleX, scaleY, 1);
    }
    
    // Update initial position for next move
    initialTouchPosition.copy(currentTouchPosition);
}

// Touch end handler
function onTouchEnd(event) {
    console.log("Touch end detected");
    
    // Save the state of what was being interacted with
    const wasMoving = isDraggingScreen || isTouchMoving;
    const wasRotating = isRotatingScreen;
    
    // Reset all interaction states
    isTouchMoving = false;
    isRotatingScreen = false;
    isTiltingScreen = false;
    isResizingScreen = false;
    isDraggingScreen = false;
    
    // Show completion notification
    if (wasMoving && selectedScreen) {
        showNotification("Screen moved successfully");
    } else if (wasRotating && selectedScreen) {
        showNotification("Screen rotated successfully");
    }
} 