// AR interaction handling
import * as THREE from 'three';
import { showNotification, throttle, debounce } from './ar_utils.js';
import { toggleVideoPlayback, toggleVideoMute, unregisterVideoScreen } from './ar_media.js';
import { setButtonHover, setButtonPressed, toggleVirtualKeyboard } from './ar_ui.js';
import { createScreenFromButton, selectScreen, screens, css3dScene } from './ar_screens.js';

// Objects for tracking interaction state
const interactionState = {
    isSelecting: false,
    isMoving: false,
    isRotating: false,
    isDragging: false,
    touchStartPosition: new THREE.Vector2(),
    selectedObject: null,
    draggedObject: null,
    lastTouchPosition: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2()
};

// Reference to video controls
let videoControls = null;

// Set up event listeners for different input types
export function setupEventListeners() {
    // Check if we already have a renderer (required for touch interaction)
    if (!window.renderer) {
        console.error("Cannot set up event listeners - renderer not initialized");
        return;
    }
    
    // Touch events for mobile
    window.renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    window.renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    window.renderer.domElement.addEventListener('touchend', onTouchEnd, false);
    
    // Mouse events for desktop testing
    window.renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    window.renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    window.renderer.domElement.addEventListener('mouseup', onMouseUp, false);
    
    // Add XR controller event listeners if they exist
    if (window.controller) {
        window.controller.addEventListener('selectstart', onSelectStart);
        window.controller.addEventListener('select', onSelect);
        window.controller.addEventListener('selectend', onSelectEnd);
    }
    
    console.log("Event listeners set up successfully");
}

// XR controller select start event
function onSelectStart(event) {
    interactionState.isSelecting = true;
    
    // Cast ray from controller
    if (window.controller && window.scene && window.camera) {
        const controller = window.controller;
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        interactionState.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        interactionState.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Find intersections with objects in the scene
        const intersects = interactionState.raycaster.intersectObjects(window.scene.children, true);
        
        if (intersects.length > 0) {
            // Get first intersected object
            const intersectedObject = intersects[0].object;
            
            // Handle button interactions
            const button = getButtonFromIntersect(intersectedObject);
            if (button) {
                // Visual feedback and store button
                setButtonPressed(button, true);
                interactionState.selectedObject = button;
                return;
            }
            
            // Handle screen interactions
            const screen = getScreenFromIntersect(intersectedObject);
            if (screen) {
                selectScreen(screen);
                interactionState.selectedObject = screen;
                
                // If drag handle was clicked, start moving screen
                if (intersectedObject.userData && intersectedObject.userData.type === 'dragHandle') {
                    interactionState.isDragging = true;
                    interactionState.draggedObject = screen;
                    
                    // Show visual feedback
                    createModeChangeIndicator('Moving Screen');
                }
            }
        }
    }
}

// XR controller select event (trigger pull complete)
function onSelect(event) {
    if (!interactionState.isSelecting) return;
    
    // Cast ray from controller to find objects
    if (window.controller && window.scene) {
        const controller = window.controller;
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        interactionState.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        interactionState.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        // Find intersections
        const intersects = interactionState.raycaster.intersectObjects(window.scene.children, true);
        
        if (intersects.length > 0) {
            // Get first intersected object
            const intersectedObject = intersects[0].object;
            
            // Check if this is a button
            const button = getButtonFromIntersect(intersectedObject);
            if (button && button.userData && button.userData.action) {
                // Handle button action
                handleButtonAction(button);
            }
        }
    }
}

// XR controller select end event
function onSelectEnd(event) {
    interactionState.isSelecting = false;
    
    // Reset button states
    if (interactionState.selectedObject && interactionState.selectedObject.userData && 
        interactionState.selectedObject.userData.type === 'button') {
        setButtonPressed(interactionState.selectedObject, false);
    }
    
    // Clear dragging state
    interactionState.isDragging = false;
    interactionState.draggedObject = null;
    
    // Clear selected object
    interactionState.selectedObject = null;
}

