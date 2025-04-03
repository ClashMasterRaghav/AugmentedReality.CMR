// AR scene setup and basic environment
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

// Initialize AR scene with lighting and basic elements
export function initARScene(scene, camera) {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 5, 0);
    directionalLight.lookAt(0, 0, 0);
    scene.add(directionalLight);
    
    // Add hemisphere light for natural lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x303030, 0.5);
    scene.add(hemisphereLight);
    
    console.log("AR scene initialized with lighting");
    
    return scene;
}

// Update scene for animation frame
export function updateScene() {
    // Animate any scene elements here
    
    // Use this for future animations or updates that need to happen per frame
}

// Add visual indicator for placement in AR
export function createPlacementIndicator() {
    // Create a simple ring to show where screens can be placed
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.rotation.x = -Math.PI / 2; // Flat on ground
    indicator.visible = false;
    
    // Add a center dot
    const dotGeometry = new THREE.CircleGeometry(0.05, 32);
    const dotMaterial = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.001; // Slightly above to avoid z-fighting
    
    indicator.add(dot);
    
    return indicator;
}

// Add visual feedback for hits/interactions
export function createHitEffect(position, color = 0x4fc3f7) {
    if (!window.scene) return;
    
    // Create a ripple effect
    const geometry = new THREE.CircleGeometry(0.05, 32);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const ripple = new THREE.Mesh(geometry, material);
    ripple.position.copy(position);
    
    // Orient to face the camera
    if (window.camera) {
        const lookDirection = new THREE.Vector3();
        window.camera.getWorldDirection(lookDirection);
        ripple.lookAt(lookDirection.add(ripple.position));
    }
    
    window.scene.add(ripple);
    
    // Animate and remove
    const duration = 0.5;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale up
        ripple.scale.set(
            1 + progress * 3,
            1 + progress * 3,
            1
        );
        
        // Fade out
        ripple.material.opacity = 0.7 * (1 - progress);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Clean up
            window.scene.remove(ripple);
            geometry.dispose();
            material.dispose();
        }
    }
    
    animate();
}

// Add simple shadow to objects
export function addObjectShadow(object, y = 0.001) {
    if (!object) return null;
    
    // Create simple shadow plane
    const shadowSize = 0.4;
    const geometry = new THREE.PlaneGeometry(shadowSize, shadowSize);
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const shadow = new THREE.Mesh(geometry, material);
    shadow.rotation.x = -Math.PI / 2; // Flat on ground
    shadow.position.y = y; // Just above the ground
    
    // Add shadow to object
    object.add(shadow);
    
    return shadow;
} 