import React, { useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Interactive, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useScreenStore } from '../store/screenStore';

/**
 * DragHandle component for moving screens in 3D space
 * Uses absolute positioning logic similar to the Three.js prototype
 */
const DragHandle = ({ screenId, position, screenRef }) => {
  const { player, isPresenting } = useXR();
  const { camera } = useThree();
  const handleRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [initialControllerPosition, setInitialControllerPosition] = useState(null);
  const [initialScreenPosition, setInitialScreenPosition] = useState(null);
  
  // Get updateScreenPosition from store
  const updateScreenPosition = useScreenStore(state => state.updateScreenPosition);
  
  // Handle drag start
  const handleDragStart = (e) => {
    setIsDragging(true);
    
    // Store initial positions for relative movement calculation
    const controllerPosition = new THREE.Vector3();
    controllerPosition.setFromMatrixPosition(e.controller.matrixWorld);
    setInitialControllerPosition(controllerPosition.clone());
    
    // Store initial screen position
    setInitialScreenPosition(screenRef.current.position.clone());
    
    // Create matrix to get absolute coordinates (like in the Three.js prototype)
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(e.controller.matrixWorld);
    
    console.log('Started dragging screen:', screenId);
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setInitialControllerPosition(null);
    setInitialScreenPosition(null);
    console.log('Ended dragging screen:', screenId);
    
    // Update store with final position
    if (screenRef.current) {
      updateScreenPosition(screenId, [
        screenRef.current.position.x,
        screenRef.current.position.y,
        screenRef.current.position.z
      ]);
    }
  };
  
  // Update position during dragging
  useFrame(({ clock }) => {
    // Animate handle to make it more noticeable
    if (handleRef.current) {
      handleRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
    
    // Handle drag movement using absolute positioning
    if (isDragging && initialControllerPosition && initialScreenPosition) {
      // Get current controller position
      const controller = isPresenting ? player.children[0] : camera;
      const currentControllerPosition = new THREE.Vector3();
      
      if (controller.matrixWorld) {
        currentControllerPosition.setFromMatrixPosition(controller.matrixWorld);
        
        // Calculate movement delta in absolute world coordinates
        const delta = new THREE.Vector3().subVectors(
          currentControllerPosition, 
          initialControllerPosition
        );
        
        // Apply movement delta to screen position
        // Using absolute coordinates similar to the Three.js prototype
        screenRef.current.position.copy(initialScreenPosition.clone().add(delta));
      }
    }
  });
  
  return (
    <Interactive
      onSelectStart={handleDragStart}
      onSelectEnd={handleDragEnd}
    >
      <group position={position}>
        <mesh ref={handleRef}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial 
            color="#4285F4"
            emissive="#4285F4"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
    </Interactive>
  );
};

export default DragHandle; 