// WebView Messaging System for WebXR
import * as THREE from 'three';
import { createScreenBase } from './ar_screens.js';

// Store all interactive web panels
const webPanels = [];

// Message types for communication
const MessageType = {
    INITIALIZE: 'initialize',
    SCROLL: 'scroll',
    CLICK: 'click',
    NAVIGATE: 'navigate',
    INPUT: 'input',
    RESPONSE: 'response',
    ERROR: 'error'
};

// Create a messaging-enabled web panel
export function createInteractiveWebPanel(options = {}) {
    const {
        url = 'about:blank',
        width = 1.6,
        height = 0.9,
        position = new THREE.Vector3(0, 0, -2),
        rotation = new THREE.Euler(0, 0, 0),
        parent = null,
        iframeId = `web-frame-${Date.now()}`
    } = options;

    // Create base screen object
    const panel = createScreenBase({
        width,
        height,
        position,
        rotation
    });

    // Create a unique ID for the iframe
    const frameId = iframeId;
    
    // Create a hidden iframe to hold the web content
    let iframe = document.getElementById(frameId);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = frameId;
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';  // Hide offscreen
        iframe.style.width = '1024px';  // Set dimensions for rendering
        iframe.style.height = '768px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
    }
    
    // Create canvas texture for rendering the web content
    const texture = new THREE.CanvasTexture(
        document.createElement('canvas')
    );
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    
    // Create material with the canvas texture
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    
    // Apply material to the panel mesh
    panel.mesh.material = material;
    
    // Add panel to the parent if provided
    if (parent) {
        parent.add(panel.mesh);
    }
    
    // Create the texture canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Messaging system setup
    const messageQueue = [];
    let messageChannel = null;
    
    // Initialize message channel with the iframe
    function initializeMessageChannel() {
        return new Promise((resolve, reject) => {
            // Wait for iframe to load
            iframe.onload = () => {
                try {
                    // Create a message channel
                    messageChannel = new MessageChannel();
                    
                    // Listen for messages from the iframe
                    messageChannel.port1.onmessage = handleIframeMessage;
                    
                    // Send the port to the iframe
                    iframe.contentWindow.postMessage({
                        type: MessageType.INITIALIZE,
                        width: canvas.width,
                        height: canvas.height
                    }, '*', [messageChannel.port2]);
                    
                    // Inject helper script into iframe for capturing content
                    const injectScript = () => {
                        try {
                            const script = iframe.contentDocument.createElement('script');
                            script.textContent = `
                                // Setup communication with parent
                                let parentPort = null;
                                window.addEventListener('message', (event) => {
                                    if (event.data.type === '${MessageType.INITIALIZE}') {
                                        parentPort = event.ports[0];
                                        
                                        // Set up rendering interval
                                        setInterval(() => captureAndSendContent(), 100);
                                        
                                        // Handle actions from parent
                                        parentPort.onmessage = (e) => {
                                            const msg = e.data;
                                            switch(msg.type) {
                                                case '${MessageType.CLICK}':
                                                    simulateClick(msg.x, msg.y);
                                                    break;
                                                case '${MessageType.SCROLL}':
                                                    window.scrollTo(msg.x, msg.y);
                                                    break;
                                                case '${MessageType.INPUT}':
                                                    handleInput(msg);
                                                    break;
                                                case '${MessageType.NAVIGATE}':
                                                    location.href = msg.url;
                                                    break;
                                            }
                                        };
                                    }
                                });
                                
                                // Capture and send the page content
                                function captureAndSendContent() {
                                    if (!parentPort) return;
                                    
                                    const canvas = document.createElement('canvas');
                                    canvas.width = ${canvas.width};
                                    canvas.height = ${canvas.height};
                                    const ctx = canvas.getContext('2d');
                                    
                                    // Draw page to canvas
                                    ctx.fillStyle = 'white';
                                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                                    
                                    // Use html2canvas if available
                                    if (typeof html2canvas !== 'undefined') {
                                        html2canvas(document.body).then(renderedCanvas => {
                                            ctx.drawImage(renderedCanvas, 0, 0, canvas.width, canvas.height);
                                            sendCanvasData(canvas);
                                        });
                                    } else {
                                        // Fallback to simple rendering
                                        try {
                                            ctx.drawImage(document.documentElement, 0, 0, canvas.width, canvas.height);
                                        } catch(e) {
                                            // Draw error message if rendering fails
                                            ctx.fillStyle = 'white';
                                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                                            ctx.fillStyle = 'black';
                                            ctx.font = '24px Arial';
                                            ctx.fillText('Content rendering unavailable', 20, 50);
                                            ctx.font = '16px Arial';
                                            ctx.fillText(location.href, 20, 80);
                                        }
                                        sendCanvasData(canvas);
                                    }
                                }
                                
                                // Send the canvas data to parent
                                function sendCanvasData(canvas) {
                                    if (!parentPort) return;
                                    
                                    const imageData = canvas.toDataURL('image/jpeg', 0.8);
                                    parentPort.postMessage({
                                        type: '${MessageType.RESPONSE}',
                                        imageData: imageData,
                                        url: location.href,
                                        title: document.title,
                                        scrollX: window.scrollX,
                                        scrollY: window.scrollY,
                                        width: window.innerWidth,
                                        height: window.innerHeight
                                    });
                                }
                                
                                // Simulate click at specific coordinates
                                function simulateClick(x, y) {
                                    const element = document.elementFromPoint(x, y);
                                    if (element) {
                                        // Create and dispatch mouse events
                                        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                                            const event = new MouseEvent(eventType, {
                                                view: window,
                                                bubbles: true,
                                                cancelable: true,
                                                clientX: x,
                                                clientY: y
                                            });
                                            element.dispatchEvent(event);
                                        });
                                    }
                                }
                                
                                // Handle input events
                                function handleInput(msg) {
                                    const element = document.elementFromPoint(msg.x, msg.y);
                                    if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                                        element.focus();
                                        element.value = msg.text;
                                        // Dispatch input event
                                        const event = new Event('input', {
                                            bubbles: true,
                                            cancelable: true
                                        });
                                        element.dispatchEvent(event);
                                    }
                                }
                            `;
                            iframe.contentDocument.head.appendChild(script);
                            
                            // Load html2canvas if possible
                            const html2canvasScript = iframe.contentDocument.createElement('script');
                            html2canvasScript.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
                            iframe.contentDocument.head.appendChild(html2canvasScript);
                            
                            resolve();
                        } catch (error) {
                            console.error('Error injecting script:', error);
                            reject(error);
                        }
                    };
                    
                    // Wait for iframe document to be accessible
                    if (iframe.contentDocument.readyState === 'complete') {
                        injectScript();
                    } else {
                        iframe.contentWindow.addEventListener('load', injectScript);
                    }
                } catch (error) {
                    console.error('Error initializing message channel:', error);
                    reject(error);
                }
            };
            
            // Set iframe source to start loading
            iframe.src = url;
        });
    }
    
    // Handle messages from the iframe
    function handleIframeMessage(event) {
        const message = event.data;
        
        switch (message.type) {
            case MessageType.RESPONSE:
                // Update texture with new content
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    texture.needsUpdate = true;
                };
                img.src = message.imageData;
                
                // Update panel data
                panel.data = {
                    ...panel.data,
                    url: message.url,
                    title: message.title,
                    scrollX: message.scrollX,
                    scrollY: message.scrollY,
                    contentWidth: message.width,
                    contentHeight: message.height
                };
                break;
                
            case MessageType.ERROR:
                console.error('Error from web panel:', message.error);
                // Draw error message on canvas
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'red';
                ctx.font = '24px Arial';
                ctx.fillText('Error loading content', 20, 50);
                ctx.font = '16px Arial';
                ctx.fillText(message.error, 20, 80);
                texture.needsUpdate = true;
                break;
        }
    }
    
    // Send messages to the iframe
    function sendMessage(message) {
        if (!messageChannel) {
            // Queue message if channel not ready
            messageQueue.push(message);
            return;
        }
        
        messageChannel.port1.postMessage(message);
    }
    
    // Process queued messages
    function processMessageQueue() {
        while (messageQueue.length > 0) {
            sendMessage(messageQueue.shift());
        }
    }
    
    // Create interaction raycaster for detecting clicks
    const raycaster = new THREE.Raycaster();
    
    // Convert 3D intersection to 2D iframe coordinates
    function convertTo2D(intersection) {
        if (!intersection) return null;
        
        // Get UV coordinates (0-1 range)
        const uv = intersection.uv;
        
        // Convert to pixel coordinates
        return {
            x: Math.floor(uv.x * canvas.width),
            y: Math.floor((1 - uv.y) * canvas.height)
        };
    }
    
    // Initialize the panel
    initializeMessageChannel()
        .then(() => {
            console.log('Web messaging initialized for:', url);
            processMessageQueue();
        })
        .catch(error => {
            console.error('Failed to initialize web messaging:', error);
            // Draw error message
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'red';
            ctx.font = '24px Arial';
            ctx.fillText('Failed to load content', 20, 50);
            ctx.font = '16px Arial';
            ctx.fillText(url, 20, 80);
            ctx.fillText(error.message, 20, 110);
            texture.needsUpdate = true;
        });
    
    // Define the panel object API
    const webPanel = {
        mesh: panel.mesh,
        url,
        iframe,
        frameId,
        canvas,
        texture,
        
        // Navigate to a new URL
        navigate(newUrl) {
            sendMessage({
                type: MessageType.NAVIGATE,
                url: newUrl
            });
        },
        
        // Simulate a click at specified coordinates or 3D position
        click(xOrIntersection, y) {
            let coords;
            
            if (typeof xOrIntersection === 'object' && xOrIntersection.point) {
                // Convert 3D intersection to 2D coordinates
                raycaster.setFromCamera(xOrIntersection.point, xOrIntersection.camera);
                const intersects = raycaster.intersectObject(panel.mesh);
                
                if (intersects.length > 0) {
                    coords = convertTo2D(intersects[0]);
                }
            } else if (typeof xOrIntersection === 'number' && typeof y === 'number') {
                // Direct 2D coordinates
                coords = { x: xOrIntersection, y };
            }
            
            if (coords) {
                sendMessage({
                    type: MessageType.CLICK,
                    x: coords.x,
                    y: coords.y
                });
            }
        },
        
        // Scroll the iframe content
        scroll(x, y) {
            sendMessage({
                type: MessageType.SCROLL,
                x, y
            });
        },
        
        // Input text at specified coordinates
        inputText(x, y, text) {
            sendMessage({
                type: MessageType.INPUT,
                x, y,
                text
            });
        },
        
        // Check if a point intersects with the panel
        intersectsPoint(point, camera) {
            raycaster.setFromCamera(point, camera);
            const intersects = raycaster.intersectObject(panel.mesh);
            return intersects.length > 0 ? intersects[0] : null;
        },
        
        // Clean up resources
        dispose() {
            // Remove from parent if attached
            if (panel.mesh.parent) {
                panel.mesh.parent.remove(panel.mesh);
            }
            
            // Remove iframe
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            
            // Dispose of textures and geometries
            texture.dispose();
            panel.mesh.geometry.dispose();
            panel.mesh.material.dispose();
            
            // Remove from panels array
            const index = webPanels.indexOf(this);
            if (index !== -1) {
                webPanels.splice(index, 1);
            }
        }
    };
    
    // Add to panels array
    webPanels.push(webPanel);
    
    return webPanel;
}

