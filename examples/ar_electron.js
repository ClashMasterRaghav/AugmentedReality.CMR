// Electron app screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from "./ar_default_screen.js";

// Create an Electron app screen with GitHub content
export function createElectronAppScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `GitHub ${screenId || "App"}`;
    
    console.log("Creating Electron app screen with GitHub");
    
    // Create electron content texture
    const electronTexture = createElectronAppTexture();
    
    // Create the screen container
    const electronScreen = enhancedCreateScreen(
        position,
        size,
        title,
        electronTexture
    );
    
    // Add electron-specific identification data
    electronScreen.userData = { 
        type: "screen",
        id: screenId,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: "electron"
    };
    
    // Add shadow for depth
    addDropShadow(electronScreen, screenWidth, screenHeight);
    
    // Add GitHub-branded border with signature electron color
    const borderGeometry = new THREE.PlaneGeometry(
        screenWidth + 0.02,
        screenHeight + 0.02
    );
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2F3241, // Electron dark blue color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990;
    electronScreen.add(borderPanel);
    
    // Set up drag handle
    const topBar = electronScreen.children.find(
        (child) => child.userData && child.userData.type === "dragHandle"
    );
    
    if (topBar) {
        topBar.userData.screen = electronScreen;
        electronScreen.userData.dragHandle = topBar;
    }
    
    // Add entrance animation
    animateScreenEntrance(electronScreen);
    
    console.log("Created Electron app screen with ID:", electronScreen.userData.id);
    
    return electronScreen;
}

