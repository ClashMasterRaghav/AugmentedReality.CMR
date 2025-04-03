// Browser screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen } from "./ar_screens.js";
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
    
    // Load DuckDuckGo logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/DuckDuckGo_logo.png';
    
    // Draw initial browser
    function drawBrowser() {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Browser chrome
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(0, 0, canvas.width, 60);
        
        // URL bar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(80, 15, canvas.width - 160, 30);
        
        // URL bar border
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(80, 15, canvas.width - 160, 30);
        
        // URL text
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(url, 90, 30);
        
        // Browser buttons (back, forward, refresh)
        ctx.fillStyle = '#555555';
        
        // Back button
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.lineTo(45, 20);
        ctx.lineTo(45, 40);
        ctx.closePath();
        ctx.fill();
        
        // Forward button
        ctx.beginPath();
        ctx.moveTo(60, 30);
        ctx.lineTo(45, 20);
        ctx.lineTo(45, 40);
        ctx.closePath();
        ctx.fill();
        
        // Refresh button
        ctx.beginPath();
        ctx.arc(canvas.width - 110, 30, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvas.width - 110, 30, 5, 0, Math.PI * 1.5);
        ctx.stroke();
        
        // Browser content area
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 60, canvas.width, canvas.height - 60);
        
        // Draw DuckDuckGo logo if loaded
        if (logo.complete) {
            const logoWidth = 250;
            const logoHeight = 125;
            ctx.drawImage(
                logo, 
                canvas.width / 2 - logoWidth / 2,
                150,
                logoWidth, 
                logoHeight
            );
        } else {
            // Placeholder for logo
            ctx.fillStyle = '#DE5833';
            ctx.fillRect(
                canvas.width / 2 - 125,
                150,
                250, 
                125
            );
        }
        
        // Search bar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(canvas.width / 2 - 200, 320, 400, 50);
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvas.width / 2 - 200, 320, 400, 50);
        
        // Search icon
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(canvas.width / 2 - 170, 345, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 165, 350);
        ctx.lineTo(canvas.width / 2 - 155, 360);
        ctx.stroke();
        
        // Search text placeholder
        ctx.fillStyle = '#888888';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Search the web without being tracked', canvas.width / 2 - 150, 345);
        
        // Privacy info
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Privacy, simplified.', canvas.width / 2, 400);
        
        ctx.fillStyle = '#666666';
        ctx.font = '14px Arial';
        ctx.fillText('Add DuckDuckGo Privacy Essentials to your browser.', canvas.width / 2, 430);
        
        // Add browser features list
        const features = [
            'Block Trackers',
            'Secure Browsing',
            'Private Search',
            'Force Encryption'
        ];
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333333';
        
        features.forEach((feature, index) => {
            const x = canvas.width / 2 - 300 + index * 200;
            const y = 500;
            
            // Feature icon (circle)
            ctx.fillStyle = '#58B792';
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Check mark
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.fillText('✓', x, y);
            
            // Feature text
            ctx.fillStyle = '#333333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(feature, x, y + 30);
        });
    }
    
    // Draw browser initially
    drawBrowser();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Add metadata
    texture.userData = {
        isBrowser: true,
        url: url,
        canvas: canvas,
        ctx: ctx
    };
    
    return texture;
} 