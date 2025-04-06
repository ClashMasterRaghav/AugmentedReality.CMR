import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ARButton, XR, Controllers, Hands, useXR } from '@react-three/xr';
import { Environment, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useScreenStore } from './store/screenStore';
import ControlPanel from './components/ControlPanel';
import XRBackgroundFix from './components/XRBackgroundFix';

// Import screen components
import DefaultScreen from './components/screens/DefaultScreen';
import BrowserScreen from './components/screens/BrowserScreen';
import YouTubeScreen from './components/screens/YouTubeScreen';
import MapsScreen from './components/screens/MapsScreen';
import ElectronScreen from './components/screens/ElectronScreen';

// Screens container component that manages all screens
const Screens = () => {
  const screens = useScreenStore(state => state.screens);
  const { isPresenting } = useXR();
  
  // Initialize with a default screen when entering AR mode
  useEffect(() => {
    const addScreen = useScreenStore.getState().addScreen;
    
    // Add a default welcome screen when entering AR mode if no screens exist
    if (isPresenting && screens.length === 0) {
      console.log('Adding default screen for AR mode');
      
      // Use absolute coordinates for screens (similar to the Three.js prototype)
      // Position screens in a semi-circle in front of the user
      // Default screen directly in front with fixed absolute coordinates
      addScreen('default', [0, 0, -1.5]);
      
      // After a short delay, add other screens in a semi-circle if none exist
      setTimeout(() => {
        if (useScreenStore.getState().screens.length <= 1) {
          // Add screens in fixed absolute positions (Apple Vision Pro style)
          addScreen('browser', [-1.0, 0, -1.2]);
          addScreen('youtube', [1.0, 0, -1.2]);
          addScreen('maps', [-0.5, 0.5, -1.0]);
        }
      }, 2000);
    }
  }, [isPresenting, screens.length]);
  
  return (
    <>
      {screens.map(screen => {
        const { id, type, position } = screen;
        
        // Convert position array to absolute Vector3 coordinates
        const pos = position ? [...position] : [0, 0, -1.5];
        
        // Render the appropriate screen component based on type
        switch (type) {
          case 'default':
            return <DefaultScreen key={id} id={id} position={pos} />;
          case 'browser':
            return <BrowserScreen key={id} id={id} position={pos} />;
          case 'youtube':
            return <YouTubeScreen key={id} id={id} position={pos} />;
          case 'maps':
            return <MapsScreen key={id} id={id} position={pos} />;
          case 'electron':
            return <ElectronScreen key={id} id={id} position={pos} />;
          default:
            return <DefaultScreen key={id} id={id} position={pos} />;
        }
      })}
    </>
  );
};

// Main App component
const App = ({ xrSupported = true }) => {
  const [isCompatible, setIsCompatible] = useState(xrSupported);
  
  // Check for WebXR compatibility on mount (fallback if not passed as prop)
  useEffect(() => {
    if (xrSupported === false) {
      setIsCompatible(false);
      console.log('WebXR not supported according to initial check');
      return;
    }
    
    if (!('xr' in navigator)) {
      setIsCompatible(false);
      console.log('WebXR not supported in this browser');
    } else {
      console.log('Checking WebXR AR session support...');
      navigator.xr?.isSessionSupported('immersive-ar')
        .then(supported => {
          console.log('WebXR AR session supported:', supported);
          setIsCompatible(supported);
        })
        .catch((err) => {
          console.error('Error checking AR support:', err);
          setIsCompatible(false);
        });
    }
  }, [xrSupported]);
  
  useEffect(() => {
    // Listen for session changes to debug
    const handleSessionStarted = () => {
      console.log('XR Session started successfully');
    };
    
    const handleSessionEnded = () => {
      console.log('XR Session ended');
    };
    
    window.addEventListener('sessionStarted', handleSessionStarted);
    window.addEventListener('sessionEnded', handleSessionEnded);
    
    return () => {
      window.removeEventListener('sessionStarted', handleSessionStarted);
      window.removeEventListener('sessionEnded', handleSessionEnded);
    };
  }, []);
  
  return (
    <>
      <ARButton 
        sessionInit={{ 
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay', 'camera-access', 'unbounded', 'local-floor'],
          domOverlay: { root: document.body }
        }}
        style={{ 
          position: 'fixed', 
          bottom: '24px',
          width: '150px',
          left: 'calc(50% - 75px)',
          background: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '12px 24px',
          fontWeight: 'bold',
          zIndex: 999,
          cursor: 'pointer'
        }}
        onStart={() => {
          console.log('AR session started by user - setting up for absolute coordinates');
        }}
        onEnd={() => {
          console.log('AR session ended by user');
        }}
        onError={(error) => {
          console.error('AR session error:', error);
          alert('Error starting AR: ' + error.message);
        }}
      />
      
      {!isCompatible && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          background: '#EA4335',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          zIndex: 1000
        }}>
          Your device or browser may not support WebXR. For the best experience, use a compatible AR device.
        </div>
      )}
      
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ 
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        }}
        onClick={() => console.log('Canvas clicked')}
        onCreated={state => {
          console.log('Canvas created with state:', state);
          
          // Set up AR renderer properties explicitly
          if (state.gl) {
            // Set proper color space for AR
            state.gl.outputEncoding = THREE.sRGBEncoding;
            state.gl.physicallyCorrectLights = true;
            
            // Make sure WebXR is properly configured
            if (state.gl.xr) {
              state.gl.xr.enabled = true;
              state.gl.xr.setReferenceSpaceType('unbounded');
            }
          }
        }}
      >
        {/* Info panel for non-AR mode - rendered outside XR context */}
        <Html center position={[0, 0, -1]}>
          {!isCompatible && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '20px',
              borderRadius: '10px',
              width: '300px',
              textAlign: 'center'
            }}>
              <h2>AR Multi-Screen Experience</h2>
              <p>Click the "AR" button to start the AR experience.</p>
              <p>In AR mode, you'll be able to create and interact with multiple screens.</p>
              <p>Not compatible? Try on a WebXR-enabled device and browser.</p>
            </div>
          )}
        </Html>
        
        {/* Controls for non-AR mode - outside XR context so they always work */}
        <OrbitControls enableDamping dampingFactor={0.1} />
        
        <XR
          referenceSpace="unbounded"
        >
          {/* Fix for black screen in AR */}
          <XRBackgroundFix />
          
          {/* Controllers for interaction */}
          <Controllers />
          <Hands />
          
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 5, 5]} intensity={0.5} castShadow />
          
          {/* Control panel for managing screens */}
          <ControlPanel />
          
          {/* Screen container */}
          <Suspense fallback={null}>
            <Screens />
          </Suspense>
          
          {/* Environment for better visuals - only in non-AR mode */}
          <Environment preset="sunset" />
        </XR>
      </Canvas>
    </>
  );
};

export default App; 