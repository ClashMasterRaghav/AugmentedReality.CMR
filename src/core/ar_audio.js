// Audio management for AR experience
import { showNotification } from './ar_utils.js';

// Audio context and sources
let audioContext = null;
let audioSources = {};
let audioListener = null;
let masterGain = null;
let isMuted = false;

// Initialize audio system
export async function initAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master gain
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.5; // 50% volume
        masterGain.connect(audioContext.destination);
        
        // Load common sounds
        await Promise.all([
            loadSound('startup', 'https://freesound.org/data/previews/562/562373_11861866-lq.mp3'),
            loadSound('click', 'https://freesound.org/data/previews/242/242501_4414128-lq.mp3'),
            loadSound('success', 'https://freesound.org/data/previews/320/320181_5260872-lq.mp3'),
            loadSound('error', 'https://freesound.org/data/previews/342/342756_5260872-lq.mp3')
        ]);
        
        console.log("Audio system initialized");
        return true;
    } catch (error) {
        console.error("Failed to initialize audio:", error);
        showNotification("Audio initialization failed: " + error.message, "error");
        return false;
    }
}

// Load a sound from URL
async function loadSound(name, url) {
    try {
        // Fetch audio data
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        // Decode audio
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Store in sources
        audioSources[name] = audioBuffer;
        
        console.log(`Sound loaded: ${name}`);
        return audioBuffer;
    } catch (error) {
        console.error(`Failed to load sound ${name}:`, error);
        return null;
    }
}

// Play a sound
export function playSound(name, volume = 1.0, loop = false, spatial = false, position = null) {
    if (!audioContext || !audioSources[name] || isMuted) return null;
    
    try {
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Create source
        const source = audioContext.createBufferSource();
        source.buffer = audioSources[name];
        source.loop = loop;
        
        // Create gain node for this sound
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        
        // Handle spatial audio if needed
        if (spatial && position && window.camera) {
            // Create panner node
            const panner = audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            
            // Set position
            panner.positionX.value = position.x;
            panner.positionY.value = position.y;
            panner.positionZ.value = position.z;
            
            // Connect chain: source -> gain -> panner -> master
            source.connect(gainNode);
            gainNode.connect(panner);
            panner.connect(masterGain);
        } else {
            // Connect chain: source -> gain -> master
            source.connect(gainNode);
            gainNode.connect(masterGain);
        }
        
        // Start playback
        source.start(0);
        
        return source;
    } catch (error) {
        console.error(`Error playing sound ${name}:`, error);
        return null;
    }
}

// Play startup sound
export function playStartupSound() {
    return playSound('startup', 0.3);
}

// Play UI click sound
export function playClickSound() {
    return playSound('click', 0.2);
}

// Play success sound
export function playSuccessSound() {
    return playSound('success', 0.3);
}

// Play error sound
export function playErrorSound() {
    return playSound('error', 0.3);
}

// Set master volume
export function setMasterVolume(volume) {
    if (!masterGain) return;
    
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    masterGain.gain.value = clampedVolume;
    
    return clampedVolume;
}

// Toggle mute
export function toggleMute() {
    if (!masterGain) return false;
    
    isMuted = !isMuted;
    
    if (isMuted) {
        // Store current volume and set to 0
        masterGain._previousVolume = masterGain.gain.value;
        masterGain.gain.value = 0;
    } else {
        // Restore previous volume
        masterGain.gain.value = masterGain._previousVolume || 0.5;
    }
    
    return isMuted;
} 