// Handle input interaction with a web panel
export function handleWebPanelInteraction(point, camera, action = 'click') {
    for (const panel of webPanels) {
        const intersection = panel.intersectsPoint(point, camera);
        if (intersection) {
            const coords = convertTo2D(intersection);
            
            switch (action) {
                case 'click':
                    panel.click(coords.x, coords.y);
                    break;
                case 'scroll':
                    // Determine scroll direction based on position
                    const scrollY = coords.y < panel.canvas.height / 2 ? -50 : 50;
                    panel.scroll(0, panel.data?.scrollY + scrollY || 0);
                    break;
                // Additional actions can be added here
            }
            
            return true; // Interaction handled
        }
    }
    
    return false; // No interaction occurred
}

// Helper function to convert 3D intersection to 2D coordinates
function convertTo2D(intersection) {
    if (!intersection || !intersection.uv) return null;
    
    const uv = intersection.uv;
    return {
        x: Math.floor(uv.x * 1024), // Standard width
        y: Math.floor((1 - uv.y) * 768) // Standard height
    };
}

// Dispose of all web panels
export function disposeAllWebPanels() {
    while (webPanels.length > 0) {
        webPanels[0].dispose();
    }
}

// Update all web panels (should be called in animation loop)
export function updateWebPanels() {
    // No update needed as messaging system handles updates automatically
} 