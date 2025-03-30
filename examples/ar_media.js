// Media handling for AR experience (video and audio)
import * as THREE from 'three';
import { scene, camera } from './ar_core.js';
import { screens, createNewBrowserScreen } from './ar_screens.js';
import { createNotification } from './ar_ui.js';
import { createModeChangeIndicator } from './ar_interaction.js';

// Export video texture reference
export let videoTexture;
export let videoElement;
export let currentTime = 0;
export let duration = 100; // Default duration if not available
export let availableVideos = []; // Array to store available videos

// Load video texture for AR content
export function loadVideoTexture(videoPath = null) {
    try {
        console.log("Loading video texture...");
        
        // Get video element from HTML
        videoElement = document.getElementById('videoElement');
        
        if (!videoElement) {
            console.error('Video element not found in HTML!');
            return createFallbackTexture("Video element not found");
        }
        
        // If a specific video path is provided, use it
        if (videoPath) {
            console.log("Using provided video path:", videoPath);
            videoElement.innerHTML = `<source src="${videoPath}" type="video/mp4">`;
        } else {
            // Check if video source is available
            const sources = videoElement.querySelectorAll('source');
            if (!sources || sources.length === 0) {
                console.warn('No video sources found');
                return createFallbackTexture("No video sources found");
            }
            
            let sourceFound = false;
            for (const source of sources) {
                if (source.src) {
                    sourceFound = true;
                    console.log("Using video source:", source.src);
                    break;
                }
            }
            
            if (!sourceFound) {
                console.warn('All video sources are empty');
                return createFallbackTexture("Video source not available");
            }
        }
        
        // Create video texture
        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBAFormat;
        videoTexture.crossOrigin = 'anonymous';
        
        // Add event listeners for video load status
        videoElement.addEventListener('loadeddata', () => {
            console.log('Video loaded successfully');
            duration = videoElement.duration || 100;
            updateExistingScreensWithVideo();
        });
        
        videoElement.addEventListener('timeupdate', () => {
            currentTime = videoElement.currentTime;
        });
        
        videoElement.addEventListener('error', (e) => {
            console.error('Video load error:', e);
            videoTexture = createFallbackTexture("Error loading video");
            updateExistingScreensWithVideo();
        });
        
        // Start playing video (will be muted)
        videoElement.muted = true;
        videoElement.play().catch(e => {
            console.error("Video play error:", e);
            // Continue without failing - the texture will still be usable
        });
        
        console.log("Video texture created");
        return videoTexture;
    } catch (error) {
        console.error("Error in loadVideoTexture:", error);
        return createFallbackTexture("Error: " + error.message);
    }
}

// Scan for available videos in the _ar_videos folder
export function scanForVideos() {
    try {
        console.log("Scanning for videos in _ar_videos folder...");
        
        // Path to the videos folder
        const videoFolderPath = '/textures/_ar_videos/';
        
        // This would normally be a server-side operation, but for client-side we'll simulate
        // by checking for common video files or create a placeholder list
        const demoVideos = [
            { name: "Sample Video 1", path: `${videoFolderPath}sample1.mp4` },
            { name: "Sample Video 2", path: `${videoFolderPath}sample2.mp4` },
            { name: "Demo Reel", path: `${videoFolderPath}demo.mp4` }
        ];
        
        // Set the available videos
        availableVideos = demoVideos;
        
        console.log(`Found ${availableVideos.length} videos`);
        return availableVideos;
    } catch (error) {
        console.error("Error scanning for videos:", error);
        return [];
    }
}

