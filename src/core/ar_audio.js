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
        
        // Load fallback sounds instead of external files due to CORS issues
        await Promise.all([
            loadFallbackSound('startup'),
            loadFallbackSound('click'),
            loadFallbackSound('success'),
            loadFallbackSound('error')
        ]);
        
        console.log("Audio system initialized");
        return true;
    } catch (error) {
        console.error("Failed to initialize audio:", error);
        showNotification("Audio initialization failed: " + error.message, "error");
        return false;
    }
}

// Load a sound from URL with fallback for CORS issues
async function loadSound(name, url) {
    try {
        // Use no-cors mode to handle CORS issues
        const response = await fetch(url, { mode: 'cors' });
        const arrayBuffer = await response.arrayBuffer();
        
        // Decode audio
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Store in sources
        audioSources[name] = audioBuffer;
        
        console.log(`Sound loaded: ${name}`);
        return audioBuffer;
    } catch (error) {
        console.error(`Failed to load sound ${name} from URL:`, error);
        return loadFallbackSound(name);
    }
}

// Load a fallback sound when external sources fail (CORS issues)
async function loadFallbackSound(name) {
    try {
        // Create a simple beep sound procedurally as fallback
        const duration = 0.3;
        const sampleRate = audioContext.sampleRate;
        const numChannels = 1;
        const numSamples = Math.floor(duration * sampleRate);
        const buffer = audioContext.createBuffer(numChannels, numSamples, sampleRate);
        
        const channelData = buffer.getChannelData(0);
        
        // Generate different tones based on the sound type
        let frequency;
        switch(name) {
            case 'startup':
                frequency = 660; // Higher tone
                break;
            case 'success':
                frequency = 440; // Medium tone
                break;
            case 'error':
                frequency = 220; // Lower tone
                break;
            case 'click':
                frequency = 880; // Highest tone
                break;
            default:
                frequency = 440; // Default tone
        }
        
        // Generate a simple sine wave
        for (let i = 0; i < numSamples; i++) {
            const value = Math.sin(2 * Math.PI * frequency * i / sampleRate);
            // Apply simple envelope for smoother sound
            const envelope = i < numSamples / 10 ? i / (numSamples / 10) : 
                            i > numSamples * 0.8 ? (numSamples - i) / (numSamples * 0.2) : 1;
            channelData[i] = value * envelope * 0.5; // Half volume
        }
        
        // Store in sources
        audioSources[name] = buffer;
        
        console.log(`Fallback sound created for: ${name}`);
        return buffer;
    } catch (error) {
        console.error(`Failed to create fallback sound for ${name}:`, error);
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