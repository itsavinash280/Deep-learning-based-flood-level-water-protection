# Deploy FloodWatch to Vercel

FloodWatch deploys as static HTML, CSS, JavaScript, JSON, and CSV files. Forecasts
run in the browser. User authentication connects directly to Supabase.

## Import the repository

1. Push the project to a Git repository and import it in Vercel.
2. Select **Other** as the Framework Preset. Use Node.js 22 or newer.
3. Choose the Root Directory that matches what you uploaded:

| Repository contents | Root Directory | Output Directory |
| --- | --- | --- |
| Workspace containing the `floodwatch` folder | Leave at repository root | `floodwatch/dist` |
| Standalone project or extracted project ZIP | Folder containing `dist`, `build.cjs`, and `package.json` | `dist` |

Both entry points include their own `vercel.json`. The file sets installation,
build, and output commands, so manual command overrides are unnecessary. If the
repository contains the workspace but Vercel's Root Directory is `floodwatch`,
the standalone configuration applies.

Deploy the project. Vercel serves only the configured output folder; `server.cjs`
is used for local development and does not need to run on Vercel. No Python runtime
is required in production. Model weights are already included in `dist/model.json`.
Navigation uses URL fragments such as `/#forecast`, so no catch-all rewrite is needed.

## Supabase login on the Vercel domain

The existing project URL and **publishable** key are included in
`dist/auth-config.json`. No Vercel environment variables are required for this
project. To connect a different Supabase project, update those two public values
before deployment. Never include a secret or service-role key.

After Vercel gives you the real deployment domain:

1. Open Supabase → Authentication → URL Configuration.
2. Add the exact HTTPS URL with a trailing slash to **Redirect URLs**, for example
   `https://your-actual-project.vercel.app/`. Replace the example with the real URL.
3. Keep the existing local and Sites URLs if you still use those deployments.
4. If Vercel becomes the primary deployment, set **Site URL** to its production URL.
5. Add a custom domain's exact URL too if you attach one later.

The app uses its current origin for confirmation and recovery callbacks. Each
preview deployment has a different origin; add the exact preview URL if you want
to test email callbacks there. Avoid allowing all `*.vercel.app` domains.

Email confirmation remains required. Configure custom SMTP if you need signup
emails delivered to arbitrary public users; Supabase's default sender has limits.
See [AUTH-SETUP.md](AUTH-SETUP.md) for account setup and session behaviour.

## Verify deployment

- The home page displays **Sign in** and **Create account**.
- Confirmed app users can sign in and open the dashboard.
- New users receive a confirmation email and return to the correct Vercel domain.
- Sign out returns to the login page; recovery links open the new-password form.
- `/model.json`, `/auth-config.json`, `/vendor/supabase.js`, and `/report.html` load.

If Vercel Deployment Protection is enabled, visitors may need Vercel access before
reaching the Supabase login page. Configure that separately for your intended audience.

## Local production check

From the workspace root:

```powershell
npm ci
npm run build
npm test
```

From the standalone project:

```powershell
npm ci --include=dev
npm run build
npm test
```

References: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json),
[Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
