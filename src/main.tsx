import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';

// Vite's BASE_URL is '/' on Railway / custom domain (and in dev).
// It may be '/Website/' if the base is ever set for the GitHub Pages sub-path.
// A relative base ('./') would yield '.' here, which React Router normalizes
// to '/.' and matches nothing — so normalize that case to '/'.
function getBasename(): string {
  const base = import.meta.env.BASE_URL;
  if (!base || base === './' || base === '.' || base === '/') return '/';
  const trimmed = base.replace(/\/$/, '');
  if (!trimmed || trimmed === '.' || trimmed === './') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

const basename = getBasename();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
