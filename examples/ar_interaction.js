// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMovingScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { screens, selectScreen, updateKeyboardPosition } from './ar_screens.js';
import { virtualKeyboard, showNotification, toggleModeButton } from './ar_ui.js';

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
let initialScale = new THREE.Vector3(1, 1, 1);

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
    // Get the action for this button
    const action = button.userData.action;
    
    if (action === 'newScreen') {
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
        console.log("New screen created!");
        
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
    
    if (action === 'moveScreen') {
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
            
            console.log("Move mode activated");
        } else {
            button.material.color.set(0x777777); // Grey when inactive
            console.log("Move mode deactivated");
        }
        return;
    }
    
    if (action === 'rotateScreen') {
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
            
            console.log("Rotate mode activated");
        } else {
            button.material.color.set(0x777777); // Grey when inactive
            console.log("Rotate mode deactivated");
        }
        return;
    }
    
    if (action === 'endAR') {
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
    event.preventDefault();

    // Convert touch to normalized device coordinates
    const touch = event.touches[0];
    initialTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = - (touch.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster
    raycaster.setFromCamera(initialTouchPosition, camera);
    
    // First, check if we touched a button
    const buttons = findButtonsInScene();
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
        let buttonObject = buttonIntersects[0].object;
        
        // If we hit a child of a button (like the icon), get the parent button
        if (!buttonObject.userData || !buttonObject.userData.type) {
            buttonObject = buttonObject.parent;
        }
        
        if (buttonObject.userData && buttonObject.userData.type === 'button') {
            handleButtonAction(buttonObject);
            
            // Visual feedback for button press
            const originalColor = buttonObject.material.color.clone();
            buttonObject.material.color.set(0x4FC3F7); // Highlight color
            setTimeout(() => {
                buttonObject.material.color.copy(originalColor);
            }, 200);
            
            return; // Don't continue with other interactions
        }
    }
    
    // Check for control panel touches
    const panelIntersects = raycaster.intersectObjects(
        scene.children.filter(obj => obj.userData && obj.userData.type === 'controlPanel'),
        true
    );
    
    if (panelIntersects.length > 0) {
        return; // Touched the panel but not a button, do nothing
    }
    
    // Test if we touched a screen
    const screenIntersects = raycaster.intersectObjects(screens, true);
    if (screenIntersects.length > 0) {
        const obj = screenIntersects[0].object;
        
        // Find the screen group this object belongs to
        let screenObj = obj;
        while (screenObj && (!screenObj.userData || screenObj.userData.type !== 'screen')) {
            screenObj = screenObj.parent;
        }
        
        if (screenObj && screenObj.userData && screenObj.userData.type === 'screen') {
            // Select the screen
            selectScreen(screenObj);
            selectedScreen = screenObj;
            
            // If we're in move mode, start moving the screen
            if (isMoveModeActive) {
                isMovingScreen = true;
                
                // Store intersection point for relative movement
                screenOffset.copy(screenObj.position).sub(screenIntersects[0].point);
            }
            
            // If we're in rotate mode, start rotating the screen
            if (isRotateModeActive) {
                isRotatingScreen = true;
                
                // Store initial rotation for relative movement
                initialRotation.copy(screenObj.rotation);
            }
        }
    } else {
        // Touched empty space, deselect current screen
        /*if (selectedScreen) {
            selectedScreen.userData.isSelected = false;
            selectedScreen = null;
        }*/
    }
}

// Touch move handler
function onTouchMove(event) {
    if (!isMovingScreen && !isRotatingScreen) return;
    
    event.preventDefault();
    
    // Convert touch to normalized device coordinates
    const touch = event.touches[0];
    initialTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = - (touch.clientY / window.innerHeight) * 2 + 1;
    
    // Handle screen movement
    if (isMovingScreen && selectedScreen) {
        // Update the raycaster
        raycaster.setFromCamera(initialTouchPosition, camera);
        
        // Create a plane at the camera's distance to the screen
        const movePlane = new THREE.Plane();
        movePlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()).negate(),
            screenOffset
        );
        
        // Find the intersection point with the plane
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(movePlane, targetPoint);
        
        // Move the screen to the new position
        if (targetPoint) {
            selectedScreen.position.copy(targetPoint);
        }
    }
    
    // Handle screen rotation
    if (isRotatingScreen && selectedScreen) {
        // Calculate rotation delta
        const deltaX = initialTouchPosition.x - initialTouchPosition.x;
        const deltaY = initialTouchPosition.y - initialTouchPosition.y;
        
        // Apply rotation - make Y axis movement rotate around X axis and vice versa
        selectedScreen.rotation.x = initialRotation.x + (deltaY * 2);
        selectedScreen.rotation.y = initialRotation.y + (deltaX * 2);
        
        // Limit rotation to reasonable angles
        selectedScreen.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, selectedScreen.rotation.x));
    }
}

// Touch end handler
function onTouchEnd(event) {
    event.preventDefault();
    
    // End screen movement or rotation
    isMovingScreen = false;
    isRotatingScreen = false;
    isResizingScreen = false;
} 