// Create a video selection menu in AR
export function createVideoSelectionMenu(position = new THREE.Vector3(0, 0, -1.2)) {
    if (availableVideos.length === 0) {
        scanForVideos();
    }
    
    // Create a menu screen
    const menuScreen = createNewBrowserScreen(position);
    menuScreen.userData.type = 'videoMenu';
    
    // Create a canvas for the menu
    const menuCanvas = document.createElement('canvas');
    menuCanvas.width = 1024;
    menuCanvas.height = 768;
    const ctx = menuCanvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, menuCanvas.width, menuCanvas.height);
    
    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Select Video', menuCanvas.width / 2, 60);
    
    // Draw video options
    const buttonHeight = 100;
    const buttonWidth = 800;
    const startY = 150;
    const padding = 20;
    
    availableVideos.forEach((video, index) => {
        const y = startY + (buttonHeight + padding) * index;
        
        // Button background
        ctx.fillStyle = '#333333';
        ctx.fillRect((menuCanvas.width - buttonWidth) / 2, y, buttonWidth, buttonHeight);
        
        // Button text
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(video.name, menuCanvas.width / 2, y + buttonHeight / 2);
        
        // Store button data for interaction
        const buttonData = {
            x: (menuCanvas.width - buttonWidth) / 2,
            y: y,
            width: buttonWidth,
            height: buttonHeight,
            videoPath: video.path,
            videoName: video.name
        };
        
        if (!menuScreen.userData.buttons) {
            menuScreen.userData.buttons = [];
        }
        
        menuScreen.userData.buttons.push(buttonData);
    });
    
    // Apply canvas as texture to the screen
    const menuTexture = new THREE.CanvasTexture(menuCanvas);
    const backgroundMesh = menuScreen.children.find(child => 
        child.material && !child.userData.type);
    
    if (backgroundMesh) {
        backgroundMesh.material.map = menuTexture;
        backgroundMesh.material.needsUpdate = true;
    }
    
    // Add click handler for video selection
    menuScreen.userData.handleMenuClick = function(normalizedX, normalizedY) {
        const buttons = this.buttons;
        if (!buttons) return;
        
        // Convert normalized coords to canvas coords
        const canvasX = normalizedX * menuCanvas.width;
        const canvasY = (1 - normalizedY) * menuCanvas.height;
        
        // Check if a button was clicked
        for (const button of buttons) {
            if (canvasX >= button.x && canvasX <= button.x + button.width &&
                canvasY >= button.y && canvasY <= button.y + button.height) {
                
                // Load the selected video
                loadVideoTexture(button.videoPath);
                
                // Show notification
                createModeChangeIndicator(`Loading video: ${button.videoName}`);
                
                // Remove the menu screen
                const index = screens.indexOf(menuScreen);
                if (index > -1) {
                    screens.splice(index, 1);
                    scene.remove(menuScreen);
                }
                
                return true;
            }
        }
        return false;
    };
    
    return menuScreen;
}

// Update existing screens with the new video texture
function updateExistingScreensWithVideo() {
    screens.forEach(screen => {
        // Find the background mesh
        const backgroundMesh = screen.children.find(child => 
            child.material && 
            child.material.map !== undefined && 
            !child.userData.type);
        
        if (backgroundMesh && videoTexture) {
            backgroundMesh.material.map = videoTexture;
            backgroundMesh.material.needsUpdate = true;
        }
    });
}

// Toggle video playback
export function toggleVideoPlayback() {
    if (!videoElement) return;
    
    if (videoElement.paused) {
        videoElement.play().then(() => {
            createModeChangeIndicator("Video Playing");
        }).catch(e => {
            console.error("Video play error:", e);
        });
    } else {
        videoElement.pause();
        createModeChangeIndicator("Video Paused");
    }
}

// Toggle video mute
export function toggleVideoMute() {
    if (!videoElement) return;
    
    videoElement.muted = !videoElement.muted;
    createModeChangeIndicator(videoElement.muted ? "Video Muted" : "Video Unmuted");
}

// Update play/pause icons on all screens
function updatePlayPauseIcons(isPaused) {
    screens.forEach(screen => {
        // Find play/pause button
        const playButton = findButtonInScreen(screen, 'playButton');
        if (playButton) {
            // Update icon
            updateButtonIcon(playButton, isPaused ? 'play' : 'pause');
            
            // Update in userData
            if (screen.userData && screen.userData.controls) {
                screen.userData.controls.isPlaying = !isPaused;
            }
        }
    });
}

