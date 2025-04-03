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
    
    // Create an iframe for YouTube
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height - 40; // Allow for title bar
    iframe.src = 'https://www.youtube.com/';
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.frameBorder = "0";
    iframe.id = `electron-youtube-${Date.now()}`;
    document.body.appendChild(iframe);
    
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
        
        // App title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('YouTube - Electron App', canvas.width / 2, 20);
        
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
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    // Clear canvas and draw electron frame
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 40, canvas.width, canvas.height - 40);
                    
                    // Draw captured content below title bar
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    
                    // Redraw the frame on top
                    drawElectronFrame();
                    
                    texture.needsUpdate = true;
                });
            } else {
                // Fallback - show a placeholder with message
                ctx.fillStyle = '#2F3241'; // Electron dark background
                ctx.fillRect(0, 40, canvas.width, canvas.height - 40);
                
                // Content message
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('YouTube running in Electron', canvas.width / 2, canvas.height / 2);
                ctx.font = '16px Arial';
                ctx.fillText('(Content will display when you interact with the app)', canvas.width / 2, canvas.height / 2 + 40);
                
                // Redraw frame
                drawElectronFrame();
                
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
    
    // Create electron app controls
    const electronControls = document.createElement('div');
    electronControls.style.position = 'absolute';
    electronControls.style.left = '-9999px';
    electronControls.style.top = '-9999px';
    electronControls.style.width = '300px';
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
    
    // Add controls to the div
    electronControls.appendChild(backButton);
    electronControls.appendChild(homeButton);
    electronControls.appendChild(refreshButton);
    document.body.appendChild(electronControls);
    
    // Setup button functionality
    backButton.addEventListener('click', function() {
        iframe.contentWindow.history.back();
    });
    
    homeButton.addEventListener('click', function() {
        iframe.src = 'https://www.youtube.com/';
    });
    
    refreshButton.addEventListener('click', function() {
        iframe.contentWindow.location.reload();
    });
    
    // Add properties and methods to texture
    texture.userData = {
        isElectronApp: true,
        iframe: iframe,
        canvas: canvas,
        ctx: ctx,
        controls: electronControls,
        updateInterval: updateInterval,
        
        // Method to navigate to a specific URL
        navigate: function(url) {
            iframe.src = url;
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