import React, { useRef } from 'react';
import { Interactive } from '@react-three/xr';
import { useScreenStore } from '../store/screenStore';

/**
 * A draggable handle component for screens
 */
const DragHandle = ({ 
  screenId, 
  position = [0, 0, 0], 
  width = 0.5, 
  height = 0.05,
  color = '#333333',
  opacity = 0.5
}) => {
  const ref = useRef();
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, z: 0 });
  const screenPosStart = useRef({ x: 0, y: 0, z: 0 });
  
  // Get screen from store
  const screens = useScreenStore(state => state.screens);
  const updateScreenPosition = useScreenStore(state => state.updateScreenPosition);
  const selectScreen = useScreenStore(state => state.selectScreen);
  
  const screen = screens.find(s => s.id === screenId);
  
  const handleSelectStart = (e) => {
    if (!screen) return;
    
    // Select this screen
    selectScreen(screenId);
    
    // Start drag operation
    dragging.current = true;
    
    // Store starting positions
    if (e.controller) {
      dragStart.current = {
        x: e.controller.controller.position.x,
        y: e.controller.controller.position.y,
        z: e.controller.controller.position.z
      };
      
      screenPosStart.current = {
        x: screen.position[0],
        y: screen.position[1],
        z: screen.position[2]
      };
    }
  };
  
  const handleSelectEnd = () => {
    dragging.current = false;
  };
  
  const handleMove = (e) => {
    if (!dragging.current || !screen) return;
    
    if (e.controller) {
      // Calculate movement delta
      const deltaX = e.controller.controller.position.x - dragStart.current.x;
      const deltaY = e.controller.controller.position.y - dragStart.current.y;
      const deltaZ = e.controller.controller.position.z - dragStart.current.z;
      
      // Apply delta to original screen position
      const newPosition = [
        screenPosStart.current.x + deltaX,
        screenPosStart.current.y + deltaY,
        screenPosStart.current.z + deltaZ
      ];
      
      // Update screen position in store
      updateScreenPosition(screenId, newPosition);
    }
  };
  
  return (
    <Interactive
      onSelect={handleSelectStart}
      onSelectEnd={handleSelectEnd}
      onMove={handleMove}
    >
      <mesh
        ref={ref}
        position={position}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial 
          color={color} 
          transparent={true} 
          opacity={opacity}
        />
      </mesh>
    </Interactive>
  );
};

export default DragHandle; 