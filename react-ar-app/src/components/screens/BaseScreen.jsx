import React, { useState, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import { useScreenInteraction } from '../../hooks/useScreenInteraction';
import DragHandle from '../DragHandle';

/**
 * Base screen component that provides common functionality for all screen types
 */
const BaseScreen = ({
  id,
  position = [0, 0, -1.5],
  title = "Screen",
  width = 1.0,
  height = 0.75,
  children,
}) => {
  const [scale, setScale] = useState(0.01);
  const { 
    ref, 
    isSelected,
    handleSelect,
    handleHover,
    handleUnhover
  } = useScreenInteraction({ screenId: id, position });

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setScale(1.0), 100);
    return () => clearTimeout(timer);
  }, []);

  // Add subtle floating animation for selected screens
  useFrame(({ clock }) => {
    if (ref.current && isSelected) {
      // Very subtle y-axis movement
      ref.current.position.y += Math.sin(clock.getElapsedTime() * 2) * 0.0001;
    }
  });

  return (
    <Interactive
      onSelect={handleSelect}
      onHover={handleHover}
      onBlur={handleUnhover}
    >
      <group 
        ref={ref}
        position={position}
        scale={[scale, scale, scale]}
      >
        {/* Screen content background */}
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#222222" />
        </mesh>

        {/* Border/highlight for the screen */}
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[width + 0.02, height + 0.02]} />
          <meshBasicMaterial 
            color={isSelected ? "#1a73e8" : "#444444"} 
            transparent 
            opacity={isSelected ? 0.8 : 0.5} 
          />
        </mesh>
        
        {/* Selection glow effect */}
        {isSelected && (
          <mesh position={[0, 0, -0.002]}>
            <planeGeometry args={[width + 0.05, height + 0.05]} />
            <meshBasicMaterial 
              color="#6495ED" 
              transparent 
              opacity={0.3} 
              blending={2} // Additive blending for glow effect
            />
          </mesh>
        )}

        {/* Title bar */}
        <mesh position={[0, height/2 + 0.03, 0]}>
          <planeGeometry args={[width, 0.06]} />
          <meshBasicMaterial color="#333333" />
        </mesh>

        {/* Title text */}
        <Text
          position={[0, height/2 + 0.03, 0.001]}
          fontSize={0.03}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>

        {/* Drag handle */}
        <DragHandle
          screenId={id}
          position={[0, height/2 + 0.03, 0.002]}
          width={width - 0.1}
          height={0.06}
          opacity={0}
        />

        {/* Screen content (passed as children) */}
        <group position={[0, 0, 0.001]}>
          {children}
        </group>
      </group>
    </Interactive>
  );
};

export default BaseScreen; 