import React, { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
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
  
  // Get screen update function from store
  const updateScreenPosition = useScreenStore(state => state.updateScreenPosition);
  
  // Start dragging
  const handleDragStart = (e) => {
    e.stopPropagation();
    
    if (!screenRef.current) return;
    
    setIsDragging(true);
    dragStartPos.current = new THREE.Vector3().copy(e.intersection.point);
    screenStartPos.current = new THREE.Vector3().copy(screenRef.current.position);
    
    console.log('Drag started at', dragStartPos.current);
  };
  
  // Continue dragging
  const handleDrag = (e) => {
    if (!isDragging || !dragStartPos.current || !screenRef.current) return;
    
    // Get current controller/pointer position
    const currentPoint = e.intersection.point;
    
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
    
    // Update final position in store
    const position = screenRef.current.position;
    updateScreenPosition(screenId, [position.x, position.y, position.z]);
    
    console.log('Drag ended at', position);
  };
  
  // Handle rotation using the controller
  const handleRotate = (e) => {
    e.stopPropagation();
    
    if (!screenRef.current) return;
    
    // Get direction to look at (towards the camera/player)
    const lookAtPos = isPresenting && player
      ? player.position.clone()
      : camera.position.clone();
    
    // Only rotate horizontally (y-axis)
    lookAtPos.y = screenRef.current.position.y;
    
    // Face the screen towards the user
    screenRef.current.lookAt(lookAtPos);
  };
  
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
      <Interactive onSelect={handleRotate}>
        <mesh position={[0.2, 0, 0]}>
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