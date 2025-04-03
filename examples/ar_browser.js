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
    iframe.height = canvas.height - 40; // Account for top bar
    iframe.src = url || 'https://duckduckgo.com/';
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone";
    iframe.allowFullscreen = true;
    iframe.sandbox = "allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts";
    iframe.frameBorder = "0";
    iframe.id = `browser-frame-${Date.now()}`;
    document.body.appendChild(iframe);
    
    // Add viewport meta tag for better mobile experience
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
    
    // Create proxy browser controls
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
    urlInput.value = url || 'https://duckduckgo.com/';
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
    
    // Try to forward user interactions to the iframe
    function forwardInteraction(event) {
        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'interaction',
                    event: {
                        type: event.type,
                        x: event.clientX,
                        y: event.clientY - 40 // Adjust for toolbar
                    }
                }, '*');
            }
        } catch (e) {
            console.warn('Unable to forward interaction:', e);
        }
    }
    
    // Setup button functionalities
    backButton.addEventListener('click', function() {
        try {
            iframe.contentWindow.history.back();
        } catch (e) {
            console.warn('Unable to go back:', e);
        }
    });
    
    forwardButton.addEventListener('click', function() {
        try {
            iframe.contentWindow.history.forward();
        } catch (e) {
            console.warn('Unable to go forward:', e);
        }
    });
    
    refreshButton.addEventListener('click', function() {
        try {
            iframe.contentWindow.location.reload();
        } catch (e) {
            console.warn('Unable to refresh:', e);
            // Alternative method
            iframe.src = iframe.src;
        }
    });
    
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            try {
                // Format URL properly if needed
                let target = urlInput.value.trim();
                if (!target.startsWith('http')) {
                    // Check if it's a URL or a search term
                    if (target.includes('.') && !target.includes(' ')) {
                        target = 'https://' + target;
                    } else {
                        // Search query
                        target = 'https://duckduckgo.com/?q=' + encodeURIComponent(target);
                    }
                }
                
                // Navigate to the URL
                iframe.src = target;
                urlInput.value = target;
            } catch (e) {
                console.warn('Unable to navigate:', e);
            }
        }
    });
    
    // Listen for message from iframe when URL changes
    window.addEventListener('message', function(event) {
        // Check if message is from our iframe
        if (event.source === iframe.contentWindow) {
            // Update URL in input box if location changed
            if (event.data && event.data.type === 'locationChange') {
                urlInput.value = event.data.url;
            }
        }
    });
    
    // Function to draw browser UI
    function drawBrowserUI() {
        // Clear the canvas
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw browser toolbar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // Draw URL bar
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(80, 8, canvas.width - 160, 24);
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(80, 8, canvas.width - 160, 24);
        
        // Draw the current URL
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Truncate URL if too long
        let displayUrl = urlInput.value;
        if (displayUrl.length > 50) {
            displayUrl = displayUrl.substring(0, 20) + '...' + displayUrl.substring(displayUrl.length - 27);
        }
        ctx.fillText(displayUrl, 85, 20);
        
        // Draw buttons
        // Back button
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(10, 8, 24, 24);
        ctx.strokeStyle = '#dddddd';
        ctx.strokeRect(10, 8, 24, 24);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('←', 22, 20);
        
        // Forward button
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(44, 8, 24, 24);
        ctx.strokeStyle = '#dddddd';
        ctx.strokeRect(44, 8, 24, 24);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('→', 56, 20);
        
        // Refresh button
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(canvas.width - 68, 8, 24, 24);
        ctx.strokeStyle = '#dddddd';
        ctx.strokeRect(canvas.width - 68, 8, 24, 24);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↻', canvas.width - 56, 20);
        
        // Draw menu button
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(canvas.width - 34, 8, 24, 24);
        ctx.strokeStyle = '#dddddd';
        ctx.strokeRect(canvas.width - 34, 8, 24, 24);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☰', canvas.width - 22, 20);
    }
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    ctx.clearRect(0, 40, canvas.width, canvas.height - 40);
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    drawBrowserUI();
                    texture.needsUpdate = true;
                });
            } else {
                // Draw placeholder content
                drawBrowserUI();
                
                // Show a message that the real content would be here
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 40, canvas.width, canvas.height - 40);
                
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('DuckDuckGo Private Browser', canvas.width / 2, 120);
                
                ctx.font = '14px Arial';
                ctx.fillText('This browser window protects your privacy.', canvas.width / 2, 150);
                ctx.fillText('Tap on the screen to interact with the webpage.', canvas.width / 2, 180);
                
                if (logo.complete) {
                    const logoWidth = 200;
                    const logoHeight = 100;
                    ctx.drawImage(
                        logo, 
                        canvas.width / 2 - logoWidth / 2,
                        250,
                        logoWidth, 
                        logoHeight
                    );
                }
                
                texture.needsUpdate = true;
            }
        } catch (e) {
            console.warn('Error capturing iframe content:', e);
        }
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
    
    // Initial draw
    drawBrowserUI();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Update texture periodically to reflect iframe content
    const updateInterval = setInterval(captureIframeToTexture, 1000);
    
    // Add metadata and methods
    texture.userData = {
        isBrowser: true,
        iframe: iframe,
        canvas: canvas,
        ctx: ctx,
        controls: browserControls,
        updateInterval: updateInterval,
        
        // Handle click interactions on the browser
        onClick: function(x, y) {
            // If click is in the toolbar area
            if (y < 40) {
                // Back button
                if (x > 10 && x < 34 && y > 8 && y < 32) {
                    backButton.click();
                    return true;
                }
                
                // Forward button
                if (x > 44 && x < 68 && y > 8 && y < 32) {
                    forwardButton.click();
                    return true;
                }
                
                // Refresh button
                if (x > canvas.width - 68 && x < canvas.width - 44 && y > 8 && y < 32) {
                    refreshButton.click();
                    return true;
                }
                
                // URL bar - focus the input
                if (x > 80 && x < canvas.width - 160 && y > 8 && y < 32) {
                    urlInput.focus();
                    return true;
                }
                
                return false;
            }
            
            // Content area - forward the click
            forwardInteraction({
                type: 'click',
                clientX: x,
                clientY: y
            });
            
            return true;
        },
        
        // Handle drag on the browser content
        onDrag: function(startX, startY, endX, endY) {
            // Don't handle drag on toolbar
            if (startY < 40) {
                return false;
            }
            
            forwardInteraction({
                type: 'drag',
                clientX: endX,
                clientY: endY,
                startX: startX,
                startY: startY
            });
            
            return true;
        },
        
        // Navigate to URL
        navigate: function(url) {
            if (!url) return;
            
            iframe.src = url;
            urlInput.value = url;
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
        }
    };
    
    return texture;
} 