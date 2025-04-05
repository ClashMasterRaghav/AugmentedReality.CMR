import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import BaseScreen from './BaseScreen';
import { createHTMLTexture, createLoadingTexture } from '../../utils/createHTMLTexture';

/**
 * ElectronScreen component that displays GitHub content
 */
const ElectronScreen = ({ id, position }) => {
  const [texture, setTexture] = useState(null);
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);
  const loadingTexture = useRef(createLoadingTexture('Loading GitHub Profile...', '#2F3241'));
  
  // Setup iframe and initial texture
  useEffect(() => {
    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    canvasRef.current = canvas;
    
    // Set initial loading texture
    setTexture(loadingTexture.current);
    
    // Create iframe for GitHub content
    const iframe = document.createElement('iframe');
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.border = 'none';
    iframe.src = 'https://github.com/ClashMasterRaghav';
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
  }, []);
  
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
    }, 2000);
    
    return () => clearInterval(updateInterval);
  }, [iframeRef.current, canvasRef.current]);
  
  // Draw Electron-style window controls on the texture canvas
  useFrame(() => {
    if (texture && texture !== loadingTexture.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      
      // Draw Electron-style title bar
      ctx.fillStyle = '#2F3241';
      ctx.fillRect(0, 0, canvasRef.current.width, 40);
      
      // Draw window controls (traffic lights)
      // Close button (red)
      ctx.beginPath();
      ctx.arc(20, 20, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FF5F56';
      ctx.fill();
      
      // Minimize button (yellow)
      ctx.beginPath();
      ctx.arc(40, 20, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFBD2E';
      ctx.fill();
      
      // Maximize button (green)
      ctx.beginPath();
      ctx.arc(60, 20, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#27C93F';
      ctx.fill();
      
      // Title text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GitHub - ClashMasterRaghav', canvasRef.current.width/2, 25);
      
      // Vertical line after window controls
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(80, 10);
      ctx.lineTo(80, 30);
      ctx.stroke();
      
      texture.needsUpdate = true;
    }
  });
  
  return (
    <BaseScreen
      id={id}
      position={position}
      title="GitHub Profile"
      width={1.0}
      height={0.75}
    >
      {texture && (
        <mesh>
          <planeGeometry args={[1.0, 0.75]} />
          <meshBasicMaterial map={texture} transparent={true} />
        </mesh>
      )}
    </BaseScreen>
  );
};

export default ElectronScreen; 