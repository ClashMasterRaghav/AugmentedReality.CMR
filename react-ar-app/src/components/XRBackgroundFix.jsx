import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';

/**
 * Component that fixes AR black screen issues by adjusting renderer settings
 */
const XRBackgroundFix = () => {
  const { gl } = useThree();
  const { isPresenting } = useXR();
  
  useEffect(() => {
    // When AR mode starts, set alpha to true for transparent background
    if (isPresenting) {
      console.log('AR mode started - setting transparent background');
      gl.setClearColor(0x000000, 0); // Set alpha to 0 for transparent background
      gl.setClearAlpha(0);
      
      // Make sure we're not overriding the camera background
      const session = gl.xr.getSession();
      if (session) {
        console.log('XR session found, checking for background settings');
        // Additional checks that might be needed
        gl.xr.enabled = true;
      }
    } else {
      // When not in AR mode, set a regular background
      console.log('Regular mode - setting normal background');
      gl.setClearColor(0x000000, 1);
      gl.setClearAlpha(1);
    }
  }, [isPresenting, gl]);
  
  return null; // This component doesn't render anything
};

export default XRBackgroundFix; 