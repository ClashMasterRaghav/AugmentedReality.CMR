import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Interactive, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useScreenStore } from '../store/screenStore';

/**
 * Draggable handle component for screens
 */
const DragHandle = ({ screenId, position, screenRef }) => {
  const { isPresenting, player } = useXR();
  const { camera } = useThree();
  const handleRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef(null);
  const screenStartPos = useRef(null);
  const rotateButtonRef = useRef();
  const [isRotating, setIsRotating] = useState(false);
  
  // Get screen update function from store
  const updateScreenPosition = useScreenStore(state => state.updateScreenPosition);
  
  // Visual feedback for active state
  useEffect(() => {
    if (rotateButtonRef.current) {
      const material = rotateButtonRef.current.material;
      material.emissiveIntensity = isRotating ? 0.8 : 0.5;
      material.needsUpdate = true;
    }
  }, [isRotating]);
  
  // Start dragging
  const handleDragStart = (e) => {
    e.stopPropagation();
    
    if (!screenRef.current) return;
    
    setIsDragging(true);
    dragStartPos.current = new THREE.Vector3().copy(e.intersection.point);
    screenStartPos.current = new THREE.Vector3().copy(screenRef.current.position);
    
    // Visual feedback
    if (handleRef.current) {
      handleRef.current.material.emissiveIntensity = 0.8;
      handleRef.current.material.needsUpdate = true;
    }
    
    console.log('Drag started at', dragStartPos.current);
  };
  
  // Continue dragging
  const handleDrag = (e) => {
    if (!isDragging || !dragStartPos.current || !screenRef.current) return;
    
    // Get current controller/pointer position
    const currentPoint = e.intersection ? e.intersection.point : null;
    if (!currentPoint) return;
    
    // Calculate offset from drag start position
    const offset = new THREE.Vector3().subVectors(currentPoint, dragStartPos.current);
    
    // Apply offset to screen position
    const newPosition = new THREE.Vector3().addVectors(screenStartPos.current, offset);
    
    // Update screen reference position
    screenRef.current.position.copy(newPosition);
    
    // Update position in store
    updateScreenPosition(screenId, [newPosition.x, newPosition.y, newPosition.z]);
  };
  
  // End dragging
  const handleDragEnd = () => {
    setIsDragging(false);
    
    if (!screenRef.current) return;
    
    // Reset visual feedback
    if (handleRef.current) {
      handleRef.current.material.emissiveIntensity = 0.5;
      handleRef.current.material.needsUpdate = true;
    }
    
    // Update final position in store
    const position = screenRef.current.position;
    updateScreenPosition(screenId, [position.x, position.y, position.z]);
    
    console.log('Drag ended at', position);
  };
  
  // Start rotation
  const handleRotateStart = (e) => {
    e.stopPropagation();
    setIsRotating(true);
  };
  
  // End rotation
  const handleRotateEnd = () => {
    setIsRotating(false);
  };
  
  // Continuous rotation update using useFrame
  useFrame(() => {
    if (isRotating && screenRef.current) {
      // Get direction to look at (towards the camera/player)
      const lookAtPos = isPresenting && player
        ? player.position.clone()
        : camera.position.clone();
      
      // Only rotate horizontally (y-axis)
      lookAtPos.y = screenRef.current.position.y;
      
      // Face the screen towards the user
      screenRef.current.lookAt(lookAtPos);
    }
  });
  
  return (
    <group position={position}>
      {/* Drag handle */}
      <Interactive 
        onSelect={handleDragStart}
        onSelectEnd={handleDragEnd}
        onSelectMissed={handleDragEnd}
        onMove={handleDrag}
      >
        <mesh ref={handleRef}>
          <boxGeometry args={[0.25, 0.08, 0.02]} />
          <meshStandardMaterial 
            color="#1a73e8" 
            emissive="#1a73e8"
            emissiveIntensity={0.5}
          />
        </mesh>
      </Interactive>
      
      {/* Rotate button */}
      <Interactive 
        onSelect={handleRotateStart}
        onSelectEnd={handleRotateEnd}
      >
        <mesh 
          ref={rotateButtonRef}
          position={[0.2, 0, 0]}
        >
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial 
            color="#EA4335" 
            emissive="#EA4335"
            emissiveIntensity={0.5}
          />
        </mesh>
      </Interactive>
    </group>
  );
};

export default DragHandle; 