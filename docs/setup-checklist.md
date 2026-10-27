# Setup checklist

Tick every item before announcing the site as live. Items marked **(verified)** were checked
while building this repository; the rest require your own accounts and credentials.

## 1. Repository

- [x] **(verified)** `npm install` completes.
- [x] **(verified)** `npm run typecheck` passes with no errors.
- [x] **(verified)** `npm run build` produces `dist/`.
- [x] **(verified)** `npm test` passes (unit + integration suites).
- [x] **(verified)** Demo mode works with no configuration (homepage, booking, admin login).
- [ ] `npm run test:e2e` after installing Playwright (`npm i -D @playwright/test && npx playwright install chromium`).

## 2. Supabase

- [ ] Project created; URL + anon key copied to `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- [ ] Service role key stored **only** as a server secret (`SUPABASE_SERVICE_ROLE_KEY`).
- [ ] `supabase db push` applied the migration (tables, RLS, RPCs, storage bucket).
- [ ] `psql "$SUPABASE_DB_URL" -f supabase/seed.sql` loaded the content.
- [ ] First administrator created in Authentication → Users, then promoted:
      `update public.profiles set role='super_admin' where email='…';`
- [ ] Row Level Security enabled on every table (the migration does this) and verified with a
      non-admin account: staff cannot read unassigned reservations, admins cannot change settings.
- [ ] Storage bucket `media` exists and is public-read, staff-write.
- [ ] Auth → URL configuration: Site URL = production origin, redirect allow-list includes
      `/admin/update-password`.
- [ ] Email templates for password reset/branding reviewed in Supabase Auth settings.

## 3. Environment variables (Cloudflare Pages → Settings → Environment variables)

Browser (`VITE_*`, safe to expose):

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_SITE_URL` (no trailing slash)

Server only (never `VITE_` prefixed):

- [ ] `SUPABASE_URL` (same project URL, without the `VITE_` prefix)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM` (verified sender/domain in Resend)
- [ ] `ADMIN_EMAIL`
- [ ] `SITE_URL`
- [ ] `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` (optional)

Set them for **both** Production and Preview environments, then redeploy.

## 4. Email (Resend)

- [ ] Domain verified (SPF, DKIM, DMARC records added at your DNS provider).
- [ ] Test email delivered to a real inbox.
- [ ] `notification_logs` shows `sent` for a test reservation (not `failed`/`skipped`).
- [ ] Admin notification arrives at `ADMIN_EMAIL`.
- [ ] Customer acknowledgment clearly says the request is **not yet confirmed** (check EN/FR/AR).

## 5. WhatsApp (optional)

- [ ] WhatsApp Business account + phone number id configured.
- [ ] Message template approved for business-initiated messages.
- [ ] `GET /api/health` reports `"whatsapp": true`.
- [ ] Test message received; `notification_logs` shows `sent`.
- [ ] If not configured: leave the variables empty — messages log as `skipped` and the site
      still works.

## 6. Content

- [ ] Business phone, WhatsApp, email, address and Maps link confirmed in `/admin/settings`.
- [ ] Social profiles that do not exist are left empty (they are hidden automatically).
- [ ] Services: prices, duration tiers, capacity, add-ons reviewed.
- [ ] Offers: validity dates and prices reviewed; publish only what is real.
- [ ] Gallery: real photos uploaded (both `public/images/*` placeholders visible on first run
      should be replaced).
- [ ] Testimonials: add only real, consented quotes. The seed is empty on purpose.
- [ ] Opening hours match reality (09:00–21:00).
- [ ] FAQ and the three privacy/terms pages reviewed by the business owner.
- [ ] "8 years of experience" claim kept only if still accurate (edit `about_claims`).

## 7. Reservations

- [ ] Submit a real request from the public form in each language.
- [ ] Request appears as **pending** in `/admin/reservations` with a `MJB-…` reference.
- [ ] Confirming it sends a confirmation email and writes history + audit entries.
- [ ] Rejecting with a reason emails the customer.
- [ ] Proposing an alternative date/time stores it and is visible to the customer.
- [ ] Double booking blocked: try two bookings that exceed capacity — the second must fail
      with a clear message.
- [ ] Closed day / blocked window / outside 09:00–21:00 are rejected.
- [ ] `/en/find-reservation/` returns the booking only with reference **and** email.

## 8. Admin

- [ ] All three roles tested: super admin, admin, staff.
- [ ] Staff sees only assigned reservations and their own notes.
- [ ] Settings and team pages are inaccessible to admin/staff (403 + hidden nav).
- [ ] Manual reservation from the calendar works.
- [ ] Availability block prevents bookings for that window.
- [ ] CSV export opens correctly in Excel (UTF-8 BOM).
- [ ] Password reset flow works end to end.

## 9. Legal and privacy

- [ ] Privacy policy mentions Supabase, Resend, Cloudflare and analytics consent.
- [ ] Cookies: only the consent choice and the locale are stored; confirm no analytics is
      written before consent.
- [ ] Contact details and company name on invoices/emails match the registered business.
- [ ] Data deletion request procedure documented (see `docs/security.md`).

## 10. Deployment and operations

- [ ] Custom domain attached and HTTPS active.
- [ ] Redirects from `www` (or to `www`) configured.
- [ ] Security headers/CSP deployed (see `docs/deployment-cloudflare.md`).
- [ ] `/api/health` returns `supabase: true` and `email: true`.
- [ ] Lighthouse check: performance, accessibility and SEO ≥ 90 on the homepage.
- [ ] Rollback procedure tested (see `docs/deployment-cloudflare.md`).
- [ ] Baseline metrics recorded for acceptance criteria (see §11).

## 11. Acceptance criteria — how each is demonstrated

| # | Criterion | Where to verify |
| --- | --- | --- |
| 1 | Standalone branded site (not an Instagram clone) | Visual review of `/en/`, `/fr/`, `/ar/` |
| 2 | Three languages with localised URLs and switcher | `src/app/router/paths.ts`, language switcher |
| 3 | Arabic RTL + Arabic typography | `/ar/` (`dir="rtl"`, IBM Plex Sans Arabic) |
| 4 | SEO: titles, meta, canonical, hreflang | `src/components/common/Seo.tsx` + page head |
| 5 | Homepage sections as specified | `src/pages/public/Home.tsx` |
| 6 | Offers come from the database, not hardcoded | `backend.getPublicData()` + admin offers |
| 7 | No fabricated reviews or statistics | Empty testimonials seed; dashboard uses records |
| 8 | Reservation form with all required fields | `/en/reservations/` |
| 9 | Availability, capacity and hours enforced server-side | `create_reservation` RPC + `/api/reservations` |
| 10 | No double bookings | advisory lock + capacity re-check; integration tests |
| 11 | Unique reference + status workflow | `MJB-…` reference, `STATUS_TRANSITIONS` |
| 12 | Email acknowledges receipt without claiming confirmation | `reservationEmail('received')` + test |
| 13 | Admin dashboard, calendar, notes, CMS modules | `/admin/*` |
| 14 | Roles, RLS and audit logging | migration policies + `audit_logs` |
| 15 | Privacy-conscious first-party analytics | consent gate + `/admin/visitors` |
| 16 | Docs, env template and deployment runbook | `README.md`, `docs/`, `.env.example` |
