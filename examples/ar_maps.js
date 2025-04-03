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
    
    // Create an iframe for Google Maps
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height;
    // Use proper Google Maps embed URL - an actual map location
    iframe.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.482669885054!2d-122.08400706868343!3d37.42214076844029!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808fba02425dad8f%3A0x715f435f946a95a8!2sGoogle!5e0!3m2!1sen!2sus!4v1696534256356!5m2!1sen!2sus';
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone";
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";
    iframe.id = `maps-frame-${Date.now()}`;
    document.body.appendChild(iframe);
    
    // Add viewport meta tag for better mobile experience
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
    
    // Create map controls
    const mapControls = document.createElement('div');
    mapControls.style.position = 'absolute';
    mapControls.style.left = '-9999px';
    mapControls.style.top = '-9999px';
    mapControls.style.width = '300px';
    mapControls.style.background = 'rgba(255,255,255,0.9)';
    mapControls.style.borderRadius = '5px';
    mapControls.style.padding = '10px';
    mapControls.style.display = 'flex';
    mapControls.style.justifyContent = 'space-between';
    
    // Add zoom controls
    const zoomInButton = document.createElement('button');
    zoomInButton.textContent = '+';
    zoomInButton.style.backgroundColor = '#4285f4';
    zoomInButton.style.color = '#FFFFFF';
    zoomInButton.style.border = 'none';
    zoomInButton.style.padding = '5px 10px';
    zoomInButton.style.borderRadius = '3px';
    zoomInButton.style.fontWeight = 'bold';
    
    const zoomOutButton = document.createElement('button');
    zoomOutButton.textContent = '-';
    zoomOutButton.style.backgroundColor = '#4285f4';
    zoomOutButton.style.color = '#FFFFFF';
    zoomOutButton.style.border = 'none';
    zoomOutButton.style.padding = '5px 10px';
    zoomOutButton.style.borderRadius = '3px';
    zoomOutButton.style.fontWeight = 'bold';
    
    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search Google Maps';
    searchInput.style.flex = '1';
    searchInput.style.marginLeft = '10px';
    searchInput.style.marginRight = '10px';
    searchInput.style.padding = '5px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '3px';
    
    mapControls.appendChild(zoomOutButton);
    mapControls.appendChild(searchInput);
    mapControls.appendChild(zoomInButton);
    document.body.appendChild(mapControls);
    
    // Try to forward user interactions to the iframe
    function forwardInteraction(event) {
        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'interaction',
                    event: {
                        type: event.type,
                        x: event.clientX,
                        y: event.clientY,
                        deltaY: event.deltaY // For zoom
                    }
                }, '*');
            }
        } catch (e) {
            console.warn('Unable to forward interaction to maps:', e);
        }
    }
    
    // Add interaction handlers
    zoomInButton.addEventListener('click', function() {
        forwardInteraction({
            type: 'zoom',
            deltaY: -100 // Negative for zoom in
        });
        
        // Also try direct embedding interaction
        try {
            if (iframe.contentWindow && iframe.contentWindow.google && iframe.contentWindow.google.maps) {
                const map = iframe.contentWindow.google.maps.Map;
                const zoom = map.getZoom();
                map.setZoom(zoom + 1);
            }
        } catch (e) {
            console.warn('Could not programmatically zoom map:', e);
        }
    });
    
    zoomOutButton.addEventListener('click', function() {
        forwardInteraction({
            type: 'zoom',
            deltaY: 100 // Positive for zoom out
        });
        
        // Also try direct embedding interaction
        try {
            if (iframe.contentWindow && iframe.contentWindow.google && iframe.contentWindow.google.maps) {
                const map = iframe.contentWindow.google.maps.Map;
                const zoom = map.getZoom();
                map.setZoom(zoom - 1);
            }
        } catch (e) {
            console.warn('Could not programmatically zoom map:', e);
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value;
            if (searchTerm.trim()) {
                // Update the iframe URL with the search term
                iframe.src = `https://www.google.com/maps/embed/v1/search?q=${encodeURIComponent(searchTerm)}&key=YOUR_API_KEY_IF_NEEDED`;
            }
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
                // Fallback method - show a map placeholder with controls
                if (mapTile.complete) {
                    // Create pattern from the map tile
                    const pattern = ctx.createPattern(mapTile, 'repeat');
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    // Draw placeholder map grid
                    ctx.fillStyle = '#f2f2f2';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw grid lines
                    ctx.strokeStyle = '#e0e0e0';
                    ctx.lineWidth = 1;
                    
                    // Draw grid
                    for (let i = 0; i < canvas.width; i += 50) {
                        ctx.beginPath();
                        ctx.moveTo(i, 0);
                        ctx.lineTo(i, canvas.height);
                        ctx.stroke();
                    }
                    
                    for (let i = 0; i < canvas.height; i += 50) {
                        ctx.beginPath();
                        ctx.moveTo(0, i);
                        ctx.lineTo(canvas.width, i);
                        ctx.stroke();
                    }
                }
                
                // Add Google Maps UI elements
                
                // Top search bar
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;
                ctx.fillRect(20, 20, canvas.width - 40, 50);
                ctx.shadowColor = 'transparent';
                
                // Search text
                ctx.fillStyle = '#888888';
                ctx.font = '16px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('Search Google Maps', 40, 45);
                
                // Zoom controls
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;
                ctx.fillRect(canvas.width - 70, 100, 50, 120);
                ctx.shadowColor = 'transparent';
                
                // Plus and minus symbols
                ctx.fillStyle = '#666666';
                ctx.fillRect(canvas.width - 55, 115, 20, 5);
                ctx.fillRect(canvas.width - 47.5, 107.5, 5, 20);
                ctx.fillRect(canvas.width - 55, 200, 20, 5);
                
                // Draw Google Maps logo
                if (logo.complete) {
                    const logoWidth = 80;
                    const logoHeight = 80;
                    ctx.drawImage(
                        logo, 
                        30, 
                        canvas.height - 100,
                        logoWidth, 
                        logoHeight
                    );
                }
                
                // Draw center pin
                ctx.fillStyle = '#EA4335'; // Google Maps red color
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2);
                ctx.lineTo(canvas.width / 2, canvas.height / 2 + 20);
                ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Text informational message
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Google Maps', canvas.width / 2, canvas.height / 2 + 60);
                ctx.font = '14px Arial';
                ctx.fillText('Tap the screen to interact with the map', canvas.width / 2, canvas.height / 2 + 90);
                
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
        controls: mapControls,
        updateInterval: updateInterval,
        
        // Handle click interactions on the maps screen
        onClick: function(x, y) {
            // If click is in the title bar area, don't forward
            if (y < 40) {
                return false;
            }
            
            // Try to forward the click to the map
            forwardInteraction({
                type: 'click',
                clientX: x,
                clientY: y
            });
            
            // Always return true to indicate handling the click
            return true;
        },
        
        // Handle dragging on the map
        onDrag: function(startX, startY, endX, endY) {
            // If drag is in the title bar area, don't forward
            if (startY < 40) {
                return false;
            }
            
            // Try to forward the drag to the map
            forwardInteraction({
                type: 'drag',
                clientX: endX,
                clientY: endY,
                startX: startX,
                startY: startY
            });
            
            return true;
        },
        
        // Handle pinch for zooming
        onPinch: function(scale) {
            forwardInteraction({
                type: 'zoom',
                deltaY: scale > 1 ? -100 : 100 // Negative for zoom in, positive for zoom out
            });
            return true;
        },
        
        // Search for location
        searchLocation: function(query) {
            if (query) {
                iframe.src = `https://www.google.com/maps/embed/v1/search?q=${encodeURIComponent(query)}&key=AIzaSyBkd9sIQSK_Xv5awQ3mruSUP0RRcRDX-yo`;
                searchInput.value = query;
            }
        },
        
        // Dispose resources
        dispose: function() {
            clearInterval(updateInterval);
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            if (mapControls && mapControls.parentNode) {
                mapControls.parentNode.removeChild(mapControls);
            }
        }
    };
    
    return texture;
} 