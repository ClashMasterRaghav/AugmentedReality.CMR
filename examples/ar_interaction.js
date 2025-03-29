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
    
    // Try to find parent button by walking up the hierarchy
    let parent = object.parent;
    while (parent) {
        if (parent.userData && parent.userData.type === 'button') {
            return parent;
        }
        parent = parent.parent;
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
    // If we hit the screen directly
    if (object.userData && object.userData.type === 'screen') {
        return object;
    }
    
    // If the object has a direct reference to its parent screen
    if (object.userData && object.userData.parentScreen) {
        return object.userData.parentScreen;
    }
    
    // Find parent screen by walking up the hierarchy
    let parent = object.parent;
    while (parent) {
        if (parent.userData && parent.userData.type === 'screen') {
            return parent;
        }
        
        // Try to use a direct reference if available
        if (parent.userData && parent.userData.parentScreen) {
            return parent.userData.parentScreen;
        }
        
        parent = parent.parent;
    }
    
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

// Find all buttons in the scene
function findAllButtons() {
    // Gather all buttons from screens and control panel
    const allButtons = [];
    
    // Get buttons from screens
    const allScreens = findAllScreens();
    allScreens.forEach(screen => {
        screen.children.forEach(child => {
            if (child.userData && child.userData.type === 'button') {
                allButtons.push(child);
            }
        });
    });
    
    // Get buttons from control panel if it exists
    if (controlPanel) {
        controlPanel.children.forEach(child => {
            if (child.userData && child.userData.type === 'button') {
                allButtons.push(child);
            }
        });
    }
    
    return allButtons;
}

// Touch start handler
function onTouchStart(event) {
    event.preventDefault();
    
    // Log touch event
    console.log(`Touch start detected with ${event.touches.length} fingers`);
    
    // Check for multi-touch (pinch gesture)
    if (event.touches.length === 2 && selectedScreen) {
        // Start pinch-to-zoom
        isPinching = true;
        
        // Calculate initial distance between fingers
        const touch1 = new THREE.Vector2(event.touches[0].clientX, event.touches[0].clientY);
        const touch2 = new THREE.Vector2(event.touches[1].clientX, event.touches[1].clientY);
        initialPinchDistance = touch1.distanceTo(touch2);
        
        // Store initial scale
        initialScale.copy(selectedScreen.scale);
        
        // Disable other touch interactions during pinch
        isTouchMovingScreen = false;
        isRotatingScreen = false;
        
        // Provide haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }
        
        return;
    }
    
    // Single touch handling
    const touch = event.touches[0];
    
    // Convert touch to normalized device coordinates
    initialTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    initialTouchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    currentTouchPosition.copy(initialTouchPosition);
    
    // Update raycaster
    raycaster.setFromCamera(initialTouchPosition, camera);
    
    // Double tap detection
    const now = performance.now();
    const doubleTapDetected = (now - lastTapTime) < 300;
    lastTapTime = now;
    
    // *** PRIORITIZE SCREEN DETECTION ***
    // Use recursive true for deep intersection testing of all screen objects
    const allScreens = findAllScreens();
    console.log(`Testing intersections with ${allScreens.length} screens`);
    
    // Test with entire screen objects
    const screenIntersects = raycaster.intersectObjects(allScreens, true);
    console.log(`Found ${screenIntersects.length} screen intersections`);
    
    if (screenIntersects.length > 0) {
        // Log intersection details
        console.log("Screen intersection:", screenIntersects[0].object.uuid);
        
        const screenObj = getScreenFromIntersect(screenIntersects[0].object);
        if (screenObj) {
            console.log("Found parent screen:", screenObj.uuid);
            
            // Select the screen
            selectScreen(screenObj);
            selectedScreen = screenObj;
            
            // Show touch indicator at intersection point for visual feedback
            createTouchIndicator(screenIntersects[0].point);
            
            // Store intersection point for drag calculations
            screenOffset.copy(screenObj.position).sub(screenIntersects[0].point);
            
            // Double tap to toggle resize 
            if (doubleTapDetected) {
                toggleResize(screenObj);
                
                // Provide haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate([30, 20, 30]);
                }
                
                return;
            }
            
            // ALWAYS enable screen movement on touch by default 
            isTouchMovingScreen = true;
            console.log("Screen touch detected - moving enabled");
            
            // Make screen "jump" slightly to indicate it's selected
            const originalPos = screenObj.position.clone();
            screenObj.position.z += 0.05; // Move slightly toward user
            
            setTimeout(() => {
                screenObj.position.copy(originalPos);
            }, 200);
            
            // Create visual feedback to show touch was detected
            createModeChangeIndicator("Screen Selected");
            
            // Provide haptic feedback for screen selection
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
            
            // Flash highlight around selected screen
            flashScreenHighlight(screenObj);
            
            // If in rotate mode, also enable rotation
            if (isRotateModeActive) {
                isRotatingScreen = true;
                initialRotation.copy(screenObj.rotation);
                initialMousePosition.copy(initialTouchPosition);
            }
            
            return; // Exit early to prioritize screen movement over buttons
        }
    }
    
    // If no screen detected, check for buttons
    console.log("No screen detected, checking for buttons");
    const buttons = findAllButtons();
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
        console.log("Button detected:", buttonIntersects[0].object.uuid);
        const buttonObj = getButtonFromIntersect(buttonIntersects[0].object);
        if (buttonObj) {
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
            
            // Create touch indicator at intersection point
            createTouchIndicator(buttonIntersects[0].point);
            
            // Provide haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(40);
            }
            
            // Handle the button action
            handleButtonAction(buttonObj);
            return;
        }
    }
    
    console.log("No interactive elements detected");
}

