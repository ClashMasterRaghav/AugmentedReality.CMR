/**
 * Creates a placeholder image with AR text
 * @param {number} size - Size of the image in pixels
 * @param {string} text - Text to display on the image
 * @returns {Blob} - Image blob
 */
export function createPlaceholderImage(size, text = 'AR') {
  // Create a canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  // Get drawing context
  const ctx = canvas.getContext('2d');
  
  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1a73e8');
  gradient.addColorStop(1, '#34A853');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size/3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size/2, size/2);
  
  // Convert to blob
  return new Promise(resolve => {
    canvas.toBlob(resolve, 'image/png');
  });
}

/**
 * Saves a blob as a file
 * @param {Blob} blob - Image blob
 * @param {string} filename - Name of the file to save
 */
export function saveBlobAsFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Usage example:
// createPlaceholderImage(192).then(blob => saveBlobAsFile(blob, 'logo192.png')); 