// Handle touch start
function onTouchStart(event) {
    event.preventDefault();
    
    // Store initial touch position
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        
        // Convert touch position to normalized device coordinates
        interactionState.touchStartPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
        interactionState.touchStartPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        interactionState.lastTouchPosition.copy(interactionState.touchStartPosition);
        
        // Perform raycasting to detect objects
        if (window.camera && window.scene) {
            interactionState.raycaster.setFromCamera(interactionState.touchStartPosition, window.camera);
            const intersects = interactionState.raycaster.intersectObjects(window.scene.children, true);
            
            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                
                // Handle button interactions
                const button = getButtonFromIntersect(intersectedObject);
                if (button) {
                    // Visual feedback
                    setButtonPressed(button, true);
                    interactionState.selectedObject = button;
                    
                    // Trigger the button action immediately
                    if (button.userData && button.userData.action) {
                        handleButtonAction(button);
                    }
                    return;
                }
                
                // Handle screen interactions
                const screen = getScreenFromIntersect(intersectedObject);
                if (screen) {
                    selectScreen(screen);
                    interactionState.selectedObject = screen;
                    
                    // If drag handle was touched, start dragging
                    if (intersectedObject.userData && intersectedObject.userData.type === 'dragHandle') {
                        interactionState.isDragging = true;
                        interactionState.draggedObject = screen;
                        
                        // Visual feedback
                        createModeChangeIndicator('Moving Screen');
                        
                        // Add haptic feedback if available
                        if (navigator.vibrate) {
                            navigator.vibrate(20);
                        }
                    }
                    
                    // Highlight the screen briefly
                    flashScreenHighlight(screen);
                }
            }
        }
    }
}

// Handle touch move
function onTouchMove(event) {
    event.preventDefault();
    
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        
        // Convert touch position to normalized device coordinates
        const touchPosition = new THREE.Vector2();
        touchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
        touchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        
        // Calculate touch movement delta
        const touchDelta = new THREE.Vector2();
        touchDelta.subVectors(touchPosition, interactionState.lastTouchPosition);
        
        // Handle dragging screens
        if (interactionState.isDragging && interactionState.draggedObject) {
            moveScreenWithTouch(touchPosition, touchDelta);
        }
        
        // Update last touch position
        interactionState.lastTouchPosition.copy(touchPosition);
    }
}

// Handle touch end
function onTouchEnd(event) {
    event.preventDefault();
    
    // Reset button states
    if (interactionState.selectedObject && interactionState.selectedObject.userData && 
        interactionState.selectedObject.userData.type === 'button') {
        setButtonPressed(interactionState.selectedObject, false);
    }
    
    // End dragging with subtle animation
    if (interactionState.isDragging && interactionState.draggedObject) {
        // Add bounce animation
        const screen = interactionState.draggedObject;
        
        // Subtle "settling" animation
        const duration = 0.3;
        const startTime = Date.now();
        const originalPosition = screen.position.clone();
        const targetPosition = originalPosition.clone();
        
        // Slightly raise the screen up by a small amount to create a "bounce" effect
        targetPosition.y += 0.02;
        
        const bounceAnimation = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease in-out sine
            const eased = -(Math.cos(Math.PI * progress) - 1) / 2;
            
            // Apply bounce effect
            if (progress < 0.5) {
                // Moving up phase
                screen.position.y = originalPosition.y + (targetPosition.y - originalPosition.y) * (eased * 2);
            } else {
                // Settling back down phase
                screen.position.y = targetPosition.y - (targetPosition.y - originalPosition.y) * ((eased - 0.5) * 2);
            }
            
            if (progress < 1) {
                requestAnimationFrame(bounceAnimation);
            }
        };
        
        // Start the animation
        bounceAnimation();
    }
    
    // Reset interaction state
    interactionState.isDragging = false;
    interactionState.draggedObject = null;
    interactionState.selectedObject = null;
}

// Move screen with touch input
function moveScreenWithTouch(touchPosition, touchDelta) {
    const screen = interactionState.draggedObject;
    if (!screen || !window.camera) return;
    
    // Create a plane at screen's distance from camera
    const cameraPosition = new THREE.Vector3();
    window.camera.getWorldPosition(cameraPosition);
    
    const screenPosition = screen.position.clone();
    const distanceToScreen = cameraPosition.distanceTo(screenPosition);
    
    // Cast rays for current and previous touch positions
    interactionState.raycaster.setFromCamera(touchPosition, window.camera);
    const rayDirection = interactionState.raycaster.ray.direction.clone();
    
    // Calculate new position based on ray and distance
    const newPosition = cameraPosition.clone().add(
        rayDirection.multiplyScalar(distanceToScreen)
    );
    
    // Limit movement to reasonable bounds
    const maxDistance = 3; // Maximum distance from camera
    const distanceFromCamera = newPosition.distanceTo(cameraPosition);
    
    if (distanceFromCamera > maxDistance) {
        // Scale back to max distance
        const direction = newPosition.clone().sub(cameraPosition).normalize();
        newPosition.copy(cameraPosition).add(direction.multiplyScalar(maxDistance));
    }
    
    // Apply smooth movement
    screen.position.lerp(newPosition, 0.3);
    
    // Make the screen face the camera
    screen.lookAt(cameraPosition);
    
    // Create visual movement indicator (throttled to avoid too many indicators)
    createMoveIndicator(screen.position.clone(), 0.05);
}