// Create a visual indicator for touch point
function createTouchIndicator(position) {
    // Create a small sphere at the touch point
    const geometry = new THREE.SphereGeometry(0.02, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4FC3F7,
        transparent: true,
        opacity: 0.8
    });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.copy(position);
    scene.add(indicator);
    
    // Animate and remove
    const startTime = performance.now();
    const duration = 500; // ms
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            scene.remove(indicator);
            indicator.geometry.dispose();
            indicator.material.dispose();
            return;
        }
        
        // Scale up and fade out
        const scale = 1 + progress * 2;
        indicator.scale.set(scale, scale, scale);
        indicator.material.opacity = 0.8 * (1 - progress);
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Touch move handler
function onTouchMove(event) {
    if (!selectedScreen) {
        return;
    }
    
    event.preventDefault();
    
    // Handle pinch zoom with two fingers
    if (event.touches.length === 2 && isPinching) {
        const touch1 = new THREE.Vector2(event.touches[0].clientX, event.touches[0].clientY);
        const touch2 = new THREE.Vector2(event.touches[1].clientX, event.touches[1].clientY);
        const currentPinchDistance = touch1.distanceTo(touch2);
        
        // Calculate scale factor based on pinch
        const scaleFactor = currentPinchDistance / initialPinchDistance;
        
        // Apply new scale (with limits to prevent too small or too large)
        const newScale = initialScale.clone().multiplyScalar(scaleFactor);
        
        // Clamp scale to reasonable values
        newScale.x = THREE.MathUtils.clamp(newScale.x, 0.5, 2.5);
        newScale.y = THREE.MathUtils.clamp(newScale.y, 0.5, 2.5);
        newScale.z = 1; // Keep z scale at 1
        
        // Apply scale with smoothing
        selectedScreen.scale.lerp(newScale, 0.3);
        
        // Store the new scale in userData for reference
        selectedScreen.userData.currentScale = selectedScreen.scale.clone();
        return;
    }
    
    // Single touch handling
    const touch = event.touches[0];
    
    // Convert touch to normalized device coordinates
    currentTouchPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    currentTouchPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // By default, move the screen - this makes touch interaction more intuitive
    moveScreenWithTouch();
    
    // If rotation mode is active, also rotate
    if (isRotatingScreen) {
        rotateScreenWithTouch();
    }
}

// Move screen based on touch movement
function moveScreenWithTouch() {
    if (!selectedScreen) {
        console.log("No selected screen to move");
        return;
    }
    
    // Update raycaster with current touch position
    raycaster.setFromCamera(currentTouchPosition, camera);
    
    // Create a plane parallel to the camera's viewing direction
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    
    // Create a plane at the screen's distance from camera
    const cameraToScreen = selectedScreen.position.clone().sub(camera.position);
    const distanceToScreen = cameraToScreen.dot(normal);
    const plane = new THREE.Plane(normal, -distanceToScreen);
    
    // Get intersection point with the plane
    const intersectionPoint = new THREE.Vector3();
    const didIntersect = raycaster.ray.intersectPlane(plane, intersectionPoint);
    
    if (didIntersect) {
        // Add screenOffset to maintain relative touch position
        const targetPosition = intersectionPoint.clone().add(screenOffset);
        
        // Calculate movement distance for feedback
        const moveDistance = selectedScreen.position.distanceTo(targetPosition);
        
        // Apply direct movement with no smoothing for immediate response
        selectedScreen.position.copy(targetPosition);
        
        // Ensure the screen stays at a reasonable distance
        const distance = camera.position.distanceTo(selectedScreen.position);
        
        // If screen gets too close or too far, adjust its position
        if (distance < 0.5 || distance > 5) {
            const idealDistance = THREE.MathUtils.clamp(distance, 0.5, 5);
            const direction = selectedScreen.position.clone().sub(camera.position).normalize();
            selectedScreen.position.copy(camera.position.clone().add(direction.multiplyScalar(idealDistance)));
        }
        
        // Update controlPanel if it has a screen reference
        if (controlPanel && controlPanel.userData && controlPanel.userData.update) {
            controlPanel.userData.update();
        }
        
        // Add visual feedback for significant movements
        if (moveDistance > 0.01) {
            createMoveIndicator(selectedScreen.position.clone(), 0.02);
            
            // Log movement for debugging
            console.log("Moving screen", moveDistance.toFixed(3), "units");
        }
    }
}

