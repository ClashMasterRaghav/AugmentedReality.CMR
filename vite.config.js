import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    // Enable HTTPS for WebXR which requires secure context
    https: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
}); 