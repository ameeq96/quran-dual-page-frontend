# Quran Admin Single-Domain App

React admin UI plus Express API for the Quran app. One Node.js app serves the dashboard, admin API, public/mobile API, and persistent content assets from `https://quranadmin.opplexify.com`.

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

For production-style local testing, fill DB/JWT values, run `npm run build`, then `npm start`.

## Production

This app is prepared for Hostinger shared `Node.js` hosting on `quranadmin.opplexify.com`.

Environment variables:

```env
HOST=0.0.0.0
PORT=3000
NODE_ENV=production
APP_URL=https://quranadmin.opplexify.com
APP_NAME=Quran Dual Page & Multi-Line Reader
STORAGE_ROOT=/home/your-user/quran-admin-storage

DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASS=your-db-password
DB_NAME=your-db-name
DB_SYNCHRONIZE=true
DB_LOGGING=false

JWT_SECRET=your-strong-secret
JWT_EXPIRES_IN=7d
ADMIN_SEED_EMAIL=admin@opplexify.com
ADMIN_SEED_PASSWORD=ChangeMe123!

VITE_ADMIN_API_URL=/api
VITE_RECAPTCHA_SITE_KEY=your-google-recaptcha-site-key
```

Notes:

- `npm install` automatically runs `npm run build`.
- `npm start` runs one Express server for React, `/api/*`, `/public/*`, `/health`, and `/assets/*`.
- React admin API calls use same-origin `/api` by default.
- Public/mobile clients should use `https://quranadmin.opplexify.com/public/config` and related `/public/*` endpoints.
- Persistent files in `STORAGE_ROOT` are served from `/assets`.
- `public/.htaccess` is copied into `dist/` so direct routes like `/login` work on Hostinger Apache hosting too
- Login page supports classic Google reCAPTCHA v2 checkbox when
  `VITE_RECAPTCHA_SITE_KEY` is configured. Use the site key, not the secret key,
  and allow the deployed admin domain in the reCAPTCHA console.
- Privacy Policy is published as a public React route at `/privacy-policy`

## Hostinger Deploy

1. Create a `Node.js` website in Hostinger hPanel.
2. Attach `quranadmin.opplexify.com` to that app.
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
7. Create the MySQL database in Hostinger and use those credentials in the env vars.
8. Set `STORAGE_ROOT` to a folder outside the deploy directory so uploaded datasets and asset packs survive redeploys.
9. Restart the app from hPanel.

After deployment, test:

- `https://quranadmin.opplexify.com/health`
- `https://quranadmin.opplexify.com/api/auth/login`
- `https://quranadmin.opplexify.com/public/config`

## Plesk Deploy

Use Plesk's Node.js app settings for this project. Do not point the domain's public
document root at the repository root, because that exposes source files and serves
the development `index.html`.

Recommended Plesk settings:

- Application root: the folder containing `package.json`
- Document root: `dist`
- Application startup file: `server.js`
- Install command: `npm install`
- Startup command: `npm start`

Set production environment variables in Plesk, including real MySQL credentials and
a writable absolute `STORAGE_ROOT`, for example:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
APP_URL=https://quran.opplexify.com
STORAGE_ROOT=/home/<plesk-user>/quran-admin-storage
```

Replace `<plesk-user>` with the real account name. Leaving the placeholder value
from `.env.example` will prevent Passenger from starting the Node app.

After deployment, test:

- `https://quran.opplexify.com/health`
- `https://quran.opplexify.com/api/auth/login`
- `https://quran.opplexify.com/public/config`