// Create a move indicator at position
function createMoveIndicator(position, size) {
    if (!window.scene) return;
    
    // Create a small dot where the ray hit
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.8
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.copy(position);
    window.scene.add(indicator);
    
    // Fade out and remove
    const duration = 0.5;
    const startTime = Date.now();
    
    function fadeOut() {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        indicator.material.opacity = 0.8 * (1 - progress);
        indicator.scale.set(
            1 + progress,
            1 + progress,
            1 + progress
        );
        
        if (progress < 1) {
            requestAnimationFrame(fadeOut);
        } else {
            window.scene.remove(indicator);
            geometry.dispose();
            material.dispose();
        }
    }
    
    fadeOut();
}

// Handle button actions
function handleButtonAction(button) {
    if (!button || !button.userData) return;
    
    // Get button data
    const action = button.userData.action;
    const actionData = button.userData.actionData;
    
    console.log("Handling button action:", action, actionData);
    
    // Handle different button actions
    if (action === 'handleButtonAction' && actionData) {
        // Nested action from control panel
        switch(actionData.action) {
            case 'addScreen':
                createNewScreenInFrontOfCamera();
                break;
                
            case 'deleteScreen':
                deleteLastScreen();
                break;
                
            case 'selectScreenType':
                if (actionData.screenType) {
                    createScreenFromButton(actionData.screenType);
                }
                break;
                
            default:
                console.warn("Unknown button action data:", actionData);
        }
    } else if (action === 'playButton') {
        // Toggle video playback
        toggleVideoPlayback();
    } else if (action === 'volumeButton') {
        // Toggle video mute
        toggleVideoMute();
    }
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
}

// Create a new screen in front of the camera
function createNewScreenInFrontOfCamera() {
    if (!window.camera) {
        console.error("Cannot create screen - camera not initialized");
        return null;
    }
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    window.camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(window.camera.quaternion);
    
    // Position screen in front of camera
    const screenPosition = cameraPosition.clone().add(cameraDirection.multiplyScalar(1.5));
    
    // Create screen at position
    const newScreen = createScreenFromButton('video', screenPosition);
    
    // Visual feedback
    createModeChangeIndicator('New Screen Created');
    
    return newScreen;
}

// Delete the last selected screen
export function deleteLastScreen() {
    console.log("deleteLastScreen function called");
    
    // Find screen to delete
    let screenToDelete = null;
    
    // If a screen is selected, delete that one
    if (window.selectedScreen) {
        screenToDelete = window.selectedScreen;
    } 
    // Otherwise delete the last screen in the array
    else if (screens.length > 0) {
        screenToDelete = screens[screens.length - 1];
    }
    
    if (!screenToDelete) {
        console.log("No screen to delete");
        showNotification("No screen to delete", "warning");
        return false;
    }
    
    console.log("Deleting screen:", screenToDelete.userData.id);
    
    // If screen has a CSS3D object, remove it
    if (screenToDelete.userData && screenToDelete.userData.css3dObject) {
        // Remove from CSS3D scene
        if (css3dScene) {
            css3dScene.remove(screenToDelete.userData.css3dObject);
        }
    }
    
    // Dispose of resources
    try {
        screenToDelete.traverse(child => {
            if (child.material && child.material.map) {
                child.material.map.dispose();
            }
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                child.material.dispose();
            }
        });
    } catch (error) {
        console.error("Error disposing screen resources:", error);
    }
    
    // Remove from scene
    if (window.scene) {
        window.scene.remove(screenToDelete);
    }
    
    // Remove from screens array
    const index = screens.indexOf(screenToDelete);
    if (index > -1) {
        screens.splice(index, 1);
        console.log("Screen removed from screens array. Remaining screens:", screens.length);
    }
    
    // Unregister from video updates
    try {
        if (typeof unregisterVideoScreen === 'function') {
            unregisterVideoScreen(screenToDelete);
        }
    } catch (error) {
        console.warn("Could not unregister video screen:", error);
    }
    
    // After deleting the selected screen, select a new one if available
    if (screens.length > 0) {
        // Select the next available screen (last in array)
        const newSelectedScreen = screens[screens.length - 1];
        console.log("Selecting new screen:", newSelectedScreen.userData.id);
        selectScreen(newSelectedScreen);
    } else {
        // No screens left
        console.log("No screens left, clearing selection");
        selectScreen(null);
    }
    
    // Add haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([30, 20, 40]); // Pattern for delete
    }
    
    // Show notification
    showNotification("Screen deleted", "success");
    
    return true;
}

// Mouse event handlers (for desktop testing)
function onMouseDown(event) {
    // Convert mouse coordinates to match touch format and pass to touch handler
    const fakeTouch = {
        preventDefault: () => {},
        touches: [{
            clientX: event.clientX,
            clientY: event.clientY
        }]
    };
    onTouchStart(fakeTouch);
}

