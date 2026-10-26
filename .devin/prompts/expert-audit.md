# Pre-Launch Audit — Propel Works Management Systems (GlassHouse)

You are auditing the production deployment at https://glasshouse-erp-propel.netlify.app backed by Supabase project `zibibvbhzzkfqrzzhhgt` before client handover. Verify every item, fix what fails, and report results per section. Do not deploy unless explicitly told to.

## 1. Authentication & session integrity
- Log in with each live account and confirm the correct portal lands immediately (no double-submit, no "content refresh but nothing happens" — if a login requires two attempts, that is a FAIL; trace AuthContext resolveUser and initSupabase):
  - facility managers: a.ogunnubi@, azeez.durodola@, progress.francis@, sodiq.ishola@, soetan.adeniyi@ → /fm
  - procurement: bashira.abdulrasaq@propelpfm.com → /procurement
  - supervisor: fadekemi.adeaga@ → /supervisor
  - finance: finance@ → /finance
  - ICT admin: itoffice@ → /ict (portal title must say "ICT Admin", never on abiodun)
  - admin/MD: abiodun@ → /admin (title "Admin Portal", full executive nav)
  - technician account → /technician shows ONLY today's technical checklist items
- Wrong password → clear error, no crash. Forgot password → reset email arrives.
- Refresh mid-session → session restores, role/nav correct. Logout → back to /login, protected routes bounce.
- Direct URL to another role's page → redirected to own portal (UI) and blocked by RLS (backend).

## 2. Per-role functional smoke test (editability + persistence)
For every editable element: make a change, reload, confirm it persisted; confirm a toast/error if the save fails.

- **FM**: create request (photo uploads), assign vendor/technician, vendor attended timestamp, mark work complete after PAID, daily walk checklist (own items editable; tech items read-only when technician exists; submit blocked until tech items done), missed-day checklists locked/red, monthly report saves per site+month, petty cash expense, PPM task completion.
- **Technician**: dashboard = checklist only; can tick tech/both items, cannot edit FM items or submit; My tasks shows assigned requests + PPM.
- **Procurement**: PO generation, vendor onboarding (no fake bank verification), scorecard shows payment→completion clocks, awaiting-payment jobs labeled "internal queue".
- **Supervisor**: approvals work; tenants read-only; PPM registry collapsible.
- **Finance**: payment queue, treasury ledger add-entry, petty cash top-up; admin site balances update live.
- **Admin**: all 13 nav sections load; site management CRUD; user management; report factory downloads a real file; veto works; audit trail visible.
- **ICT admin**: staff onboarding/edit for non-executive roles ONLY (cannot create/modify admin accounts — server must reject); cannot read requests/vendors/finance data.

## 3. Data integrity & permissions
- Facility scoping: FM/technician only see/write their assigned sites (verify via RLS policies, not just UI).
- No Firebase residue: `rg -i firebase src/` returns only dead/unused files; nothing imports it at runtime.
- Every mutation path persists to Supabase — no localStorage-only or mock fallbacks (mockData only under demo flag, which must not exist in prod build).
- Audit trail entries written on request lifecycle transitions; staff management actions logged to audit_logs.

## 4. Performance & resilience
- Initial JS bundle ≤ ~300 KB (route-level splitting); pages lazy-load without errors.
- Login renders shell within ~1s on decent connection; data streams in progressively.
- Simulate ~30 concurrent sessions conceptually: realtime channel count, refetch load, no memory leaks from subscriptions (unsubscribe on unmount).
- PWA: service worker registers, auto-update activates new versions without manual toast, install prompt appears post-login, manifest/icons correct.
- Offline/weak-network: failed saves surface the error toast, no silent data loss; app doesn't hang on retry.

## 5. UX details
- Naira formatting (en-NG) everywhere money displays; dates en-GB/en-NG.
- No stray demo controls anywhere in production; no dead buttons; no placeholder text.
- Propel logo on login (blended, no white box), house-mark favicon on desktop tabs, PWA home-screen icon.

## 6. Report format
For each section: PASS / FAIL / PARTIAL with evidence (screenshot or log). For each FAIL: root cause, file:line, fix applied or recommended. End with a launch-readiness verdict and a prioritized fix list.
