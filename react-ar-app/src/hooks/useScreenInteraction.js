import { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, Interactive } from '@react-three/xr';
import { Vector3 } from 'three';
import { useScreenStore } from '../store/screenStore';

/**
 * Hook for handling screen interactions (drag, select, etc.)
 * @param {Object} props - Hook properties
 * @param {string} props.screenId - ID of the screen to handle interactions for
 * @param {Vector3|Array} [props.position] - Initial position
 * @returns {Object} - Interaction handlers and state
 */
export const useScreenInteraction = ({ screenId, position }) => {
  const { camera } = useThree();
  const { isPresenting, player } = useXR();
  const ref = useRef();
  const dragging = useRef(false);
  const dragStartPoint = useRef(null);
  const originalPosition = useRef(position);
  const [isHovered, setIsHovered] = useState(false);
  
  // Get screen data and functions from store
  const updateScreenPosition = useScreenStore(state => state.updateScreenPosition);
  const selectScreen = useScreenStore(state => state.selectScreen);
  const isSelected = useScreenStore(state => 
    state.screens.find(screen => screen.id === screenId)?.isSelected || false
  );

  // Select this screen when clicked/tapped
  const handleSelect = () => {
    selectScreen(screenId);
  };

  // Start drag operation
  const handleDragStart = (e) => {
    e.stopPropagation();
    dragging.current = true;
    
    // Store the current position as the original for this drag operation
    if (ref.current) {
      originalPosition.current = ref.current.position.clone();
    }
    
    // Store controller/pointer position for calculating offset
    if (isPresenting && e.controller) {
      dragStartPoint.current = e.controller.controller.position.clone();
    } else {
      // Non-VR mode: use camera-relative position
      const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      dragStartPoint.current = camera.position.clone().add(forward.multiplyScalar(2));
    }
  };

  // Continue drag operation
  const handleDrag = (e) => {
    if (!dragging.current || !ref.current || !dragStartPoint.current) return;
    
    let currentPoint;
    if (isPresenting && e.controller) {
      // VR mode: use controller position
      currentPoint = e.controller.controller.position.clone();
    } else {
      // Non-VR mode: use camera-relative position
      const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      currentPoint = camera.position.clone().add(forward.multiplyScalar(2));
    }
    
    // Calculate delta movement
    const delta = new Vector3().subVectors(currentPoint, dragStartPoint.current);
    
    // Apply delta to original position
    const newPosition = originalPosition.current.clone().add(delta);
    
    // Update component and store
    ref.current.position.copy(newPosition);
    updateScreenPosition(screenId, newPosition.toArray());
  };

  // End drag operation
  const handleDragEnd = () => {
    dragging.current = false;
    dragStartPoint.current = null;
    
    // Store final position as the new original
    if (ref.current) {
      originalPosition.current = ref.current.position.clone();
      updateScreenPosition(screenId, originalPosition.current.toArray());
    }
  };

  // React to hover state
  const handleHover = () => {
    setIsHovered(true);
  };

  const handleUnhover = () => {
    setIsHovered(false);
  };

  // Face screen toward user/camera
  useFrame(() => {
    if (!ref.current || dragging.current) return;
    
    // Get current camera or player position
    const viewerPosition = isPresenting 
      ? player.position.clone() 
      : camera.position.clone();
    
    // Update lookAt only for horizontal rotation (y-axis)
    const direction = new Vector3().subVectors(viewerPosition, ref.current.position);
    direction.y = 0; // Remove vertical component to only rotate horizontally
    
    // Only apply if there's a meaningful direction
    if (direction.length() > 0.001) {
      ref.current.lookAt(ref.current.position.clone().add(direction));
    }
  });

  return {
    ref,
    isHovered,
    isSelected,
    handleSelect,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    handleHover,
    handleUnhover
  };
}; 