function onMouseMove(event) {
    // Convert mouse coordinates to match touch format and pass to touch handler
    const fakeTouch = {
        preventDefault: () => {},
        touches: [{
            clientX: event.clientX,
            clientY: event.clientY
        }]
    };
    onTouchMove(fakeTouch);
}

function onMouseUp(event) {
    // Simulate touch end
    const fakeTouch = { preventDefault: () => {} };
    onTouchEnd(fakeTouch);
}

// Create a mode change indicator
function createModeChangeIndicator(message) {
    if (!window.camera || !window.scene) return;
    
    // Create canvas for text
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw background with rounded corners
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    
    // Rounded rectangle path
    const radius = 20;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    
    // Add text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.width/2, canvas.height/2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create indicator plane
    const geometry = new THREE.PlaneGeometry(0.5, 0.125);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    
    // Position in front of camera
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(window.camera.quaternion);
    
    const position = new THREE.Vector3();
    position.copy(window.camera.position).add(direction.multiplyScalar(1));
    position.y += 0.2; // Position above eye level
    
    indicator.position.copy(position);
    indicator.quaternion.copy(window.camera.quaternion);
    
    // Add to scene
    window.scene.add(indicator);
    
    // Fade out and remove
    const duration = 1.5;
    const startTime = Date.now();
    
    function fadeOut() {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        // Fade out in the last 0.5 seconds
        if (progress > 0.6) {
            const fadeProgress = (progress - 0.6) / 0.4;
            indicator.material.opacity = 1 - fadeProgress;
        }
        
        // Update position to follow camera
        const newDirection = new THREE.Vector3(0, 0, -1);
        newDirection.applyQuaternion(window.camera.quaternion);
        
        const newPosition = new THREE.Vector3();
        newPosition.copy(window.camera.position).add(newDirection.multiplyScalar(1));
        newPosition.y += 0.2;
        
        indicator.position.copy(newPosition);
        indicator.quaternion.copy(window.camera.quaternion);
        
        if (progress < 1) {
            requestAnimationFrame(fadeOut);
        } else {
            window.scene.remove(indicator);
            geometry.dispose();
            material.dispose();
            texture.dispose();
        }
    }
    
    fadeOut();
}

// Flash a highlight on a screen for visual feedback
function flashScreenHighlight(screen) {
    if (!screen || !window.scene) return;
    
    // Create highlight mesh
    const width = 1.0;
    const height = 0.75;
    
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthTest: false
    });
    
    const highlight = new THREE.Mesh(geometry, material);
    
    // Position at screen
    highlight.position.copy(screen.position);
    highlight.rotation.copy(screen.rotation);
    highlight.position.z += 0.001; // Slightly in front
    
    // Add to scene
    window.scene.add(highlight);
    
    // Animate fade in and out
    const duration = 0.5;
    const startTime = Date.now();
    
    // Fade in phase
    const fadeIn = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / (duration / 2), 1);
        
        highlight.material.opacity = progress * 0.5;
        
        if (progress < 1) {
            requestAnimationFrame(fadeIn);
        } else {
            // Start fade out phase
            const fadeOut = () => {
                const elapsedOut = (Date.now() - startTime) / 1000 - (duration / 2);
                const progressOut = Math.min(elapsedOut / (duration / 2), 1);
                
                highlight.material.opacity = 0.5 * (1 - progressOut);
                
                if (progressOut < 1) {
                    requestAnimationFrame(fadeOut);
                } else {
                    // Clean up
                    window.scene.remove(highlight);
                    geometry.dispose();
                    material.dispose();
                }
            };
            
            fadeOut();
        }
    };
    
    fadeIn();
}

// Helper to get button from intersection
function getButtonFromIntersect(object) {
    // Check if object is a button
    if (object.userData && object.userData.type === 'button') {
        return object;
    }
    
    // Check if parent is a button
    if (object.parent && object.parent.userData && object.parent.userData.type === 'button') {
        return object.parent;
    }
    
    return null;
}

// Helper to get screen from intersection
function getScreenFromIntersect(object) {
    // Check if the object has a userData type
    if (!object || !object.userData) return null;
    
    // If it's a screen, return it directly
    if (object.userData.type === 'screen') {
        return object;
    }
    
    // Navigate up the parent chain to find a screen
    let current = object;
    while (current && current.parent) {
        // Check if current object is a child of a screen
        if (current.parent.userData && current.parent.userData.type === 'screen') {
            return current.parent;
        }
        
        // If the current object has screen reference in userData, use that
        if (current.userData && current.userData.screen) {
            return current.userData.screen;
        }
        
        // Move up to parent
        current = current.parent;
    }
    
    return null;
}

// Set up video control functionality
export function setupVideoControls(mediaControls) {
    // Store references to media control functions
    if (mediaControls) {
        videoControls = mediaControls;
    }
} 