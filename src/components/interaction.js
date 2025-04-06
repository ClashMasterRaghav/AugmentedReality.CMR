// interaction.js - Handles user input and interaction with 3D objects
import * as THREE from 'three';
import { getScreens, getSelectedScreen, selectScreen, removeScreen } from './screens.js';
import { getActiveMode, getControlPanel } from './ui.js';

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const workingMatrix = new THREE.Matrix4();

// Interaction state
let isDragging = false;
let selectedObject = null;
let initialIntersectionPoint = new THREE.Vector3();
let initialObjectPosition = new THREE.Vector3();
let controller = null;

// Setup interaction handlers
export function setupInteractions(scene, camera, xrController) {
    // Store controller reference
    controller = xrController;
    
    // Setup event listeners
    // For desktop/non-AR testing
    if (!controller) {
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // For mobile
        document.addEventListener('touchstart', onTouchStart);
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    }
    
    // For XR controller (AR mode)
    if (controller) {
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
    }
    
    // Update the interaction on each frame
    setInterval(() => updateInteraction(scene, camera), 16); // ~60fps
}

// Mouse event handlers for desktop testing
function onMouseDown(event) {
    event.preventDefault();
    
    // Calculate mouse position in normalized device coordinates
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    checkInteraction();
}

function onMouseMove(event) {
    event.preventDefault();
    
    if (!isDragging || !selectedObject) return;
    
    // Update mouse position
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseUp(event) {
    event.preventDefault();
    endInteraction();
}

// Touch event handlers for mobile testing
function onTouchStart(event) {
    event.preventDefault();
    
    if (event.touches.length > 0) {
        const touch = event.touches[0];
        pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        
        checkInteraction();
    }
}

function onTouchMove(event) {
    event.preventDefault();
    
    if (!isDragging || !selectedObject || event.touches.length === 0) return;
    
    const touch = event.touches[0];
    pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
}

function onTouchEnd(event) {
    event.preventDefault();
    endInteraction();
}

// XR controller event handlers
function onSelectStart(event) {
    checkXRInteraction();
}

function onSelectEnd(event) {
    endInteraction();
}

// Check for interaction with objects
function checkInteraction() {
    if (!isDragging) {
        // Find what was clicked
        const intersects = performRaycast();
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const object = intersect.object;
            
            // Store initial interaction state
            initialIntersectionPoint.copy(intersect.point);
            
            // Check what type of object was hit
            if (object.userData && object.userData.type) {
                switch (object.userData.type) {
                    case 'closeButton':
                        if (object.userData.screen) {
                            removeScreen(object.userData.screen);
                        }
                        break;
                        
                    case 'button':
                        if (object.userData.action && typeof object.userData.action === 'function') {
                            object.userData.action();
                        }
                        break;
                        
                    case 'dragHandle':
                        startDragging(object.userData.screen);
                        break;
                        
                    case 'screen':
                        // Select the screen
                        selectScreen(object);
                        break;
                        
                    default:
                        // Check if parent has relevant data
                        if (object.parent && object.parent.userData && 
                            object.parent.userData.type === 'screen') {
                            selectScreen(object.parent);
                        }
                }
            }
        }
    }
}

// Check for XR controller interaction
function checkXRInteraction() {
    if (!controller || isDragging) return;
    
    // Get controller world matrix
    workingMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);
    
    // Find all objects the ray intersects
    const screens = getScreens();
    const controlPanel = getControlPanel();
    const objectsToCheck = [...screens];
    
    if (controlPanel) objectsToCheck.push(controlPanel);
    
    // Get all meshes from these objects
    const meshes = [];
    objectsToCheck.forEach(object => {
        object.traverse(child => {
            if (child.isMesh && child.userData && child.userData.isInteractive !== false) {
                meshes.push(child);
            }
        });
    });
    
    const intersects = raycaster.intersectObjects(meshes, false);
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const object = intersect.object;
        
        // Store initial intersection state
        initialIntersectionPoint.copy(intersect.point);
        
        // Check what type of object was hit
        if (object.userData && object.userData.type) {
            switch (object.userData.type) {
                case 'closeButton':
                    if (object.userData.screen) {
                        removeScreen(object.userData.screen);
                    }
                    break;
                    
                case 'button':
                    if (object.userData.action && typeof object.userData.action === 'function') {
                        object.userData.action();
                    }
                    break;
                    
                case 'dragHandle':
                    startDragging(object.userData.screen);
                    break;
                    
                case 'screen':
                    const activeMode = getActiveMode();
                    if (activeMode === 'move') {
                        startDragging(object);
                    } else {
                        // Select the screen
                        selectScreen(object);
                    }
                    break;
                    
                default:
                    // Check if parent has relevant data
                    if (object.parent && object.parent.userData && 
                        object.parent.userData.type === 'screen') {
                        selectScreen(object.parent);
                    }
            }
        }
    }
}

