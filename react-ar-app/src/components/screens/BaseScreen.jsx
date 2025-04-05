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
  
  // Access screen store
  const setSelectedScreenId = useScreenStore(state => state.setSelectedScreenId);
  const selectedScreenId = useScreenStore(state => state.selectedScreenId);
  
  // Set initial position
  useEffect(() => {
    if (screenGroup.current) {
      screenGroup.current.position.set(position[0], position[1], position[2]);
      
      if (rotation) {
        screenGroup.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
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
  
  // Add a subtle animation to make the screen more noticeable in AR
  useFrame(({ clock }) => {
    if (screenGroup.current && isPresenting) {
      // Small hover animation when selected
      if (isSelected) {
        const hoverOffset = Math.sin(clock.getElapsedTime() * 2) * 0.005;
        screenGroup.current.position.y = position[1] + hoverOffset;
      }
      
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