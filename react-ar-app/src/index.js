import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Create root container
const container = document.getElementById('root');
const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 