// Start dragging an object
function startDragging(object) {
    if (!object) return;
    
    isDragging = true;
    selectedObject = object;
    initialObjectPosition.copy(object.position);
    
    console.log(`Started dragging object: ${object.userData.type}`);
}

// End current interaction
function endInteraction() {
    isDragging = false;
    selectedObject = null;
}

// Perform raycast based on current pointer position
function performRaycast() {
    // Update the raycaster
    raycaster.setFromCamera(pointer, window.camera); // Global camera reference
    
    // Get objects to check
    const screens = getScreens();
    const controlPanel = getControlPanel();
    const objectsToCheck = [...screens];
    
    if (controlPanel) objectsToCheck.push(controlPanel);
    
    // Get all meshes from these objects
    const meshes = [];
    objectsToCheck.forEach(object => {
        object.traverse(child => {
            if (child.isMesh && child.userData && child.userData.isInteractive !== false) {
                meshes.push(child);
            }
        });
    });
    
    // Perform raycast
    return raycaster.intersectObjects(meshes, false);
}

// Update interaction state on each frame
function updateInteraction(scene, camera) {
    // Handle object dragging based on mode
    if (isDragging && selectedObject) {
        const activeMode = getActiveMode();
        
        if (activeMode === 'move' || !activeMode) {
            // Move mode or default dragging (for drag handles)
            if (controller) {
                // In AR mode, use controller for dragging
                updateXRDragging();
            } else {
                // In desktop mode, use raycaster for dragging
                updateDesktopDragging(camera);
            }
        } else if (activeMode === 'rotate') {
            // Rotate mode
            updateRotation();
        } else if (activeMode === 'resize') {
            // Resize mode
            updateResize();
        }
    }
}

// Update dragging in desktop mode
function updateDesktopDragging(camera) {
    // Update the raycaster with current pointer
    raycaster.setFromCamera(pointer, camera);
    
    // Calculate drag distance on an imaginary plane at the same distance as the object
    const objectDistance = initialObjectPosition.distanceTo(camera.position);
    const planeNormal = new THREE.Vector3().subVectors(camera.position, initialObjectPosition).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, initialObjectPosition);
    
    // Find where on the plane the ray intersects
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, targetPoint);
    
    // Update object position
    selectedObject.position.copy(targetPoint);
}

// Update dragging in XR mode
function updateXRDragging() {
    if (!controller) return;
    
    // Get controller direction
    workingMatrix.identity().extractRotation(controller.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(workingMatrix);
    
    // Get controller position
    const controllerPosition = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    
    // Calculate target position at a fixed distance in front of controller
    const dragDistance = 0.8; // Distance in front of controller
    const targetPosition = new THREE.Vector3().copy(controllerPosition).add(
        direction.multiplyScalar(dragDistance)
    );
    
    // Smooth movement (lerp)
    selectedObject.position.lerp(targetPosition, 0.5);
}

// Update rotation of selected object
function updateRotation() {
    if (!controller || !selectedObject) return;
    
    // Extract controller rotation
    workingMatrix.identity().extractRotation(controller.matrixWorld);
    const controllerQuaternion = new THREE.Quaternion().setFromRotationMatrix(workingMatrix);
    
    // Extract rotation values with sensitivity adjustment
    const euler = new THREE.Euler().setFromQuaternion(controllerQuaternion);
    
    // Apply rotation with smoothing
    selectedObject.rotation.x = THREE.MathUtils.lerp(selectedObject.rotation.x, euler.x, 0.1);
    selectedObject.rotation.y = THREE.MathUtils.lerp(selectedObject.rotation.y, euler.y, 0.1);
    
    // Limit rotation to avoid extreme angles
    selectedObject.rotation.x = THREE.MathUtils.clamp(
        selectedObject.rotation.x, 
        -Math.PI / 2,  // Limit to 90 degrees up
        Math.PI / 2    // Limit to 90 degrees down
    );
}

// Update resize of selected object
function updateResize() {
    if (!controller || !selectedObject) return;
    
    // Get controller position and selected object position
    const controllerPosition = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const objectPosition = new THREE.Vector3().setFromMatrixPosition(selectedObject.matrixWorld);
    
    // Calculate distance between controller and object center
    const distance = controllerPosition.distanceTo(objectPosition);
    
    // Base scale on distance with limits
    const baseScale = THREE.MathUtils.clamp(distance, 0.5, 2.0);
    const targetScale = baseScale;
    
    // Apply smooth scaling
    selectedObject.scale.x = THREE.MathUtils.lerp(selectedObject.scale.x, targetScale, 0.1);
    selectedObject.scale.y = THREE.MathUtils.lerp(selectedObject.scale.y, targetScale, 0.1);
    selectedObject.scale.z = THREE.MathUtils.lerp(selectedObject.scale.z, targetScale, 0.1);
} 