# CLIQUE — The IT & Analytics Club, IMNU

Marketing site for CLIQUE, the IT & Analytics Club at the Institute of
Management, Nirma University. Built with React 19, Vite, TypeScript and
React Router.

The site presents the club's story, focus areas, member wall and join form,
plus a game-night page (`/gauntlet`) with a poster-drop banner, event rounds
and a registration ticket.

## Local development

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build locally
```

## Deployment

### Railway (primary)

The site is deployed on Railway from the `main` branch. Railway auto-detects
the Node.js app, runs `npm install` + `npm run build`, then starts the
production server with `npm start` (`vite preview --port $PORT`).

The Vite `base` is `'./'` (relative) in [vite.config.ts](vite.config.ts), so
the build works both at a root domain (Railway) and under a sub-path
(GitHub Pages). Client-side routes (`/gauntlet`, `/join`, `/people/:slug`)
survive a hard refresh via the SPA fallback in `vite preview`.

### GitHub Pages (legacy)

Live URL: <https://clique-imnu.github.io/Website/>

Because it can be served from the `/Website/` sub-path, the router reads the
base via `import.meta.env.BASE_URL`. For a custom domain served from the root,
set `base` back to `'/'`.

## Registration form → Google Sheet

The `/join` form can post submissions to a Google Sheet. See
[SHEET_SETUP.md](SHEET_SETUP.md) for the one-time Apps Script setup; until a
webhook URL is configured the form runs in demo mode (localStorage only).
