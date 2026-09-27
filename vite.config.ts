import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works both as a GitHub Pages project site
// (https://clique-imnu.github.io/Website/) and on Railway (root domain).
export default defineConfig({
  base: './',
  plugins: [react()],
});
