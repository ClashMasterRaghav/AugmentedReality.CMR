// YouTube screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen, screens } from "./ar_screens.js";
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from "./ar_default_screen.js";

// Create a YouTube screen with embedded video player
export function createYouTubeScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `YouTube ${screenId || ""}`;
    
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
    // Create a canvas element to render iframe content
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Create an invisible iframe to load YouTube embed
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height;
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&enablejsapi=1`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.frameBorder = "0";
    iframe.id = `youtube-player-${Date.now()}`;
    document.body.appendChild(iframe);
    
    // Initial blank state with loading message
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading YouTube video...', canvas.width / 2, canvas.height / 2);
    
    // YouTube logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/youtube.png';
    
    // Create YouTube logo directly if the image isn't found
    logo.onerror = function() {
        console.warn("YouTube logo image not found - creating a canvas version");
        
        // Create a temporary canvas for the logo
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 200;
        logoCanvas.height = 100;
        const logoCtx = logoCanvas.getContext('2d');
        
        // Draw red box with rounded corners
        logoCtx.fillStyle = '#FF0000'; // YouTube red
        logoCtx.beginPath();
        roundedRect(logoCtx, 0, 0, 200, 70, 20);
        logoCtx.fill();
        
        // Draw play button triangle
        logoCtx.fillStyle = '#FFFFFF';
        logoCtx.beginPath();
        logoCtx.moveTo(85, 15);
        logoCtx.lineTo(85, 55);
        logoCtx.lineTo(130, 35);
        logoCtx.closePath();
        logoCtx.fill();
        
        // Draw "YouTube" text
        logoCtx.fillStyle = '#FFFFFF';
        logoCtx.font = 'bold 24px Arial';
        logoCtx.textAlign = 'left';
        logoCtx.textBaseline = 'middle';
        logoCtx.fillText('YouTube', 40, 85);
        
        // Helper function for rounded rectangle
        function roundedRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }
        
        // Store the image data
        const logoImage = new Image();
        logoImage.src = logoCanvas.toDataURL();
        
        // Replace the original logo reference
        logo.src = logoImage.src;
    };
    
    // Initial draw with YouTube logo
    if (logo.complete) {
        const logoWidth = 200;
        const logoHeight = 100;
        ctx.drawImage(
            logo, 
            canvas.width / 2 - logoWidth / 2,
            canvas.height / 2 - logoHeight / 2 - 50,
            logoWidth, 
            logoHeight
        );
    }
    
    // Add a play button overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 15, canvas.height / 2 - 25);
    ctx.lineTo(canvas.width / 2 - 15, canvas.height / 2 + 25);
    ctx.lineTo(canvas.width / 2 + 25, canvas.height / 2);
    ctx.closePath();
    ctx.fill();
    
    // Create a DOM element for YouTube iframe controls
    const youtubeControls = document.createElement('div');
    youtubeControls.style.position = 'absolute';
    youtubeControls.style.left = '-9999px';
    youtubeControls.style.top = '-9999px';
    youtubeControls.style.width = '300px';
    youtubeControls.style.background = 'rgba(0,0,0,0.7)';
    youtubeControls.style.borderRadius = '5px';
    youtubeControls.style.padding = '10px';
    youtubeControls.style.display = 'flex';
    youtubeControls.style.justifyContent = 'space-between';
    
    const playButton = document.createElement('button');
    playButton.textContent = 'Play';
    playButton.style.backgroundColor = '#FF0000';
    playButton.style.color = '#FFFFFF';
    playButton.style.border = 'none';
    playButton.style.padding = '5px 10px';
    playButton.style.borderRadius = '3px';
    
    const pauseButton = document.createElement('button');
    pauseButton.textContent = 'Pause';
    pauseButton.style.backgroundColor = '#666666';
    pauseButton.style.color = '#FFFFFF';
    pauseButton.style.border = 'none';
    pauseButton.style.padding = '5px 10px';
    pauseButton.style.borderRadius = '3px';
    
    const muteButton = document.createElement('button');
    muteButton.textContent = 'Mute';
    muteButton.style.backgroundColor = '#444444';
    muteButton.style.color = '#FFFFFF';
    muteButton.style.border = 'none';
    muteButton.style.padding = '5px 10px';
    muteButton.style.borderRadius = '3px';
    
    youtubeControls.appendChild(playButton);
    youtubeControls.appendChild(pauseButton);
    youtubeControls.appendChild(muteButton);
    document.body.appendChild(youtubeControls);
    
    // Setup YouTube API
    let player = null;
    let isPlaying = false;
    
    // Add YouTube API script if not already added
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = function() {
            setupYouTubePlayer();
        };
    } else {
        setupYouTubePlayer();
    }
    
    function setupYouTubePlayer() {
        player = new YT.Player(iframe.id, {
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
    
    function onPlayerReady(event) {
        console.log('YouTube player ready');
        
        // Setup button event listeners
        playButton.addEventListener('click', function() {
            player.playVideo();
        });
        
        pauseButton.addEventListener('click', function() {
            player.pauseVideo();
        });
        
        muteButton.addEventListener('click', function() {
            if (player.isMuted()) {
                player.unMute();
                muteButton.textContent = 'Mute';
            } else {
                player.mute();
                muteButton.textContent = 'Unmute';
            }
        });
    }
    
    function onPlayerStateChange(event) {
        switch(event.data) {
            case YT.PlayerState.PLAYING:
                isPlaying = true;
                break;
            case YT.PlayerState.PAUSED:
            case YT.PlayerState.ENDED:
                isPlaying = false;
                break;
        }
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Add properties and methods to the texture
    texture.userData = {
        isYouTube: true,
        videoId: videoId,
        iframe: iframe,
        canvas: canvas,
        player: player,
        isPlaying: false,
        controls: youtubeControls,
        
        // Methods to control video
        playVideo: function() {
            if (player && player.playVideo) {
                player.playVideo();
            }
        },
        
        pauseVideo: function() {
            if (player && player.pauseVideo) {
                player.pauseVideo();
            }
        },
        
        togglePlayback: function() {
            if (!player) return;
            
            if (this.isPlaying) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
        },
        
        // Cleanup resources
        dispose: function() {
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            if (youtubeControls && youtubeControls.parentNode) {
                youtubeControls.parentNode.removeChild(youtubeControls);
            }
        },
        
        // Method to handle click interactions
        onClick: function(x, y) {
            // Central play/pause button area
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            
            if (distance < 50) {
                // Clicked on the center play button
                this.togglePlayback();
                return true;
            }
            
            // Volume control area (bottom right)
            if (x > canvas.width - 100 && y > canvas.height - 50) {
                if (player && player.isMuted) {
                    if (player.isMuted()) {
                        player.unMute();
                    } else {
                        player.mute();
                    }
                }
                return true;
            }
            
            return false;
        }
    };
    
    return texture;
} 