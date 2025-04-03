// Media handling for AR experience (video and audio)
import * as THREE from 'three';
import { showNotification } from './ar_utils.js';

// Global variables
let videoElement = null;
let videoScreens = [];
export let videoTexture = null;

// Initialize media sources
export async function initMediaSources() {
    try {
        // Create video element for texture
        videoElement = document.createElement('video');
        videoElement.autoplay = false;
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.playsInline = true;
        videoElement.crossOrigin = 'anonymous';
        
        // Add test video source
        videoElement.src = 'https://threejs.org/examples/textures/sintel.ogv';
        
        // Create video texture
        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBAFormat;
        
        console.log("Media sources initialized");
        return true;
    } catch (error) {
        console.error("Failed to initialize media sources:", error);
        showNotification("Failed to initialize media: " + error.message, "error");
        return false;
    }
}

// Alias for initMediaSources to maintain compatibility with app.js
export const initMedia = initMediaSources;

// Export video texture reference
export let currentTime = 0;
export let duration = 100; // Default duration if not available

// Track screens using video

// Load video texture for AR content
export function loadVideoTexture() {
    try {
        console.log("Loading video texture...");
        
        // Get video element from HTML
        videoElement = document.getElementById('videoElement');
        
        if (!videoElement) {
            console.error('Video element not found in HTML!');
            return createFallbackTexture("Video element not found");
        }
        
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
            showNotification("Video loaded successfully", "success");
            
            // Update the mute icon to reflect the default muted state
            updateMuteIcons(true);
        });
        
        videoElement.addEventListener('timeupdate', () => {
            currentTime = videoElement.currentTime;
        });
        
        videoElement.addEventListener('error', (e) => {
            console.error('Video load error:', e);
            videoTexture = createFallbackTexture("Error loading video");
            showNotification("Error loading video", "error");
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

// Toggle video playback
export function toggleVideoPlayback() {
    if (!videoElement) return;
    
    if (videoElement.paused) {
        videoElement.play().then(() => {
            updatePlayPauseIcons(false);
            showNotification("Video playing", "info");
        }).catch(e => {
            console.error("Video play error:", e);
            showNotification("Error playing video", "error");
        });
    } else {
        videoElement.pause();
        updatePlayPauseIcons(true);
        showNotification("Video paused", "info");
    }
}

// Toggle video mute
export function toggleVideoMute() {
    if (!videoElement) return;
    
    videoElement.muted = !videoElement.muted;
    updateMuteIcons(videoElement.muted);
    
    showNotification(videoElement.muted ? "Audio muted" : "Audio unmuted", "info");
}

// Register a screen to receive video updates
export function registerVideoScreen(screen) {
    if (!videoScreens.includes(screen)) {
        videoScreens.push(screen);
    }
}

// Unregister a screen from video updates
export function unregisterVideoScreen(screen) {
    const index = videoScreens.indexOf(screen);
    if (index !== -1) {
        videoScreens.splice(index, 1);
    }
}

// Update play/pause icons on all registered screens
function updatePlayPauseIcons(isPaused) {
    videoScreens.forEach(screen => {
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

// Update mute icons on all registered screens
function updateMuteIcons(isMuted) {
    videoScreens.forEach(screen => {
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
        
        // Clean up old texture
        if (iconMesh.material.map) {
            iconMesh.material.map.dispose();
        }
        
        // Apply new texture
        iconMesh.material.map = newTexture;
        iconMesh.material.needsUpdate = true;
    }
}

// Create control button icons
function createControlIcon(type) {
    // Use texture loader for icons
    const iconLoader = new THREE.TextureLoader();
    let iconPath = '';
    
    switch(type) {
        case 'play':
            iconPath = 'examples/textures/ar_icons/play-buttton.png';
            break;
        case 'pause':
            iconPath = 'examples/textures/ar_icons/pause-button.png';
            break;
        case 'volume':
            iconPath = 'examples/textures/ar_icons/unmute.png';
            break;
        case 'muted':
            iconPath = 'examples/textures/ar_icons/mute.png';
            break;
        default:
            // Create a fallback if no matching icon
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(32, 32, 16, 0, Math.PI * 2);
            ctx.fill();
            return new THREE.CanvasTexture(canvas);
    }
    
    // Return the loaded texture
    return iconLoader.load(iconPath);
}

// Create a fallback texture when video fails
function createFallbackTexture(errorMessage = "Video not available") {
    console.log("Creating fallback texture:", errorMessage);
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
    ctx.fillText(errorMessage, canvas.width/2, canvas.height/2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('Video will appear when available', canvas.width/2, canvas.height/2 + 20);
    
    // Create a texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Update video textures in render loop
export function updateVideoTextures() {
    // Only run this update if there's a video playing
    if (videoElement && videoTexture) {
        if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
            videoTexture.needsUpdate = true;
            currentTime = videoElement.currentTime;
        }
    }
}

// Alias for updateVideoTextures to maintain compatibility with app.js
export const updateMedia = updateVideoTextures;

// Create a dynamic video overlay for a screen
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

// Play spatial audio at a location
export function playSpatialAudio(url, position, volume = 1.0, loop = false) {
    if (!window.camera || !window.scene) {
        console.error("Camera or scene not available for spatial audio");
        return null;
    }
    
    // Create audio element
    const audio = document.createElement('audio');
    audio.src = url;
    audio.loop = loop;
    
    // Create audio listener if not already attached to camera
    if (!window.camera.children.find(child => child instanceof THREE.AudioListener)) {
        const listener = new THREE.AudioListener();
        window.camera.add(listener);
    }
    
    // Get the audio listener
    const listener = window.camera.children.find(child => child instanceof THREE.AudioListener);
    
    // Create audio source
    const sound = new THREE.PositionalAudio(listener);
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
    window.scene.add(sphere);
    
    // Play audio
    audio.play().catch(e => console.error("Audio play error:", e));
    
    // Return control object
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
        },
        dispose: function() {
            window.scene.remove(sphere);
            sound.disconnect();
            audio.pause();
            audio.remove();
        }
    };
} 