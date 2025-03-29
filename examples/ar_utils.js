// Utility functions for AR experience
import * as THREE from 'three';

// Generate a random color
export function randomColor() {
    return new THREE.Color(Math.random(), Math.random(), Math.random());
}

// Generate a random position within bounds
export function randomPosition(minX = -1, maxX = 1, minY = 0, maxY = 1.5, minZ = -1, maxZ = -2) {
    return new THREE.Vector3(
        THREE.MathUtils.randFloat(minX, maxX),
        THREE.MathUtils.randFloat(minY, maxY),
        THREE.MathUtils.randFloat(minZ, maxZ)
    );
}

// Calculate distance between two Vector3 points
export function distance(point1, point2) {
    return point1.distanceTo(point2);
}

// Lerp (linear interpolation) between two values
export function lerp(start, end, alpha) {
    return start + (end - start) * alpha;
}

// Lerp between two Vector3s
export function lerpVectors(v1, v2, alpha) {
    const result = new THREE.Vector3();
    return result.lerpVectors(v1, v2, alpha);
}

// Ease in out function
export function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Clamp a value between min and max
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Convert degrees to radians
export function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// Convert radians to degrees
export function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

// Round to nearest decimal place
export function roundTo(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

// Check if point is inside a sphere
export function isPointInSphere(point, sphereCenter, radius) {
    return distance(point, sphereCenter) <= radius;
}

// Generate UUID for unique identifiers
export function generateUUID() {
    return THREE.MathUtils.generateUUID();
}

// Normalize value to 0-1 range
export function normalize(value, min, max) {
    return (value - min) / (max - min);
}

// Map a value from one range to another
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

// Get the world position of a THREE.Object3D
export function getWorldPosition(object) {
    const worldPosition = new THREE.Vector3();
    object.getWorldPosition(worldPosition);
    return worldPosition;
}

// Get the world quaternion of a THREE.Object3D
export function getWorldQuaternion(object) {
    const worldQuaternion = new THREE.Quaternion();
    object.getWorldQuaternion(worldQuaternion);
    return worldQuaternion;
}

// Calculate the direction vector from one object to another
export function getDirectionVector(fromObject, toObject) {
    const fromPosition = getWorldPosition(fromObject);
    const toPosition = getWorldPosition(toObject);
    const direction = new THREE.Vector3().subVectors(toPosition, fromPosition).normalize();
    return direction;
}

// Check if a ray intersects an object
export function rayIntersectsObject(origin, direction, object, recursive = true) {
    const raycaster = new THREE.Raycaster(origin, direction);
    const intersects = raycaster.intersectObject(object, recursive);
    return intersects.length > 0 ? intersects[0] : null;
}

// Format a number with commas for thousands
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Shuffle an array using Fisher-Yates algorithm
export function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Generate a random integer between min and max (inclusive)
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create a delay using Promise
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple throttle function to limit function calls
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Simple debounce function
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Linear ease
export function linearEase(t) {
    return t;
}

// Cubic ease in
export function easeIn(t) {
    return t * t * t;
}

// Cubic ease out
export function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Get current timestamp in milliseconds
export function now() {
    return performance.now();
}

// Calculate frames per second based on deltaTime
export function calculateFPS(deltaTime) {
    return 1 / (deltaTime / 1000);
}

// Format time in mm:ss format
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Get screen space position from world position
export function worldToScreen(position, camera, renderer) {
    const vector = position.clone();
    vector.project(camera);
    
    const halfWidth = renderer.domElement.width / 2;
    const halfHeight = renderer.domElement.height / 2;
    
    vector.x = (vector.x * halfWidth) + halfWidth;
    vector.y = -(vector.y * halfHeight) + halfHeight;
    
    return {
        x: vector.x,
        y: vector.y
    };
}

// Get HTML element position and size
export function getElementRect(element) {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
    };
}

// Get viewport dimensions
export function getViewportSize() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

// Check if device supports WebXR
export function checkWebXRSupport() {
    return navigator.xr !== undefined;
}

// Check if device supports AR
export async function checkARSupport() {
    if (!navigator.xr) return false;
    
    try {
        return await navigator.xr.isSessionSupported('immersive-ar');
    } catch (e) {
        console.error('Error checking AR support:', e);
        return false;
    }
}

// Create a text canvas texture
export function createTextTexture(text, options = {}) {
    const {
        fontFace = 'Arial',
        fontSize = 24,
        fontWeight = 'normal',
        textColor = '#ffffff',
        backgroundColor = 'transparent',
        padding = 10,
        textAlign = 'center',
        textBaseline = 'middle'
    } = options;
    
    // Create canvas and context
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set font
    context.font = `${fontWeight} ${fontSize}px ${fontFace}`;
    
    // Measure text width
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;
    
    // Set canvas dimensions
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;
    
    // Redraw with proper dimensions
    context.font = `${fontWeight} ${fontSize}px ${fontFace}`;
    context.textAlign = textAlign;
    context.textBaseline = textBaseline;
    
    // Draw background if not transparent
    if (backgroundColor !== 'transparent') {
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw text
    context.fillStyle = textColor;
    context.fillText(
        text, 
        textAlign === 'center' ? canvas.width / 2 : padding,
        textBaseline === 'middle' ? canvas.height / 2 : padding + fontSize
    );
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
} 