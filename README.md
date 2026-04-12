# Admin Frontend (React)

Minimal dashboard UI for the Quran app admin API.

## Setup

1. Copy `.env.example` to `.env` and set values.
2. Install dependencies:
```
npm install
```
3. Run dev server:
```
npm run dev
```

## Production

This frontend is prepared for Hostinger shared `Node.js` hosting.

Environment variables:

```env
HOST=0.0.0.0
PORT=3000
VITE_ADMIN_API_URL=https://quranadminapi.opplexify.com
VITE_ADMIN_API_KEY=change-me
```

Notes:

- `npm install` automatically runs `npm run build`
- `npm start` serves the built `dist/` app through Node.js
- React routes use SPA fallback through `server.js`

## Hostinger Deploy

1. Create a `Node.js` website in Hostinger hPanel.
2. Attach your frontend domain to that app.
3. Upload this repo so `package.json` is in the app root.
4. Set install command to:
```bash
npm install
```
5. Set startup command to:
```bash
npm start
```
6. Add the production environment variables above.
7. Restart the app from hPanel.