// Create a visual indicator for movement feedback
function createMoveIndicator(position, size = 0.05) {
    // Create a ring to show where the screen is being moved
    const geometry = new THREE.RingGeometry(size, size + 0.01, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4FC3F7,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.copy(position);
    
    // Orient to face camera
    indicator.lookAt(camera.position);
    
    scene.add(indicator);
    
    // Animate and remove
    const startTime = performance.now();
    const duration = 300; // ms
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            scene.remove(indicator);
            indicator.geometry.dispose();
            indicator.material.dispose();
            return;
        }
        
        // Scale up and fade out
        const scale = 1 + progress * 3;
        indicator.scale.set(scale, scale, scale);
        indicator.material.opacity = 0.6 * (1 - progress);
        
        requestAnimationFrame(animate);
    }
    
    animate();
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
    // Check if we were doing something interactive
    const wasInteractive = isTouchMovingScreen || isRotatingScreen || isPinching;
    
    // Reset interaction flags
    isTouchMovingScreen = false;
    isRotatingScreen = false;
    isPinching = false;
    
    // If this was the last touch and we have a selected screen, save its current state
    if (event.touches.length === 0 && selectedScreen) {
        // Save current scale
        if (selectedScreen.userData.currentScale) {
            selectedScreen.userData.originalScale = selectedScreen.userData.currentScale.clone();
        }
        
        // Save current position
        selectedScreen.userData.originalPosition = selectedScreen.position.clone();
        
        // Provide haptic feedback for interaction end (if we were doing something)
        if (wasInteractive && navigator.vibrate) {
            navigator.vibrate(15);  // Lighter vibration for release
        }
        
        // Create a subtle "settle" animation when dropping the screen
        if (wasInteractive) {
            // Small "bounce" effect when releasing
            const originalPosition = selectedScreen.position.clone();
            
            // Slight drop effect
            const dropAnimation = () => {
                const downPos = originalPosition.clone();
                downPos.y -= 0.01;  // Move slightly down
                selectedScreen.position.lerp(downPos, 0.5);
                
                setTimeout(() => {
                    // Bounce back up
                    const upAnimation = () => {
                        selectedScreen.position.lerp(originalPosition, 0.3);
                    };
                    requestAnimationFrame(upAnimation);
                }, 100);
            };
            requestAnimationFrame(dropAnimation);
            
            // Show a brief confirmation indicator
            createModeChangeIndicator('Position Saved');
        }
    }
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
    // Create a text indicator using HTML
    const indicator = document.createElement('div');
    indicator.textContent = message;
    indicator.style.position = 'fixed';
    indicator.style.bottom = '20px';
    indicator.style.left = '50%';
    indicator.style.transform = 'translateX(-50%)';
    indicator.style.background = 'rgba(33, 150, 243, 0.8)';
    indicator.style.color = 'white';
    indicator.style.padding = '10px 20px';
    indicator.style.borderRadius = '20px';
    indicator.style.fontFamily = 'Arial, sans-serif';
    indicator.style.fontSize = '16px';
    indicator.style.fontWeight = 'bold';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.3s ease-in-out';
    
    document.body.appendChild(indicator);
    
    // Fade in
    setTimeout(() => {
        indicator.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(indicator);
        }, 300);
    }, 1500);
}

// Flash a highlight effect around a selected screen
function flashScreenHighlight(screen) {
    // Create a highlight effect around the selected screen
    const width = screen.userData.originalDimensions?.width || 1.0;
    const height = screen.userData.originalDimensions?.height || 0.75;
    
    const geometry = new THREE.PlaneGeometry(width + 0.15, height + 0.15);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4FC3F7,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const highlight = new THREE.Mesh(geometry, material);
    highlight.position.copy(screen.position);
    highlight.position.z -= 0.015; // Behind screen
    
    // Match screen rotation
    highlight.rotation.copy(screen.rotation);
    
    scene.add(highlight);
    
    // Animate and remove
    const startTime = performance.now();
    const duration = 500; // ms
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            scene.remove(highlight);
            highlight.geometry.dispose();
            highlight.material.dispose();
            return;
        }
        
        // Pulse effect
        const pulse = Math.sin(progress * Math.PI * 3);
        const scale = 1 + pulse * 0.1;
        highlight.scale.set(scale, scale, scale);
        highlight.material.opacity = 0.3 * (1 - progress);
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Find all screens in the scene
function findAllScreens() {
    // First try to use the screens array
    if (screens && screens.length > 0) {
        return screens;
    }
    
    // Fallback: search directly in the scene
    return scene.children.filter(obj => obj.userData && obj.userData.type === 'screen');
} 