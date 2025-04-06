import React from 'react';
import { useXR } from '@react-three/xr';

/**
 * Helper component that observes AR mode state and passes it to children
 * Used to conditionally render components based on AR mode
 * @param {Object} props
 * @param {Function} props.children - Render prop that receives AR state  
 */
export const ARModeObserver = ({ children }) => {
  const { isPresenting } = useXR();
  
  return children({ isPresenting });
}; 