// Create a texture for the Electron app screen
function createElectronAppTexture() {
    // Create a canvas for the app display
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Create a loading message
    ctx.fillStyle = '#1c2128'; // GitHub dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading GitHub...', canvas.width / 2, canvas.height / 2);
    
    // Load Electron logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/electron_app.png';
    
    // Create Electron logo directly if the image isn't found
    logo.onerror = function() {
        console.warn("Electron logo image not found - creating a canvas version");
        
        // Create a temporary canvas for the logo
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 100;
        logoCanvas.height = 100;
        const logoCtx = logoCanvas.getContext('2d');
        
        // Draw a stylized electron orbit symbol
        logoCtx.fillStyle = '#9feaf9'; // Electron blue
        
        // Draw center circle
        logoCtx.beginPath();
        logoCtx.arc(50, 50, 10, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Draw orbit ellipses
        logoCtx.strokeStyle = '#9feaf9';
        logoCtx.lineWidth = 2;
        
        // Orbit 1
        logoCtx.beginPath();
        logoCtx.ellipse(50, 50, 40, 20, 0, 0, Math.PI * 2);
        logoCtx.stroke();
        
        // Orbit 2
        logoCtx.beginPath();
        logoCtx.ellipse(50, 50, 40, 20, Math.PI/3, 0, Math.PI * 2);
        logoCtx.stroke();
        
        // Orbit 3
        logoCtx.beginPath();
        logoCtx.ellipse(50, 50, 40, 20, -Math.PI/3, 0, Math.PI * 2);
        logoCtx.stroke();
        
        // Store the image data
        const logoImage = new Image();
        logoImage.src = logoCanvas.toDataURL();
        
        // Replace the original logo reference
        logo.src = logoImage.src;
    };
    
    // Draw logo on loading screen
    if (logo.complete) {
        const logoSize = 100;
        ctx.drawImage(
            logo, 
            canvas.width / 2 - logoSize / 2,
            canvas.height / 2 - logoSize - 50,
            logoSize, 
            logoSize
        );
    }
    
    // Create an iframe for GitHub content
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height - 40; // Account for the title bar
    iframe.src = 'https://www.github.com/';
    iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms';
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope";
    iframe.frameBorder = "0";
    iframe.id = `electron-frame-${Date.now()}`;
    document.body.appendChild(iframe);
    
    // Add viewport meta tag for better mobile-friendly rendering
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
    
    // Create app window controls
    const windowControls = document.createElement('div');
    windowControls.style.position = 'absolute';
    windowControls.style.left = '-9999px';
    windowControls.style.top = '-9999px';
    windowControls.style.width = '400px';
    windowControls.style.background = '#1c2128';
    windowControls.style.borderRadius = '5px';
    windowControls.style.padding = '10px';
    windowControls.style.display = 'flex';
    windowControls.style.justifyContent = 'space-between';
    
    // Add window control buttons (mimic Electron)
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.color = '#FFFFFF';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '15px';
    closeButton.style.height = '15px';
    closeButton.style.lineHeight = '15px';
    closeButton.style.textAlign = 'center';
    closeButton.style.padding = '0';
    closeButton.style.marginRight = '5px';
    closeButton.style.backgroundColor = '#ff5f56';
    
    const minimizeButton = document.createElement('button');
    minimizeButton.textContent = '−';
    minimizeButton.style.backgroundColor = 'transparent';
    minimizeButton.style.color = '#000000';
    minimizeButton.style.border = 'none';
    minimizeButton.style.borderRadius = '50%';
    minimizeButton.style.width = '15px';
    minimizeButton.style.height = '15px';
    minimizeButton.style.lineHeight = '15px';
    minimizeButton.style.textAlign = 'center';
    minimizeButton.style.padding = '0';
    minimizeButton.style.marginRight = '5px';
    minimizeButton.style.backgroundColor = '#ffbd2e';
    
    const maximizeButton = document.createElement('button');
    maximizeButton.textContent = '+';
    maximizeButton.style.backgroundColor = 'transparent';
    maximizeButton.style.color = '#000000';
    maximizeButton.style.border = 'none';
    maximizeButton.style.borderRadius = '50%';
    maximizeButton.style.width = '15px';
    maximizeButton.style.height = '15px';
    maximizeButton.style.lineHeight = '15px';
    maximizeButton.style.textAlign = 'center';
    maximizeButton.style.padding = '0';
    maximizeButton.style.marginRight = '10px';
    maximizeButton.style.backgroundColor = '#27c93f';
    
    // URL input box
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = 'https://github.com/';
    urlInput.style.flex = '1';
    urlInput.style.marginLeft = '10px';
    urlInput.style.marginRight = '10px';
    urlInput.style.padding = '5px';
    urlInput.style.border = '1px solid #30363d';
    urlInput.style.borderRadius = '3px';
    urlInput.style.backgroundColor = '#0d1117';
    urlInput.style.color = '#c9d1d9';
    
    // Create refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '↻';
    refreshButton.style.backgroundColor = '#21262d';
    refreshButton.style.color = '#c9d1d9';
    refreshButton.style.border = 'none';
    refreshButton.style.padding = '5px 10px';
    refreshButton.style.borderRadius = '3px';
    
    // Add controls to container
    const windowButtonsContainer = document.createElement('div');
    windowButtonsContainer.style.display = 'flex';
    windowButtonsContainer.style.alignItems = 'center';
    windowButtonsContainer.appendChild(closeButton);
    windowButtonsContainer.appendChild(minimizeButton);
    windowButtonsContainer.appendChild(maximizeButton);
    
    windowControls.appendChild(windowButtonsContainer);
    windowControls.appendChild(urlInput);
    windowControls.appendChild(refreshButton);
    document.body.appendChild(windowControls);
    
    // Function to forward user interactions to the iframe
    function forwardInteraction(event) {
        // Ignore interactions in title bar area
        if (event.y < 40) return false;
        
        try {
            // Position iframe on-screen temporarily to receive the event
            const originalPosition = iframe.style.position;
            const originalLeft = iframe.style.left;
            const originalTop = iframe.style.top;
            
            iframe.style.position = 'fixed';
            iframe.style.left = '0';
            iframe.style.top = '0';
            iframe.style.zIndex = '9999';
            
            // Create and dispatch event
            let appEvent;
            if (event.type === 'click') {
                appEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: event.x,
                    clientY: event.y - 40 // Adjust for title bar
                });
            } else if (event.type === 'drag') {
                // For drag, send both mousedown and mousemove
                const downEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: event.startX,
                    clientY: event.startY - 40
                });
                
                const moveEvent = new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: event.x,
                    clientY: event.y - 40
                });
                
                if (iframe.contentDocument) {
                    iframe.contentDocument.elementFromPoint(event.startX, event.startY - 40)?.dispatchEvent(downEvent);
                    iframe.contentDocument.elementFromPoint(event.x, event.y - 40)?.dispatchEvent(moveEvent);
                }
            } else if (event.type === 'scroll') {
                // Handle scrolling - simulate wheel event
                const wheelEvent = new WheelEvent('wheel', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: event.x,
                    clientY: event.y - 40,
                    deltaY: event.deltaY
                });
                
                if (iframe.contentDocument) {
                    iframe.contentDocument.elementFromPoint(event.x, event.y - 40)?.dispatchEvent(wheelEvent);
                }
            }
            
            // For simple click events
            if (event.type === 'click' && iframe.contentDocument) {
                const element = iframe.contentDocument.elementFromPoint(event.x, event.y - 40);
                if (element) element.dispatchEvent(appEvent);
            }
            
            // Return iframe to its original position
            iframe.style.position = originalPosition;
            iframe.style.left = originalLeft;
            iframe.style.top = originalTop;
            
            return true;
        } catch (e) {
            console.error('Error forwarding interaction to Electron iframe:', e);
            return false;
        }
    }
    
    // Setup window controls functionality
    refreshButton.addEventListener('click', function() {
        if (iframe.contentWindow) {
            iframe.contentWindow.location.reload();
            setTimeout(captureIframeToTexture, 500);
        }
    });
    
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            let newUrl = urlInput.value.trim();
            
            // Format the URL properly
            if (newUrl.indexOf(' ') !== -1 || !newUrl.includes('.')) {
                // If the input has spaces or doesn't have a dot, treat as search query
                newUrl = `https://github.com/search?q=${encodeURIComponent(newUrl)}`;
            } else if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
                newUrl = 'https://' + newUrl;
            }
            
            iframe.src = newUrl;
            urlInput.value = newUrl;
            
            // Capture the new content after it loads
            setTimeout(captureIframeToTexture, 1000);
        }
    });
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    // Clear canvas and draw the Electron app UI
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawElectronUI();
                    
                    // Draw the captured iframe content below the UI
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    texture.needsUpdate = true;
                    
                    // Update URL display with current page
                    const currentUrl = iframe.contentWindow.location.href;
                    urlInput.value = currentUrl;
                    
                    // Extract domain for title bar
                    try {
                        const urlObj = new URL(currentUrl);
                        const domain = urlObj.hostname;
                        drawTitleText(domain);
                    } catch (e) {
                        drawTitleText('GitHub');
                    }
                });
            } else {
                // Fallback method
                ctx.fillStyle = '#1c2128';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the Electron app UI
                drawElectronUI();
                
                texture.needsUpdate = true;
            }
        } catch (e) {
            console.warn('Error capturing iframe content:', e);
        }
    }
    
    // Function to draw the Electron app UI
    function drawElectronUI() {
        // Draw window title bar (OS X style)
        ctx.fillStyle = '#1c2128'; // GitHub dark theme color
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // Draw window buttons (close, minimize, maximize)
        // Close button (red)
        ctx.fillStyle = '#ff5f56';
        ctx.beginPath();
        ctx.arc(15, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Minimize button (yellow)
        ctx.fillStyle = '#ffbd2e';
        ctx.beginPath();
        ctx.arc(35, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Maximize button (green)
        ctx.fillStyle = '#27c93f';
        ctx.beginPath();
        ctx.arc(55, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw title text centered
        drawTitleText(urlInput.value);
        
        // Draw GitHub icon if available
        if (logo.complete) {
            ctx.drawImage(logo, canvas.width - 35, 5, 30, 30);
        }
    }
    
    function drawTitleText(title) {
        let displayTitle = 'GitHub';
        
        // If title is a URL, extract domain
        if (title.includes('//')) {
            try {
                const urlObj = new URL(title);
                displayTitle = urlObj.hostname;
            } catch (e) {
                displayTitle = title;
            }
        } else {
            displayTitle = title;
        }
        
        // Limit length
        if (displayTitle.length > 30) {
            displayTitle = displayTitle.substring(0, 27) + '...';
        }
        
        ctx.fillStyle = '#c9d1d9'; // GitHub text color
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayTitle, canvas.width / 2, 20);
    }
    
    // Try to load html2canvas if not already available
    if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = function() {
            console.log('html2canvas loaded for GitHub');
            captureIframeToTexture();
        };
        document.head.appendChild(script);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Update texture periodically
    const updateInterval = setInterval(captureIframeToTexture, 1000);
    
    // Add metadata and methods
    texture.userData = {
        isElectronApp: true,
        iframe: iframe,
        canvas: canvas,
        ctx: ctx,
        controls: windowControls,
        updateInterval: updateInterval,
        
        // Handle click interaction
        onClick: function(x, y) {
            // Handle UI element clicks in the title bar
            if (y < 40) {
                // Close button area
                if (Math.sqrt(Math.pow(x - 15, 2) + Math.pow(y - 20, 2)) < 6) {
                    // Implement close behavior here
                    return true;
                }
                
                // Minimize button area
                if (Math.sqrt(Math.pow(x - 35, 2) + Math.pow(y - 20, 2)) < 6) {
                    // Implement minimize behavior here
                    return true;
                }
                
                // Maximize button area
                if (Math.sqrt(Math.pow(x - 55, 2) + Math.pow(y - 20, 2)) < 6) {
                    // Implement maximize behavior here
                    return true;
                }
                
                return false;
            }
            
            // Forward the click to iframe content
            return forwardInteraction({
                type: 'click',
                x: x,
                y: y
            });
        },
        
        // Handle drag interaction
        onDrag: function(startX, startY, endX, endY) {
            // If drag starts in title bar, don't forward
            if (startY < 40) return false;
            
            return forwardInteraction({
                type: 'drag',
                startX: startX,
                startY: startY,
                x: endX,
                y: endY
            });
        },
        
        // Handle scroll gesture
        onScroll: function(x, y, deltaY) {
            if (y < 40) return false;
            
            return forwardInteraction({
                type: 'scroll',
                x: x,
                y: y,
                deltaY: deltaY
            });
        },
        
        // Navigate to a new URL
        navigate: function(newUrl) {
            // Format the URL properly
            if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
                newUrl = 'https://' + newUrl;
            }
            
            iframe.src = newUrl;
            urlInput.value = newUrl;
            captureIframeToTexture();
        },
        
        // Refresh the page
        refresh: function() {
            if (iframe.contentWindow) {
                iframe.contentWindow.location.reload();
                captureIframeToTexture();
            }
        },
        
        // Dispose resources
        dispose: function() {
            clearInterval(updateInterval);
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            if (windowControls && windowControls.parentNode) {
                windowControls.parentNode.removeChild(windowControls);
            }
            if (viewportMeta && viewportMeta.parentNode) {
                viewportMeta.parentNode.removeChild(viewportMeta);
            }
        }
    };
    
    return texture;
} 