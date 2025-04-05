import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import BaseScreen from './BaseScreen';
import { createHTMLTexture, createLoadingTexture } from '../../utils/createHTMLTexture';

/**
 * MapsScreen component for displaying Google Maps
 */
const MapsScreen = ({ id, position, satellite = true }) => {
  const [texture, setTexture] = useState(null);
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);
  const loadingTexture = useRef(createLoadingTexture('Loading Maps...', '#E5E3DF'));
  
  // Setup iframe and initial texture
  useEffect(() => {
    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    canvasRef.current = canvas;
    
    // Set initial loading texture
    setTexture(loadingTexture.current);
    
    // Create iframe for Google Maps embed
    const iframe = document.createElement('iframe');
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.border = 'none';
    
    // Set up Google Maps URL with satellite view if requested
    const mapsUrl = satellite 
      ? 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d14021.580710370736!2d77.2273!3d28.6129!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sin!4v1612345678901!5m2!1sen!2sin'
      : 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d14021.580710370736!2d77.2273!3d28.6129!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sin!4v1612345678901!5m2!1sen!2sin';
    
    iframe.src = mapsUrl;
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
  }, [satellite]);
  
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
    }, 1000);
    
    return () => clearInterval(updateInterval);
  }, [iframeRef.current, canvasRef.current]);
  
  // Draw Maps UI on the texture canvas
  useFrame(() => {
    if (texture && texture !== loadingTexture.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      
      // Google Maps has its own UI, so we don't need to add much
      // Just add a simple header at the top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, canvasRef.current.width, 40);
      
      // Add Google Maps branding
      ctx.fillStyle = '#4285F4'; // Google Blue
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Google Maps', 50, 25);
      
      // Draw a stylized map pin icon
      ctx.fillStyle = '#EA4335'; // Google Red
      ctx.beginPath();
      ctx.arc(25, 20, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.lineTo(25, 35);
      ctx.lineTo(30, 20);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(25, 20, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Buttons for toggle satellite/map view
      ctx.fillStyle = satellite ? '#4285F4' : '#EEEEEE';
      ctx.fillRect(canvasRef.current.width - 170, 8, 70, 24);
      ctx.fillStyle = satellite ? '#EEEEEE' : '#4285F4';
      ctx.fillRect(canvasRef.current.width - 90, 8, 70, 24);
      
      ctx.fillStyle = satellite ? '#FFFFFF' : '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Satellite', canvasRef.current.width - 135, 24);
      
      ctx.fillStyle = satellite ? '#000000' : '#FFFFFF';
      ctx.fillText('Map', canvasRef.current.width - 55, 24);
      
      texture.needsUpdate = true;
    }
  });
  
  // Toggle satellite/map view
  const handleViewToggle = () => {
    // Simulate view toggle - would need to reload iframe with new URL
    console.log('Map view toggle requested');
  };
  
  return (
    <BaseScreen
      id={id}
      position={position}
      title="Google Maps"
      width={1.0}
      height={0.75}
    >
      <Interactive onSelect={handleViewToggle}>
        <mesh>
          <planeGeometry args={[1.0, 0.75]} />
          <meshBasicMaterial map={texture} transparent={true} />
        </mesh>
      </Interactive>
    </BaseScreen>
  );
};

export default MapsScreen; 