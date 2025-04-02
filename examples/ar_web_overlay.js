// WebXR DOM Overlay for web content in AR
import * as THREE from 'three';

// Track the active overlays
const webOverlays = [];

// Initialize DOM overlay for WebXR
export async function initDOMOverlay() {
    try {
        // Check if DOM overlay is supported
        if (!navigator.xr) {
            console.error("WebXR not supported in this browser");
            return false;
        }
        
        // Create overlay container if it doesn't exist
        let overlayContainer = document.getElementById('xr-dom-overlay-container');
        if (!overlayContainer) {
            overlayContainer = document.createElement('div');
            overlayContainer.id = 'xr-dom-overlay-container';
            overlayContainer.style.width = '100%';
            overlayContainer.style.height = '100%';
            overlayContainer.style.position = 'absolute';
            overlayContainer.style.top = '0';
            overlayContainer.style.left = '0';
            overlayContainer.style.pointerEvents = 'none'; // Start with no pointer events
            overlayContainer.style.display = 'none';
            document.body.appendChild(overlayContainer);
        }
        
        console.log("DOM Overlay container initialized");
        return true;
    } catch (error) {
        console.error("Error initializing DOM overlay:", error);
        return false;
    }
}

// Create a web overlay with the provided URL
export function createWebOverlay(url, options = {}) {
    // Default options
    const {
        width = "80%",
        height = "60%",
        position = "center", // center, top, bottom
        initiallyVisible = false,
        transparentBackground = false
    } = options;
    
    try {
        // Get or create the overlay container
        let overlayContainer = document.getElementById('xr-dom-overlay-container');
        if (!overlayContainer) {
            // Initialize if not already done
            initDOMOverlay();
            overlayContainer = document.getElementById('xr-dom-overlay-container');
            
            if (!overlayContainer) {
                console.error("Could not create overlay container");
                return null;
            }
        }
        
        // Create the overlay wrapper
        const overlayWrapper = document.createElement('div');
        overlayWrapper.className = 'xr-web-overlay';
        overlayWrapper.style.position = 'absolute';
        overlayWrapper.style.width = width;
        overlayWrapper.style.height = height;
        
        // Position the overlay
        switch (position) {
            case 'top':
                overlayWrapper.style.top = '10%';
                overlayWrapper.style.left = '50%';
                overlayWrapper.style.transform = 'translateX(-50%)';
                break;
            case 'bottom':
                overlayWrapper.style.bottom = '10%';
                overlayWrapper.style.left = '50%';
                overlayWrapper.style.transform = 'translateX(-50%)';
                break;
            case 'center':
            default:
                overlayWrapper.style.top = '50%';
                overlayWrapper.style.left = '50%';
                overlayWrapper.style.transform = 'translate(-50%, -50%)';
                break;
        }
        
        // Set initial visibility
        overlayWrapper.style.display = initiallyVisible ? 'block' : 'none';
        
        // Add styling
        overlayWrapper.style.backgroundColor = transparentBackground ? 'transparent' : '#fff';
        overlayWrapper.style.borderRadius = '10px';
        overlayWrapper.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        overlayWrapper.style.overflow = 'hidden';
        overlayWrapper.style.pointerEvents = 'auto'; // This specific element can receive events
        
        // Create header for controls
        const header = document.createElement('div');
        header.style.width = '100%';
        header.style.height = '40px';
        header.style.backgroundColor = '#4285f4';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '0 10px';
        header.style.boxSizing = 'border-box';
        header.style.touchAction = 'none'; // Prevent touch scrolling
        
        // Add title to header
        const title = document.createElement('div');
        title.textContent = 'Web Content';
        title.style.color = '#fff';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.fontWeight = 'bold';
        header.appendChild(title);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = '#fff';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.width = '30px';
        closeButton.style.height = '30px';
        closeButton.style.lineHeight = '30px';
        closeButton.style.padding = '0';
        closeButton.onclick = () => {
            hideOverlay(overlayWrapper);
        };
        header.appendChild(closeButton);
        
        // Create content iframe
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = 'calc(100% - 40px)'; // Subtract header height
        iframe.style.border = 'none';
        iframe.allowFullscreen = true;
        
        // Assemble the overlay
        overlayWrapper.appendChild(header);
        overlayWrapper.appendChild(iframe);
        overlayContainer.appendChild(overlayWrapper);
        
        // Make draggable
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        header.addEventListener('pointerdown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = overlayWrapper.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            e.preventDefault(); // Prevent default behavior
        });
        
        document.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            overlayWrapper.style.left = `${initialLeft + deltaX}px`;
            overlayWrapper.style.top = `${initialTop + deltaY}px`;
            overlayWrapper.style.transform = 'none'; // Remove transform when manually positioned
        });
        
        document.addEventListener('pointerup', () => {
            isDragging = false;
        });
        
        // Create overlay object
        const overlay = {
            element: overlayWrapper,
            iframe: iframe,
            url: url,
            
            // Show the overlay
            show() {
                overlayWrapper.style.display = 'block';
                overlayContainer.style.display = 'block';
                
                // Make sure the overlay container is active for hit testing
                overlayContainer.style.pointerEvents = 'auto';
                return this;
            },
            
            // Hide the overlay
            hide() {
                hideOverlay(overlayWrapper);
                return this;
            },
            
            // Navigate to a new URL
            navigate(newUrl) {
                iframe.src = newUrl;
                this.url = newUrl;
                return this;
            },
            
            // Destroy the overlay and clean up resources
            destroy() {
                if (overlayWrapper.parentNode) {
                    overlayWrapper.parentNode.removeChild(overlayWrapper);
                }
                
                // Check if there are any other active overlays
                if (overlayContainer.childElementCount === 0) {
                    overlayContainer.style.display = 'none';
                    overlayContainer.style.pointerEvents = 'none';
                }
                
                // Remove from tracking array
                const index = webOverlays.indexOf(this);
                if (index !== -1) {
                    webOverlays.splice(index, 1);
                }
            }
        };
        
        // Add to tracking array
        webOverlays.push(overlay);
        
        // Show if initiallyVisible is true
        if (initiallyVisible) {
            overlay.show();
        }
        
        return overlay;
    } catch (error) {
        console.error("Error creating web overlay:", error);
        return null;
    }
}

