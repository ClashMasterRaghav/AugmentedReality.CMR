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
    
    // Initial blank state with loading message
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading YouTube video...', canvas.width / 2, canvas.height / 2);
    
    // Create an invisible iframe to load YouTube embed
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.width = canvas.width;
    iframe.height = canvas.height - 40; // Account for the title bar
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&enablejsapi=1`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.frameBorder = "0";
    iframe.id = `youtube-player-${Date.now()}`;
    document.body.appendChild(iframe);
    
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
    youtubeControls.style.width = '400px';
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
    
    // Add search input for YouTube videos
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search YouTube...';
    searchInput.style.flex = '1';
    searchInput.style.marginLeft = '10px';
    searchInput.style.marginRight = '10px';
    searchInput.style.padding = '5px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '3px';
    
    const searchButton = document.createElement('button');
    searchButton.textContent = 'Search';
    searchButton.style.backgroundColor = '#FF0000';
    searchButton.style.color = '#FFFFFF';
    searchButton.style.border = 'none';
    searchButton.style.padding = '5px 10px';
    searchButton.style.borderRadius = '3px';
    
    youtubeControls.appendChild(playButton);
    youtubeControls.appendChild(pauseButton);
    youtubeControls.appendChild(muteButton);
    youtubeControls.appendChild(searchInput);
    youtubeControls.appendChild(searchButton);
    document.body.appendChild(youtubeControls);
    
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
            let youtubeEvent;
            if (event.type === 'click') {
                youtubeEvent = new MouseEvent('click', {
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
            }
            
            // For simple click events
            if (event.type === 'click' && iframe.contentDocument) {
                const element = iframe.contentDocument.elementFromPoint(event.x, event.y - 40);
                if (element) element.dispatchEvent(youtubeEvent);
            }
            
            // Return iframe to its original position
            iframe.style.position = originalPosition;
            iframe.style.left = originalLeft;
            iframe.style.top = originalTop;
            
            return true;
        } catch (e) {
            console.error('Error forwarding interaction to YouTube iframe:', e);
            return false;
        }
    }
    
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
            captureIframeToTexture();
        });
        
        pauseButton.addEventListener('click', function() {
            player.pauseVideo();
            captureIframeToTexture();
        });
        
        muteButton.addEventListener('click', function() {
            if (player.isMuted()) {
                player.unMute();
                muteButton.textContent = 'Mute';
            } else {
                player.mute();
                muteButton.textContent = 'Unmute';
            }
            captureIframeToTexture();
        });
        
        // Setup search functionality
        searchButton.addEventListener('click', function() {
            searchYouTube();
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchYouTube();
            }
        });
        
        function searchYouTube() {
            const query = searchInput.value.trim();
            if (query) {
                // For a real implementation, you would use the YouTube Data API to search
                // Here we'll just load a search results page in the iframe
                iframe.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}`;
                captureIframeToTexture();
            }
        }
    }
    
    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            // Update UI to show the video is playing
            drawYoutubeUI(true);
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            isPlaying = false;
            // Update UI to show the video is paused
            drawYoutubeUI(false);
        }
    }
    
    // Function to capture iframe content to texture
    function captureIframeToTexture() {
        try {
            // Try to use html2canvas to capture the iframe content
            if (window.html2canvas && iframe.contentDocument) {
                html2canvas(iframe.contentDocument.body).then(function(renderedCanvas) {
                    // Clear canvas and draw the YouTube UI
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawYoutubeUI(isPlaying);
                    
                    // Draw the captured iframe content below the UI
                    ctx.drawImage(renderedCanvas, 0, 40, canvas.width, canvas.height - 40);
                    texture.needsUpdate = true;
                });
            } else {
                // Fallback with basic UI
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the YouTube UI
                drawYoutubeUI(isPlaying);
                
                texture.needsUpdate = true;
            }
        } catch (e) {
            console.warn('Error capturing YouTube iframe content:', e);
        }
    }
    
    // Function to draw the YouTube UI overlay
    function drawYoutubeUI(isPlaying) {
        // Draw the top bar
        ctx.fillStyle = '#212121'; // YouTube dark theme color
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // Draw YouTube logo
        if (logo.complete) {
            ctx.drawImage(logo, 10, 5, 80, 30);
        } else {
            // Text fallback
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('YouTube', 15, 20);
        }
        
        // Draw search bar
        ctx.fillStyle = '#323232';
        ctx.fillRect(canvas.width / 2 - 150, 5, 300, 30);
        ctx.strokeStyle = '#666666';
        ctx.strokeRect(canvas.width / 2 - 150, 5, 300, 30);
        
        // Search text
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Search YouTube', canvas.width / 2 - 140, 20);
        
        // User icon at right
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(canvas.width - 20, 20, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw play/pause icon based on state
        if (player && isPlaying) {
            // Draw pause icon in timeline
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(20, canvas.height - 20, 5, 15);
            ctx.fillRect(30, canvas.height - 20, 5, 15);
        } else {
            // Draw play icon in timeline
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(20, canvas.height - 25);
            ctx.lineTo(20, canvas.height - 5);
            ctx.lineTo(35, canvas.height - 15);
            ctx.closePath();
            ctx.fill();
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
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Set up update interval
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
        
        // Handle click interaction
        onClick: function(x, y) {
            // Handle toolbar interactions
            if (y < 40) {
                // Logo area - do nothing
                if (x < 100) {
                    return true;
                }
                
                // Search area
                if (x > canvas.width / 2 - 150 && x < canvas.width / 2 + 150) {
                    // Open search UI
                    searchInput.focus();
                    return true;
                }
                
                return false;
            }
            
            // Center play/pause button area
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            
            // Extra check for the play button at center (for when video isn't playing)
            if (distance < 50 && !isPlaying) {
                if (player) {
                    player.playVideo();
                    isPlaying = true;
                }
                return true;
            }
            
            // Forward the click to the iframe content
            return forwardInteraction({
                type: 'click',
                x: x,
                y: y
            });
        },
        
        // Handle drag interaction for video scrubbing
        onDrag: function(startX, startY, endX, endY) {
            // If in the bottom area - treat as timeline scrubbing
            if (startY > canvas.height - 30) {
                if (player) {
                    // Calculate position in video as percentage of width
                    const percentage = endX / canvas.width;
                    if (percentage >= 0 && percentage <= 1) {
                        // Get duration and set current time
                        const duration = player.getDuration();
                        player.seekTo(duration * percentage, true);
                        return true;
                    }
                }
                return false;
            }
            
            // Otherwise forward the drag to the iframe
            return forwardInteraction({
                type: 'drag',
                startX: startX,
                startY: startY,
                x: endX,
                y: endY
            });
        },
        
        // Methods to control video
        playVideo: function() {
            if (player && player.playVideo) {
                player.playVideo();
                isPlaying = true;
                captureIframeToTexture();
            }
        },
        
        pauseVideo: function() {
            if (player && player.pauseVideo) {
                player.pauseVideo();
                isPlaying = false;
                captureIframeToTexture();
            }
        },
        
        togglePlayback: function() {
            if (!player) return;
            
            if (isPlaying) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
            
            captureIframeToTexture();
        },
        
        // Load a different video
        loadVideo: function(newVideoId) {
            if (player) {
                player.loadVideoById(newVideoId);
                texture.userData.videoId = newVideoId;
                captureIframeToTexture();
            }
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