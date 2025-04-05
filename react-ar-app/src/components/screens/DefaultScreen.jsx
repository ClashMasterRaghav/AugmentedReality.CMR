import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import BaseScreen from './BaseScreen';

/**
 * DefaultScreen component that serves as the welcome screen
 */
const DefaultScreen = ({ id, position }) => {
  const [textureCanvas] = useState(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    return canvas;
  });
  
  const [texture, setTexture] = useState(null);
  const gradientOffset = useRef(0);
  const logoRotation = useRef(0);
  
  // Create initial texture
  useEffect(() => {
    const newTexture = new THREE.CanvasTexture(textureCanvas);
    setTexture(newTexture);
    
    // Clean up texture when component unmounts
    return () => {
      if (newTexture) newTexture.dispose();
    };
  }, [textureCanvas]);
  
  // Animate the welcome screen
  useFrame(({ clock }) => {
    if (!texture || !textureCanvas) return;
    
    const ctx = textureCanvas.getContext('2d');
    
    // Animated gradient background
    gradientOffset.current = (gradientOffset.current + 0.005) % 1;
    const gradient = ctx.createLinearGradient(
      0, 0, 
      textureCanvas.width, textureCanvas.height
    );
    
    // Shift hues over time for a subtle rainbow effect
    const time = clock.getElapsedTime() * 0.1;
    gradient.addColorStop(0, `hsl(${(time * 20) % 360}, 70%, 20%)`);
    gradient.addColorStop(gradientOffset.current, `hsl(${(time * 20 + 60) % 360}, 70%, 25%)`);
    gradient.addColorStop(1, `hsl(${(time * 20 + 120) % 360}, 70%, 20%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
    
    // Draw a grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const offsetX = Math.sin(time) * 10;
    const offsetY = Math.cos(time) * 10;
    
    // Vertical lines
    for (let x = offsetX % gridSize; x < textureCanvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, textureCanvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = offsetY % gridSize; y < textureCanvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(textureCanvas.width, y);
      ctx.stroke();
    }
    
    // Draw a stylized AR logo in the center
    const centerX = textureCanvas.width / 2;
    const centerY = textureCanvas.height / 2 - 50;
    const logoSize = 120 + Math.sin(time * 2) * 10;
    
    // Save the current context state
    ctx.save();
    
    // Translate to center and rotate
    ctx.translate(centerX, centerY);
    logoRotation.current += 0.001;
    ctx.rotate(Math.sin(time * 0.5) * 0.05);
    
    // 'AR' letters - stylized and connected
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Create a light-emitting effect with glow
    ctx.shadowColor = 'rgba(120, 200, 255, 0.8)';
    ctx.shadowBlur = 20;
    
    // Draw 'A'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-logoSize/2, logoSize/2);
    ctx.lineTo(0, -logoSize/2);
    ctx.lineTo(logoSize/2, logoSize/2);
    ctx.stroke();
    
    // Middle bar of 'A'
    ctx.beginPath();
    ctx.moveTo(-logoSize/4, 0);
    ctx.lineTo(logoSize/4, 0);
    ctx.stroke();
    
    // Draw 'R'
    ctx.beginPath();
    ctx.moveTo(-logoSize/4, logoSize * 0.8);
    ctx.lineTo(-logoSize/4, -logoSize * 0.4);
    ctx.lineTo(logoSize/4, -logoSize * 0.4);
    ctx.quadraticCurveTo(logoSize/2, -logoSize * 0.4, logoSize/2, -logoSize * 0.2);
    ctx.quadraticCurveTo(logoSize/2, 0, logoSize/4, 0);
    
    // Leg of the 'R'
    ctx.moveTo(logoSize/4, 0);
    ctx.lineTo(logoSize/2, logoSize * 0.4);
    ctx.stroke();
    
    // Restore the context
    ctx.restore();
    
    // Welcome text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome to AR Multi-Screen', centerX, centerY + 150);
    
    // Instructions
    ctx.font = '24px Arial';
    ctx.fillText('Open the control panel to create new screens', centerX, centerY + 210);
    ctx.fillText('Use the controller to interact with screens', centerX, centerY + 250);
    
    // Animated dots for a loading-like effect
    const numDots = (Math.floor(time * 2) % 4);
    const dots = '.'.repeat(numDots);
    ctx.fillText(`Get started${dots}`, centerX, centerY + 310);
    
    // Version info
    ctx.font = '16px Arial';
    ctx.fillText('v0.1.0', textureCanvas.width - 40, textureCanvas.height - 20);
    
    // Update the texture
    texture.needsUpdate = true;
  });
  
  return (
    <BaseScreen
      id={id}
      position={position}
      title="Welcome"
      width={1.0}
      height={0.75}
    >
      <mesh>
        <planeGeometry args={[1.0, 0.75]} />
        <meshBasicMaterial map={texture} transparent={true} />
      </mesh>
      
      {/* Additional 3D text with depth for a nice effect */}
      <Text
        position={[0, 0.2, 0.01]}
        fontSize={0.05}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#1a73e8"
      >
        AR Experience
      </Text>
    </BaseScreen>
  );
};

export default DefaultScreen; 