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
    
    // Create an iframe for Google Maps - with a specific location embedded
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height - 40; // Account for the title bar
    
    // Use Google Maps embed with an API key (if available, otherwise default to a simple embed)
    // In a real app, you should use your own Google Maps API key
    const mapsAPIKey = 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg'; // This is a placeholder - replace with your own key
    iframe.src = `https://www.google.com/maps/embed/v1/place?key=${mapsAPIKey}&q=Googleplex`;
    
    // Fallback if the API key is not valid
    iframe.onerror = function() {
        iframe.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3168.639290621105!2d-122.08529!3d37.423!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDI1JzIyLjgiTiAxMjLCsDA1JzA3LjAiVw!5e0!3m2!1sen!2sus!4v1635357774300!5m2!1sen!2sus';
    };
    
    iframe.frameBorder = "0";
    iframe.allowFullscreen = true;
    iframe.id = `maps-frame-${Date.now()}`;
    iframe.allow = "geolocation";
    document.body.appendChild(iframe);
    
    // Add metadata tag to make maps more mobile friendly
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
    
    // Create map controls for zoom and search
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
            let mapEvent;
            if (event.type === 'click') {
                mapEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: event.x,
                    clientY: event.y - 40 // Adjust for title bar
                });
            } else if (event.type === 'drag') {
                // For drag, we'll send both mousedown and mousemove
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
            } else if (event.type === 'pinch') {
                // Handle pinch to zoom - simulate wheel event
                const wheelEvent = new WheelEvent('wheel', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: event.x,
                    clientY: event.y - 40,
                    deltaY: event.scale > 1 ? -100 : 100 // Negative is zoom in
                });
                
                if (iframe.contentDocument) {
                    iframe.contentDocument.elementFromPoint(event.x, event.y - 40)?.dispatchEvent(wheelEvent);
                }
            }
            
            // For simple click events
            if (event.type === 'click' && iframe.contentDocument) {
                const element = iframe.contentDocument.elementFromPoint(event.x, event.y - 40);
                if (element) element.dispatchEvent(mapEvent);
            }
            
            // Return iframe to its original position
            iframe.style.position = originalPosition;
            iframe.style.left = originalLeft;
            iframe.style.top = originalTop;
            
            return true;
        } catch (e) {
            console.error('Error forwarding interaction to Maps iframe:', e);
            return false;
        }
    }
    
    // Set up button functionality
    zoomInButton.addEventListener('click', function() {
        // Create and forward a zoom in wheel event
        forwardInteraction({
            type: 'pinch',
            x: canvas.width / 2,
            y: canvas.height / 2,
            scale: 1.5 // Zoom in
        });
    });
    
    zoomOutButton.addEventListener('click', function() {
        // Create and forward a zoom out wheel event
        forwardInteraction({
            type: 'pinch',
            x: canvas.width / 2,
            y: canvas.height / 2,
            scale: 0.5 // Zoom out
        });
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                // Update iframe src with search query
                iframe.src = `https://www.google.com/maps/embed/v1/search?key=${mapsAPIKey}&q=${encodeURIComponent(query)}`;
                
                // If we're capturing to canvas, update it
                captureIframeToTexture();
            }
        }
    });
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    // Clear the canvas and draw the title bar
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawMapsUI();
                    
                    // Draw the captured iframe content below the title bar
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    texture.needsUpdate = true;
                });
            } else {
                // Fallback - draw a static maps interface
                ctx.fillStyle = '#f2f2f2';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the Maps UI
                drawMapsUI();
                
                texture.needsUpdate = true;
            }
        } catch (e) {
            console.warn('Error capturing iframe content:', e);
        }
    }
    
    // Function to draw Maps UI elements
    function drawMapsUI() {
        // Draw the Maps UI header
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // Draw top border line
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(canvas.width, 40);
        ctx.stroke();
        
        // Add Google Maps logo
        if (logo.complete) {
            ctx.drawImage(logo, 10, 5, 30, 30);
        }
        
        // Add title text
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Google Maps', 50, 20);
        
        // Add search box
        ctx.fillStyle = '#f1f1f1';
        ctx.fillRect(canvas.width - 300, 5, 290, 30);
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(canvas.width - 300, 5, 290, 30);
        
        // Add search text
        ctx.fillStyle = '#888888';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Search Google Maps', canvas.width - 280, 20);
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
    
    // Update texture periodically
    const updateInterval = setInterval(captureIframeToTexture, 1000);
    
    // Add metadata and methods
    texture.userData = {
        isMaps: true,
        iframe: iframe,
        canvas: canvas,
        ctx: ctx,
        controls: mapControls,
        updateInterval: updateInterval,
        
        // Handle click interaction
        onClick: function(x, y) {
            // If click is in the title bar, don't forward to iframe
            if (y < 40) return false;
            
            return forwardInteraction({
                type: 'click',
                x: x,
                y: y
            });
        },
        
        // Handle drag interaction
        onDrag: function(startX, startY, endX, endY) {
            // If drag starts in title bar, don't forward to iframe
            if (startY < 40) return false;
            
            return forwardInteraction({
                type: 'drag',
                startX: startX,
                startY: startY,
                x: endX,
                y: endY
            });
        },
        
        // Handle pinch (zoom) interaction
        onPinch: function(x, y, scale) {
            // If pinch is in title bar, don't forward to iframe
            if (y < 40) return false;
            
            return forwardInteraction({
                type: 'pinch',
                x: x,
                y: y,
                scale: scale
            });
        },
        
        // Search for location
        searchLocation: function(query) {
            if (query) {
                // Use a proper API key for your application
                iframe.src = `https://www.google.com/maps/embed/v1/search?key=${mapsAPIKey}&q=${encodeURIComponent(query)}`;
                searchInput.value = query;
                captureIframeToTexture();
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
            if (viewportMeta && viewportMeta.parentNode) {
                viewportMeta.parentNode.removeChild(viewportMeta);
            }
        }
    };
    
    return texture;
} 