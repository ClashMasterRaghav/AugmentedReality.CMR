// Utility functions for AR experience
import * as THREE from 'three';

// Create and display notifications
export function showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // Create DOM notification
    createDOMNotification(message, type);
    
    // Create 3D notification if renderer is available
    if (window.renderer && window.camera) {
        create3DNotification(message, type);
    }
}

// Alias for backward compatibility
export const createNotification = showNotification;

// Create a notification in the DOM
function createDOMNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add type-specific styling
    switch(type) {
        case 'error':
            notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            break;
        case 'success':
            notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
            break;
        case 'warning':
            notification.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
            break;
        default:
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    }
    
    // Add to container
    container.appendChild(notification);
    
    // Remove after animation completes
    setTimeout(() => {
        if (notification.parentNode === container) {
            container.removeChild(notification);
        }
    }, 3000);
}

// Create a 3D notification in space
function create3DNotification(message, type = 'info') {
    if (!window.camera) return;
    
    // Create canvas for the notification
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Set background color based on type
    let bgColor;
    switch(type) {
        case 'error':
            bgColor = 'rgba(255, 0, 0, 0.7)';
            break;
        case 'success':
            bgColor = 'rgba(0, 255, 0, 0.7)';
            break;
        case 'warning':
            bgColor = 'rgba(255, 165, 0, 0.7)';
            break;
        default:
            bgColor = 'rgba(0, 0, 0, 0.7)';
    }
    
    // Draw rounded rectangle background
    context.fillStyle = bgColor;
    context.beginPath();
    context.moveTo(20, 0);
    context.lineTo(canvas.width - 20, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, 20);
    context.lineTo(canvas.width, canvas.height - 20);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - 20, canvas.height);
    context.lineTo(20, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - 20);
    context.lineTo(0, 20);
    context.quadraticCurveTo(0, 0, 20, 0);
    context.closePath();
    context.fill();
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create notification panel
    const geometry = new THREE.PlaneGeometry(0.5, 0.125);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const notificationMesh = new THREE.Mesh(geometry, material);
    
    // Position notification in front of camera
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(window.camera.quaternion);
    
    const position = new THREE.Vector3();
    position.copy(window.camera.position).add(direction.multiplyScalar(1));
    position.y += 0.2; // Position above eye level
    
    notificationMesh.position.copy(position);
    notificationMesh.quaternion.copy(window.camera.quaternion);
    
    // Add to scene
    window.scene.add(notificationMesh);
    
    // Remove after timeout
    setTimeout(() => {
        window.scene.remove(notificationMesh);
        material.dispose();
        geometry.dispose();
        texture.dispose();
    }, 3000);
}

// Create a texture with rounded rectangle
export function createRoundedRectTexture(
    width, 
    height, 
    radius, 
    bgColor = 'rgba(40, 40, 60, 0.8)', 
    gradientColor = 'rgba(60, 80, 120, 0.8)',
    borderSize = 2,
    borderColor = 'rgba(100, 150, 255, 0.9)'
) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, gradientColor);
    
    // Draw rounded rectangle with gradient
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    
    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add border
    if (borderSize > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderSize;
        ctx.stroke();
    }
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Create a glow texture
export function createGlowTexture(
    width, 
    height, 
    color = 'rgba(100, 150, 255, 0.2)'
) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create radial gradient for glow
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2;
    
    const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.2,
        centerX, centerY, radius * 0.8
    );
    
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Load a texture from URL
export function loadTexture(url) {
    return new THREE.TextureLoader().load(url);
}

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

// Distance between two Vector3 points
export function distance(point1, point2) {
    return point1.distanceTo(point2);
}

// Linear interpolation between values
export function lerp(start, end, alpha) {
    return start + (end - start) * alpha;
}

// Ease in-out function
export function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Generate UUID
export function generateUUID() {
    return THREE.MathUtils.generateUUID();
}

// Format time in MM:SS format
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Check if WebXR is supported
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

// Throttle function to limit calls
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

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Create a delay with Promise
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
} 