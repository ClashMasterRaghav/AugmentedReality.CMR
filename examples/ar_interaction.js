// Event handlers and interaction logic for AR experience
import * as THREE from 'three';
import { 
    camera, scene, controller, renderer, raycaster, 
    isPlacingScreen, newScreen, isMoveModeActive,
    isRotateModeActive, selectedScreen, selectedKey
} from './ar_core.js';
import { 
    screens, selectScreen, updateKeyboardPosition, createNewBrowserScreen,
    createNewYouTubeScreen, createNewElectronAppScreen, createNewGoogleMapsScreen, createDuckDuckGoScreen
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
    console.log("Setting up event listeners...");
    
    try {
        // Controller events - only add if controller exists
        if (controller) {
            controller.addEventListener('select', onSelect);
            controller.addEventListener('selectstart', onSelectStart);
            controller.addEventListener('selectend', onSelectEnd);
            console.log("Controller event listeners added");
        } else {
            console.warn("Controller is not available - controller events not set up");
        }
        
        // Touch events - only add if renderer dom element exists
        if (renderer && renderer.domElement) {
            renderer.domElement.addEventListener('touchstart', onTouchStart, false);
            renderer.domElement.addEventListener('touchmove', onTouchMove, false);
            renderer.domElement.addEventListener('touchend', onTouchEnd, false);
            console.log("Touch event listeners added");
        } else {
            console.warn("Renderer DOM element is not available - touch events not set up");
        }
        
        console.log("Event listeners set up successfully");
    } catch (error) {
        console.error("Error setting up event listeners:", error);
    }
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
    
    // Traverse up to find a button (up to 7 levels deep now)
    let current = object;
    let level = 0;
    
    while (current.parent && level < 7) {
        current = current.parent;
        level++;
        
        if (current.userData && current.userData.type === 'button') {
            console.log(`Found button at level ${level}:`, current.userData.action);
            return current;
        }
    }
    
    // Special handling for control panel buttons - check sibling elements
    // This helps when hitting transparent parts or edges of buttons
    if (object.parent) {
        const siblings = object.parent.children || [];
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling.userData && sibling.userData.type === 'button') {
                // Check proximity - the button should be very close to the hit object
                const hitPosition = new THREE.Vector3();
                const buttonPosition = new THREE.Vector3();
                
                object.getWorldPosition(hitPosition);
                sibling.getWorldPosition(buttonPosition);
                
                const distance = hitPosition.distanceTo(buttonPosition);
                if (distance < 0.2) { // Within 20cm, generous for control panel
                    console.log("Found nearby button sibling:", sibling.userData.action);
                    return sibling;
                }
            }
        }
        
        // Check if parent is the control panel
        if (object.parent.userData && object.parent.userData.type === 'controlPanel') {
            // Search all descendant buttons of the control panel
            let closestButton = null;
            let closestDistance = 0.2; // Initial max distance (20cm)
            const hitPosition = new THREE.Vector3();
            object.getWorldPosition(hitPosition);
            
            // Function to recursively search for the closest button
            function findClosestButton(parent) {
                if (!parent.children) return;
                
                parent.children.forEach(child => {
                    if (child.userData && child.userData.type === 'button') {
                        const buttonPosition = new THREE.Vector3();
                        child.getWorldPosition(buttonPosition);
                        const distance = hitPosition.distanceTo(buttonPosition);
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestButton = child;
                        }
                    }
                    
                    // Recursively check children
                    findClosestButton(child);
                });
            }
            
            findClosestButton(object.parent);
            
            if (closestButton) {
                console.log("Found closest control panel button:", closestButton.userData.action, "distance:", closestDistance);
                return closestButton;
            }
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
                        if (distance < 0.08) { // If within 8cm (increased from 5cm)
                            console.log("Found nearby button:", child.userData.action, "distance:", distance);
                            return child;
                        }
                    }
                }
            }
            
            // Check for recursive buttons inside screen components
            const buttonsList = [];
            screen.traverse((obj) => {
                if (obj.userData && obj.userData.type === 'button') {
                    buttonsList.push(obj);
                }
            });
            
            if (buttonsList.length > 0) {
                // Find the closest button
                const hitPoint = new THREE.Vector3();
                object.getWorldPosition(hitPoint);
                
                let closestButton = null;
                let closestDistance = 0.1; // 10cm threshold
                
                buttonsList.forEach(button => {
                    const buttonPoint = new THREE.Vector3();
                    button.getWorldPosition(buttonPoint);
                    
                    const distance = hitPoint.distanceTo(buttonPoint);
                    if (distance < closestDistance) {
                        closestButton = button;
                        closestDistance = distance;
                    }
                });
                
                if (closestButton) {
                    console.log("Found closest screen button:", closestButton.userData.action, "distance:", closestDistance);
                    return closestButton;
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
    // Check for controller intersection with objects
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Find intersections with all objects in the scene
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        console.log("Intersection detected:", intersects[0].object.userData);
        
        // Get first intersection
        const intersect = intersects[0];
        
        // If this is a button
        const button = getButtonFromIntersect(intersect.object);
        if (button) {
            console.log("Button clicked:", button.userData);
            handleButtonAction(button);
            return;
        }
        
        // If this is a screen - get the parent screen object
        const screen = getScreenFromIntersect(intersect.object);
        if (screen) {
            // If the screen is already selected, check for control buttons or video player interaction
            if (screen.userData.isSelected) {
                
                // Try to relay the interaction to iframe content if applicable
                if (relayInteractionToIframe(screen, intersect, 'click')) {
                    // Interaction was handled by iframe
                    return;
                }
                
                // Handle screen control buttons and interaction zones if not handled by iframe
                
                // Find if the intersection is with a control button
                if (intersect.object.userData && 
                    intersect.object.userData.type === 'button') {
                    
                    // Handle specific button actions
                    if (intersect.object.userData.action === 'close') {
                        // Handle close button
                        scene.remove(screen);
                        screens.splice(screens.indexOf(screen), 1);
                        setSelectedScreen(null);
                    } 
                    else if (intersect.object.userData.action === 'minimize') {
                        // Handle minimize button
                        toggleMinimize(screen);
                    } 
                    else if (intersect.object.userData.action === 'maximize') {
                        // Handle maximize/fullscreen button
                        toggleFullscreen(screen);
                    }
                    else if (intersect.object.userData.action === 'playButton') {
                        // Handle video play/pause button
                        if (videoControlFunctions.togglePlayback) {
                            videoControlFunctions.togglePlayback();
                        } else {
                            console.warn("Video playback function not available");
                        }
                    }
                    else if (intersect.object.userData.action === 'volumeButton') {
                        // Handle volume mute/unmute button
                        if (videoControlFunctions.toggleMute) {
                            videoControlFunctions.toggleMute();
                        } else {
                            console.warn("Video mute function not available");
                        }
                    }
                    return;
                }
                
                // If no specific interaction was identified, just select the screen
                selectScreen(screen);
            } else {
                // Select this screen if it wasn't already selected
                selectScreen(screen);
            }
        }
        
        // If this is a control panel or its controls
        if (intersect.object.userData && intersect.object.userData.type === 'controlPanel' ||
            (intersect.object.parent && intersect.object.parent.userData && 
            intersect.object.parent.userData.type === 'controlPanel') ||
            intersect.object.userData && intersect.object.userData.parentPanel) {
            
            // Get the actual panel
            let controlPanel;
            if (intersect.object.userData.type === 'controlPanel') {
                controlPanel = intersect.object;
            } else if (intersect.object.userData.parentPanel) {
                controlPanel = intersect.object.userData.parentPanel;
            } else if (intersect.object.parent && intersect.object.parent.userData && 
                intersect.object.parent.userData.type === 'controlPanel') {
                controlPanel = intersect.object.parent;
            }
            
            if (controlPanel) {
                console.log("Control panel clicked");
                
                // Check for control panel button clicks (like screen creation buttons)
                const button = getButtonFromIntersect(intersect.object);
                if (button && button.userData && button.userData.buttonType === 'screenTypeSelector') {
                    console.log("Screen type button clicked:", button.userData.index);
                    
                    // Create new screen based on button index
                    const cameraWorldPos = new THREE.Vector3();
                    camera.getWorldPosition(cameraWorldPos);
                    
                    // Calculate position in front of the camera
                    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    const screenPosition = cameraWorldPos.clone().add(
                        cameraDirection.multiplyScalar(1.5)
                    );
                    
                    // Determine screen type from button action
                    let screenType = button.userData.action || '';
                    
                    // Create appropriate screen type
                    let newScreen = null;
                    switch(screenType) {
                        case 'youtube':
                            newScreen = createNewYouTubeScreen(screenPosition);
                            break;
                        case 'duckduckgo':
                            newScreen = createDuckDuckGoScreen(screenPosition);
                            break;
                        case 'maps':
                            newScreen = createNewGoogleMapsScreen(screenPosition);
                            break;
                        case 'electron':
                            newScreen = createNewElectronAppScreen(screenPosition);
                            break;
                        default:
                            newScreen = createNewBrowserScreen(screenPosition);
                    }
                    
                    if (newScreen) {
                        showNotification(`Created new ${screenType} screen`, 'success');
                        // Auto-select the new screen
                        selectScreen(newScreen);
                    }
                }
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
    console.log("Handling button action:", button.userData);
    
    // Visual feedback
    if (button.material) {
        const originalColor = button.material.color.clone();
        button.material.color.set(0x4FC3F7); // Highlight color
        setTimeout(() => {
            if (button && button.material) {
                button.material.color.copy(originalColor);
            }
        }, 200);
    }
    
    // Handle different button types
    if (!button.userData) {
        console.warn("Button has no userData");
        return;
    }
    
    // Handle screen type selector buttons
    if (button.userData.buttonType === 'screenTypeSelector') {
        createScreenOfType(button.userData.action || button.userData.screenType);
        return;
    }
    
    // Handle video controls
    if (button.userData.videoControl) {
        const action = button.userData.videoAction;
        
        if (action === 'togglePlayback' && videoControlFunctions.togglePlayback) {
            videoControlFunctions.togglePlayback();
        }
        else if (action === 'toggleMute' && videoControlFunctions.toggleMute) {
            videoControlFunctions.toggleMute();
        }
        
        return;
    }
    
    // Handle other actions based on the action property
    switch(button.userData.action) {
        case 'newScreen':
            createNewScreenInFrontOfCamera();
            break;
        case 'deleteScreen':
            deleteLastScreen();
            break;
        case 'moveMode':
            toggleMoveMode(button);
            break;
        case 'rotateMode':
            toggleRotateMode(button);
            break;
        default:
            console.log("Unhandled button action:", button.userData.action);
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
    event.preventDefault();
    
    // Only handle the first touch point
    const touch = event.touches[0];
    if (!touch) return;
    
    // Store touch start information
    touchStartTime = Date.now();
    lastTapTime = touchStartTime;
    
    // Convert touch to normalized device coordinates
    touchStartPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    touchStartPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // Copy position for movement detection
    currentTouchPosition.copy(touchStartPosition);
    
    // Use raycaster to check for intersections
    raycaster.setFromCamera(touchStartPosition, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length === 0) return;
    
    // Get first intersection
    const intersect = intersects[0];
    const hitObject = intersect.object;
    
    // PRIORITY 0: Check for control panel dragging
    if (controlPanel) {
        const panelIntersects = raycaster.intersectObject(controlPanel, true);
        
        if (panelIntersects.length > 0) {
            // Get info about intersection
            const hitPoint = panelIntersects[0].point.clone();
            const localPoint = controlPanel.worldToLocal(hitPoint.clone());
            const hitObject = panelIntersects[0].object;
            
            console.log("Hit panel object:", hitObject.uuid.slice(0, 8), 
                      "userData:", hitObject.userData ? JSON.stringify(hitObject.userData) : 'none');
            
            // Enhanced drag detection - check if we hit:
            // 1. The explicit drag handle or grip lines
            // 2. The top portion of the panel
            // 3. Any object marked as part of drag handle
            const isDragHandle = hitObject.userData && (
                hitObject.userData.isDragArea || 
                hitObject.userData.isPartOfDragHandle ||
                hitObject.userData.type === 'dragHandle' ||
                (hitObject.parent && hitObject.parent.userData && 
                 (hitObject.parent.userData.isDragArea || hitObject.parent.userData.type === 'dragHandle'))
            );
            
            // First check if this is a button
            const isButton = hitObject.userData && hitObject.userData.type === 'button';
            
            if (isButton) {
                // Handle button press
                handleButtonAction(hitObject);
                return;
            }
            
            // Check for buttons in parent
            if (hitObject.parent && hitObject.parent.userData && 
                hitObject.parent.userData.type === 'button') {
                handleButtonAction(hitObject.parent);
                return;
            }
            
            // Check if touch is in the top portion (drag area) of panel
            const isInDragArea = localPoint.y > panelHeight * 0.35;
            
            if (isDragHandle || isInDragArea) {
                console.log("Starting control panel drag - detected via:", isDragHandle ? "drag handle" : "top area");
                
                // Store initial panel position and rotation
                initialPanelPosition.copy(controlPanel.position);
                initialPanelQuaternion.copy(controlPanel.quaternion);
                
                // Calculate offset for more natural dragging
                panelDragOffset.copy(hitPoint).sub(controlPanel.position);
                
                // Set flag to indicate panel is being dragged
                isPanelBeingDragged = true;
                controlPanel.userData.isDragging = true;
                
                // Provide strong haptic feedback like screen dragging
                if (navigator.vibrate) {
                    navigator.vibrate([40, 30, 60]); // Pattern for "grab" feel, same as screen dragging
                }
                
                // Visual feedback - highlight the drag handle if available
                const dragHandle = controlPanel.children.find(
                    child => child.userData && (child.userData.isDragArea || child.userData.type === 'dragHandle')
                );
                
                if (dragHandle) {
                    // Highlight by changing color temporarily
                    if (dragHandle.userData.hoverColor) {
                        dragHandle.material.color.setHex(dragHandle.userData.hoverColor);
                    } else {
                        dragHandle.material.color.set(0x91BEFF); // Light blue highlight
                    }
                    
                    // Scale up slightly for visual feedback
                    dragHandle.scale.set(1.1, 1.1, 1.1);
                }
                
                return;
            }
            
            // Check if it's a screen type selector button
            if (hitObject.userData && hitObject.userData.buttonType === 'screenTypeSelector') {
                console.log("Screen type selector button pressed:", hitObject.userData.index);
                
                // Create a new screen of the appropriate type
                createScreenType(hitObject.userData.index);
                
                // Provide haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(20);
                }
                
                return;
            }
        }
    }
    
    // PRIORITY 1: Check for screen control handle intersection
    const dragHandle = intersects.find(i => 
        i.object.userData && i.object.userData.type === "dragHandle"
    );
    
    if (dragHandle) {
        const screenObject = findScreenFromDragHandle(dragHandle.object);
        
        if (screenObject) {
            isDraggingHandle = true;
            draggedScreen = screenObject;
            dragStartPoint.copy(dragHandle.point);
            initialScreenPosition.copy(screenObject.position);
            
            // Select this screen if it's not already selected
            selectScreen(screenObject);
            
            // Provide haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([40, 30, 60]); // Stronger pattern for "grab" feel
            }
            
            console.log("Drag handle intersected, setting drag mode");
            
            // Flash visual feedback to confirm drag interaction
            flashScreenHighlight(screenObject);
            
            return;
        }
    }
    
    // PRIORITY 2: Check for video progress bar interaction
    const progressBarIntersect = intersects.find(i => 
        i.object.userData && i.object.userData.type === "progressBar"
    );
    
    if (progressBarIntersect) {
        const screen = getScreenFromIntersect(progressBarIntersect.object);
        if (screen) {
            // User is interacting with the progress bar
            handleProgressBarTouch(screen, progressBarIntersect.point);
            return;
        }
    }
    
    // PRIORITY 3: Check for button intersections
    const buttonIntersect = intersects.find(i => 
        i.object.userData && i.object.userData.type === "button"
    );
    
    if (buttonIntersect) {
        handleButtonAction(buttonIntersect.object);
        return;
    }
    
    // PRIORITY 4: Check for screen intersections
    const screenIntersect = intersects.find(i => {
        const screen = getScreenFromIntersect(i.object);
        return screen !== null;
    });
    
    if (screenIntersect) {
        const screen = getScreenFromIntersect(screenIntersect.object);
        
        if (screen) {
            // Try to relay interaction to iframe content
            if (relayInteractionToIframe(screen, screenIntersect, 'click')) {
                // Interaction was handled by iframe
                return;
            }
            
            // If not handled by iframe, just select the screen
            selectScreen(screen);
            
            // Store for double tap detection
            lastTappedScreen = screen;
            
            // Check if this is a double tap (fast repeat tap on the same screen)
            const isDoubleTap = (lastTapTime - previousTapTime < 300) && 
                                (lastTappedScreen === previousTappedScreen);
            
            previousTapTime = lastTapTime;
            previousTappedScreen = lastTappedScreen;
            
            // If double tap, handle special interaction
            if (isDoubleTap) {
                console.log("Double tap detected on screen:", screen.userData.id);
                
                // If it's a video screen, toggle playback
                if (screen.userData.contentType === "video" || screen.userData.contentType === "youtube") {
                    console.log("Toggling video playback on double tap");
                    if (videoControlFunctions.togglePlayback) {
                        videoControlFunctions.togglePlayback();
                    } else {
                        console.warn("Video playback function not available");
                    }
                }
            }
            
            return;
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
    
    // Handle control panel dragging
    if (isPanelBeingDragged && controlPanel) {
        // Update raycaster with current touch position
        raycaster.setFromCamera(currentTouchPosition, camera);
        
        // Get camera direction and up vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; // Keep panel at a constant height relative to camera view
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);
        
        // IMPROVED: Use same approach as screen dragging for more intuitive movement
        // Calculate movement delta from touch (like screen dragging)
        const deltaX = currentTouchPosition.x - previousTouchPosition.x;
        const deltaY = currentTouchPosition.y - previousTouchPosition.y;
        
        // Get camera's right and up vectors for moving in screen space
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        
        // Scale factor for more responsive movement - INCREASED
        const moveScale = 1.5; // Much more responsive movement
        
        // Create movement vector
        const movement = new THREE.Vector3()
            .addScaledVector(cameraRight, deltaX * moveScale)
            .addScaledVector(cameraUp, deltaY * moveScale);
        
        // Apply movement directly for more responsive feel
        controlPanel.position.add(movement);
        
        // Keep y position within reasonable bounds
        controlPanel.position.y = THREE.MathUtils.clamp(controlPanel.position.y, -0.3, 0.4);
        
        // Always face the camera for better visibility
        controlPanel.lookAt(camera.position);
        
        // Mark that the user has manually positioned the panel
        controlPanel.userData.manuallyPositioned = true;
        
        // Visual feedback - show tiny movement indicator
        const moveIndicatorSize = 0.01;
        createMoveIndicator(controlPanel.position.clone(), moveIndicatorSize);
        
        return;
    }
    
    // Handle dragging via the drag handle - even more direct approach
    if (isDraggingHandle && draggedScreen) {
        console.log("Moving screen via drag handle:", draggedScreen.userData.id);
        
        try {
            // Preserve original scale
            if (draggedScreen.userData && draggedScreen.userData.originalScale) {
                // Ensure scale doesn't change during movement
                draggedScreen.scale.copy(draggedScreen.userData.originalScale);
            }
            
            // DIRECT MOVEMENT APPROACH - increased sensitivity for AR
            // Calculate movement delta from touch
            const deltaX = currentTouchPosition.x - previousTouchPosition.x;
            const deltaY = currentTouchPosition.y - previousTouchPosition.y;
            
            // Get camera's right and up vectors for moving in screen space
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            
            // Scale for more noticeable movement in AR - INCREASED for faster movement
            const moveScale = 0.75; // Significantly increased for better AR response
            
            // Create movement vector
            const movement = new THREE.Vector3()
                .addScaledVector(cameraRight, deltaX * moveScale)
                .addScaledVector(cameraUp, deltaY * moveScale);
            
            // Apply movement directly
            draggedScreen.position.add(movement);
            
            // Make screen face the camera
            draggedScreen.lookAt(camera.position);
            
            // Optional visual feedback
            createMoveIndicator(draggedScreen.position.clone(), 0.03);
            
        } catch (error) {
            console.error("Error in drag movement:", error);
        }
        
        return;
    }
    
    // We're not handling other forms of movement to simplify the interaction model
    // This keeps the drag handle as the primary way to move screens, which improves reliability
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
    console.log("Setting up video controls with:", mediaModule);
    if (mediaModule) {
        videoControlFunctions.togglePlayback = mediaModule.toggleVideoPlayback || null;
        videoControlFunctions.toggleMute = mediaModule.toggleVideoMute || null;
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

// Handle direct iframe interactions
export function relayInteractionToIframe(screen, intersection, eventType) {
    if (!screen || !screen.userData) return false;
    
    // Find the content component that has the iframe reference
    const contentMesh = screen.children.find(
        child => child.material && 
                child.material.map && 
                child.material.map.userData && 
                (child.material.map.userData.iframe || 
                 child.material.map.userData.isBrowser || 
                 child.material.map.userData.isYouTube ||
                 child.material.map.userData.isMaps)
    );
    
    if (!contentMesh || !contentMesh.material || !contentMesh.material.map) return false;
    
    const userData = contentMesh.material.map.userData;
    const iframe = userData.iframe;
    
    if (!iframe) return false;
    
    // Get local point on the screen
    const localPoint = intersection.point.clone();
    screen.worldToLocal(localPoint);
    
    // Convert to iframe coordinates
    const iframeX = ((localPoint.x + (contentMesh.geometry.parameters.width/2)) / 
                     contentMesh.geometry.parameters.width) * iframe.width;
    
    // Adjust for title bar - don't send clicks to the title area (top 40px)
    let iframeY = ((localPoint.y + (contentMesh.geometry.parameters.height/2)) / 
                   contentMesh.geometry.parameters.height) * iframe.height;
    
    // Create the event to forward
    try {
        // Position the iframe on-screen temporarily to receive the event
        const tempPosition = iframe.style.position;
        const tempLeft = iframe.style.left;
        const tempTop = iframe.style.top;
        
        // Move to a visible position temporarily
        iframe.style.position = 'fixed';
        iframe.style.left = '0px';
        iframe.style.top = '0px';
        iframe.style.zIndex = '9999';
        
        // Dispatch the appropriate event
        if (eventType === 'click') {
            // Create a mouse click event
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: iframeX,
                clientY: iframeY
            });
            
            // Focus the iframe first
            iframe.focus();
            
            // Direct dispatch to iframe content
            if (iframe.contentDocument) {
                const element = iframe.contentDocument.elementFromPoint(iframeX, iframeY);
                if (element) {
                    element.dispatchEvent(clickEvent);
                }
            }
        } 
        else if (eventType === 'move' || eventType === 'hover') {
            // Create a mouse move event
            const moveEvent = new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: iframeX,
                clientY: iframeY
            });
            
            // Direct dispatch to iframe content
            if (iframe.contentDocument) {
                const element = iframe.contentDocument.elementFromPoint(iframeX, iframeY);
                if (element) {
                    element.dispatchEvent(moveEvent);
                }
            }
        }
        
        // Return iframe to hidden position
        iframe.style.position = tempPosition;
        iframe.style.left = tempLeft;
        iframe.style.top = tempTop;
        
        // For YouTube content, explicitly use player API if available
        if (userData.isYouTube && userData.player) {
            // For YouTube, use specific actions
            const centerX = contentMesh.geometry.parameters.width / 2;
            const centerY = contentMesh.geometry.parameters.height / 2;
            const clickX = localPoint.x + centerX;
            const clickY = -(localPoint.y - centerY);
            
            // Create appropriate API calls based on where the click happened
            if (Math.abs(clickX - centerX) < 50 && Math.abs(clickY - centerY) < 50) {
                // Center area - toggle play/pause
                if (userData.player.getPlayerState() === 1) { // playing
                    userData.player.pauseVideo();
                } else {
                    userData.player.playVideo();
                }
            }
        }
        
        return true;
    } catch (e) {
        console.error("Error forwarding interaction to iframe:", e);
        return false;
    }
} 