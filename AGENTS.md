# Propel Works Management Systems — Agent notes

## Environment
- React 19 + TypeScript 5.9 + Vite 8 + React Router 7 + Zustand 5 + Tailwind CSS + Supabase
- Repository root: `/Users/kingtoy/CascadeProjects/windsurf-project-6`
- Supabase project: `Glasshouse` (`zibibvbhzzkfqrzzhhgt`)

## Required environment variables
Create `.env.local` locally (never commit):
```env
VITE_SUPABASE_URL=https://zibibvbhzzkfqrzzhhgt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```
Do not put `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in any frontend env variable.

## Useful commands
```bash
npm run lint
npm run build
npm run dev                    # local dev
VITE_ENABLE_DEMO_MODE=true npm run dev   # enable demo login tabs for local UI testing
npx supabase db push           # deploy migrations to linked remote project
npx supabase db lint --linked --level error
npx supabase functions deploy manage-staff
npx supabase functions logs manage-staff --tail
npx update-browserslist-db@latest
```

## Netlify deployment
- Active production site: `glasshouse-erp-propel` (`https://glasshouse-erp-propel.netlify.app`), site id `2e830550-1a9d-473e-a9bb-dc26c540a28e`, owned by `cardojay1@gmail.com` (cardojay1's team).
- The repo's linked site is still the old `glasshouse-erp` project (no deploy access) — always pass `--site` explicitly.

```bash
npx netlify deploy --prod --dir=dist --site 2e830550-1a9d-473e-a9bb-dc26c540a28e
```

## Applying migrations
- `npx supabase db push` is denied for the current CLI login; apply a migration file with `npx supabase db query --linked --file supabase/migrations/<file>.sql` (keep migrations idempotent: `if not exists`, `drop policy if exists`).
- `npx supabase functions deploy manage-staff` works.

## Demo mode
- Demo login is disabled by default.
- Enable locally by setting `VITE_ENABLE_DEMO_MODE=true`.
- Production builds should never enable demo access.

## Browser smoke test
```bash
VITE_ENABLE_DEMO_MODE=true npm run dev &
node scripts/browser-smoke.cjs
```
Note: the smoke test requires a local Chrome executable on macOS at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

## Known warnings (non-blocking)
- Vite warns the main JS chunk is >500 KB. Route-level code splitting is recommended when scaling.
- `caniuse-lite` data is outdated; run `npx update-browserslist-db@latest` to refresh.

## Pending before launch
- Create the first ICT administrator account via Supabase Auth + `profiles` record.
- Add verified Resend domain and operational email alerts (optional; in-app notifications are live).
- Run the expert audit prompt in `.devin/prompts/expert-audit.md`.
- Conduct end-to-end tests on the live Supabase project with real accounts for each role.
- Consider route-level code splitting to reduce the main bundle size.
