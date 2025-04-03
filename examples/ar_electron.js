// Electron app screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
// Remove circular dependency
// import { selectScreen, screens } from "./ar_screens.js";
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from "./ar_default_screen.js";

// Create an Electron app screen
export function createElectronAppScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Electron App ${screenId || ""}`;
    
    console.log("Creating Electron App screen");
    
    // Create Electron app texture
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
    
    // Add Electron app-branded border
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
    
    console.log("Created Electron App screen with ID:", electronScreen.userData.id);
    
    return electronScreen;
}

// Create an Electron app texture simulating the app interface
function createElectronAppTexture() {
    // Use canvas to draw Electron-like window
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Create a loading message
    ctx.fillStyle = '#2F3241'; // Electron dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading Electron app...', canvas.width / 2, canvas.height / 2);
    
    // Load Electron logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/electron_app.png';
    
    // Create Electron logo directly if the image isn't found
    logo.onerror = function() {
        console.warn("Electron logo image not found - creating a canvas version");
        
        // Create a temporary canvas for the logo
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 120;
        logoCanvas.height = 120;
        const logoCtx = logoCanvas.getContext('2d');
        
        // Draw electron orbits
        logoCtx.strokeStyle = '#9FEAF9'; // Electron blue
        logoCtx.lineWidth = 6;
        
        // Draw electron nucleus
        logoCtx.fillStyle = '#2F3241'; // Dark background
        logoCtx.beginPath();
        logoCtx.arc(60, 60, 20, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Draw electron orbits
        logoCtx.beginPath();
        logoCtx.ellipse(60, 60, 50, 15, 0, 0, Math.PI * 2);
        logoCtx.stroke();
        
        logoCtx.beginPath();
        logoCtx.ellipse(60, 60, 40, 50, Math.PI / 3, 0, Math.PI * 2);
        logoCtx.stroke();
        
        logoCtx.beginPath();
        logoCtx.ellipse(60, 60, 40, 50, -Math.PI / 3, 0, Math.PI * 2);
        logoCtx.stroke();
        
        // Draw electrons
        logoCtx.fillStyle = '#9FEAF9';
        logoCtx.beginPath();
        logoCtx.arc(60, 10, 7, 0, Math.PI * 2);
        logoCtx.fill();
        
        logoCtx.beginPath();
        logoCtx.arc(105, 85, 7, 0, Math.PI * 2);
        logoCtx.fill();
        
        logoCtx.beginPath();
        logoCtx.arc(15, 85, 7, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Store the image data
        const logoImage = new Image();
        logoImage.src = logoCanvas.toDataURL();
        
        // Replace the original logo reference
        logo.src = logoImage.src;
    };
    
    // Draw logo on loading screen
    if (logo.complete) {
        const logoSize = 120;
        ctx.drawImage(
            logo, 
            canvas.width / 2 - logoSize / 2,
            canvas.height / 2 - logoSize - 20,
            logoSize, 
            logoSize
        );
    }
    
    // Create an iframe for embedding a website
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height - 40; // Account for the title bar
    iframe.src = 'https://www.github.com/';
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone";
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";
    iframe.id = `electron-app-${Date.now()}`;
    document.body.appendChild(iframe);
    
    // Add viewport meta tag for better interactivity  
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
    
    // Create electron app window frame
    function drawElectronFrame() {
        // Title bar
        ctx.fillStyle = '#1F2232';
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // Window controls (macOS style)
        // Close button
        ctx.fillStyle = '#FF5F57';
        ctx.beginPath();
        ctx.arc(20, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Minimize button
        ctx.fillStyle = '#FFBD2E';
        ctx.beginPath();
        ctx.arc(40, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Maximize button
        ctx.fillStyle = '#28CA42';
        ctx.beginPath();
        ctx.arc(60, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // App title - use the website domain from the iframe
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Extract domain from iframe src
        let domain = "Electron App";
        try {
            const url = new URL(iframe.src);
            domain = url.hostname || "Electron App";
        } catch (e) {
            console.warn("Failed to parse URL:", e);
        }
        
        ctx.fillText(domain + ' - Electron', canvas.width / 2, 20);
        
        // Draw small Electron logo in top right corner
        if (logo.complete) {
            const logoSize = 30;
            ctx.drawImage(
                logo, 
                canvas.width - logoSize - 10,
                5,
                logoSize, 
                logoSize
            );
        }
    }
    
    // Draw the electron frame
    drawElectronFrame();
    
    // Create electron app controls
    const electronControls = document.createElement('div');
    electronControls.style.position = 'absolute';
    electronControls.style.left = '-9999px';
    electronControls.style.top = '-9999px';
    electronControls.style.width = '400px';
    electronControls.style.background = 'rgba(47, 50, 65, 0.9)';
    electronControls.style.borderRadius = '5px';
    electronControls.style.padding = '10px';
    electronControls.style.display = 'flex';
    electronControls.style.justifyContent = 'space-between';
    
    // Add back, home, refresh buttons
    const backButton = document.createElement('button');
    backButton.textContent = '← Back';
    backButton.style.backgroundColor = '#1F2232';
    backButton.style.color = '#FFFFFF';
    backButton.style.border = 'none';
    backButton.style.padding = '5px 10px';
    backButton.style.borderRadius = '3px';
    
    const homeButton = document.createElement('button');
    homeButton.textContent = 'Home';
    homeButton.style.backgroundColor = '#1F2232';
    homeButton.style.color = '#FFFFFF';
    homeButton.style.border = 'none';
    homeButton.style.padding = '5px 10px';
    homeButton.style.borderRadius = '3px';
    
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.style.backgroundColor = '#1F2232';
    refreshButton.style.color = '#FFFFFF';
    refreshButton.style.border = 'none';
    refreshButton.style.padding = '5px 10px';
    refreshButton.style.borderRadius = '3px';
    
    // URL input box
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = 'https://www.github.com/';
    urlInput.style.flex = '1';
    urlInput.style.marginLeft = '10px';
    urlInput.style.marginRight = '10px';
    urlInput.style.padding = '5px';
    urlInput.style.border = '1px solid #444';
    urlInput.style.borderRadius = '3px';
    urlInput.style.backgroundColor = '#242633';
    urlInput.style.color = '#FFFFFF';
    
    // Navigation controls row
    const navControls = document.createElement('div');
    navControls.style.display = 'flex';
    navControls.style.width = '100%';
    navControls.style.marginBottom = '10px';
    navControls.appendChild(backButton);
    navControls.appendChild(homeButton);
    navControls.appendChild(refreshButton);
    
    // URL row
    const urlControls = document.createElement('div');
    urlControls.style.display = 'flex';
    urlControls.style.width = '100%';
    urlControls.appendChild(urlInput);
    
    // Add controls to the div
    electronControls.appendChild(navControls);
    electronControls.appendChild(urlControls);
    document.body.appendChild(electronControls);
    
    // Try to forward user interactions to the iframe
    function forwardInteraction(event) {
        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'interaction',
                    event: {
                        type: event.type,
                        x: event.clientX,
                        y: event.clientY - 40 // Adjust for title bar
                    }
                }, '*');
            }
        } catch (e) {
            console.warn('Unable to forward interaction:', e);
        }
    }
    
    // Setup button functionality
    backButton.addEventListener('click', function() {
        try {
            iframe.contentWindow.history.back();
        } catch (e) {
            console.warn('Unable to go back:', e);
        }
    });
    
    homeButton.addEventListener('click', function() {
        iframe.src = 'https://www.github.com/';
        urlInput.value = iframe.src;
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
                        // Search query using DuckDuckGo
                        target = 'https://duckduckgo.com/?q=' + encodeURIComponent(target);
                    }
                }
                
                // Navigate to the URL
                iframe.src = target;
                urlInput.value = target;
                
                // Update title bar with new domain
                drawElectronFrame();
            } catch (e) {
                console.warn('Unable to navigate:', e);
            }
        }
    });
    
    // Listen for messages from the iframe
    window.addEventListener('message', function(event) {
        // Check if message is from our iframe
        if (event.source === iframe.contentWindow) {
            // Handle location changes
            if (event.data && event.data.type === 'locationChange' && event.data.url) {
                urlInput.value = event.data.url;
                drawElectronFrame();
            }
        }
    });
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    // Clear content area and draw iframe content
                    ctx.clearRect(0, 40, canvas.width, canvas.height - 40);
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    
                    // Redraw the electron frame
                    drawElectronFrame();
                    
                    texture.needsUpdate = true;
                });
            } else {
                // Draw content placeholder
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 40, canvas.width, canvas.height - 40);
                
                // Add a GitHub-like content simulation if using GitHub
                if (iframe.src.includes('github.com')) {
                    // GitHub header
                    ctx.fillStyle = '#24292e';
                    ctx.fillRect(0, 40, canvas.width, 60);
                    
                    // GitHub logo
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 28px Arial';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('GitHub', 20, 70);
                    
                    // Content area
                    ctx.fillStyle = '#f6f8fa';
                    ctx.fillRect(30, 120, canvas.width - 60, canvas.height - 180);
                    
                    // Fake repository name
                    ctx.fillStyle = '#24292e';
                    ctx.font = 'bold 24px Arial';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText('electron / electron', 40, 130);
                    
                    // Description
                    ctx.fillStyle = '#586069';
                    ctx.font = '16px Arial';
                    ctx.fillText('Build cross-platform desktop apps with JavaScript, HTML, and CSS', 40, 165);
                    
                    // Stars, forks, etc.
                    ctx.fillStyle = '#24292e';
                    ctx.font = '14px Arial';
                    ctx.fillText('★ 104k', 40, 200);
                    ctx.fillText('⑂ 14.2k', 100, 200);
                    ctx.fillText('👁 2.3k', 160, 200);
                }
                
                // Redraw the frame
                drawElectronFrame();
                
                // Message about interaction
                ctx.fillStyle = '#333333';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Tap the screen to interact with the app', canvas.width / 2, canvas.height - 40);
                
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
            console.log('html2canvas loaded for Electron app');
            captureIframeToTexture();
        };
        document.head.appendChild(script);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Update texture periodically to reflect iframe content
    const updateInterval = setInterval(captureIframeToTexture, 1000);
    
    // Add properties and methods to texture
    texture.userData = {
        isElectronApp: true,
        iframe: iframe,
        canvas: canvas,
        ctx: ctx,
        controls: electronControls,
        updateInterval: updateInterval,
        
        // Handle click interactions on the Electron app
        onClick: function(x, y) {
            // If click is in the title bar
            if (y < 40) {
                // Window controls
                if (y < 30) {
                    // Close button
                    if (x < 26) {
                        return true; // Just acknowledge the click, don't close the app
                    }
                    
                    // Minimize button
                    if (x > 32 && x < 48) {
                        return true; // Just acknowledge the click
                    }
                    
                    // Maximize button
                    if (x > 54 && x < 70) {
                        return true; // Just acknowledge the click
                    }
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
        
        // Handle dragging on the content
        onDrag: function(startX, startY, endX, endY) {
            // If drag starts in the title bar, handle as window drag
            if (startY < 40) {
                return false; // Let the parent handle dragging
            }
            
            // Forward drag to iframe content
            forwardInteraction({
                type: 'drag',
                clientX: endX,
                clientY: endY,
                startX: startX,
                startY: startY
            });
            
            return true;
        },
        
        // Method to navigate to a specific URL
        navigate: function(url) {
            if (!url) return;
            
            // Format URL properly if needed
            if (!url.startsWith('http')) {
                if (url.includes('.') && !url.includes(' ')) {
                    url = 'https://' + url;
                } else {
                    // Search query
                    url = 'https://duckduckgo.com/?q=' + encodeURIComponent(url);
                }
            }
            
            iframe.src = url;
            urlInput.value = url;
            drawElectronFrame();
        },
        
        // Cleanup resources
        dispose: function() {
            clearInterval(updateInterval);
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            if (electronControls && electronControls.parentNode) {
                electronControls.parentNode.removeChild(electronControls);
            }
        }
    };
    
    return texture;
} 