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
    
    // If we hit a child of a button (like the icon)
    if (object.parent && object.parent.userData && object.parent.userData.type === 'button') {
        return object.parent;
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
    
    // Find parent screen by walking up the hierarchy
    let parent = object.parent;
    while (parent) {
        if (parent.userData && parent.userData.type === 'screen') {
            return parent;
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
    } else if (action === 'fullscreenButton') {
        toggleFullscreen(button.userData.screen);
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

// Toggle fullscreen for a screen
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
            }
        });
    });
    
    return buttons;
}

// Touch start handler
function onTouchStart(event) {
    event.preventDefault();
    
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
    
    // Check for button intersections first
    const buttons = findAllButtons();
    const buttonIntersects = raycaster.intersectObjects(buttons, true);
    
    if (buttonIntersects.length > 0) {
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
            
            // Provide haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(40);
            }
            
            // Handle the button action
            handleButtonAction(buttonObj);
            return;
        }
    }
    
    // Check for screen intersections
    const screenIntersects = raycaster.intersectObjects(screens, true);
    
    if (screenIntersects.length > 0) {
        const screenObj = getScreenFromIntersect(screenIntersects[0].object);
        if (screenObj) {
            // Select the screen
            selectScreen(screenObj);
            selectedScreen = screenObj;
            
            // Store intersection point for drag calculations
            screenOffset.copy(screenObj.position).sub(screenIntersects[0].point);
            
            // Double tap to toggle fullscreen
            if (doubleTapDetected) {
                toggleFullscreen(screenObj);
                
                // Provide haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate([30, 20, 30]);
                }
                
                // Visual fullscreen feedback
                createModeChangeIndicator('Fullscreen Toggled');
                return;
            }
            
            // Always enable screen movement on touch - simplifies interaction
            isTouchMovingScreen = true;
            
            // Provide light haptic feedback for screen selection
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
    if (!selectedScreen) return;
    
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
        
        // Apply more responsive smoothing
        selectedScreen.position.lerp(targetPosition, 0.7);
        
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
        
        // Add visual feedback for movement
        createMoveIndicator(selectedScreen.position.clone(), 0.05);
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