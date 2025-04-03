// Maps screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen } from "./ar_screens.js";
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
    // Use canvas to simulate Google Maps
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Load Google Maps logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/maps.png';
    
    // Create custom map tiles
    const mapTile = new Image();
    mapTile.src = 'examples/textures/ar_icons/map_texture.png';
    
    // Draw initial maps view
    function drawMapsInterface() {
        // Draw base map (light gray)
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw map grid pattern
        if (mapTile.complete) {
            // Create pattern from the map tile
            const pattern = ctx.createPattern(mapTile, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            // Draw placeholder map grid
            ctx.fillStyle = '#e8e8e8';
            
            // Major roads
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(100, 150, canvas.width - 200, 40);
            ctx.fillRect(200, 0, 40, canvas.height);
            
            // Minor roads
            ctx.fillStyle = '#f0f0f0';
            for (let i = 0; i < 10; i++) {
                // Horizontal roads
                ctx.fillRect(0, 100 + i * 70, canvas.width, 20);
                // Vertical roads
                ctx.fillRect(100 + i * 70, 0, 20, canvas.height);
            }
            
            // Draw some buildings
            ctx.fillStyle = '#e0e0e0';
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const width = 30 + Math.random() * 50;
                const height = 30 + Math.random() * 50;
                ctx.fillRect(x, y, width, height);
            }
        }
        
        // Draw Google Maps UI elements
        
        // Top search bar
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.fillRect(20, 20, canvas.width - 40, 50);
        ctx.shadowColor = 'transparent';
        
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
        } else {
            // Placeholder Google Maps logo
            ctx.fillStyle = '#4285f4';
            ctx.beginPath();
            ctx.arc(50, canvas.height - 60, 30, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('G', 50, canvas.height - 60);
        }
        
        // Draw scale bar
        ctx.fillStyle = '#333333';
        ctx.fillRect(30, canvas.height - 30, 100, 5);
        
        ctx.fillStyle = '#333333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('500 m', 80, canvas.height - 40);
        
        // Draw search placeholder in the search bar
        ctx.fillStyle = '#888888';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Search Google Maps', 40, 45);
        
        // Draw magnifying glass icon
        ctx.beginPath();
        ctx.arc(canvas.width - 50, 45, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(canvas.width - 42, 52);
        ctx.lineTo(canvas.width - 35, 60);
        ctx.stroke();
        
        // Draw a marker pin in the center
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
        
        // Add location info panel at the bottom
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = -2;
        ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
        ctx.shadowColor = 'transparent';
        
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Mountain View, CA', 20, canvas.height - 170);
        
        ctx.fillStyle = '#666666';
        ctx.font = '14px Arial';
        ctx.fillText('Google Headquarters', 20, canvas.height - 145);
        
        // Directions button
        ctx.fillStyle = '#4285f4';
        ctx.fillRect(20, canvas.height - 120, 150, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Directions', 95, canvas.height - 100);
        
        // Save button
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4285f4';
        ctx.lineWidth = 2;
        ctx.strokeRect(190, canvas.height - 120, 100, 40);
        ctx.fillStyle = '#4285f4';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Save', 240, canvas.height - 100);
        
        // Share button
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4285f4';
        ctx.strokeRect(310, canvas.height - 120, 100, 40);
        ctx.fillStyle = '#4285f4';
        ctx.fillText('Share', 360, canvas.height - 100);
    }
    
    // Draw initial maps view
    drawMapsInterface();
    
    // Create animation variables for panning effect
    let animationId;
    let panOffsetX = 0;
    let panOffsetY = 0;
    let panDirectionX = 1;
    let panDirectionY = 1;
    
    // Simulate subtle map panning
    function updateMapsView() {
        // Update pan offsets
        panOffsetX += 0.1 * panDirectionX;
        panOffsetY += 0.05 * panDirectionY;
        
        // Reverse direction at boundaries
        if (Math.abs(panOffsetX) > 50) {
            panDirectionX *= -1;
        }
        
        if (Math.abs(panOffsetY) > 30) {
            panDirectionY *= -1;
        }
        
        // Redraw with updated offsets
        ctx.save();
        ctx.translate(panOffsetX, panOffsetY);
        drawMapsInterface();
        ctx.restore();
        
        // Continue animation
        animationId = requestAnimationFrame(updateMapsView);
    }
    
    // Start animation
    animationId = requestAnimationFrame(updateMapsView);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Add metadata
    texture.userData = {
        isMaps: true,
        canvas: canvas,
        ctx: ctx,
        animationId: animationId
    };
    
    return texture;
} 