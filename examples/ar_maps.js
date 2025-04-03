// Maps screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen, screens } from "./ar_screens.js";
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from "./ar_default_screen.js";

// Create a Google Maps screen
export function createMapsScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Google Maps ${screenId || ""}`;
    
    console.log("Creating Google Maps screen");
    
    // Create maps texture
    const mapsTexture = createMapsTexture();
    
    // Create the screen container
    const mapsScreen = enhancedCreateScreen(
        position,
        size,
        title,
        mapsTexture
    );
    
    // Add maps-specific identification data
    mapsScreen.userData = { 
        type: "screen",
        id: screenId,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: "maps"
    };
    
    // Add shadow for depth
    addDropShadow(mapsScreen, screenWidth, screenHeight);
    
    // Add Google Maps-branded border
    const borderGeometry = new THREE.PlaneGeometry(
        screenWidth + 0.02,
        screenHeight + 0.02
    );
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4285f4, // Google blue color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990;
    mapsScreen.add(borderPanel);
    
    // Set up drag handle
    const topBar = mapsScreen.children.find(
        (child) => child.userData && child.userData.type === "dragHandle"
    );
    
    if (topBar) {
        topBar.userData.screen = mapsScreen;
        mapsScreen.userData.dragHandle = topBar;
    }
    
    // Add entrance animation
    animateScreenEntrance(mapsScreen);
    
    console.log("Created Maps screen with ID:", mapsScreen.userData.id);
    
    return mapsScreen;
}

// Create a Google Maps texture simulating the maps interface
function createMapsTexture() {
    // Create a canvas for the maps display
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Create a loading message
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading Google Maps...', canvas.width / 2, canvas.height / 2);
    
    // Load Google Maps logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/maps.png';
    
    // Create Google Maps logo directly if the image isn't found
    logo.onerror = function() {
        console.warn("Google Maps logo image not found - creating a canvas version");
        
        // Create a temporary canvas for the logo
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 80;
        logoCanvas.height = 80;
        const logoCtx = logoCanvas.getContext('2d');
        
        // Draw pin shape
        logoCtx.fillStyle = '#EA4335'; // Google Maps red
        logoCtx.beginPath();
        logoCtx.arc(40, 30, 25, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Pin bottom part
        logoCtx.beginPath();
        logoCtx.moveTo(30, 30);
        logoCtx.lineTo(40, 70);
        logoCtx.lineTo(50, 30);
        logoCtx.fill();
        
        // Center of pin
        logoCtx.fillStyle = '#FFFFFF';
        logoCtx.beginPath();
        logoCtx.arc(40, 30, 10, 0, Math.PI * 2);
        logoCtx.fill();
        
        // Store the image data
        const logoImage = new Image();
        logoImage.src = logoCanvas.toDataURL();
        
        // Replace the original logo reference
        logo.src = logoImage.src;
    };
    
    // Create custom map tiles
    const mapTile = new Image();
    mapTile.src = 'examples/textures/ar_icons/map_texture.png';
    
    // Create a map texture directly if the image isn't found
    mapTile.onerror = function() {
        console.warn("Map texture image not found - creating a simple grid texture");
        
        // Create a temporary canvas for the tile
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = 256;
        tileCanvas.height = 256;
        const tileCtx = tileCanvas.getContext('2d');
        
        // Fill with light color
        tileCtx.fillStyle = '#EEEEEE';
        tileCtx.fillRect(0, 0, tileCanvas.width, tileCanvas.height);
        
        // Draw grid
        tileCtx.strokeStyle = '#DDDDDD';
        tileCtx.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 0; i <= tileCanvas.height; i += 32) {
            tileCtx.beginPath();
            tileCtx.moveTo(0, i);
            tileCtx.lineTo(tileCanvas.width, i);
            tileCtx.stroke();
        }
        
        // Vertical lines
        for (let i = 0; i <= tileCanvas.width; i += 32) {
            tileCtx.beginPath();
            tileCtx.moveTo(i, 0);
            tileCtx.lineTo(i, tileCanvas.height);
            tileCtx.stroke();
        }
        
        // Add a thicker line for main road
        tileCtx.strokeStyle = '#FFFFFF';
        tileCtx.lineWidth = 6;
        tileCtx.beginPath();
        tileCtx.moveTo(0, 128);
        tileCtx.lineTo(256, 128);
        tileCtx.stroke();
        
        tileCtx.beginPath();
        tileCtx.moveTo(128, 0);
        tileCtx.lineTo(128, 256);
        tileCtx.stroke();
        
        // Store the image data
        const tileImage = new Image();
        tileImage.src = tileCanvas.toDataURL();
        
        // Replace the original tile reference
        mapTile.src = tileImage.src;
    };
    
    // Draw logo on loading screen
    if (logo.complete) {
        const logoSize = 100;
        ctx.drawImage(
            logo, 
            canvas.width / 2 - logoSize / 2,
            canvas.height / 2 - logoSize - 20,
            logoSize, 
            logoSize
        );
    }
    
    // Create an iframe for Google Maps with satellite view enabled
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height - 60; // Allow space for controls
    iframe.src = 'https://www.google.com/maps/embed?pb=&maptype=satellite';
    iframe.id = `google-maps-${Date.now()}`;
    iframe.allow = "geolocation";
    iframe.frameBorder = "0";
    document.body.appendChild(iframe);
    
    // Add viewport meta tag for better mobile interactivity
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
    
    // Store the current view type (satellite or roadmap)
    let mapViewType = 'satellite';
    
    // Draw the maps interface with controls
    function drawMapsInterface() {
        // Clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw header bar
        ctx.fillStyle = '#4285F4'; // Google Maps blue
        ctx.fillRect(0, 0, canvas.width, 60);
        
        // Draw Google Maps logo
        if (logo.complete && logo.naturalWidth !== 0) {
            const logoHeight = 40;
            const logoWidth = logoHeight * (logo.naturalWidth / logo.naturalHeight);
            ctx.drawImage(logo, 10, 10, logoWidth, logoHeight);
        } else {
            // Draw "Maps" text if logo not available
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('Maps', 15, 30);
        }
        
        // Draw controls
        // Zoom controls
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#DDDDDD';
        ctx.lineWidth = 1;
        
        // Zoom in button
        ctx.beginPath();
        ctx.arc(canvas.width - 30, 30, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', canvas.width - 30, 30);
        
        // Zoom out button
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(canvas.width - 70, 30, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#333333';
        ctx.fillText('-', canvas.width - 70, 30);
        
        // View type toggle (Map/Satellite)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(canvas.width - 160, 15, 60, 30);
        ctx.strokeRect(canvas.width - 160, 15, 60, 30);
        
        ctx.fillStyle = mapViewType === 'satellite' ? '#4285F4' : '#333333';
        ctx.font = '12px Arial';
        ctx.fillText(mapViewType === 'satellite' ? 'SAT' : 'MAP', canvas.width - 130, 30);
        
        // Search bar
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(120, 15, canvas.width - 320, 30);
        ctx.strokeRect(120, 15, canvas.width - 320, 30);
        
        ctx.fillStyle = '#999999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Search Google Maps', 130, 30);
    }
    
    // Draw the initial interface
    drawMapsInterface();
    
    // Set up event listeners for the screen to interact with map controls
    mapsScreen.userData.screenInteractionHandlers = {
        onClick: function(point, intersects) {
            // Check if click is on the header area
            if (point.y < 60) {
                // Zoom in button
                const distToZoomIn = Math.sqrt(Math.pow(point.x - (canvas.width - 30), 2) + Math.pow(point.y - 30, 2));
                if (distToZoomIn < 16) {
                    console.log('Zoom in clicked');
                    // Would implement zoom functionality here
                    return true;
                }
                
                // Zoom out button
                const distToZoomOut = Math.sqrt(Math.pow(point.x - (canvas.width - 70), 2) + Math.pow(point.y - 30, 2));
                if (distToZoomOut < 16) {
                    console.log('Zoom out clicked');
                    // Would implement zoom functionality here
                    return true;
                }
                
                // View type toggle
                if (point.x > canvas.width - 160 && point.x < canvas.width - 100 && 
                    point.y > 15 && point.y < 45) {
                    mapViewType = mapViewType === 'satellite' ? 'roadmap' : 'satellite';
                    console.log('Map view changed to:', mapViewType);
                    
                    // Update iframe src with new maptype
                    iframe.src = `https://www.google.com/maps/embed?pb=&maptype=${mapViewType}`;
                    
                    // Redraw interface with updated state
                    drawMapsInterface();
                    texture.needsUpdate = true;
                    return true;
                }
                
                // Search bar
                if (point.x > 120 && point.x < canvas.width - 200 && 
                    point.y > 15 && point.y < 45) {
                    console.log('Search bar clicked');
                    // Would implement search functionality here
                    return true;
                }
            }
            
            // Forward interaction to iframe for map panning/zooming
            try {
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'mapInteraction',
                        event: {
                            type: 'click',
                            x: point.x,
                            y: point.y - 60 // Adjust for header
                        }
                    }, '*');
                }
            } catch (e) {
                console.warn('Unable to forward map interaction:', e);
            }
            
            return false;
        }
    };
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    // Draw captured content below controls
                    ctx.drawImage(renderedCanvas, 0, 60, canvas.width, canvas.height - 60);
                    
                    // Redraw the interface on top
                    drawMapsInterface();
                    
                    texture.needsUpdate = true;
                });
            } else {
                // Fallback message
                ctx.fillStyle = '#F8F9FA'; // Google Maps background color
                ctx.fillRect(0, 60, canvas.width, canvas.height - 60);
                
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Google Maps', canvas.width / 2, canvas.height / 2);
                ctx.font = '16px Arial';
                ctx.fillText('Tap to interact with the map', canvas.width / 2, canvas.height / 2 + 40);
                
                // Redraw interface
                drawMapsInterface();
                
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
            console.log('html2canvas loaded for Google Maps');
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
        isMaps: true,
        iframe: iframe,
        canvas: canvas,
        ctx: ctx,
        controls: iframe,
        updateInterval: updateInterval,
        
        // Search for location
        searchLocation: function(query) {
            if (query) {
                iframe.src = `https://www.google.com/maps/embed/v1/search?q=${encodeURIComponent(query)}&key=YOUR_API_KEY`;
            }
        },
        
        // Dispose resources
        dispose: function() {
            clearInterval(updateInterval);
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }
    };
    
    return texture;
} 