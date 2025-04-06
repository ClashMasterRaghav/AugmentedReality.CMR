import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

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

// Create root container
const container = document.getElementById('root');
const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 