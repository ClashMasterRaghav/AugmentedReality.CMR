// YouTube screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen } from "./ar_screens.js";
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from "./ar_default_screen.js";

// Create a YouTube screen with embedded video player
export function createYouTubeScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `YouTube ${screenId || screens.length + 1}`;
    
    console.log("Creating YouTube screen with embedded video");
    
    // Create a YouTube texture using a sample video ID
    const youtubeTexture = createYouTubeVideoTexture("Myrr9vA7j5A");
    
    // Create the screen container using shared functionality
    const youtubeScreen = enhancedCreateScreen(
        position,
        size,
        title,
        youtubeTexture
    );
    
    // Add YouTube-specific identification data
    youtubeScreen.userData = { 
        type: "screen",
        id: screenId,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: "youtube"
    };
    
    // Add shadow for depth
    addDropShadow(youtubeScreen, screenWidth, screenHeight);
    
    // Add YouTube-branded border
    const borderGeometry = new THREE.PlaneGeometry(
        screenWidth + 0.02,
        screenHeight + 0.02
    );
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xe62117, // YouTube red color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990; // Ensure it's behind the content
    youtubeScreen.add(borderPanel);
    
    // Set up drag handle
    const topBar = youtubeScreen.children.find(
        (child) => child.userData && child.userData.type === "dragHandle"
    );
    
    if (topBar) {
        topBar.userData.screen = youtubeScreen;
        youtubeScreen.userData.dragHandle = topBar;
    }
    
    // Add entrance animation
    animateScreenEntrance(youtubeScreen);
    
    console.log("Created YouTube screen with ID:", youtubeScreen.userData.id);
    
    return youtubeScreen;
}

// Create a YouTube video texture with interactive player
function createYouTubeVideoTexture(videoId) {
    // Use canvas to simulate YouTube player
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // YouTube logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/youtube.png';
    
    // YouTube colors
    const youtubeRed = '#FF0000';
    const youtubeDarkRed = '#CC0000';
    
    // Draw initial state
    function drawYouTubePlayer() {
        // Black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw player area (dark gray)
        ctx.fillStyle = '#0F0F0F';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw YouTube logo if loaded
        if (logo.complete) {
            const logoWidth = 200;
            const logoHeight = 100;
            ctx.drawImage(
                logo, 
                canvas.width / 2 - logoWidth / 2,
                canvas.height / 2 - logoHeight / 2,
                logoWidth, 
                logoHeight
            );
        } else {
            // Placeholder for logo
            ctx.fillStyle = youtubeRed;
            ctx.fillRect(
                canvas.width / 2 - 100,
                canvas.height / 2 - 50,
                200, 
                100
            );
        }
        
        // Draw video title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Sample YouTube Video", canvas.width / 2, canvas.height / 2 + 100);
        
        // Draw player controls at bottom
        ctx.fillStyle = '#282828';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        
        // Draw play button
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(30, canvas.height - 25 - 10);
        ctx.lineTo(30, canvas.height - 25 + 10);
        ctx.lineTo(50, canvas.height - 25);
        ctx.closePath();
        ctx.fill();
        
        // Draw progress bar
        ctx.fillStyle = '#636363';
        ctx.fillRect(70, canvas.height - 25, canvas.width - 140, 5);
        ctx.fillStyle = youtubeRed;
        ctx.fillRect(70, canvas.height - 25, (canvas.width - 140) * 0.3, 5);
        
        // Draw volume icon
        ctx.beginPath();
        ctx.moveTo(canvas.width - 50, canvas.height - 30);
        ctx.lineTo(canvas.width - 40, canvas.height - 30);
        ctx.lineTo(canvas.width - 30, canvas.height - 40);
        ctx.lineTo(canvas.width - 30, canvas.height - 10);
        ctx.lineTo(canvas.width - 40, canvas.height - 20);
        ctx.lineTo(canvas.width - 50, canvas.height - 20);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw initial player
    drawYouTubePlayer();
    
    // Create canvas animation loop
    let animationId;
    let progress = 0;
    
    function updateCanvas() {
        // Update progress
        progress += 0.0005;
        if (progress > 1) progress = 0;
        
        // Redraw player with updated progress
        ctx.fillStyle = '#282828';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        
        // Draw play button
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(30, canvas.height - 25 - 10);
        ctx.lineTo(30, canvas.height - 25 + 10);
        ctx.lineTo(50, canvas.height - 25);
        ctx.closePath();
        ctx.fill();
        
        // Draw progress bar
        ctx.fillStyle = '#636363';
        ctx.fillRect(70, canvas.height - 25, canvas.width - 140, 5);
        ctx.fillStyle = youtubeRed;
        ctx.fillRect(70, canvas.height - 25, (canvas.width - 140) * progress, 5);
        
        // Draw volume icon
        ctx.beginPath();
        ctx.moveTo(canvas.width - 50, canvas.height - 30);
        ctx.lineTo(canvas.width - 40, canvas.height - 30);
        ctx.lineTo(canvas.width - 30, canvas.height - 40);
        ctx.lineTo(canvas.width - 30, canvas.height - 10);
        ctx.lineTo(canvas.width - 40, canvas.height - 20);
        ctx.lineTo(canvas.width - 50, canvas.height - 20);
        ctx.closePath();
        ctx.fill();
        
        // Request next frame
        animationId = requestAnimationFrame(updateCanvas);
    }
    
    // Start animation
    animationId = requestAnimationFrame(updateCanvas);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Add functions and metadata to texture
    texture.userData = {
        isYouTube: true,
        videoId: videoId,
        canvas: canvas,
        ctx: ctx,
        animationId: animationId,
        onClick: () => {
            // Simulate opening YouTube video in new window
            const url = `https://www.youtube.com/watch?v=${videoId}`;
            window.open(url, '_blank');
        }
    };
    
    // Update texture on animation frame
    texture.update = function() {
        this.needsUpdate = true;
    };
    
    return texture;
} 