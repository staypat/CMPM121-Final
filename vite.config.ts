import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Ensure the output directory is set for GitHub Pages
    rollupOptions: {
      input: 'index.html', // Entry point for the build
    },
  },
});