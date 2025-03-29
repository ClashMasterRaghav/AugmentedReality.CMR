// Media handling for AR experience (video and audio)
import * as THREE from 'three';
import { scene } from './ar_core.js';
import { screens } from './ar_screens.js';

// Export video texture reference
export let videoTexture;
export let videoElement;

// Load video texture for AR content
export function loadVideoTexture() {
    // Get video element from HTML
    videoElement = document.getElementById('videoElement');
    
    if (!videoElement) {
        console.error('Video element not found in HTML!');
        return;
    }
    
    // Create video texture
    videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.crossOrigin = 'anonymous';
    
    // Start playing video (will be muted)
    videoElement.play().catch(e => console.error("Video play error:", e));
    
    // Update existing screens with video
    updateExistingScreensWithVideo();
    
    return videoTexture;
}

// Update existing screens with video texture
function updateExistingScreensWithVideo() {
    if (!videoTexture) return;
    
    screens.forEach(screen => {
        // Find the content panel in the screen (usually child index 3 or 4)
        const contentPanel = screen.children.find(child => 
            child.geometry && 
            child.geometry.type === 'PlaneGeometry' &&
            child.position.y === -0.03
        );
        
        if (contentPanel) {
            // Update material with video texture
            contentPanel.material.map = videoTexture;
            contentPanel.material.needsUpdate = true;
        }
    });
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