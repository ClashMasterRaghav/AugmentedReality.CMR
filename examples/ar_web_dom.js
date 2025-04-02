// DOM-based web content integration for WebXR
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { scene, camera, renderer } from './ar_core.js';
// Import the enhancedCreateScreen function from ar_screens.js
import { screens } from './ar_screens.js';

let css3dRenderer;
let css3dScene;
let webPanels = [];
let domContainer = null;

// Initialize the CSS3D renderer
export function initWebDOMRenderer(parentElement) {
    // Check if CSS3DRenderer is available
    if (typeof CSS3DRenderer === 'undefined') {
        console.error('CSS3DRenderer is not available. Make sure it is loaded.');
        return false;
    }
    
    try {
        // Create container for DOM elements
        domContainer = document.createElement('div');
        domContainer.id = 'webxr-dom-container';
        domContainer.style.position = 'absolute';
        domContainer.style.top = '0';
        domContainer.style.left = '0';
        domContainer.style.width = '100%';
        domContainer.style.height = '100%';
        domContainer.style.overflow = 'hidden';
        domContainer.style.pointerEvents = 'none'; // Disable pointer events at container level
        
        // Add container to parent element or body
        const parentEl = parentElement || document.body;
        parentEl.appendChild(domContainer);
        
        // Create CSS3D renderer and scene
        css3dRenderer = new CSS3DRenderer();
        css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        css3dRenderer.domElement.style.position = 'absolute';
        css3dRenderer.domElement.style.top = '0';
        css3dRenderer.domElement.style.left = '0';
        css3dRenderer.domElement.style.zIndex = '1'; // Below WebGL canvas
        css3dRenderer.domElement.style.pointerEvents = 'none';
        domContainer.appendChild(css3dRenderer.domElement);
        
        // Create scene
        css3dScene = new THREE.Scene();
        
        // Set up resize listener
        window.addEventListener('resize', () => {
            if (css3dRenderer) {
                css3dRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        console.log('WebXR DOM Injection initialized');
        return true;
    } catch (error) {
        console.error('Error initializing WebXR DOM Injection:', error);
        return false;
    }
}

// Create an interactive web panel using DOM injection
export function createInteractiveWebPanel(options = {}) {
    if (!css3dRenderer || !css3dScene) {
        console.error('DOM renderer not initialized. Call initWebDOMRenderer first.');
        return null;
    }
    
    const {
        url = 'about:blank',
        width = 1.6,
        height = 0.9,
        position = new THREE.Vector3(0, 0, -2),
        rotation = new THREE.Euler(0, 0, 0),
        resolution = 1024, // Internal resolution
        interactive = true
    } = options;
    
    // Create a unique ID for this panel
    const panelId = `web-panel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create a basic screen without using createScreenBase
    const screen = {
        mesh: new THREE.Group()
    };
    
    // Create a basic plane for the screen
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshBasicMaterial({
        opacity: 0.1,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create mesh and add to group
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    screen.mesh.add(planeMesh);
    
    // Position the screen mesh
    screen.mesh.position.copy(position);
    screen.mesh.rotation.copy(rotation);
    
    // Add to scene
    scene.add(screen.mesh);
    
    // Calculate pixel size based on physical size
    const aspectRatio = width / height;
    const pixelWidth = resolution;
    const pixelHeight = Math.round(resolution / aspectRatio);
    
    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.id = `${panelId}-iframe`;
    iframe.src = url;
    iframe.width = pixelWidth;
    iframe.height = pixelHeight;
    iframe.style.border = 'none';
    iframe.style.backgroundColor = '#FFFFFF';
    iframe.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
    iframe.allowFullscreen = true;
    
    // Create div to wrap the iframe
    const div = document.createElement('div');
    div.style.width = pixelWidth + 'px';
    div.style.height = pixelHeight + 'px';
    div.style.overflow = 'hidden';
    div.appendChild(iframe);
    
    // Create CSS3D object
    const css3dObject = new CSS3DObject(div);
    
    // Scale the CSS3D object to match the WebGL plane
    // CSS3D uses a different coordinate system, we need to adjust the scale
    const scaleFactor = 0.001; // Convert from pixels to WebGL units
    css3dObject.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Position the CSS3D object to match the WebGL plane
    css3dObject.position.copy(position);
    css3dObject.rotation.copy(rotation);
    
    // Add to CSS3D scene
    css3dScene.add(css3dObject);
    
    // Enable/disable interaction on the iframe
    setIframeInteractive(iframe, interactive);
    
    // Create panel object
    const panel = {
        id: panelId,
        mesh: screen.mesh,
        css3dObject: css3dObject,
        iframe: iframe,
        div: div,
        url: url,
        
        // Set interactivity
        setInteractive(interactive) {
            setIframeInteractive(iframe, interactive);
        },
        
        // Navigate to a new URL
        navigate(newUrl) {
            iframe.src = newUrl;
            this.url = newUrl;
        },
        
        // Update position and rotation from AR object
        updateFromARObject(arObject) {
            // Update WebGL mesh
            screen.mesh.position.copy(arObject.position);
            screen.mesh.rotation.copy(arObject.rotation);
            
            // Update CSS3D object to match
            css3dObject.position.copy(arObject.position);
            css3dObject.rotation.copy(arObject.rotation);
        },
        
        // Clean up resources
        dispose() {
            // Remove from scenes
            if (screen.mesh.parent) {
                screen.mesh.parent.remove(screen.mesh);
            }
            if (css3dObject.parent) {
                css3dObject.parent.remove(css3dObject);
            }
            
            // Dispose of geometries and materials
            planeMesh.geometry.dispose();
            planeMesh.material.dispose();
            
            // Remove from panels array
            const index = webPanels.indexOf(this);
            if (index !== -1) {
                webPanels.splice(index, 1);
            }
        }
    };
    
    // Add to panels array
    webPanels.push(panel);
    
    return panel;
}

// Update the panels to align with the WebXR camera
export function updateWebPanels(camera) {
    if (!css3dRenderer || !css3dScene) return;
    
    // Render the CSS3D scene from the same viewpoint as the WebGL scene
    css3dRenderer.render(css3dScene, camera);
}

// Set iframe interactive state
function setIframeInteractive(iframe, interactive) {
    if (interactive) {
        iframe.style.pointerEvents = 'auto';
    } else {
        iframe.style.pointerEvents = 'none';
    }
}

// CSS3DObject implementation if not available
// This is a simplified version for demonstration
if (typeof CSS3DObject === 'undefined') {
    class CSS3DObject extends THREE.Object3D {
        constructor(element) {
            super();
            
            this.element = element;
            this.element.style.position = 'absolute';
            this.element.style.pointerEvents = 'auto';
            
            this.addEventListener('removed', () => {
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            });
        }
    }
    
    // Make it globally available
    window.CSS3DObject = CSS3DObject;
}

// Dispose of all web panels
export function disposeAllWebPanels() {
    while (webPanels.length > 0) {
        webPanels[0].dispose();
    }
    
    // Clean up DOM container
    if (domContainer && domContainer.parentNode) {
        domContainer.parentNode.removeChild(domContainer);
    }
    
    css3dRenderer = null;
    css3dScene = null;
    domContainer = null;
} 