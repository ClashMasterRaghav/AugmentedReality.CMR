// HTML-to-Texture approach for WebXR
import * as THREE from 'three';
import { scene, camera } from './ar_core.js';
import html2canvas from 'html2canvas'; // Note: This would need to be installed

let webTextures = [];

// Create a texture from a web page
export async function createWebTexture(url, width = 1024, height = 768) {
    // Create a hidden iframe to load the web content
    const iframe = document.createElement('iframe');
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px'; // Position off-screen
    iframe.style.top = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-1000';
    
    // Add to document and set source
    document.body.appendChild(iframe);
    
    // Create a promise to track when the iframe has loaded
    const loadPromise = new Promise((resolve) => {
        iframe.onload = () => resolve();
    });
    
    // Set the source to trigger loading
    iframe.src = url;
    
    // Wait for the iframe to load
    await loadPromise;
    
    try {
        // Try to capture the iframe content as a canvas
        const canvas = await html2canvas(iframe.contentDocument.body, {
            width: width,
            height: height,
            scrollX: 0,
            scrollY: 0,
            windowWidth: width,
            windowHeight: height
        });
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Store the texture data
        const textureData = {
            texture,
            iframe,
            canvas,
            url,
            width,
            height,
            id: webTextures.length,
            lastUpdated: Date.now()
        };
        
        webTextures.push(textureData);
        
        console.log(`Created web texture ${textureData.id} from URL: ${url}`);
        return textureData;
    } catch (error) {
        console.error('Error creating web texture:', error);
        // Create a fallback texture with error message
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = width;
        fallbackCanvas.height = height;
        const ctx = fallbackCanvas.getContext('2d');
        
        // Draw error message
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading web content', width/2, height/2 - 20);
        ctx.font = '16px Arial';
        ctx.fillText(error.message, width/2, height/2 + 20);
        
        // Create texture from fallback canvas
        const texture = new THREE.CanvasTexture(fallbackCanvas);
        texture.needsUpdate = true;
        
        return { texture, error };
    } finally {
        // Clean up the iframe if needed
        if (iframe.parentNode) {
            document.body.removeChild(iframe);
        }
    }
}

// Create a 3D screen with a web texture
export async function createWebTextureScreen(url, position = new THREE.Vector3(0, 0, -1.5), width = 1.0, height = 0.75) {
    // Create the texture
    const textureData = await createWebTexture(url, width * 1024, height * 1024);
    
    // Create the screen geometry
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        map: textureData.texture,
        side: THREE.DoubleSide
    });
    
    // Create the mesh
    const screen = new THREE.Mesh(geometry, material);
    screen.position.copy(position);
    
    // Store reference to texture data and update frequency
    screen.userData = {
        textureData: textureData,
        updateInterval: 1000, // Update every second by default
        lastUpdate: Date.now(),
        url: url
    };
    
    // Add to scene
    scene.add(screen);
    
    console.log(`Created web texture screen at position (${position.x}, ${position.y}, ${position.z})`);
    return screen;
}

// Update a web texture (refresh the content)
export async function updateWebTexture(textureData) {
    if (!textureData || !textureData.iframe) {
        console.error('Invalid texture data for update');
        return false;
    }
    
    try {
        // Capture the current content
        const canvas = await html2canvas(textureData.iframe.contentDocument.body, {
            width: textureData.width,
            height: textureData.height,
            scrollX: 0,
            scrollY: 0
        });
        
        // Update the texture
        textureData.texture.image = canvas;
        textureData.texture.needsUpdate = true;
        textureData.canvas = canvas;
        textureData.lastUpdated = Date.now();
        
        return true;
    } catch (error) {
        console.error('Error updating web texture:', error);
        return false;
    }
}

// Handle user interaction with web texture screens
export function setupWebTextureInteraction(screen) {
    // Create invisible interaction plane in front of the screen
    const interactionGeometry = new THREE.PlaneGeometry(
        screen.geometry.parameters.width,
        screen.geometry.parameters.height
    );
    const interactionMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.001,
        side: THREE.DoubleSide
    });
    
    const interactionPlane = new THREE.Mesh(interactionGeometry, interactionMaterial);
    interactionPlane.position.copy(screen.position);
    interactionPlane.position.z += 0.01; // Slightly in front of screen
    interactionPlane.quaternion.copy(screen.quaternion);
    
    // Store reference to screen and vice versa
    interactionPlane.userData = {
        type: 'interactionPlane',
        screen: screen,
        webTexture: true
    };
    
    screen.userData.interactionPlane = interactionPlane;
    
    // Add to scene
    scene.add(interactionPlane);
    
    return interactionPlane;
}

// Handle clicks on web texture
export function handleWebTextureClick(screen, point) {
    if (!screen || !screen.userData || !screen.userData.textureData) {
        return false;
    }
    
    // Convert 3D intersection point to 2D coordinates in the texture
    const textureData = screen.userData.textureData;
    
    // Calculate local coordinates on the plane
    const localPoint = point.clone().sub(screen.position);
    
    // Apply the inverse of the screen's rotation
    const invQuaternion = screen.quaternion.clone().invert();
    localPoint.applyQuaternion(invQuaternion);
    
    // Map from 3D coords to texture coords
    const width = screen.geometry.parameters.width;
    const height = screen.geometry.parameters.height;
    
    const textureX = ((localPoint.x / width) + 0.5) * textureData.width;
    const textureY = ((-localPoint.y / height) + 0.5) * textureData.height;
    
    console.log(`Web texture click at texture coordinates: (${textureX}, ${textureY})`);
    
    // If we have access to the iframe, we can try to simulate a click
    if (textureData.iframe && textureData.iframe.contentWindow) {
        try {
            const iframe = textureData.iframe;
            const doc = iframe.contentDocument;
            
            // Create a synthetic click event
            const clickEvent = new MouseEvent('click', {
                view: iframe.contentWindow,
                bubbles: true,
                cancelable: true,
                clientX: textureX,
                clientY: textureY
            });
            
            // Find the element at the position
            const element = doc.elementFromPoint(textureX, textureY);
            if (element) {
                element.dispatchEvent(clickEvent);
                
                // Schedule an update after the click is processed
                setTimeout(() => updateWebTexture(textureData), 100);
                return true;
            }
        } catch (error) {
            console.error('Error simulating click on web texture:', error);
        }
    }
    
    return false;
}

// Periodic update of all web textures
export function updateAllWebTextures() {
    const now = Date.now();
    
    scene.traverse(object => {
        if (object.userData && object.userData.textureData && object.userData.updateInterval) {
            const timeSinceLastUpdate = now - object.userData.lastUpdate;
            
            if (timeSinceLastUpdate >= object.userData.updateInterval) {
                updateWebTexture(object.userData.textureData);
                object.userData.lastUpdate = now;
            }
        }
    });
} 