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

// Screens container component that manages all screens
const Screens = () => {
  const screens = useScreenStore(state => state.screens);
  const { isPresenting } = useXR();
  
  return (
    <>
      {screens.map(screen => {
        const { id, type, position } = screen;
        
        // Convert position array to Vector3
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
      
      {/* Add a default screen if no screens exist and we're in AR */}
      {screens.length === 0 && isPresenting && (
        <DefaultScreen id="default" position={[0, 0, -1.5]} />
      )}
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
  
  // Check for WebXR compatibility
  useEffect(() => {
    if (!'xr' in navigator) {
      setIsCompatible(false);
    } else {
      navigator.xr?.isSessionSupported('immersive-ar')
        .then(supported => setIsCompatible(supported))
        .catch(() => setIsCompatible(false));
    }
  }, []);
  
  return (
    <>
      <ARButton 
        sessionInit={{ 
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
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
      
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <XR>
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
          
          {/* Environment for better visuals */}
          <Environment preset="sunset" />
        </XR>
        
        {/* Controls for non-AR mode */}
        <OrbitControls enableDamping dampingFactor={0.1} />
        
        {/* Info panel for non-AR mode */}
        <InfoPanel />
      </Canvas>
    </>
  );
};

export default App; 