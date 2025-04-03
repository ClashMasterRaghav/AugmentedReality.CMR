// YouTube screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
// Remove circular dependency
// import { selectScreen, screens } from "./ar_screens.js";
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
    iframe.height = canvas.height - 40; // Account for top bar
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&enablejsapi=1`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone";
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
    
    // Search input for YouTube
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search YouTube...';
    searchInput.style.flex = '1';
    searchInput.style.marginLeft = '10px';
    searchInput.style.marginRight = '10px';
    searchInput.style.padding = '5px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '3px';
    
    // Search button
    const searchButton = document.createElement('button');
    searchButton.textContent = 'Search';
    searchButton.style.backgroundColor = '#FF0000';
    searchButton.style.color = '#FFFFFF';
    searchButton.style.border = 'none';
    searchButton.style.padding = '5px 10px';
    searchButton.style.borderRadius = '3px';
    
    // Add first row of controls - playback
    const playbackControls = document.createElement('div');
    playbackControls.style.display = 'flex';
    playbackControls.style.justifyContent = 'space-between';
    playbackControls.style.marginBottom = '10px';
    playbackControls.appendChild(playButton);
    playbackControls.appendChild(pauseButton);
    playbackControls.appendChild(muteButton);
    
    // Add second row - search
    const searchControls = document.createElement('div');
    searchControls.style.display = 'flex';
    searchControls.appendChild(searchInput);
    searchControls.appendChild(searchButton);
    
    // Add both rows to controls
    youtubeControls.appendChild(playbackControls);
    youtubeControls.appendChild(searchControls);
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
        
        // Setup search functionality
        searchButton.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query) {
                // Use YouTube search as the iframe source
                iframe.src = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                
                // Reset player since we've changed the iframe source
                setTimeout(setupYouTubePlayer, 500);
            }
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
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
    
    // Function to draw YouTube UI
    function drawYouTubeUI() {
        // Draw YouTube-styled toolbar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // YouTube logo
        if (logo.complete) {
            const logoWidth = 80;
            const logoHeight = 40;
            ctx.drawImage(
                logo, 
                10,
                0,
                logoWidth, 
                logoHeight
            );
        } else {
            // Fallback YouTube text
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('YouTube', 20, 20);
        }
        
        // Search bar
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(120, 8, canvas.width - 300, 24);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.strokeRect(120, 8, canvas.width - 300, 24);
        
        // Search icon
        ctx.fillStyle = '#999999';
        ctx.beginPath();
        ctx.arc(130, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(135, 25);
        ctx.lineTo(140, 30);
        ctx.stroke();
        
        // Search text placeholder
        ctx.fillStyle = '#999999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Search YouTube', 145, 20);
        
        // User icon (circle)
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(canvas.width - 20, 20, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('U', canvas.width - 20, 20);
    }
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    // Clear content area and draw iframe content
                    ctx.clearRect(0, 40, canvas.width, canvas.height - 40);
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    
                    // Redraw YouTube UI
                    drawYouTubeUI();
                    
                    texture.needsUpdate = true;
                });
            } else {
                // Draw a placeholder YouTube interface
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 40, canvas.width, canvas.height - 40);
                
                // Draw YouTube UI
                drawYouTubeUI();
                
                // Show a message about interacting
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('YouTube', canvas.width / 2, canvas.height / 2 - 60);
                ctx.font = '16px Arial';
                ctx.fillText('Tap the screen to interact with YouTube videos', canvas.width / 2, canvas.height / 2 - 30);
                
                // Video thumbnail placeholder
                ctx.fillStyle = '#333333';
                ctx.fillRect(canvas.width / 2 - 160, canvas.height / 2, 320, 180);
                
                // Play button overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2 + 90, 30, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2 + 80);
                ctx.lineTo(canvas.width / 2 - 10, canvas.height / 2 + 100);
                ctx.lineTo(canvas.width / 2 + 15, canvas.height / 2 + 90);
                ctx.closePath();
                ctx.fill();
                
                // Video title
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('Sample YouTube Video', canvas.width / 2 - 160, canvas.height / 2 + 190);
                
                // Channel name
                ctx.fillStyle = '#AAAAAA';
                ctx.font = '14px Arial';
                ctx.fillText('Channel name • 100K views • 2 days ago', canvas.width / 2 - 160, canvas.height / 2 + 215);
                
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
            console.log('html2canvas loaded for YouTube');
            captureIframeToTexture();
        };
        document.head.appendChild(script);
    }
    
    // Initial draw
    drawYouTubeUI();
    
    // Try to forward user interactions to the iframe
    function forwardInteraction(event) {
        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'interaction',
                    event: {
                        type: event.type,
                        x: event.clientX,
                        y: event.clientY - 40 // Adjust for toolbar
                    }
                }, '*');
            }
        } catch (e) {
            console.warn('Unable to forward interaction to YouTube:', e);
        }
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Update texture periodically to reflect iframe content
    const updateInterval = setInterval(captureIframeToTexture, 1000);
    
    // Add properties and methods to the texture
    texture.userData = {
        isYouTube: true,
        videoId: videoId,
        iframe: iframe,
        canvas: canvas,
        player: player,
        isPlaying: false,
        controls: youtubeControls,
        updateInterval: updateInterval,
        
        // Handle click interactions on the YouTube UI
        onClick: function(x, y) {
            // If click is in the toolbar area
            if (y < 40) {
                // YouTube logo - go to home
                if (x < 100) {
                    iframe.src = 'https://www.youtube.com/';
                    return true;
                }
                
                // Search bar
                if (x > 120 && x < canvas.width - 180 && y > 8 && y < 32) {
                    searchInput.focus();
                    return true;
                }
                
                // User icon (right side)
                if (x > canvas.width - 40) {
                    // Show sign-in options or account info
                    return true;
                }
                
                return false;
            }
            
            // Content area - forward the click directly
            forwardInteraction({
                type: 'click',
                clientX: x,
                clientY: y
            });
            
            return true;
        },
        
        // Handle dragging on the content
        onDrag: function(startX, startY, endX, endY) {
            // Don't handle drag on toolbar
            if (startY < 40) {
                return false;
            }
            
            forwardInteraction({
                type: 'drag',
                clientX: endX,
                clientY: endY,
                startX: startX,
                startY: startY
            });
            
            return true;
        },
        
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
        
        loadVideo: function(newVideoId) {
            if (player && player.loadVideoById) {
                player.loadVideoById(newVideoId);
                this.videoId = newVideoId;
            } else {
                // Fallback method
                iframe.src = `https://www.youtube.com/embed/${newVideoId}?autoplay=1&controls=1&enablejsapi=1`;
                this.videoId = newVideoId;
                
                // Reset player since we've changed the iframe source
                setTimeout(setupYouTubePlayer, 500);
            }
        },
        
        // Search YouTube
        search: function(query) {
            if (!query) return;
            
            iframe.src = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            searchInput.value = query;
            
            // Reset player since we've changed the iframe source
            setTimeout(setupYouTubePlayer, 500);
        },
        
        // Cleanup resources
        dispose: function() {
            clearInterval(updateInterval);
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            if (youtubeControls && youtubeControls.parentNode) {
                youtubeControls.parentNode.removeChild(youtubeControls);
            }
        }
    };
    
    return texture;
} 