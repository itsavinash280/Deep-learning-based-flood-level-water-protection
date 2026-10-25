# FloodWatch

**Deep Learning Based Flood Level Water Protection** — an academic mini project
with a responsive monitoring dashboard, a trained neural network, and Supabase login.

## Features

- Six-hour water level forecasts from five environmental inputs.
- Four fictional monitoring stations, an illustrative basin diagram, and risk indicators.
- Scenario presets, validated CSV uploads, and downloadable forecasts.
- Simulated flood barrier and drainage pump controls.
- Email/password signup, email confirmation, sign-in, sign-out, and password recovery.
- Downloadable model weights, reproducible NumPy training, and a printable report.

All monitoring data is synthetic. This is a learning prototype; no sensors,
physical actuators, or operational flood alerts are connected.

## Run locally

Requires **Node.js 22 or newer**.

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:4173/. Keep the terminal running; press Ctrl+C to stop it.
`npm start` is also supported. The same commands work inside `floodwatch/`.

If port 4173 is already busy, the server automatically tries the next available
port. Open the **Local** URL printed in the terminal. When using a different port,
add that exact URL with a trailing slash to Supabase Redirect URLs for email links.
An explicitly configured `PORT` is respected and is not automatically changed.

## Build and test

```powershell
npm run build
npm test
```

The root build installs the pinned dependencies in `floodwatch/` and bundles the
Supabase browser client. Checks cover model inference, CSV validation, verified
sessions, sign-out races, mobile menu focus, and password confirmation errors.

## Deploy to Vercel

Import this repository into Vercel using these settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | Repository root |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `floodwatch/dist` |

The included `vercel.json` sets the commands and output directory automatically.
Deploying only `floodwatch/` is also supported by its own configuration.
No Python runtime or running Node server is needed in production.

After deployment, add the actual HTTPS Vercel URL, with a trailing slash, to
**Supabase → Authentication → URL Configuration → Redirect URLs**. This is required
for email confirmation and password recovery on the new domain. If Vercel becomes
the primary website, also update the Supabase Site URL.

The included `auth-config.json` contains the public Supabase project URL and
publishable key. No Vercel environment variables are required. Never put a secret
or service-role key in browser files.

## User accounts

Choose **Create account**, confirm the email, then sign in. A Supabase dashboard
administrator account is separate from an application account. Public email
delivery may require custom SMTP configured in Supabase.

## Documentation

- [Vercel deployment guide](floodwatch/VERCEL.md)
- [Authentication setup](floodwatch/AUTH-SETUP.md)
- [UI/UX decisions using UI/UX Pro Max](floodwatch/DESIGN.md)
- [Model training and project details](floodwatch/README.md)
- [Printable project report](floodwatch/dist/report.html)
