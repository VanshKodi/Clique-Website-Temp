import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Railway (and the custom domain) serve the app from the domain root,
// so use an absolute base. (A relative './' base breaks React Router:
// BASE_URL becomes './', which normalizes to basename '/.' and matches nothing.)
// Deployed as a GitHub Pages project site at https://clique-imnu.github.io/Website/,
// so plain `npm run build` must emit /Website/ URLs for their gh-pages deploy.
// Override with PAGES_BASE for other targets: Railway (PAGES_BASE=/),
// a personal fork's Pages (PAGES_BASE=/Clique-Website-Temp/).
export default defineConfig({
  base: process.env.PAGES_BASE || '/Website/',
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: ['clique-website-temp-production.up.railway.app', 'cliquetemp.vanshkodi.in'],
  },
});
