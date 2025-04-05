import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ARButton, XR, Controllers, Hands, useXR } from '@react-three/xr';
import { Environment, OrbitControls, Html } from '@react-three/drei';
import { useScreenStore } from './store/screenStore';
import ControlPanel from './components/ControlPanel';

// Import screen components
import DefaultScreen from './components/screens/DefaultScreen';
import BrowserScreen from './components/screens/BrowserScreen';
import YouTubeScreen from './components/screens/YouTubeScreen';
import MapsScreen from './components/screens/MapsScreen';
import ElectronScreen from './components/screens/ElectronScreen';

// Camera permission request component
const CameraPermissionRequest = () => {
  const [requested, setRequested] = useState(false);
  
  useEffect(() => {
    if (!requested) {
      // Request camera permission early to ensure smooth AR initialization
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => console.log('Camera permission granted'))
        .catch(err => console.error('Camera permission denied:', err))
        .finally(() => setRequested(true));
    }
  }, [requested]);
  
  return null;
};

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
      addScreen('default', [0, 0, -1.5]);
    }
  }, [isPresenting, screens.length]);
  
  // Debug logging for active screens
  useEffect(() => {
    if (isPresenting) {
      console.log(`Active screens in AR: ${screens.length}`, screens);
    }
  }, [isPresenting, screens]);
  
  return (
    <>
      {screens.map(screen => {
        const { id, type, position } = screen;
        
        // Convert position array to Vector3
        const pos = position ? [...position] : [0, 0, -1.5];
        
        // Log screen rendering for debugging
        console.log(`Rendering screen: ${type} at position:`, pos);
        
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

// Information component for non-AR mode
const InfoPanel = () => {
  return (
    <Html center position={[0, 0, -1]}>
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
    </Html>
  );
};

// Main App component
const App = () => {
  const [isCompatible, setIsCompatible] = useState(true);
  const [arStarted, setArStarted] = useState(false);
  
  // Check for WebXR compatibility
  useEffect(() => {
    if (!('xr' in navigator)) {
      setIsCompatible(false);
    } else {
      navigator.xr?.isSessionSupported('immersive-ar')
        .then(supported => setIsCompatible(supported))
        .catch(() => setIsCompatible(false));
    }
  }, []);
  
  return (
    <>
      {/* Request camera permission early */}
      <CameraPermissionRequest />
      
      <ARButton 
        sessionInit={{ 
          requiredFeatures: ['hit-test', 'camera-access'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
        }}
        onSessionStarted={() => {
          setArStarted(true);
          console.log('AR Session started');
        }}
        onSessionEnded={() => {
          setArStarted(false);
          console.log('AR Session ended');
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
          preserveDrawingBuffer: true
        }}
      >
        <XR
          referenceSpace="local-floor"
          foveation={2}
          sessionInit={{
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay', 'camera-access'],
            domOverlay: { root: document.body }
          }}
        >
          {/* Controllers for interaction */}
          <Controllers rayMaterial={{ color: 'blue' }} hideRaysOnBlur={false} />
          <Hands />
          
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 5, 5]} intensity={0.5} castShadow />
          
          {/* Control panel for managing screens */}
          <ControlPanel visible={true} />
          
          {/* Screen container */}
          <Suspense fallback={null}>
            <Screens />
          </Suspense>
          
          {/* Environment for better visuals */}
          <Environment preset="sunset" />
        </XR>
        
        {/* Controls for non-AR mode */}
        <OrbitControls enableDamping dampingFactor={0.1} />
        
        {/* Info panel for non-AR mode */}
        <InfoPanel />
      </Canvas>
      
      {/* Debug panel for AR mode */}
      {arStarted && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          AR Mode Active
        </div>
      )}
    </>
  );
};

export default App; 