// WebXR DOM Overlay functionality
import { renderer } from './ar_core.js';

// Store references to all created overlays
const overlays = [];

// Initialize the DOM Overlay
export async function initDOMOverlay() {
    if (!navigator.xr) {
        console.error('WebXR not supported');
        return false;
    }
    
    try {
        // Check if DOM overlay is supported
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isSupported) {
            console.error('Immersive AR is not supported');
            return false;
        }
        
        // Create root overlay container if it doesn't exist
        let overlayRoot = document.getElementById('xr-overlay-root');
        if (!overlayRoot) {
            overlayRoot = document.createElement('div');
            overlayRoot.id = 'xr-overlay-root';
            overlayRoot.style.width = '100%';
            overlayRoot.style.height = '100%';
            overlayRoot.style.position = 'absolute';
            overlayRoot.style.top = '0';
            overlayRoot.style.left = '0';
            overlayRoot.style.pointerEvents = 'none'; // Start with no pointer events
            document.body.appendChild(overlayRoot);
        }
        
        // Store the overlay root
        overlays.root = overlayRoot;
        
        console.log('DOM Overlay initialized');
        return true;
    } catch (error) {
        console.error('Error initializing DOM Overlay:', error);
        return false;
    }
}

// Configure the WebXR session with DOM Overlay
export function configureDOMOverlaySession(sessionInit) {
    if (!overlays.root) {
        console.error('DOM Overlay not initialized');
        return sessionInit;
    }
    
    // Add DOM overlay feature to session initialization
    return {
        ...sessionInit,
        optionalFeatures: [
            ...(sessionInit.optionalFeatures || []),
            'dom-overlay'
        ],
        domOverlay: { root: overlays.root }
    };
}

// Create a web browser overlay
export function createWebOverlay(url, options = {}) {
    if (!overlays.root) {
        console.error('DOM Overlay not initialized');
        return null;
    }
    
    const {
        width = '80%',
        height = '60%',
        position = 'center', // center, top, bottom
        initiallyVisible = false,
        transparentBackground = false
    } = options;
    
    // Create container for this overlay
    const container = document.createElement('div');
    container.className = 'xr-web-overlay';
    container.style.position = 'absolute';
    container.style.width = typeof width === 'string' ? width : `${width}px`;
    container.style.height = typeof height === 'string' ? height : `${height}px`;
    container.style.backgroundColor = transparentBackground ? 'transparent' : 'rgba(255, 255, 255, 0.9)';
    container.style.borderRadius = '10px';
    container.style.overflow = 'hidden';
    container.style.transition = 'opacity 0.3s, transform 0.3s';
    container.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    container.style.display = initiallyVisible ? 'block' : 'none';
    container.style.opacity = initiallyVisible ? '1' : '0';
    container.style.pointerEvents = 'auto'; // Make this overlay interactive
    
    // Position the overlay
    switch (position) {
        case 'top':
            container.style.top = '5%';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            break;
        case 'bottom':
            container.style.bottom = '5%';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            break;
        case 'center':
        default:
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            break;
    }
    
    // Create header/toolbar with controls
    const toolbar = document.createElement('div');
    toolbar.className = 'xr-overlay-toolbar';
    toolbar.style.height = '36px';
    toolbar.style.backgroundColor = 'rgba(60, 64, 67, 0.9)';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.padding = '0 8px';
    toolbar.style.color = 'white';
    toolbar.style.fontFamily = 'Arial, sans-serif';
    toolbar.style.fontSize = '14px';
    toolbar.style.justifyContent = 'space-between';
    
    // Add title and close button
    const title = document.createElement('div');
    title.textContent = url;
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.style.whiteSpace = 'nowrap';
    title.style.maxWidth = 'calc(100% - 30px)';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0 5px';
    closeButton.style.lineHeight = '1';
    
    toolbar.appendChild(title);
    toolbar.appendChild(closeButton);
    container.appendChild(toolbar);
    
    // Create iframe for web content
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 36px)'; // Subtract toolbar height
    iframe.style.border = 'none';
    iframe.src = url;
    iframe.allow = 'accelerometer; autoplay; camera; encrypted-media; geolocation; gyroscope; microphone; xr-spatial-tracking';
    container.appendChild(iframe);
    
    // Add to overlay root
    overlays.root.appendChild(container);
    
    // Create overlay object
    const overlay = {
        container,
        iframe,
        toolbar,
        url,
        id: overlays.length,
        visible: initiallyVisible,
        options,
        show() {
            container.style.display = 'block';
            // Use setTimeout to ensure display change takes effect before opacity
            setTimeout(() => {
                container.style.opacity = '1';
            }, 10);
            this.visible = true;
        },
        hide() {
            container.style.opacity = '0';
            // Wait for transition to complete before hiding
            setTimeout(() => {
                container.style.display = 'none';
            }, 300);
            this.visible = false;
        },
        toggle() {
            if (this.visible) {
                this.hide();
            } else {
                this.show();
            }
        },
        destroy() {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            const index = overlays.findIndex(o => o.id === this.id);
            if (index !== -1) {
                overlays.splice(index, 1);
            }
        }
    };
    
    // Set up close button
    closeButton.addEventListener('click', () => {
        overlay.hide();
    });
    
    // Add to overlays array
    overlays.push(overlay);
    
    console.log(`Created DOM overlay for URL: ${url}`);
    return overlay;
}

// Show a specific overlay or a new one with the given URL
export function showWebOverlay(urlOrOverlay, options = {}) {
    // Handle the case when an overlay object is passed
    if (typeof urlOrOverlay === 'object' && urlOrOverlay.show) {
        urlOrOverlay.show();
        return urlOrOverlay;
    }
    
    // Handle the case when a URL is passed
    const url = urlOrOverlay;
    
    // Check if we already have an overlay for this URL
    const existingOverlay = overlays.find(overlay => overlay.url === url);
    if (existingOverlay) {
        existingOverlay.show();
        return existingOverlay;
    }
    
    // Create a new overlay with the URL
    const newOverlay = createWebOverlay(url, { ...options, initiallyVisible: true });
    return newOverlay;
}

// Configure XR session with DOM overlay
export function startXRSessionWithOverlay() {
    if (!renderer || !renderer.xr) {
        console.error('Three.js renderer not initialized');
        return Promise.reject(new Error('Three.js renderer not initialized'));
    }
    
    // Initialize DOM overlay if not already done
    if (!overlays.root) {
        initDOMOverlay();
    }
    
    // Configure session options
    const sessionInit = {
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: overlays.root }
    };
    
    // Request XR session
    return navigator.xr.requestSession('immersive-ar', sessionInit)
        .then(session => {
            renderer.xr.setSession(session);
            return session;
        });
}

// Clean up all overlays
export function destroyAllOverlays() {
    if (overlays.root) {
        // Clear all children
        while (overlays.root.firstChild) {
            overlays.root.removeChild(overlays.root.firstChild);
        }
    }
    
    // Clear overlay references
    overlays.length = 0;
} 