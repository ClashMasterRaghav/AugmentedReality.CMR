// Screen creation and management functionality
import * as THREE from "three";
import { scene, camera, selectedScreen, setSelectedScreen } from "./ar_core.js";
import { virtualKeyboard } from "./ar_ui.js";
import { createDefaultScreen } from "./ar_default_screen.js"; 
import { createYouTubeScreen as importedCreateYouTubeScreen } from "./ar_youtube.js";
import { createBrowserScreen } from "./ar_browser.js";
import { createMapsScreen } from "./ar_maps.js";
import { createElectronAppScreen as importedCreateElectronAppScreen } from "./ar_electron.js";

// Array to store screen objects
export let screens = [];

// Create a new browser screen
export function createNewBrowserScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    const browserScreen = createBrowserScreen(position, screens.length + 1);
    
    // Add to scene and screens array
    scene.add(browserScreen);
    screens.push(browserScreen);
    
    // Select this as the current screen
    selectScreen(browserScreen);
    
    return browserScreen;
}

// Create a new YouTube screen wrapper function
export function createNewYouTubeScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    const youtubeScreen = importedCreateYouTubeScreen(position, screens.length + 1);
    
    // Add to scene and screens array
    scene.add(youtubeScreen);
    screens.push(youtubeScreen);
    
    // Select this as the current screen
    selectScreen(youtubeScreen);
    
    return youtubeScreen;
}

// Create a DuckDuckGo search screen (alias for browser screen)
export const createDuckDuckGoScreen = createBrowserScreen;

// Create a new Google Maps screen wrapper function
export function createNewGoogleMapsScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    const mapsScreen = createMapsScreen(position, screens.length + 1);
    
    // Add to scene and screens array
    scene.add(mapsScreen);
    screens.push(mapsScreen);
    
    // Select this as the current screen
    selectScreen(mapsScreen);
    
    return mapsScreen;
}

// Create Google Maps screen (alias for createNewGoogleMapsScreen)
export const createGoogleMapsScreen = createNewGoogleMapsScreen;

// Create a new Electron app screen wrapper function
export function createNewElectronAppScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    const electronScreen = importedCreateElectronAppScreen(position, screens.length + 1);
    
    // Add to scene and screens array
    scene.add(electronScreen);
    screens.push(electronScreen);
    
    // Select this as the current screen
    selectScreen(electronScreen);
    
    return electronScreen;
}

// Export the imported functions directly
export const createElectronAppScreen = importedCreateElectronAppScreen;
export const createYouTubeScreen = importedCreateYouTubeScreen;

// Create a new default screen wrapper function
export function createNewDefaultScreen(position = new THREE.Vector3(0, 0, -1.5)) {
    const defaultScreen = createDefaultScreen(position, screens.length + 1);
    
    // Add to scene and screens array
    scene.add(defaultScreen);
    screens.push(defaultScreen);
    
    // Select this as the current screen
    selectScreen(defaultScreen);
    
    return defaultScreen;
}

// Select a screen and update UI accordingly with enhanced visual feedback
export function selectScreen(screen) {
    // Deselect previously selected screen
    if (selectedScreen) {
        // Find and update border color
        const borderMesh = findBorderMesh(selectedScreen);
        if (borderMesh) {
            borderMesh.material.color.set(0x444444); // Default border color
            borderMesh.material.opacity = 0.5; // Less visible
        }
        
        // Turn off glow
        const glowMesh = selectedScreen.userData.glowMesh;
        if (glowMesh) {
            glowMesh.material.opacity = 0;
        }
        
        selectedScreen.userData.isSelected = false;
        
        // Scale down slightly for visual deselection
        selectedScreen.scale.multiplyScalar(0.97);
        // Animate back to original scale
        animateScreenScale(selectedScreen, 1.0, 150);
    }
    
    // If screen is null, just clear selection
    if (!screen) {
        // Update both local and global references
        setSelectedScreen(null);
        return;
    }
    
    // Select new screen
    // Update the global selectedScreen variable through the setter function
    setSelectedScreen(screen);
    screen.userData.isSelected = true;
    
    // Log selection for debugging
    console.log(
        "Selected screen with ID:",
        screen.userData.id,
        "UUID:",
        screen.uuid.substring(0, 8) + "..."
    );
    
    // Highlight border for selected screen
    const borderMesh = findBorderMesh(screen);
    if (borderMesh) {
        borderMesh.material.color.set(0x1a237e); // Dark blue border (indigo 900)
        borderMesh.material.opacity = 1.0; // More visible
    }
    
    // Turn on glow
    const glowMesh = screen.userData.glowMesh;
    if (glowMesh) {
        glowMesh.material.opacity = 0.3; // Subtle glow
    }
    
    // Scale up slightly for visual selection
    screen.scale.multiplyScalar(1.03);
    // Animate back to original scale with slight bounce
    animateScreenScale(screen, 1.0, 300, true);
    
    // Position keyboard under selected screen if needed
    if (virtualKeyboard) {
        updateKeyboardPosition(screen);
    }
}

