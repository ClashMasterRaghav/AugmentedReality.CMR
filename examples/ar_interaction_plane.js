// Interactive plane functionality for AR
import * as THREE from 'three';
import { scene } from './ar_core.js';

// Create an invisible interactive plane for interaction
export function createInteractivePlane(options = {}) {
    const {
        width = 1.0,
        height = 0.75,
        position = new THREE.Vector3(0, 0, -1.5),
        rotation = new THREE.Euler(0, 0, 0),
        onTap = null,
        onDrag = null,
        onRelease = null,
        visible = false
    } = options;
    
    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(width, height);
    
    // Create material - invisible by default but can be made visible for debugging
    const material = new THREE.MeshBasicMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: visible ? 0.2 : 0.0,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const plane = new THREE.Mesh(geometry, material);
    
    // Set position and rotation
    plane.position.copy(position);
    plane.rotation.copy(rotation);
    
    // Add user data for interaction
    plane.userData = {
        type: 'interactivePlane',
        isInteractive: true,
        onTap: onTap,
        onDrag: onDrag,
        onRelease: onRelease,
        isDragging: false
    };
    
    // Add to scene
    scene.add(plane);
    
    // Return the plane for further manipulation
    return plane;
} 