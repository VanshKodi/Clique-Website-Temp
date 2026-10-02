import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Railway (and the custom domain) serve the app from the domain root,
// so use an absolute base. (A relative './' base breaks React Router:
// BASE_URL becomes './', which normalizes to basename '/.' and matches nothing.)
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: ['clique-website-temp-production.up.railway.app', 'cliquetemp.vanshkodi.in'],
  },
});
