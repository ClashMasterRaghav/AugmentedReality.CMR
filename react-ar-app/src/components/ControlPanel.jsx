import React, { useState, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Interactive, useXR } from '@react-three/xr';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useScreenStore } from '../store/screenStore';

/**
 * ControlPanel component for creating and managing screens in AR
 */
const ControlPanel = ({ position = [0, 0, 0], visible = true }) => {
  const { player, isPresenting } = useXR();
  const { camera } = useThree();
  const panelRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'
  
  // Access screen store functions
  const addScreen = useScreenStore(state => state.addScreen);
  const removeScreen = useScreenStore(state => state.removeScreen);
  const clearScreens = useScreenStore(state => state.clearScreens);
  const screens = useScreenStore(state => state.screens);
  const selectedScreenId = useScreenStore(state => state.selectedScreenId);
  
  // Position control panel in front of user when showing
  const updatePanelPosition = () => {
    if (!panelRef.current || !visible) return;
    
    // Get position in front of user/camera
    const viewerPosition = isPresenting && player
      ? player.position.clone()
      : camera.position.clone();
    
    const viewerDirection = isPresenting && player
      ? new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion)
      : new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    
    // Calculate position in front of user
    const panelPosition = viewerPosition.clone().add(
      viewerDirection.multiplyScalar(0.5) // Place 0.5 meters in front
    );
    
    // Keep panel height at waist level
    panelPosition.y = isPresenting
      ? viewerPosition.y - 0.3 // Below eye level in VR
      : viewerPosition.y - 0.2; // Slightly below camera in non-VR
    
    // Apply position
    panelRef.current.position.copy(panelPosition);
    
    // Look at user
    panelRef.current.lookAt(
      viewerPosition.x,
      panelRef.current.position.y, // Keep y-level the same (don't tilt up/down)
      viewerPosition.z
    );
  };
  
  // Use Frame hook to continually update position in AR mode
  useFrame(() => {
    if (isPresenting) {
      updatePanelPosition();
    }
  });
  
  // Also update position on regular component updates
  useEffect(() => {
    updatePanelPosition();
  }, [isPresenting, visible]);
  
  // Toggle panel open/closed
  const togglePanel = () => {
    setIsOpen(!isOpen);
  };
  
  // Create new screen of specified type
  const createScreen = (type) => {
    // Get position in front of user/camera
    const viewerPosition = isPresenting && player
      ? player.position.clone()
      : camera.position.clone();
    
    const viewerDirection = isPresenting && player
      ? new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion)
      : new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    
    // Calculate absolute world position using controller matrix approach
    // Similar to how cones are positioned in the Three.js prototype
    const screenPosition = viewerPosition.clone().add(
      viewerDirection.multiplyScalar(1.5) // 1.5 meters in front
    );
    
    // Create a matrix to get absolute world coordinates
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.makeRotationFromQuaternion(
      isPresenting && player ? player.quaternion : camera.quaternion
    );
    tempMatrix.setPosition(viewerPosition);
    
    // Apply matrix to get absolute world coordinates (like in the Three.js prototype)
    const absolutePosition = screenPosition.clone();
    
    // Add screen with absolute coordinates
    addScreen(type, absolutePosition);
    
    // Log for debugging
    console.log(`Creating ${type} screen at absolute position:`, absolutePosition);
  };
  
  // Switch between tabs
  const switchTab = (tab) => {
    setActiveTab(tab);
  };
  
  // Panel is always visible if requested
  if (!visible) return null;
  
  return (
    <group ref={panelRef} position={position}>
      {/* Main panel body */}
      <mesh
        position={[0, 0, 0]}
        onClick={(e) => e.stopPropagation()}
      >
        <boxGeometry args={[0.3, isOpen ? 0.25 : 0.05, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Panel handle/header */}
      <Interactive onSelect={togglePanel}>
        <group position={[0, isOpen ? 0.125 : 0, 0.011]}>
          <mesh>
            <planeGeometry args={[0.3, 0.05]} />
            <meshStandardMaterial color="#1a73e8" />
          </mesh>
          
          <Text
            position={[0, 0, 0.005]}
            fontSize={0.02}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {isOpen ? 'CONTROL PANEL [X]' : 'CONTROL PANEL [+]'}
          </Text>
        </group>
      </Interactive>
      
      {/* Panel content (only visible when open) */}
      {isOpen && (
        <>
          {/* Tab switcher */}
          <group position={[0, 0.075, 0.011]}>
            <Interactive onSelect={() => switchTab('create')}>
              <mesh position={[-0.075, 0, 0]}>
                <planeGeometry args={[0.14, 0.04]} />
                <meshStandardMaterial color={activeTab === 'create' ? '#4285F4' : '#555555'} />
              </mesh>
            </Interactive>
            
            <Interactive onSelect={() => switchTab('manage')}>
              <mesh position={[0.075, 0, 0]}>
                <planeGeometry args={[0.14, 0.04]} />
                <meshStandardMaterial color={activeTab === 'manage' ? '#4285F4' : '#555555'} />
              </mesh>
            </Interactive>
            
            <Text
              position={[-0.075, 0, 0.005]}
              fontSize={0.016}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              Create
            </Text>
            
            <Text
              position={[0.075, 0, 0.005]}
              fontSize={0.016}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              Manage
            </Text>
          </group>
          
          {/* Tab content */}
          {activeTab === 'create' ? (
            // Create screens tab content
            <group position={[0, 0, 0.011]}>
              {/* Screen creation buttons */}
              <Interactive onSelect={() => createScreen('default')}>
                <mesh position={[-0.12, 0.03, 0]}>
                  <planeGeometry args={[0.13, 0.045]} />
                  <meshStandardMaterial color="#EA4335" />
                </mesh>
              </Interactive>
              
              <Interactive onSelect={() => createScreen('browser')}>
                <mesh position={[0, 0.03, 0]}>
                  <planeGeometry args={[0.13, 0.045]} />
                  <meshStandardMaterial color="#4285F4" />
                </mesh>
              </Interactive>
              
              <Interactive onSelect={() => createScreen('youtube')}>
                <mesh position={[0.12, 0.03, 0]}>
                  <planeGeometry args={[0.13, 0.045]} />
                  <meshStandardMaterial color="#FF0000" />
                </mesh>
              </Interactive>
              
              <Interactive onSelect={() => createScreen('maps')}>
                <mesh position={[-0.12, -0.03, 0]}>
                  <planeGeometry args={[0.13, 0.045]} />
                  <meshStandardMaterial color="#34A853" />
                </mesh>
              </Interactive>
              
              <Interactive onSelect={() => createScreen('electron')}>
                <mesh position={[0, -0.03, 0]}>
                  <planeGeometry args={[0.13, 0.045]} />
                  <meshStandardMaterial color="#2F3241" />
                </mesh>
              </Interactive>
              
              <Interactive onSelect={() => clearScreens()}>
                <mesh position={[0.12, -0.03, 0]}>
                  <planeGeometry args={[0.13, 0.045]} />
                  <meshStandardMaterial color="#FBBC05" />
                </mesh>
              </Interactive>
              
              {/* Button labels */}
              <Text position={[-0.12, 0.03, 0.005]} fontSize={0.013} color="white" anchorX="center" anchorY="middle">Default</Text>
              <Text position={[0, 0.03, 0.005]} fontSize={0.013} color="white" anchorX="center" anchorY="middle">Browser</Text>
              <Text position={[0.12, 0.03, 0.005]} fontSize={0.013} color="white" anchorX="center" anchorY="middle">YouTube</Text>
              <Text position={[-0.12, -0.03, 0.005]} fontSize={0.013} color="white" anchorX="center" anchorY="middle">Maps</Text>
              <Text position={[0, -0.03, 0.005]} fontSize={0.013} color="white" anchorX="center" anchorY="middle">GitHub</Text>
              <Text position={[0.12, -0.03, 0.005]} fontSize={0.013} color="white" anchorX="center" anchorY="middle">Clear All</Text>
            </group>
          ) : (
            // Manage screens tab content
            <group position={[0, 0, 0.011]}>
              {screens.length > 0 ? (
                <>
                  {/* Show screen counter */}
                  <Text
                    position={[0, 0.03, 0]}
                    fontSize={0.016}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                  >
                    {`Screens: ${screens.length}`}
                  </Text>
                  
                  {/* Delete selected screen button */}
                  {selectedScreenId && (
                    <Interactive onSelect={() => removeScreen(selectedScreenId)}>
                      <mesh position={[0, -0.015, 0]}>
                        <planeGeometry args={[0.2, 0.04]} />
                        <meshStandardMaterial color="#EA4335" />
                      </mesh>
                      
                      <Text
                        position={[0, -0.015, 0.005]}
                        fontSize={0.013}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                      >
                        Delete Selected Screen
                      </Text>
                    </Interactive>
                  )}
                </>
              ) : (
                <Text
                  position={[0, 0, 0]}
                  fontSize={0.016}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                >
                  No screens created yet
                </Text>
              )}
            </group>
          )}
          
          {/* Info text at bottom */}
          <Text
            position={[0, -0.09, 0.011]}
            fontSize={0.011}
            color="#CCCCCC"
            anchorX="center"
            anchorY="middle"
          >
            Tap to interact with screens
          </Text>
        </>
      )}
    </group>
  );
};

export default ControlPanel; 