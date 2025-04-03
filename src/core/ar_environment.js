// Environment assets and settings for AR
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { showNotification } from './ar_utils.js';

// Asset loader
const textureLoader = new THREE.TextureLoader();

// Load environment assets
export async function loadEnvironmentAssets() {
    try {
        console.log("Loading environment assets...");
        
        // Nothing to load for now
        // Future: load skybox, ground textures, etc.
        
        console.log("Environment assets loaded successfully");
        return true;
    } catch (error) {
        console.error("Failed to load environment assets:", error);
        showNotification("Failed to load environment assets", "error");
        return false;
    }
}

// Create a grid helper for development
export function createGridHelper() {
    const grid = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    grid.position.y = -0.01; // Slightly below other objects
    
    return grid;
}

// Create a simple floor plane
export function createFloorPlane() {
    const geometry = new THREE.PlaneGeometry(10, 10);
    const material = new THREE.MeshBasicMaterial({
        color: 0x555555,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });
    
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2; // Flat on ground
    floor.position.y = -0.01; // Slightly below other objects
    
    return floor;
}

// Create a simple skybox 
export function createSkybox() {
    // Create a sphere for the skybox
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert so textures render on inside
    
    // Create material with sky gradient
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `;
    
    const uniforms = {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
    };
    
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms,
        side: THREE.BackSide
    });
    
    return new THREE.Mesh(geometry, material);
}

// Add fog to the scene
export function addFog(scene, color = 0xcccccc, near = 1, far = 20) {
    if (!scene) return;
    
    scene.fog = new THREE.Fog(color, near, far);
}

// Add subtle ambient light to scene
export function addAmbientLight(scene, color = 0xffffff, intensity = 0.4) {
    if (!scene) return null;
    
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);
    
    return light;
}

// Create a sun/directional light
export function createSunLight(color = 0xffffff, intensity = 1.0) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 10, 0);
    light.target.position.set(0, 0, 0);
    
    return light;
} 