// Hide an overlay
function hideOverlay(overlayElement) {
    overlayElement.style.display = 'none';
    
    // Check if there are any visible overlays
    const overlayContainer = document.getElementById('xr-dom-overlay-container');
    if (overlayContainer) {
        let hasVisibleOverlays = false;
        for (const child of overlayContainer.children) {
            if (child.style.display !== 'none') {
                hasVisibleOverlays = true;
                break;
            }
        }
        
        // Hide the container if no visible overlays
        if (!hasVisibleOverlays) {
            overlayContainer.style.display = 'none';
            overlayContainer.style.pointerEvents = 'none';
        }
    }
}

// Check if DOM overlay is supported for WebXR
export async function isDOMOverlaySupported() {
    if (!navigator.xr) return false;
    
    try {
        // Check if the browser supports the necessary features
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!supported) return false;
        
        // Check for DOM overlay support
        return 'dom-overlay' in XRSession.prototype || 
               'domOverlay' in navigator.xr.requestSession('immersive-ar', { optionalFeatures: ['dom-overlay'] });
    } catch (error) {
        console.error("Error checking DOM overlay support:", error);
        return false;
    }
}

// Show a web overlay by ID
export function showOverlay(id) {
    const overlay = webOverlays.find(o => o.element.id === id);
    if (overlay) {
        overlay.show();
        return true;
    }
    return false;
}

// Hide all overlays
export function hideAllOverlays() {
    webOverlays.forEach(overlay => overlay.hide());
}

// Clean up all overlays
export function disposeAllOverlays() {
    while (webOverlays.length > 0) {
        webOverlays[0].destroy();
    }
    
    // Remove the container
    const overlayContainer = document.getElementById('xr-dom-overlay-container');
    if (overlayContainer && overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
    }
} 