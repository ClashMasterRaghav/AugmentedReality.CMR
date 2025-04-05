import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR, Interactive } from '@react-three/xr';
import * as THREE from 'three';
import DragHandle from '../DragHandle';
import { useScreenStore } from '../../store/screenStore';

/**
 * Base component for all screen types
 */
const BaseScreen = ({ 
  id, 
  position = [0, 0, -1.5], 
  rotation = [0, 0, 0], 
  width = 1.0, 
  height = 0.75, 
  title = 'Screen', 
  children 
}) => {
  const { isPresenting } = useXR();
  const frameRef = useRef();
  const screenGroup = useRef();
  const [isSelected, setIsSelected] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [initialPlacement, setInitialPlacement] = useState(true);
  
  // Access screen store
  const setSelectedScreenId = useScreenStore(state => state.setSelectedScreenId);
  const selectedScreenId = useScreenStore(state => state.selectedScreenId);
  
  // Set initial position with a small delay for better AR placement
  useEffect(() => {
    if (screenGroup.current) {
      // Set initial rotation
      if (rotation) {
        screenGroup.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
      
      // Add initial scale animation for better visibility
      screenGroup.current.scale.set(0.01, 0.01, 0.01);
      
      // Delayed placement for AR initialization
      const timer = setTimeout(() => {
        // Set position
        screenGroup.current.position.set(position[0], position[1], position[2]);
        
        // Animate to full size
        const duration = 500; // ms
        const startTime = Date.now();
        
        function animateScale() {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutCubic = 1 - Math.pow(1 - progress, 3); // Easing function
          
          if (screenGroup.current) {
            const scale = 0.01 + easeOutCubic * 0.99; // Grow from 0.01 to 1.0
            screenGroup.current.scale.set(scale, scale, scale);
          }
          
          if (progress < 1) {
            requestAnimationFrame(animateScale);
          } else {
            setInitialPlacement(false);
          }
        }
        
        animateScale();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Update selection state when selected screen changes
  useEffect(() => {
    setIsSelected(selectedScreenId === id);
  }, [selectedScreenId, id]);
  
  // Select this screen
  const handleSelect = (e) => {
    e.stopPropagation();
    setSelectedScreenId(id);
    console.log(`Selected screen: ${id}`);
  };
  
  // Track visibility based on camera position
  useFrame(({ camera, clock }) => {
    if (!screenGroup.current || initialPlacement) return;
    
    // Check if screen is in view
    const screenPos = new THREE.Vector3();
    screenGroup.current.getWorldPosition(screenPos);
    const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const screenDir = screenPos.clone().sub(camera.position).normalize();
    const dotProduct = cameraDir.dot(screenDir);
    
    // If screen is behind camera or too far from view center, consider it not visible
    const isInView = dotProduct > 0.3; // Within about 70 degrees of center view
    setIsVisible(isInView);
    
    // Small hover animation when selected
    if (isSelected && isPresenting) {
      const hoverOffset = Math.sin(clock.getElapsedTime() * 2) * 0.005;
      screenGroup.current.position.y = position[1] + hoverOffset;
      
      // Add a subtle pulsing glow to make it more visible in AR
      if (frameRef.current) {
        const intensity = 0.8 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
        const material = frameRef.current.material;
        if (material && material.emissiveIntensity !== undefined) {
          material.emissiveIntensity = intensity;
          material.needsUpdate = true;
        }
      }
    }
  });
  
  return (
    <group ref={screenGroup}>
      {/* Screen frame with glow effect */}
      <Interactive onSelect={handleSelect}>
        <mesh 
          ref={frameRef}
          position={[0, 0, -0.01]}
          onClick={handleSelect}
        >
          <boxGeometry args={[width + 0.05, height + 0.05, 0.01]} />
          <meshStandardMaterial 
            color={isSelected ? "#4285F4" : "#2a2a2a"} 
            emissive={isSelected ? "#4285F4" : "#333333"}
            emissiveIntensity={0.8}
            transparent={true} 
            opacity={0.9}
          />
        </mesh>
      </Interactive>
      
      {/* Screen title */}
      <Text
        position={[0, height / 2 + 0.05, 0]}
        fontSize={0.04}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.005}
        outlineColor="#000000"
      >
        {title}
      </Text>
      
      {/* Screen content (passed as children) */}
      {children}
      
      {/* Visibility indicator for screens outside of view */}
      {!isVisible && isPresenting && (
        <mesh position={[0, 0, 0.02]} rotation={[0, 0, 0]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} />
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.05}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Look this way to see screen
          </Text>
        </mesh>
      )}
      
      {/* Drag handle (only visible when selected) */}
      {isSelected && (
        <DragHandle 
          screenId={id} 
          position={[0, height / 2 + 0.1, 0]} 
          screenRef={screenGroup} 
        />
      )}
    </group>
  );
};

export default BaseScreen; 