import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Debug resource loading issues
console.log('Public URL:', process.env.PUBLIC_URL);
console.log('Base path:', window.location.pathname);

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