// Update mute icons on all screens
function updateMuteIcons(isMuted) {
    screens.forEach(screen => {
        // Find volume button
        const volumeButton = findButtonInScreen(screen, 'volumeButton');
        if (volumeButton) {
            // Update icon
            updateButtonIcon(volumeButton, isMuted ? 'muted' : 'volume');
            
            // Update in userData
            if (screen.userData && screen.userData.controls) {
                screen.userData.controls.isMuted = isMuted;
            }
        }
    });
}

// Find a button in a screen by action
function findButtonInScreen(screen, action) {
    return screen.children.find(child => 
        child.userData && 
        child.userData.type === 'button' && 
        child.userData.action === action);
}

// Update a button's icon
function updateButtonIcon(button, newType) {
    // Find icon mesh (first child)
    const iconMesh = button.children[0];
    if (iconMesh && iconMesh.material && iconMesh.material.map) {
        // Create new icon texture
        const newTexture = createControlIcon(newType);
        iconMesh.material.map.dispose();
        iconMesh.material.map = newTexture;
        iconMesh.material.needsUpdate = true;
    }
}

// Create control button icons
function createControlIcon(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and set styles
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    switch(type) {
        case 'play':
            // Draw play icon (triangle)
            ctx.beginPath();
            ctx.moveTo(22, 16);
            ctx.lineTo(22, 48);
            ctx.lineTo(48, 32);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'pause':
            // Draw pause icon (two vertical bars)
            ctx.fillRect(20, 16, 8, 32);
            ctx.fillRect(36, 16, 8, 32);
            break;
            
        case 'volume':
            // Draw volume icon
            // Speaker base
            ctx.beginPath();
            ctx.moveTo(16, 24);
            ctx.lineTo(24, 24);
            ctx.lineTo(32, 16);
            ctx.lineTo(32, 48);
            ctx.lineTo(24, 40);
            ctx.lineTo(16, 40);
            ctx.closePath();
            ctx.fill();
            
            // Sound waves
            ctx.beginPath();
            ctx.moveTo(40, 22);
            ctx.bezierCurveTo(45, 30, 45, 34, 40, 42);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(44, 18);
            ctx.bezierCurveTo(52, 28, 52, 36, 44, 46);
            ctx.stroke();
            break;
            
        case 'muted':
            // Draw muted icon
            // Speaker base
            ctx.beginPath();
            ctx.moveTo(16, 24);
            ctx.lineTo(24, 24);
            ctx.lineTo(32, 16);
            ctx.lineTo(32, 48);
            ctx.lineTo(24, 40);
            ctx.lineTo(16, 40);
            ctx.closePath();
            ctx.fill();
            
            // X mark for mute
            ctx.beginPath();
            ctx.moveTo(38, 22);
            ctx.lineTo(52, 42);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(38, 42);
            ctx.lineTo(52, 22);
            ctx.stroke();
            break;
            
        case 'fullscreen':
            // Draw fullscreen icon
            ctx.beginPath();
            // Top-left corner
            ctx.moveTo(18, 26);
            ctx.lineTo(18, 18);
            ctx.lineTo(26, 18);
            
            // Top-right corner
            ctx.moveTo(38, 18);
            ctx.lineTo(46, 18);
            ctx.lineTo(46, 26);
            
            // Bottom-right corner
            ctx.moveTo(46, 38);
            ctx.lineTo(46, 46);
            ctx.lineTo(38, 46);
            
            // Bottom-left corner
            ctx.moveTo(26, 46);
            ctx.lineTo(18, 46);
            ctx.lineTo(18, 38);
            ctx.stroke();
            break;
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Create a fallback texture when video can't be loaded
function createFallbackTexture(message = "No video available") {
    console.log("Creating fallback texture:", message);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width/2, canvas.height/2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('Video will appear when available', canvas.width/2, canvas.height/2 + 20);
    
    // Create a texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create a dynamic video overlay for screen
export function createVideoOverlay(videoUrl, width = 0.76, height = 0.46) {
    const group = new THREE.Group();
    
    // Create video element
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    
    // Create video texture
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    
    // Create plane with video texture
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide,
        transparent: true
    });
    const plane = new THREE.Mesh(geometry, material);
    group.add(plane);
    
    // Add play/pause button
    const buttonSize = Math.min(width, height) * 0.2;
    const buttonGeometry = new THREE.CircleGeometry(buttonSize/2, 32);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.z = 0.001;
    
    // Create play/pause icon
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 128;
    iconCanvas.height = 128;
    const iconCtx = iconCanvas.getContext('2d');
    
    // Draw play icon by default
    iconCtx.fillStyle = '#ffffff';
    iconCtx.beginPath();
    iconCtx.moveTo(40, 30);
    iconCtx.lineTo(100, 64);
    iconCtx.lineTo(40, 98);
    iconCtx.closePath();
    iconCtx.fill();
    
    const iconTexture = new THREE.CanvasTexture(iconCanvas);
    const iconGeometry = new THREE.CircleGeometry(buttonSize/2 * 0.8, 32);
    const iconMaterial = new THREE.MeshBasicMaterial({
        map: iconTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    icon.position.z = 0.002;
    
    // Group button components
    const buttonGroup = new THREE.Group();
    buttonGroup.add(button);
    buttonGroup.add(icon);
    buttonGroup.position.set(0, -height/2 + buttonSize/2 + 0.02, 0);
    buttonGroup.userData = { 
        type: 'button', 
        action: 'togglePlay',
        isPlaying: false
    };
    
    group.add(buttonGroup);
    
    // Store video element and texture in userData
    group.userData = {
        video: video,
        texture: texture,
        togglePlay: function() {
            const isPlaying = !video.paused;
            if (isPlaying) {
                video.pause();
                // Update to play icon
                iconCtx.clearRect(0, 0, 128, 128);
                iconCtx.fillStyle = '#ffffff';
                iconCtx.beginPath();
                iconCtx.moveTo(40, 30);
                iconCtx.lineTo(100, 64);
                iconCtx.lineTo(40, 98);
                iconCtx.closePath();
                iconCtx.fill();
            } else {
                video.play();
                // Update to pause icon
                iconCtx.clearRect(0, 0, 128, 128);
                iconCtx.fillStyle = '#ffffff';
                iconCtx.fillRect(35, 30, 20, 68);
                iconCtx.fillRect(75, 30, 20, 68);
            }
            iconTexture.needsUpdate = true;
            buttonGroup.userData.isPlaying = !isPlaying;
        }
    };
    
    // Start playing video
    video.play().catch(e => console.error("Video play error:", e));
    
    return group;
}

// Update video textures in render loop
export function updateVideoTextures() {
    // Update main video texture
    if (videoTexture && videoElement && videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
    }
    
    // Update any other video textures in the scene
    scene.traverse(object => {
        if (object.userData && object.userData.texture && object.userData.video) {
            if (object.userData.video.readyState >= object.userData.video.HAVE_CURRENT_DATA) {
                object.userData.texture.needsUpdate = true;
            }
        }
    });
}

// Play spatial audio at a location
export function playSpatialAudio(url, position, volume = 1.0, loop = false) {
    // Create audio element
    const audio = document.createElement('audio');
    audio.src = url;
    audio.loop = loop;
    
    // Create audio listener if not already attached to camera
    if (!THREE.AudioListener) {
        const listener = new THREE.AudioListener();
        camera.add(listener);
    }
    
    // Create audio source
    const sound = new THREE.PositionalAudio(THREE.AudioListener);
    sound.setMediaElementSource(audio);
    sound.setRefDistance(1);
    sound.setDistanceModel('exponential');
    sound.setRolloffFactor(1);
    sound.setVolume(volume);
    
    // Create visual indicator for sound source
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        })
    );
    
    sphere.add(sound);
    
    // Position the sound in 3D space
    if (position) {
        sphere.position.copy(position);
    }
    
    // Add to scene
    scene.add(sphere);
    
    // Play audio
    audio.play().catch(e => console.error("Audio play error:", e));
    
    // Return for later reference/control
    return { 
        audio: audio, 
        sound: sound, 
        mesh: sphere,
        stop: function() {
            audio.pause();
            audio.currentTime = 0;
        },
        pause: function() {
            audio.pause();
        },
        play: function() {
            audio.play();
        },
        setPosition: function(newPosition) {
            sphere.position.copy(newPosition);
        }
    };
} 