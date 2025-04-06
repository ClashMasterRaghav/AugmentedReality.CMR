import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * Component that fixes AR black screen issues and ensures camera output is visible
 * Also sets up the rendering environment for absolute coordinates in AR
 */
const XRBackgroundFix = () => {
  const { gl, scene } = useThree();
  const { isPresenting } = useXR();
  
  useEffect(() => {
    // When AR mode starts, set up for transparent background and camera passthrough
    if (isPresenting) {
      console.log('AR mode started - configuring for camera passthrough and absolute coordinates');
      
      // Set renderer to be transparent
      gl.setClearColor(0x000000, 0);
      gl.setClearAlpha(0);
      
      // Critical: Set up for AR with absolute coordinate system
      gl.xr.enabled = true;
      
      // Use 'unbounded' reference space for true absolute positioning
      // This is similar to how the Three.js prototype positions cones
      gl.xr.setReferenceSpaceType('unbounded');
      
      // Additional WebXR settings to ensure proper camera display
      const session = gl.xr.getSession();
      if (session) {
        console.log('XR session configured for camera passthrough and absolute coordinates');
        
        // Request required features for absolute positioning
        session.requestReferenceSpace('unbounded').then(space => {
          console.log('Unbounded reference space acquired - absolute coordinates enabled');
        }).catch(err => {
          console.warn('Unbounded reference space not available, falling back:', err);
          // Try with local-floor as fallback
          session.requestReferenceSpace('local-floor').then(space => {
            console.log('Using local-floor reference space');
          });
        });
        
        // Make sure canvas is transparent for camera passthrough
        const canvas = gl.domElement;
        canvas.style.backgroundColor = 'transparent';
      }
      
      // Set up scene for proper blending with real world
      scene.traverse(obj => {
        if (obj.isMesh) {
          obj.material.transparent = true;
          obj.material.needsUpdate = true;
        }
      });
    } else {
      // When not in AR mode, set a regular background
      console.log('Regular mode - setting normal background');
      gl.setClearColor(0x000000, 1);
      gl.setClearAlpha(1);
    }
    
    // Update the renderer for proper display
    gl.setPixelRatio(window.devicePixelRatio);
    
  }, [isPresenting, gl, scene]);
  
  return null; // This component doesn't render anything
};

export default XRBackgroundFix; 