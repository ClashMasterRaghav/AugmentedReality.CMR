// Browser screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen, screens } from "./ar_screens.js";
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from "./ar_default_screen.js";

// Create a DuckDuckGo search screen
export function createBrowserScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `DuckDuckGo ${screenId || "Search"}`;
    
    console.log("Creating DuckDuckGo search screen");
    
    // Create iframe content texture
    const browserTexture = createBrowserTexture("https://duckduckgo.com/");
    
    // Create the screen container
    const browserScreen = enhancedCreateScreen(
        position,
        size,
        title,
        browserTexture
    );
    
    // Add browser-specific identification data
    browserScreen.userData = { 
        type: "screen",
        id: screenId,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: "browser"
    };
    
    // Add shadow for depth
    addDropShadow(browserScreen, screenWidth, screenHeight);
    
    // Add DuckDuckGo-branded border
    const borderGeometry = new THREE.PlaneGeometry(
        screenWidth + 0.02,
        screenHeight + 0.02
    );
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xde5833, // DuckDuckGo orange color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990;
    browserScreen.add(borderPanel);
    
    // Set up drag handle
    const topBar = browserScreen.children.find(
        (child) => child.userData && child.userData.type === "dragHandle"
    );
    
    if (topBar) {
        topBar.userData.screen = browserScreen;
        browserScreen.userData.dragHandle = topBar;
    }
    
    // Add entrance animation
    animateScreenEntrance(browserScreen);
    
    console.log("Created browser screen with ID:", browserScreen.userData.id);
    
    return browserScreen;
}

