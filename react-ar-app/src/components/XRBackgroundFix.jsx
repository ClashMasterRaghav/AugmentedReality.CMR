import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';

/**
 * Component that fixes AR black screen issues by adjusting renderer settings
 */
const XRBackgroundFix = () => {
  const { gl, scene } = useThree();
  const { isPresenting } = useXR();
  
  useEffect(() => {
    // When AR mode starts, set up for transparent background
    if (isPresenting) {
      console.log('AR mode started - setting transparent background');
      
      // Set renderer to be transparent
      gl.setClearColor(0x000000, 0);
      gl.setClearAlpha(0);
      
      // Critical: Set xrCompatible and preserve drawing buffer
      gl.xr.enabled = true;
      gl.xr.setReferenceSpaceType('unbounded');
      
      // Make sure canvas is transparent
      const canvas = gl.domElement;
      canvas.style.backgroundColor = 'transparent';
      
      // Make sure the session is properly set
      const session = gl.xr.getSession();
      if (session) {
        console.log('XR session configured for camera passthrough');
        
        // Ensure proper blending of virtual content with real world
        scene.traverse(obj => {
          if (obj.isMesh) {
            obj.material.transparent = true;
            obj.material.needsUpdate = true;
          }
        });
      }
    } else {
      // When not in AR mode, set a regular background
      console.log('Regular mode - setting normal background');
      gl.setClearColor(0x000000, 1);
      gl.setClearAlpha(1);
    }
    
    // Update the renderer
    gl.setPixelRatio(window.devicePixelRatio);
    
  }, [isPresenting, gl, scene]);
  
  return null; // This component doesn't render anything
};

export default XRBackgroundFix; 