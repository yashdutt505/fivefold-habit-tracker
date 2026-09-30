# Fivefold

Live app: https://fivefold-daily.vercel.app

A responsive web tracker for five habits per account, current and best streaks, and a GitHub-style yearly calendar. Includes persistent light/dark themes and full account deletion.

## Production architecture

- Next.js 16, React 19, TypeScript, Tailwind and Radix components hosted on Vercel Hobby.
- Supabase PostgreSQL and Supabase Auth on the Free plan; Google OAuth for public login.
- Google requests only basic identity scopes (openid, email, profile).
- No ChatGPT authentication or trusted identity headers are used in the Vercel application.
- Configure your own Supabase project. The original deployment uses Mumbai for its database and Vercel functions.

## Storage and security

Profiles store account ID and timezone. Habits store names, slots and creation dates. Completions store habit IDs and dates. Auth stores Google identity and email. Habit data stays in PostgreSQL; theme preference stays in browser localStorage; authentication uses cookies.

Row-level security restricts direct reads to the authenticated owner. Anonymous reads and client table writes are denied. Database functions derive the owner from auth.uid(), check that the account still exists, validate input and scope every query to that owner. All mutations lock the profile row, making concurrent five-slot allocation safe. Unique constraints enforce slots 1-5 and one check-in per habit per day. Mutations require same-origin JSON. Account/API responses are private and non-cacheable. Supabase session refresh runs in proxy.ts.

The server-only Supabase credential is stored in Vercel production secrets and the ignored local .env.local. Never expose it as NEXT_PUBLIC_, commit it, or print it. Site operators and infrastructure providers have administrative access; data is not end-to-end encrypted.

## Account deletion

Account settings starts a Google confirmation. The OAuth callback must return the same user as the signed deletion intent. It creates a signed, HTTP-only proof bound to that user and the freshly authenticated access token, valid for five minutes. The final same-origin DELETE request also requires typing DELETE. The server verifies the user against Supabase, validates the proof, then uses the server credential to hard-delete that account. Foreign-key cascades remove profiles, habits and completions. The local session is cleared and stale sessions cannot access the app or database functions. Provider backups/logs may persist until normal expiry. This does not delete the user's Google account.

A password reauthentication fallback exists for email-based accounts used in integration tests. Public email registration is disabled unless ENABLE_EMAIL_SIGNUP=true; it requires separately configured SMTP. Production UI uses Google sign-in.

## Development and deployment

Use Node 24. Run npm ci. Copy .env.example to .env.local and set the Supabase URL, publishable key and server secret. Apply supabase/migrations/202609260001_fivefold.sql once to a new Supabase database. Configure Google with the callback shown in Supabase and set the Supabase Site URL and exact allowed callback to the deployment origin and /auth/confirm. Use npm run dev, npm test and npm run build.

Link your own Vercel project, then deploy: node node_modules/vercel/dist/index.js deploy --prod. Configure all three environment variables in Vercel before deploying. No billing upgrade or purchased domain is needed for the current setup; free plan limits still apply.

## Behaviour

The first mutation establishes the account timezone. Dates before habit creation or after today are rejected. Current streaks may end today or yesterday, and streaks span years. Renaming preserves history; deleting a habit removes its check-ins. The yearly view displays the current year and supports retrospective check-ins.

## Verification

- Unit tests cover streak boundaries, leap years, timezones, legacy storage regression, PostgreSQL RLS, ownership, five slots, date/input constraints, account deletion cascades and stale identity rejection.
- Signed deletion proof tests cover tampering, wrong user, wrong session and expiry.
- Live Vercel tests used disposable accounts to verify sign-in, saving/checking habits, limits, cross-account isolation, CSRF rejection, incorrect-password protection, hard account deletion, stale session rejection and survival of another account. Test accounts were removed.
- Browser checks verify both themes and persistence after reload, real Google login, and Google reauthentication returning to the deletion confirmation dialog.
- Explicit live test command (creates/deletes disposable accounts only): set LIVE_TEST_BASE to the intended deployment, then run node --conditions=react-server --env-file=.env.local tests/live-vercel.mjs.

## Legacy site

The earlier Sites address now returns a verified HTTP 302 redirect to the Vercel app; non-GET writes return 410. The old database is inactive and is not included in this repository. The old SQLite implementation/migrations and packaging scripts are retained for migration history and excluded from Vercel deployment. Do not deploy them as the new backend. Google and ChatGPT account IDs differ; migration must map only verified identities and must never trust a client-supplied owner ID.

## Public source configuration

This repository contains source code, tests, and schema migrations, not production credentials or user records. Configure the values in .env.example for your own deployment. Set the optional server-side SUPPORT_EMAIL to display a contact address on the privacy page. Deployment identifiers and local hosting bindings are intentionally excluded. The old redirect worker is retained in legacy/redirect-worker.mjs for reference; it is not part of the Vercel application.
