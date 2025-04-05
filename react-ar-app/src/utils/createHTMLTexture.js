import * as THREE from 'three';
import html2canvas from 'html2canvas';

/**
 * Creates a Three.js texture from an HTML element or iframe
 * @param {HTMLElement|HTMLIFrameElement} element - The HTML element to capture
 * @param {HTMLCanvasElement} [existingCanvas] - Optional existing canvas to reuse
 * @returns {Promise<THREE.Texture>} The created texture
 */
export const createHTMLTexture = async (element, existingCanvas = null) => {
  try {
    // If the element is an iframe, try to access its document
    let targetElement = element;
    if (element.tagName === 'IFRAME') {
      try {
        // Check if we can access the iframe content (same-origin policy)
        targetElement = element.contentDocument.body;
      } catch (e) {
        console.warn('Cannot access iframe content due to same-origin policy:', e);
        // Fall back to using the iframe element itself
        targetElement = element;
      }
    }

    // Create canvas from HTML element
    let canvas;
    if (existingCanvas) {
      canvas = existingCanvas;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = element.clientWidth || 1024;
      canvas.height = element.clientHeight || 768;
    }

    // Use html2canvas to capture the content
    const renderedCanvas = await html2canvas(targetElement, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: canvas.width,
      height: canvas.height,
    });

    // Draw the rendered canvas onto our canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(renderedCanvas, 0, 0, canvas.width, canvas.height);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  } catch (error) {
    console.error('Error creating HTML texture:', error);
    
    // Create fallback texture
    const canvas = existingCanvas || document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Draw error message
    ctx.fillStyle = '#2F3241';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Error loading content', canvas.width/2, canvas.height/2);
    ctx.font = '18px Arial';
    ctx.fillText('Please check console for details', canvas.width/2, canvas.height/2 + 30);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
};

/**
 * Creates a loading texture with custom message
 * @param {string} message - The loading message to display
 * @param {string} backgroundColor - Background color
 * @param {HTMLCanvasElement} [existingCanvas] - Optional existing canvas to reuse
 * @returns {THREE.Texture} The created texture
 */
export const createLoadingTexture = (message = 'Loading...', backgroundColor = '#2F3241', existingCanvas = null) => {
  const canvas = existingCanvas || document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add loading text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvas.width/2, canvas.height/2);
  
  // Add spinning animation dots
  const now = Date.now();
  const numDots = (Math.floor(now / 500) % 3) + 1;
  const dots = '.'.repeat(numDots);
  ctx.font = '24px Arial';
  ctx.fillText(dots, canvas.width/2 + 80, canvas.height/2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}; 