import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any GitHub Pages subpath
  // (https://btownbrief.github.io/church-street-runner/)
  base: './',
  build: {
    // Serve straight from the main branch via Pages "main /docs"
    outDir: 'docs',
  },
});