// Helper function to find border mesh in a screen
function findBorderMesh(screen) {
    return screen.children.find(
        (child) =>
            child.geometry &&
            child.geometry.type === "PlaneGeometry" &&
            Math.abs(child.position.z - -0.001) < 0.0001
    );
}

// Animate screen scale with optional bounce effect
function animateScreenScale(screen, targetScale, duration, bounce = false) {
    const originalScale = screen.userData.originalScale || new THREE.Vector3(1, 1, 1);
    const startScale = screen.scale.clone();
    const targetVector = new THREE.Vector3()
        .copy(originalScale)
        .multiplyScalar(targetScale);
    
    const startTime = performance.now();
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out for smoother animation
        const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
        // Apply bounce effect if requested
        let finalProgress = easedProgress;
        if (bounce && progress > 0.7) {
            // Add a subtle bounce at the end
            const bounceAmount = Math.sin((progress - 0.7) * Math.PI * 5) * 0.02;
            finalProgress = easedProgress + bounceAmount;
        }
        
        // Update scale
        screen.scale.lerpVectors(startScale, targetVector, finalProgress);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

// Update keyboard position relative to the selected screen
export function updateKeyboardPosition(screen) {
    if (!virtualKeyboard) return;
    
    const screenPos = screen.position.clone();
    const screenScale = screen.scale.clone();
    
    // Position keyboard under selected screen, accounting for screen scale
    virtualKeyboard.position.set(
        screenPos.x, 
        screenPos.y - (0.3 + 0.15 * screenScale.y), // Adjust for screen height
        screenPos.z + 0.02
    );
    
    // Scale keyboard proportionally to screen
    const keyboardScale = Math.max(
        0.8,
        Math.min(1.2, (screenScale.x + screenScale.y) / 2)
    );
    virtualKeyboard.scale.set(keyboardScale, keyboardScale, 1);
    
    // Make keyboard face the user
    virtualKeyboard.lookAt(camera.position);
    virtualKeyboard.rotation.x = -Math.PI / 8;
}

// Update screen visual effects - including YouTube video animations
export function updateScreenEffects() {
    screens.forEach((screen) => {
        // Skip if screen is not visible
        if (!screen.visible) return;

        // Apply glow effect to selected screen
        if (screen.userData.isSelected) {
            updateSelectedScreenGlow(screen);
        }

        // Update YouTube screens
        if (screen.userData.contentType === "youtube") {
            // Find the mesh with the YouTube texture
            const backgroundMesh = screen.children.find(
                (child) =>
                    child.geometry &&
                    child.geometry.type === "PlaneGeometry" &&
                    child.material &&
                    child.material.map &&
                    child.material.map.userData &&
                    child.material.map.userData.isYouTube
            );

            if (backgroundMesh && backgroundMesh.material.map) {
                // Update live YouTube texture elements (like current time)
                backgroundMesh.material.map.needsUpdate = true;
            }
        }
    });
}

// Update visual effects for selected screens
function updateSelectedScreenGlow(screen) {
            // Find the border mesh
    const borderMesh = findBorderMesh(screen);
                
            if (borderMesh) {
                // Subtle pulsing effect for selected screen's border (dark blue colors)
                const time = Date.now() * 0.001;
                const pulseIntensity = 0.15 * Math.sin(time * 2) + 0.85;
                borderMesh.material.color.setRGB(
            0.1 * pulseIntensity, // R (low for blue)
            0.1 * pulseIntensity, // G (low for blue)
            0.5 * pulseIntensity  // B (higher for blue)
                );
            }
            
            // Update glow effect for selected screen
            const glowMesh = screen.userData.glowMesh;
            if (glowMesh) {
                const time = Date.now() * 0.001;
                const glowIntensity = 0.2 * Math.sin(time * 1.5) + 0.25; // Reduced max intensity
                glowMesh.material.opacity = glowIntensity;
            }
            
            // Subtle floating effect
            screen.position.y += Math.sin(Date.now() * 0.002) * 0.0001;
        }
