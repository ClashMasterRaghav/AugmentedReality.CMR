// Reset script to restore screens if they disappear
import * as THREE from 'three';
import { scene, camera } from './ar_core.js';
import { createNewBrowserScreen, screens, restoreScreens } from './ar_screens.js';

// Function to reset all screens
export function resetScreens() {
    console.log("Resetting screens...");
    
    // Clear any existing screens from the scene
    if (screens && screens.length > 0) {
        screens.forEach(screen => {
            if (scene.children.includes(screen)) {
                scene.remove(screen);
            }
        });
        
        // Clear screens array
        screens.length = 0;
    }
    
    // Create a new screen in front of the camera
    const position = new THREE.Vector3(0, 0, -1.2);
    if (camera) {
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        position.copy(camera.position).add(cameraDirection.multiplyScalar(1.2));
    }
    
    const newScreen = createNewBrowserScreen(position);
    console.log("Created new screen at position:", position);
    
    // Make screen face the camera
    if (camera) {
        newScreen.lookAt(camera.position);
    }
    
    return newScreen;
}

// Export a restore function that just restores screens if missing
export function checkAndRestoreScreens() {
    return restoreScreens();
}

// Check if being imported or directly executed
if (typeof window !== 'undefined' && window.document) {
    // Browser environment
    console.log("Reset screens script loaded");
    
    // Add a global function for debugging
    window.resetAllScreens = resetScreens;
    window.checkScreens = checkAndRestoreScreens;
    
    // Create a floating reset button for emergencies
    const button = document.createElement('button');
    button.textContent = 'Reset Screens';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#ff3333';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.fontWeight = 'bold';
    
    // Add click event
    button.addEventListener('click', () => {
        resetScreens();
        alert('Screens have been reset!');
    });
    
    // Add to DOM
    document.body.appendChild(button);
} 