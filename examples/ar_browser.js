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
    iframe.height = canvas.height;
    iframe.src = url;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.frameBorder = "0";
    iframe.id = `browser-frame-${Date.now()}`;
    document.body.appendChild(iframe);
    
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
    
    // Setup browser functionality
    backButton.addEventListener('click', function() {
        iframe.contentWindow.history.back();
    });
    
    forwardButton.addEventListener('click', function() {
        iframe.contentWindow.history.forward();
    });
    
    refreshButton.addEventListener('click', function() {
        iframe.contentWindow.location.reload();
    });
    
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            let newUrl = urlInput.value;
            if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
                newUrl = 'https://' + newUrl;
            }
            iframe.src = newUrl;
        }
    });
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    ctx.drawImage(renderedCanvas, 0, 0, canvas.width, canvas.height);
                    texture.needsUpdate = true;
                });
            } else {
                // Fallback method - show a message that direct rendering isn't available
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Add browser chrome simulation
                ctx.fillStyle = '#f2f2f2';
                ctx.fillRect(0, 0, canvas.width, 60);
                
                // URL bar
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(80, 15, canvas.width - 160, 30);
                ctx.strokeStyle = '#dddddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(80, 15, canvas.width - 160, 30);
                
                // URL text
                ctx.fillStyle = '#333333';
                ctx.font = '14px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(iframe.src, 90, 30);
                
                // Content area with message
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`Browsing: ${iframe.src}`, canvas.width / 2, canvas.height / 2);
                ctx.font = '14px Arial';
                ctx.fillText('(Content will display when you interact with the browser)', canvas.width / 2, canvas.height / 2 + 40);
                
                // Draw DuckDuckGo logo
                if (logo.complete) {
                    const logoWidth = 200;
                    const logoHeight = 100;
                    ctx.drawImage(
                        logo, 
                        canvas.width / 2 - logoWidth / 2,
                        150,
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
            console.log('html2canvas loaded');
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
        
        // Navigate to URL
        navigate: function(newUrl) {
            iframe.src = newUrl;
            urlInput.value = newUrl;
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