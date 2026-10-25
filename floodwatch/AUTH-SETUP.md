# FloodWatch user authentication

FloodWatch uses Supabase Auth in project `obobjwrlggznqlrndydb`. Email/password
authentication and signup were checked through `/auth/v1/settings`; both are
enabled and email confirmation is required.

## Use the website

1. Run `npm run dev`, then open http://127.0.0.1:4173/.
2. Choose **Create account**, use an accessible email, and choose a password with
   at least eight characters. The form requires matching password confirmation.
3. Open the email confirmation link, then sign in. Existing confirmed users can
   sign in immediately. Dashboard access is shown after Supabase verifies the user.
4. Use **Sign out** in the header to clear the session for the current browser.
5. Use **Forgot password?** to request a recovery email. Open the link and save a
   new password on the recovery screen.

Supabase dashboard administrator accounts and application accounts are separate.
There are no hardcoded demo credentials or authentication bypasses.

## Redirect URLs

The owner confirmed these values were saved in Supabase → Authentication → URL Configuration:

```text
https://floodwatch-water-protection-avina.groovymoose512.chatgpt.site/
http://127.0.0.1:4173/
http://localhost:4173/
```

Keep existing allowed URLs. Signup and recovery requests pass the current site's
root as their return URL. Add any new deployment URL before using emailed links there.

## Public configuration and dependencies

`dist/auth-config.json` contains only the project's public URL and publishable key.
Never use a service-role, secret, database password, OAuth token, or personal access
token in that file. Browser configuration rejects non-publishable keys.

The SDK is pinned to `@supabase/supabase-js` 2.118.0; esbuild 0.28.2 bundles its browser
client. The generated bundle is included, so normal website startup needs no build.
For rebuilding from this folder:

```powershell
npm ci
npm run build
npm test
```

From the parent workspace, `npm run build` installs and builds the nested project.

## Access boundaries

Login controls access to the dashboard interface. The model, sample CSV, and report
are public educational assets served by the static host. No private per-user data
is stored in this prototype. If database-backed private data is added, enforce RLS
ownership policies in Supabase rather than relying on browser UI visibility.

The hosted Site's sharing policy is separate from Supabase login. The owner has
authorized a public sign-in page so other people can create an app account.
The model, sample CSV, and report remain public educational assets. App login
does not make a static file private; any future private records need database RLS.

## Email delivery

Email confirmation remains enabled. Supabase's built-in sender has restrictions
and rate limits; a production app accepting arbitrary email addresses needs a
configured custom SMTP provider. If no confirmation email arrives, inspect Supabase
Auth logs, sender configuration, spam folders, and allowed return URLs. Do not disable
confirmation merely to bypass a delivery problem.

## Verification

`npm test` covers verified session restore, rejection of expired/forged sessions,
logged-out state, sign-out racing an in-flight verification, provider sign-in and
cross-tab sign-out, and rejection of secret keys in browser configuration. It also
runs the existing model and CSV checks. These tests use a mock auth provider; the
live settings endpoint is checked separately. A successful real-account login is
only established by an actual user test, not by mocked session tests.

Documentation: [Password auth](https://supabase.com/docs/guides/auth/passwords),
[Auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
