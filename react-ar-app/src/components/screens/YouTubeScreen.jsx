import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import BaseScreen from './BaseScreen';
import { createHTMLTexture, createLoadingTexture } from '../../utils/createHTMLTexture';

/**
 * YouTubeScreen component that displays YouTube video content
 */
const YouTubeScreen = ({ id, position, videoId = "Myrr9vA7j5A" }) => {
  const [texture, setTexture] = useState(null);
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);
  const isPlaying = useRef(false);
  const loadingTexture = useRef(createLoadingTexture('Loading YouTube Video...', '#0F0F0F'));
  
  // Setup iframe and initial texture
  useEffect(() => {
    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    canvasRef.current = canvas;
    
    // Set initial loading texture
    setTexture(loadingTexture.current);
    
    // Create iframe for YouTube embed
    const iframe = document.createElement('iframe');
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.border = 'none';
    iframe.allowFullscreen = true;
    
    // YouTube embed URL with parameters for performance and control
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&rel=0&showinfo=0`;
    document.body.appendChild(iframe);
    iframeRef.current = iframe;
    
    // Update texture once iframe loads
    iframe.onload = async () => {
      try {
        const newTexture = await createHTMLTexture(iframe, canvas);
        setTexture(newTexture);
      } catch (error) {
        console.error('Error capturing iframe:', error);
      }
    };
    
    // Cleanup
    return () => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      if (texture) {
        texture.dispose();
      }
    };
  }, [videoId]);
  
  // Update texture periodically
  useEffect(() => {
    if (!iframeRef.current || !canvasRef.current) return;
    
    const updateInterval = setInterval(async () => {
      try {
        const newTexture = await createHTMLTexture(iframeRef.current, canvasRef.current);
        setTexture(newTexture);
      } catch (error) {
        console.error('Error updating texture:', error);
      }
    }, 1000); // Update more frequently for video
    
    return () => clearInterval(updateInterval);
  }, [iframeRef.current, canvasRef.current]);
  
  // Draw YouTube-style controls on the texture canvas
  useFrame(() => {
    if (texture && texture !== loadingTexture.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      
      // Draw YouTube-like controls at the bottom
      const controlsHeight = 40;
      const progressBarHeight = 4;
      
      // Progress bar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, canvasRef.current.height - controlsHeight, canvasRef.current.width, controlsHeight);
      
      // Progress bar track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, canvasRef.current.height - controlsHeight - progressBarHeight, canvasRef.current.width, progressBarHeight);
      
      // Progress bar (fake progress that increases over time)
      const now = Date.now();
      const progress = (now % 120000) / 120000; // 2-minute cycle
      ctx.fillStyle = '#FF0000'; // YouTube red
      ctx.fillRect(0, canvasRef.current.height - controlsHeight - progressBarHeight, canvasRef.current.width * progress, progressBarHeight);
      
      // Play/Pause button
      ctx.fillStyle = 'white';
      if (isPlaying.current) {
        // Pause icon
        ctx.fillRect(20, canvasRef.current.height - controlsHeight + 15, 6, 15);
        ctx.fillRect(32, canvasRef.current.height - controlsHeight + 15, 6, 15);
      } else {
        // Play icon (triangle)
        ctx.beginPath();
        ctx.moveTo(20, canvasRef.current.height - controlsHeight + 12);
        ctx.lineTo(38, canvasRef.current.height - controlsHeight + 22);
        ctx.lineTo(20, canvasRef.current.height - controlsHeight + 32);
        ctx.closePath();
        ctx.fill();
      }
      
      // Time display (fake time based on progress)
      const totalSeconds = 120; // 2 minutes
      const currentSeconds = Math.floor(progress * totalSeconds);
      const minutes = Math.floor(currentSeconds / 60);
      const seconds = currentSeconds % 60;
      const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} / 2:00`;
      
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(timeString, 50, canvasRef.current.height - controlsHeight + 25);
      
      texture.needsUpdate = true;
    }
  });
  
  // Toggle play/pause when clicking on the video area
  const handleVideoClick = () => {
    isPlaying.current = !isPlaying.current;
    
    // Try to control YouTube iframe API if available
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const message = isPlaying.current ? 'playVideo' : 'pauseVideo';
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: message,
            args: []
          }), 
          '*'
        );
      }
    } catch (e) {
      console.error('Failed to control YouTube player:', e);
    }
  };
  
  return (
    <BaseScreen
      id={id}
      position={position}
      title="YouTube"
      width={1.0}
      height={0.75}
    >
      <Interactive onSelect={handleVideoClick}>
        <mesh>
          <planeGeometry args={[1.0, 0.75]} />
          <meshBasicMaterial map={texture} transparent={true} />
        </mesh>
      </Interactive>
    </BaseScreen>
  );
};

export default YouTubeScreen;