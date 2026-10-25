# FloodWatch

A college mini project on **Deep Learning Based Flood Level Water Protection**.

## Run the website

Requires Node.js 22 or newer. The included public Supabase configuration connects user login.
From the folder containing this README, run:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:4173. Stop the server with Ctrl+C. Do not open index.html directly: the browser needs HTTP to load model.json.

If 4173 is occupied, use the next available **Local** URL printed in the terminal.
Add that URL with a trailing slash to Supabase Redirect URLs if you use signup or
password recovery on the new port. An explicitly set `PORT` is never changed.

`npm start` also starts the website. These commands also work from the parent
workspace folder. `node server.cjs` remains available inside this folder.

## Included

- Responsive dashboard with four fictional monitoring stations and an illustrative basin diagram.
- Genuine trained dense neural network (5 inputs, 24 and 16 hidden neurons, 6 outputs).
- Six-hour forecasts, scenario presets, CSV import, and forecast export.
- Simulated barrier and pump controls. They do not change the forecast or operate hardware.
- Model metrics, downloadable weights, sample dataset, and printable project report at `/report.html`.
- Supabase email/password signup, confirmed-account sign-in, persistent sessions, sign-out, and password recovery.

The pinned Supabase browser client is bundled locally in `dist/vendor/supabase.js`.
Internet access is required for account authentication. Optional Google Fonts fall
back to local system fonts when unavailable. Forecast calculations and CSV uploads
stay in the current tab; scenarios reset on reload. Supabase manages persistent
authentication sessions; passwords are never stored by the application.

Create an app account and confirm its email before signing in. A Supabase dashboard
account is not automatically a FloodWatch account. See [AUTH-SETUP.md](AUTH-SETUP.md).

To rebuild the browser client after installing dependencies, run `npm run build`.

## Deploy to Vercel

Import the repository with Framework Preset **Other**. The included `vercel.json`
sets the build and output directory. Both the workspace root and this standalone
folder are supported. No Vercel environment variables are needed for the included
Supabase connection. After deployment, add the real Vercel URL to Supabase's
allowed redirect URLs. See [VERCEL.md](VERCEL.md) for the full setup.

## Reproduce training

Python 3.10+ and NumPy are required only for retraining, not running the website.

```powershell
python -m pip install numpy
python train.py
npm test
```

Training generates 2,400 independent synthetic scenarios, with a fixed 70/15/15 train/validation/test split. Standardization uses training inputs only. Adam minimizes mean squared error in six water level changes. The checkpoint with the lowest validation error is exported. The test partition is used only for final metrics.

The included model's test MAE is 0.0288 m and RMSE is 0.0363 m. Persistence baseline MAE is 0.8720 m. These results apply only to this synthetic generator. Read the report for the generator equation, input bounds, and limitations. Retraining may produce small floating-point differences; metrics in the website come from the generated model.json.

## Files

| File | Purpose |
| --- | --- |
| `dist/index.html`, `dist/style.css`, `dist/app.js` | Website layout, styling, and behavior |
| `dist/core.js` | Validated inference, risk boundaries, CSV parser |
| `dist/model.json` | Reproducible trained weights, scales, metrics, parity fixture |
| `train.py` | NumPy training and synthetic data generator |
| `dist/report.html` | Printable academic project report |
| `test.cjs` | Focused model and input checks |
| `server.cjs` | Dependency-free local server |
| `package.json`, `package-lock.json` | npm install, start, dev, and test commands |
| `dist/auth-client.js`, `dist/auth-ui.js`, `dist/auth.css` | Authentication logic, login page, and session handling |
| `dist/auth-config.json` | Public project URL and publishable key; never put secrets here |
| `auth.test.cjs` | Session verification and sign-out race checks |

## Scope

This is an educational prototype. The station readings, historical chart, basin map, and rainfall inputs are illustrative. History is reconstructed from the scenario's trend. There are no live sensors, weather integrations, sent alerts, or connected actuators. The warning threshold (4 m) and critical threshold (5 m) are demo values, not real river limits. No calibrated probability or confidence interval is claimed.

Before any operational use, replace generated scenarios with locally measured, timestamped basin data; use chronological and event-based evaluation; calibrate against local gauge datums; test sensor faults and drift; and engineer independently reviewed hardware safety controls.

Documentation consulted using Context7: [NumPy random generation](https://numpy.org/doc/stable/reference/random/generator.html). Ponytail and Caveman guided implementation scope and communication.
