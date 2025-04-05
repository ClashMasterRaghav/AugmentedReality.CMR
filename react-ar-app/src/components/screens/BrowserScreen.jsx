import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import BaseScreen from './BaseScreen';
import { createHTMLTexture, createLoadingTexture } from '../../utils/createHTMLTexture';

/**
 * BrowserScreen component for displaying web content
 */
const BrowserScreen = ({ id, position, url = "https://duckduckgo.com" }) => {
  const [texture, setTexture] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(url);
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);
  const loadingTexture = useRef(createLoadingTexture('Loading Browser...', '#F7F7F7'));
  
  // Setup iframe and initial texture
  useEffect(() => {
    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    canvasRef.current = canvas;
    
    // Set initial loading texture
    setTexture(loadingTexture.current);
    
    // Create iframe for web content
    const iframe = document.createElement('iframe');
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.border = 'none';
    iframe.src = currentUrl;
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
      if (texture && texture !== loadingTexture.current) {
        texture.dispose();
      }
    };
  }, [currentUrl]);
  
  // Update texture periodically
  useEffect(() => {
    if (!iframeRef.current || !canvasRef.current) return;
    
    const updateInterval = setInterval(async () => {
      try {
        const newTexture = await createHTMLTexture(iframeRef.current, canvasRef.current);
        setTexture(newTexture);
        
        // Check if URL has changed
        try {
          const newUrl = iframeRef.current.contentWindow.location.href;
          if (newUrl !== currentUrl && newUrl !== 'about:blank') {
            setCurrentUrl(newUrl);
          }
        } catch (e) {
          // Cannot access iframe URL due to same-origin policy
          console.warn('Cannot access iframe URL:', e);
        }
      } catch (error) {
        console.error('Error updating texture:', error);
      }
    }, 1000);
    
    return () => clearInterval(updateInterval);
  }, [iframeRef.current, canvasRef.current, currentUrl]);
  
  // Draw browser chrome on the texture canvas
  useFrame(() => {
    if (texture && texture !== loadingTexture.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      
      // Save the main content
      const imgData = ctx.getImageData(0, 40, canvasRef.current.width, canvasRef.current.height - 40);
      
      // Draw browser top bar
      ctx.fillStyle = '#F7F7F7'; // Light gray
      ctx.fillRect(0, 0, canvasRef.current.width, 40);
      
      // Draw URL bar
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(120, 8, canvasRef.current.width - 180, 24);
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.strokeRect(120, 8, canvasRef.current.width - 180, 24);
      
      // Navigation buttons
      // Back button
      ctx.beginPath();
      ctx.moveTo(30, 20);
      ctx.lineTo(15, 20);
      ctx.lineTo(22, 13);
      ctx.moveTo(15, 20);
      ctx.lineTo(22, 27);
      ctx.strokeStyle = '#505050';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Forward button
      ctx.beginPath();
      ctx.moveTo(60, 20);
      ctx.lineTo(75, 20);
      ctx.lineTo(68, 13);
      ctx.moveTo(75, 20);
      ctx.lineTo(68, 27);
      ctx.stroke();
      
      // Refresh button
      ctx.beginPath();
      ctx.arc(100, 20, 8, 0, Math.PI * 1.5, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(100, 12);
      ctx.lineTo(105, 12);
      ctx.lineTo(102, 17);
      ctx.closePath();
      ctx.fillStyle = '#505050';
      ctx.fill();
      
      // Display URL
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(currentUrl.length > 50 ? currentUrl.substring(0, 47) + '...' : currentUrl, 125, 24);
      
      // Restore the main content
      ctx.putImageData(imgData, 0, 40);
      
      texture.needsUpdate = true;
    }
  });
  
  // Handle clicks on the browser
  const handleBrowserClick = (e) => {
    // For now, just detect clicks but we can't forward them to the iframe
    // due to same-origin policy limitations
    console.log('Browser click detected');
  };
  
  return (
    <BaseScreen
      id={id}
      position={position}
      title="Browser"
      width={1.0}
      height={0.75}
    >
      <Interactive onSelect={handleBrowserClick}>
        <mesh>
          <planeGeometry args={[1.0, 0.75]} />
          <meshBasicMaterial map={texture} transparent={true} />
        </mesh>
      </Interactive>
    </BaseScreen>
  );
};

export default BrowserScreen; 