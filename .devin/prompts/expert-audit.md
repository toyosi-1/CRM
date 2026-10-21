
# Expert audit prompt — Glass House ERP v12 (Supabase)

You are a senior full-stack engineer, production security reviewer, and SaaS QA lead. Audit the Glass House ERP React application in `/Users/kingtoy/CascadeProjects/windsurf-project-6` end-to-end against the following checklist. Do not change code until you have reported findings and the user has approved a remediation plan, unless a change is obviously safe and fixes a broken build or lint error.

## 1. Repository hygiene and secrets
- [ ] Verify no secrets (Supabase service-role key, Resend key, Firebase keys) are committed to Git.
- [ ] Confirm `.env.local`, `.env.production`, and `supabase/.temp` are ignored.
- [ ] Review `package.json` for unused or vulnerable dependencies; run `npm audit` and classify each issue.
- [ ] Confirm the production bundle does not include source maps or development-only code.

## 2. Architecture and data model
- [ ] Review `src/types/index.ts`, `src/lib/firestore.ts`, and `supabase/migrations/*.sql` for consistency.
- [ ] Confirm every table has primary keys, foreign keys, appropriate indexes, `updated_at` triggers, and RLS enabled.
- [ ] Verify the realtime publication includes all tables that the UI subscribes to.
- [ ] Check that no table has a policy that lets a user escalate their own role or read records outside their authorization scope.
- [ ] Confirm the `profiles` table links to `auth.users(id)` with `on delete set null` and the `active` flag is honored in every helper function.

## 3. Authentication and authorization
- [ ] Test email/password login, password reset, invitation flow, and sign-out against the live Supabase project.
- [ ] Verify the first administrator can be bootstrapped safely without exposing the service-role key in the browser.
- [ ] Confirm route guards in `src/App.tsx` reject cross-role navigation and redirect to the correct home route.
- [ ] Verify `AuthContext.tsx` initializes the store after a session is established and does not fall back to mock data in production.
- [ ] Test role-specific read/write operations directly against Supabase with the anon key to confirm RLS behaves as intended.

## 4. ICT staff provisioning (Supabase Edge Function)
- [ ] Review `supabase/functions/manage-staff/index.ts` for input validation, CORS, authentication, authorization, and audit logging.
- [ ] Confirm the function rejects non-admin callers, invalid emails, and unknown roles.
- [ ] Test the invitation flow end-to-end: admin creates a user → user receives email → user sets password → user lands on the correct role dashboard.
- [ ] Verify the profile is created atomically and the Auth user is deleted if profile insertion fails.

## 5. Core request-to-payment workflow
- [ ] Facility manager creates a request with images/compressed attachments.
- [ ] Procurement reviews and assigns a vendor; PO number is generated.
- [ ] Supervisor approves or rejects with a comment; rejection returns the request to the correct state.
- [ ] Finance calculates WHT tax, marks payment pending, and uploads a receipt before marking paid.
- [ ] Site `current_month_spend` updates correctly and budget warnings appear.
- [ ] SLA deadlines are computed from priority and breached flag is set or cleared accurately.
- [ ] Audit trail entries are appended on every transition.

## 6. New v12 modules
- [ ] PPM registry: supervisor/admin creates schedules, assigns technicians, technicians complete and defer, next due date recalculates.
- [ ] Incidents: facility managers log incidents; status transitions are persisted.
- [ ] Petty cash: facility manager entries require finance/admin approval; balance is computed correctly.
- [ ] Support tickets: any authenticated user can raise a ticket; admin updates status.
- [ ] Technician dashboard, tasks, checklists, assets, and PPM schedule views load and reflect assigned data.

## 7. Notifications and observability
- [ ] Verify database trigger `notify_request_event` inserts notifications for new requests and status changes.
- [ ] Confirm the TopBar notification dropdown receives realtime updates and marks items read.
- [ ] When Resend is later enabled, review the edge function that sends email alerts to ensure it uses a verified domain, retries safely, and does not leak the API key.
- [ ] Confirm `audit_logs` capture staff invitations; consider adding audit logging to request status changes and site updates.

## 8a. New v12 modules added in this phase
- [ ] Facility configuration: supervisors/admins can edit site scope, utilities, floors, units, contacts, and status.
- [ ] Tenancy registry: admin can add tenants, set lease dates, monthly rent, and payment status; overdue/expiringSoon flags compute correctly.
- [ ] People registry: supervisor/admin directory with role filters, phone, trade, site assignment, and active status.
- [ ] Vendor onboarding: procurement/admin can register tier 1/2/3 vendors, capture bank details, TIN, SLA hours, guarantor, and verified flag.
- [ ] Vendor SLA scorecard aggregates total vendors, verified count, average completion days, and total amount paid.
- [ ] Technician job completion form: technician selects an open request, writes a narrative, uploads before/after photos, and closes the request.
- [ ] Checklist builder: supervisor/admin selects a site/frequency, toggles zones, adds custom items with pass/fail/rating/numeric types and FM/tech/both assignment.

## 8. File and storage security
- [ ] Confirm the `request-files` bucket is private and objects are uploaded with the correct MIME type and size limits.
- [ ] Verify the application resolves signed URLs or public URLs appropriately; avoid storing long-lived signed URLs in the database.
- [ ] Test Storage RLS policies: authenticated users can read; only users with a role can insert; users can update only objects they own.

## 9. UI/UX and responsiveness
- [ ] Run the app in desktop, tablet, and mobile viewports; confirm the mobile menu, sidebars, tables, forms, and modals are usable.
- [ ] Test every new page added in this phase for empty states, loading states, validation errors, and success feedback.
- [ ] Verify the global search finds requests and navigates to the detail page.
- [ ] Confirm dark/light theme persists across reloads.

## 10. Build, lint, and deployment
- [ ] Run `npm run lint`, `npm run build`, and `npx supabase db lint --linked --level error`. All must pass.
- [ ] Verify `netlify.toml` SPA redirects, cache headers, and security headers.
- [ ] Confirm the production bundle size and recommend route-level code splitting if the main chunk exceeds 500 KB.
- [ ] Document any remaining incomplete modules, external blockers, or follow-up tasks.

## Deliverable
Produce a written report with:
1. Executive summary (pass/fail for each section).
2. Critical issues that must be fixed before launch, ordered by risk.
3. Concrete, minimal remediation steps for each issue.
4. Verification commands and test accounts used.
5. A list of safe next features to implement after launch.
