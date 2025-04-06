import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as THREE from 'three';

// Debug resource loading issues
console.log('Public URL:', process.env.PUBLIC_URL);
console.log('Base path:', window.location.pathname);

// Create dynamic favicon to prevent 404 errors
const createFavicon = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  
  const ctx = canvas.getContext('2d');
  
  // Blue background
  ctx.fillStyle = '#1a73e8';
  ctx.fillRect(0, 0, 64, 64);
  
  // White AR text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AR', 32, 32);
  
  // Create favicon link element
  const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  link.href = canvas.toDataURL('image/x-icon');
  document.head.appendChild(link);
};

// Create dynamic favicon
createFavicon();

// Listen for resource loading errors to debug 404s
window.addEventListener('error', function(e) {
  if (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'IMG') {
    console.warn('Resource failed to load:', e.target.src || e.target.href);
  }
}, true);

// Check if WebXR is available
const checkXRSupport = async () => {
  // Check basic navigator.xr support
  if (!navigator.xr) {
    console.warn('WebXR not supported by this browser');
    return false;
  }

  // Check AR session support
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    console.log('AR session support:', supported);
    return supported;
  } catch (error) {
    console.error('Error checking WebXR support:', error);
    return false;
  }
};

// Configure THREE.js for better AR rendering
const configureThree = () => {
  // Set up Three.js for AR
  THREE.ColorManagement.enabled = true;
  
  // WebXR improvements
  if (navigator.xr) {
    // Additional WebXR specific configuration
    navigator.xr.addEventListener('devicechange', () => {
      console.log('XR device change detected');
    });
  }
  
  console.log('THREE.js configured for AR');
};

// Set up any polyfills or compatibility fixes
const setupPolyfills = () => {
  // Enable hit testing in WebXR if available
  if (!window.XRRigidTransform) {
    window.XRRigidTransform = function(position, orientation) {
      this.position = position || { x: 0, y: 0, z: 0 };
      this.orientation = orientation || { x: 0, y: 0, z: 0, w: 1 };
    };
  }
};

// Initialize the application
const initApp = async () => {
  // Check WebXR support
  const xrSupported = await checkXRSupport();
  
  // Configure Three.js
  configureThree();
  
  // Setup compatibility fixes
  setupPolyfills();
  
  // Log device info for debugging
  console.log('User agent:', navigator.userAgent);
  console.log('Display capabilities:', window.screen);
  
  // Create root and render app
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App xrSupported={xrSupported} />
    </React.StrictMode>
  );
};

// Start the app
initApp(); 