// Create a browser texture that simulates a web page
function createBrowserTexture(url) {
    // Create a canvas to draw the browser 
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Create a loading message
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading browser...', canvas.width / 2, canvas.height / 2);
    
    // Load DuckDuckGo logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/DuckDuckGo_logo.png';
    
    // Create DuckDuckGo logo directly if the image isn't found
    logo.onerror = function() {
        console.warn("DuckDuckGo logo image not found - creating a canvas version");
        
        // Create a temporary canvas for the logo
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 250;
        logoCanvas.height = 125;
        const logoCtx = logoCanvas.getContext('2d');
        
        // Draw orange background
        logoCtx.fillStyle = '#DE5833';
        logoCtx.fillRect(0, 0, logoCanvas.width, logoCanvas.height);
        
        // Draw duck silhouette
        logoCtx.fillStyle = '#ffffff';
        logoCtx.beginPath();
        
        // Create a simplified duck shape
        logoCtx.ellipse(125, 60, 60, 50, 0, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Duck head
        logoCtx.fillStyle = '#ffffff';
        logoCtx.beginPath();
        logoCtx.ellipse(185, 60, 35, 28, 0, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Duck bill
        logoCtx.fillStyle = '#DE5833';
        logoCtx.beginPath();
        logoCtx.moveTo(215, 60);
        logoCtx.lineTo(245, 50);
        logoCtx.lineTo(245, 70);
        logoCtx.closePath();
        logoCtx.fill();
        
        // Eye
        logoCtx.fillStyle = '#000000';
        logoCtx.beginPath();
        logoCtx.arc(195, 55, 5, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Store the image data
        const logoImage = new Image();
        logoImage.src = logoCanvas.toDataURL();
        
        // Replace the original logo reference
        logo.src = logoImage.src;
    };
    
    // Draw logo on loading screen
    if (logo.complete) {
        const logoWidth = 250;
        const logoHeight = 125;
        ctx.drawImage(
            logo, 
            canvas.width / 2 - logoWidth / 2,
            canvas.height / 2 - logoHeight - 20,
            logoWidth, 
            logoHeight
        );
    }
    
    // Create an invisible iframe to load the website
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height - 40; // Account for the title bar
    iframe.src = url;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.sandbox = "allow-same-origin allow-scripts allow-popups allow-forms";
    iframe.frameBorder = "0";
    iframe.id = `browser-frame-${Date.now()}`;
    document.body.appendChild(iframe);
    
    // Add viewport meta tag for better mobile-friendly rendering
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
    
    // Create browser controls
    const browserControls = document.createElement('div');
    browserControls.style.position = 'absolute';
    browserControls.style.left = '-9999px';
    browserControls.style.top = '-9999px';
    browserControls.style.width = '400px';
    browserControls.style.background = 'rgba(240,240,240,0.9)';
    browserControls.style.borderRadius = '5px';
    browserControls.style.padding = '10px';
    browserControls.style.display = 'flex';
    browserControls.style.justifyContent = 'space-between';
    
    // Add back, forward, refresh buttons
    const backButton = document.createElement('button');
    backButton.textContent = '←';
    backButton.style.backgroundColor = '#f2f2f2';
    backButton.style.border = '1px solid #ddd';
    backButton.style.padding = '5px 10px';
    backButton.style.borderRadius = '3px';
    
    const forwardButton = document.createElement('button');
    forwardButton.textContent = '→';
    forwardButton.style.backgroundColor = '#f2f2f2';
    forwardButton.style.border = '1px solid #ddd';
    forwardButton.style.padding = '5px 10px';
    forwardButton.style.borderRadius = '3px';
    
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '↻';
    refreshButton.style.backgroundColor = '#f2f2f2';
    refreshButton.style.border = '1px solid #ddd';
    refreshButton.style.padding = '5px 10px';
    refreshButton.style.borderRadius = '3px';
    
    // URL input box
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = url;
    urlInput.style.flex = '1';
    urlInput.style.marginLeft = '10px';
    urlInput.style.marginRight = '10px';
    urlInput.style.padding = '5px';
    urlInput.style.border = '1px solid #ddd';
    urlInput.style.borderRadius = '3px';
    
    // Add elements to control bar
    browserControls.appendChild(backButton);
    browserControls.appendChild(forwardButton);
    browserControls.appendChild(refreshButton);
    browserControls.appendChild(urlInput);
    document.body.appendChild(browserControls);
    
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
            let browserEvent;
            if (event.type === 'click') {
                browserEvent = new MouseEvent('click', {
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
                if (element) element.dispatchEvent(browserEvent);
            }
            
            // Return iframe to its original position
            iframe.style.position = originalPosition;
            iframe.style.left = originalLeft;
            iframe.style.top = originalTop;
            
            return true;
        } catch (e) {
            console.error('Error forwarding interaction to browser iframe:', e);
            return false;
        }
    }
    
    // Setup browser functionality
    backButton.addEventListener('click', function() {
        if (iframe.contentWindow && iframe.contentWindow.history) {
            iframe.contentWindow.history.back();
            setTimeout(captureIframeToTexture, 500);
        }
    });
    
    forwardButton.addEventListener('click', function() {
        if (iframe.contentWindow && iframe.contentWindow.history) {
            iframe.contentWindow.history.forward();
            setTimeout(captureIframeToTexture, 500);
        }
    });
    
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
                newUrl = `https://duckduckgo.com/?q=${encodeURIComponent(newUrl)}`;
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
                    // Clear canvas and draw the browser UI
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawBrowserUI();
                    
                    // Draw the captured iframe content below the UI
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    texture.needsUpdate = true;
                });
            } else {
                // Fallback method
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the browser UI
                drawBrowserUI();
                
                texture.needsUpdate = true;
            }
        } catch (e) {
            console.warn('Error capturing iframe content:', e);
        }
    }
    
    // Function to draw the browser UI
    function drawBrowserUI() {
        // Draw browser chrome (top bar)
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // Draw border line
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(canvas.width, 40);
        ctx.stroke();
        
        // Draw DuckDuckGo logo (small)
        if (logo.complete) {
            ctx.drawImage(logo, 10, 5, 30, 15);
        }
        
        // Draw URL bar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(80, 5, canvas.width - 160, 30);
        ctx.strokeStyle = '#dddddd';
        ctx.strokeRect(80, 5, canvas.width - 160, 30);
        
        // Draw URL text
        const displayUrl = iframe.src.length > 50 ? 
            iframe.src.substring(0, 47) + '...' : 
            iframe.src;
            
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayUrl, 90, 20);
        
        // Draw navigation buttons
        // Back button
        ctx.fillStyle = '#dddddd';
        ctx.beginPath();
        ctx.moveTo(65, 20);
        ctx.lineTo(50, 20);
        ctx.stroke();
        
        // Forward button
        ctx.beginPath();
        ctx.moveTo(canvas.width - 65, 20);
        ctx.lineTo(canvas.width - 50, 20);
        ctx.stroke();
    }
    
    // Try to load html2canvas if not already available
    if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = function() {
            console.log('html2canvas loaded for browser');
            captureIframeToTexture();
        };
        document.head.appendChild(script);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Update texture periodically to reflect iframe content
    const updateInterval = setInterval(captureIframeToTexture, 1000);
    
    // Add metadata and methods
    texture.userData = {
        isBrowser: true,
        url: url,
        iframe: iframe,
        canvas: canvas,
        ctx: ctx,
        controls: browserControls,
        updateInterval: updateInterval,
        
        // Handle click interaction
        onClick: function(x, y) {
            // Handle UI element clicks in the title bar
            if (y < 40) {
                // Back button area
                if (x < 70) {
                    if (iframe.contentWindow && iframe.contentWindow.history) {
                        iframe.contentWindow.history.back();
                        setTimeout(captureIframeToTexture, 500);
                    }
                    return true;
                }
                
                // Forward button area
                if (x > canvas.width - 70) {
                    if (iframe.contentWindow && iframe.contentWindow.history) {
                        iframe.contentWindow.history.forward();
                        setTimeout(captureIframeToTexture, 500);
                    }
                    return true;
                }
                
                // Refresh (middle of the bar)
                if (x > 70 && x < 80) {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.location.reload();
                        setTimeout(captureIframeToTexture, 500);
                    }
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
        
        // Handle drag interaction for scrolling
        onDrag: function(startX, startY, endX, endY) {
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
        
        // Navigate to URL
        navigate: function(newUrl) {
            // Format the URL properly
            if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
                newUrl = 'https://' + newUrl;
            }
            
            iframe.src = newUrl;
            urlInput.value = newUrl;
            captureIframeToTexture();
        },
        
        // Dispose resources
        dispose: function() {
            clearInterval(updateInterval);
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            if (browserControls && browserControls.parentNode) {
                browserControls.parentNode.removeChild(browserControls);
            }
            if (viewportMeta && viewportMeta.parentNode) {
                viewportMeta.parentNode.removeChild(viewportMeta);
            }
        }
    };
    
    return texture;
} 