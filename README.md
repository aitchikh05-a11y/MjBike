# MJ Bike Tangier — website, booking system and CMS

Production-ready platform for **MJ Bike Tangier**: bicycle rental, guided cycling tours and
cycling experiences in Tangier, Morocco.

It is a standalone branded website — **not** an Instagram clone and **not** a static mockup:

- multilingual public site (English, French, Arabic with full RTL support and localized URLs)
- a real reservation workflow (request → manual confirmation → customer emails)
- a password-protected CMS for reservations, calendar, customers, offers, services,
  inventory, gallery, testimonials, internal notes, first-party analytics and site settings
- Supabase Postgres with Row Level Security, Cloudflare Pages Functions for privileged work,
  Resend for transactional email and an optional WhatsApp Business Cloud API channel

---

## 1. Business facts used by the site

| Fact | Value |
| --- | --- |
| Name | MJ Bike Tangier |
| Phone | +212 613 993 957 |
| WhatsApp | https://wa.me/212613993957 |
| Opening hours | 09:00 – 21:00, every day |
| Experience | 8 years of cycling experience in Tangier |
| Instagram | [@mj.bike.tangier](https://www.instagram.com/mj.bike.tangier/) |
| Location | Tangier, Morocco — [Google Maps](https://maps.app.goo.gl/V25hn98AexWHFd67g) |

Everything else (street address, prices, services, offers, gallery, testimonials) is editable
content in the CMS. The project intentionally ships **no invented reviews** and **no
fabricated dashboard statistics**: every number in the admin comes from stored records.

---

## 2. Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS 4 |
| Routing | React Router 7 (localized nested routes, lazy-loaded pages) |
| Database & auth | Supabase (Postgres, Auth, Storage, RLS) |
| Server logic | Cloudflare Pages Functions (Hono) — validation, pricing, rate limiting, email |
| Email | Resend (transactional, EN/FR/AR templates) |
| Messaging (optional) | WhatsApp Business Cloud API |
| Validation | Zod schemas shared by browser, Functions and tests |
| Charts | Recharts |
| Tests | Vitest + Testing Library (+ Playwright specs for E2E) |

---

## 3. Project structure

```
.
├── functions/api/                 Cloudflare Pages Functions (mounted at /api)
│   ├── [[route]].ts               Hono app: reservations, contact, analytics, admin endpoints
│   └── _lib/                      Supabase service client, auth guard, email, WhatsApp helpers
├── shared/                        Code shared by the browser, the Functions and the tests
│   ├── domain/                    types, pricing, availability, reservation rules, permissions
│   └── schemas/                   Zod schemas (single source of validation truth)
├── src/
│   ├── app/
│   │   ├── layouts/               PublicLayout, AdminLayout + RequireAuth
│   │   ├── providers/             i18n, consent, public data, scroll restoration
│   │   └── router/                localized paths/slugs + route table
│   ├── components/                layout (header/footer), booking form, admin widgets, UI kit
│   ├── data/seed.ts               demo + database seed content (single source, see §6)
│   ├── features/                  authentication context, first-party analytics 
│   ├── locales/                   en.ts / fr.ts / ar.ts dictionaries
│   ├── pages/public/              homepage, rentals, tours, experiences, offers, gallery, booking…
│   ├── pages/admin/               dashboard, reservations, calendar, customers, CMS modules
│   ├── services/backend/          data-access contract with two implementations (see §5)
│   └── styles/index.css           Tailwind theme, brand palette, RTL typography
├── supabase/
│   ├── migrations/                schema, RLS, RPCs, storage policies
│   └── seed.sql                   generated from src/data/seed.ts
├── scripts/generate-seed-sql.mjs  seed generator (keeps demo and database in sync)
├── tests/                         unit, integration and e2e specs
└── docs/                          setup, deployment, security and admin guides
```

---

## 4. Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc project references
npm test           # vitest unit + integration suites
npm run build      # typecheck + production build into dist/
```

### Demo mode (no configuration needed)

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the app runs on a **local demo
backend** stored in `localStorage`. It implements the same contract as Supabase and mirrors
the SQL rules (pricing, availability, capacity, status transitions, permissions, audit log).

Demo administrator accounts (password `MjBike!2026`):

| Email | Role |
| --- | --- |
| owner@mjbiketangier.com | Super Admin |
| admin@mjbiketangier.com | Admin |
| staff@mjbiketangier.com | Staff |

The admin header shows a **Local demo mode** badge; the refresh button resets the demo data.
Demo emails and WhatsApp messages are recorded with the status `skipped` — nothing is sent.
Demo data never leaves your browser.

### With Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill the browser values (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`) and the server values (`SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, plus the Resend settings). The `VITE_*` pair decides whether
   the app talks to Supabase; the un-prefixed pair is used by the Pages Functions.
3. Apply the schema and the seed:

   ```bash
   npm run db:push          # or: supabase db reset (local stack)
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   ```

4. Create the first administrator in Supabase → Authentication → Users → *Add user*, then
   promote them (the seed does not create auth users):

   ```sql
   update public.profiles set role = 'super_admin', full_name = 'Your Name'
   where email = 'you@example.com';
   ```

5. Run the API locally in a second terminal: `npx wrangler pages dev dist --port 8788`
   (Vite proxies `/api` to `http://127.0.0.1:8788`).

---

## 5. Data access contract

`src/services/backend/index.ts` exports one `backend` object:

| Environment | Implementation | Notes |
| --- | --- | --- |
| No Supabase env vars | `demoBackend` | localStorage, mirrors SQL behaviour |
| Supabase configured | `supabaseBackend` | Auth + Postgres via RLS; privileged writes through `/api` |

Privileged endpoints (never called with the service role from the browser):

| Endpoint | Purpose |
| --- | --- |
| `POST /api/reservations` | Guest booking request: server-side validation, price recomputation, availability re-check, RPC insert, emails |
| `POST /api/contact` | Contact form + admin notification |
| `POST /api/analytics/collect` | Consent-gated first-party event |
| `POST /api/reservations/lookup` | Guest status lookup by reference **and** email |
| `PATCH /api/admin/reservations/:id` | Status changes, internal notes, reassignment, alternative slot |
| `POST /api/admin/reservations/:id/notes` | Internal note / customer communication history |
| `POST /api/admin/staff` | Super-admin invitation (creates the auth user + profile) |
| `GET /api/health` | Configuration report (`supabase`, `email`, `whatsapp` flags) |

---

## 6. Database, seed and content

The migration creates every table required by the specification: `profiles`, `services`,
`service_translations`, `offers`, `offer_translations`, `reservations`, `reservation_items`,
`reservation_status_history`, `reservation_notes`, `availability_rules`, `availability_blocks`,
`bicycles`, `customers`, `customer_notes`, `calendar_events`, `admin_notes`, `gallery_items`,
`testimonials`, `site_settings`, `notification_logs`, `audit_logs`, `analytics_events`
(plus `contact_messages`).

Highlights:

- enums for statuses/roles/kinds, foreign keys with sensible `on delete` behaviour,
  unique indexes (reservation reference, customer email, one settings row), check constraints
- `create_reservation(jsonb)` — security definer, `pg_advisory_xact_lock` per service/day,
  re-checks opening hours, blocks and capacity, upserts the customer, generates the reference
- `service_availability(service, date, duration)` — SQL mirror of `shared/domain/availability.ts`
- `lookup_reservation(reference, email)`, `analytics_summary(from, to)`,
  `reorder_gallery_item(id, direction)`
- triggers: `updated_at`, automatic status history, enum-checked references
- RLS: public read on published content only, staff sees only assigned reservations,
  settings/team/audit restricted to Super Admin, guests cannot write reservation tables

**Editing seed content:** change `src/data/seed.ts` (used by the demo backend) and run

```bash
npm run seed:sql   # regenerates supabase/seed.sql from the same data
```

---

## 7. Reservation lifecycle

```
pending ──► confirmed ──► completed
   │            │  └────► no_show ──► completed
   │            └──────► cancelled
   ├─► rejected ─► pending
   └─► cancelled ─► pending
```

- A submitted request is **pending**; the customer email says explicitly that it is *not yet
  confirmed*.
- Administrators confirm, reject with a reason, or propose an alternative date/time.
- Only `confirmed` and `completed` count as revenue; `pending` is shown as estimated value.
- Blocking statuses (`pending`, `confirmed`) consume capacity; rejected/cancelled do not.
- Every transition is written to `reservation_status_history` and mirrored in the audit log.
- References follow `MJB-YYMMDD-XXXX` (alphabet excludes `O`, `0`, `I`, `1`).

Pricing (`shared/domain/pricing.ts`) is recalculated on the server: rentals use a duration
ladder, tours are per person, `per_group` ignores quantity, add-ons are charged once per
reservation, totals round to 2 decimals, and `price_snapshot` freezes the calculation.

---

## 8. Multilingual site

| Page | EN | FR | AR |
| --- | --- | --- | --- |
| Home | `/en/` | `/fr/` | `/ar/` |
| Rentals | `/en/bike-rentals/` | `/fr/location-velos/` | `/ar/tajir-darajat/` |
| Tours | `/en/bike-tours/` | `/fr/balades-velo/` | `/ar/jawalat/` |
| Experiences | `/en/experiences/` | `/fr/experiences/` | `/ar/tajarib/` |
| Offers | `/en/offers/` | `/fr/offres/` | `/ar/urud/` |
| Gallery | `/en/gallery/` | `/fr/galerie/` | `/ar/maarid/` |
| Booking | `/en/reservations/` | `/fr/reservations/` | `/ar/hajz/` |
| Confirmation | `/en/reservations/confirmation/` | `/fr/reservations/confirmation/` | `/ar/hajz/tamid/` |
| Find a booking | `/en/find-reservation/` | `/fr/trouver-reservation/` | `/ar/al-bahth-an-hajzi/` |
| Contact | `/en/contact/` | `/fr/contact/` | `/ar/ittisal/` |
| About | `/en/about/` | `/fr/a-propos/` | `/ar/man-nahnu/` |
| FAQ | `/en/faq/` | `/fr/faq/` | `/ar/asila/` |
| Privacy | `/en/privacy/` | `/fr/confidentialite/` | `/ar/khousousiya/` |
| Terms | `/en/terms/` | `/fr/conditions-generales/` | `/ar/shurut/` |

- `/` redirects to the visitor's stored or browser language.
- The language switcher keeps the equivalent page (slug mapping in `src/app/router/paths.ts`).
- Arabic sets `dir="rtl"`, `lang="ar-MA"` and uses IBM Plex Sans Arabic; layout uses logical
  CSS properties (`ms-*`, `start-*`) so the admin and the site mirror correctly.
- Every page renders a canonical URL, `hreflang` alternates for all three languages plus
  `x-default`, Open Graph/Twitter tags and robots directives (`noindex` for admin and 404s).

---

## 9. Admin CMS

`/admin/login` · `/admin/dashboard` · reservations · calendar · customers · offers · services ·
inventory · gallery · testimonials · notes · visitors · settings.

| Module | What it does |
| --- | --- |
| Dashboard | Today / pending / confirmed / upcoming tours / cancellations, confirmed vs estimated revenue, published offers, visitors, charts and date range |
| Reservations | Search, filter, CSV export, status workflow, internal notes, communication history, price snapshot, assignment |
| Calendar | Month / week / day, colour-coded statuses, availability blocks and holidays, reschedule with validation, manual booking |
| Customers | Search, history, consent, notes gated by permission |
| Offers & services | CRUD with EN/FR/AR translations, images, duration tiers, add-ons, publish/unpublish/archive |
| Inventory | Fleet by model, status, maintenance blocks |
| Gallery | Image/video items, categories, ordering, publish toggle |
| Testimonials | Only real, consented quotes — the seed ships with none |
| Notes | Tasks with priority, category, follow-up date, pin/archive |
| Visitors | First-party analytics with anonymous vs identified split |
| Settings | Business info, contact/social links, claims, opening hours, FAQ and team management |

Roles: **Super Admin** (everything), **Admin** (operations + content, no settings/team/audit),
**Staff** (only assigned reservations, calendar, inventory, own notes). Permissions live in
`shared/domain/permissions.ts` and are enforced twice (UI + RLS/Functions).

---

## 10. Email and WhatsApp

- Emails are sent with Resend from the Pages Function (`functions/api/_lib/email.ts`).
- Templates exist in EN/FR/AR for: request received (explicitly *not* a confirmation),
  confirmed, rejected, cancelled, contact acknowledgment, and an admin notification.
- Every attempt is logged in `notification_logs` with `sent` / `failed` / `skipped`.
- WhatsApp is optional: it activates only when `WHATSAPP_ACCESS_TOKEN` and
  `WHATSAPP_PHONE_NUMBER_ID` are set. Business-initiated messages require an approved
  WhatsApp template; until that is set up, messages are logged as `skipped`.

> Nothing here claims an integration works before it is configured and tested. Use
> `GET /api/health` after deployment to confirm which channels are live.

---

## 11. Analytics and privacy

- First-party only: no third-party trackers, no cookies for analytics.
- Nothing is stored until the visitor accepts the consent banner; declining keeps the site
  fully functional.
- Events are aggregated per anonymous id and per session; the admin dashboard shows anonymous
  visitors separately from identified customers.
- IP addresses are not stored; only the two-letter country from Cloudflare is recorded.
- Customers can request deletion; see `docs/security.md`.

---

## 12. Deployment (Cloudflare Pages)

```bash
npm run build
npx wrangler pages deploy dist --project-name mj-bike-tangier
```

### Documentation

| Document | Contents |
| --- | --- |
| [`docs/deployment-cloudflare.md`](docs/deployment-cloudflare.md) | DNS, HTTPS, custom domain, SPA routing, caching, CSP/security headers, rollback, post-deploy checks |
| [`docs/setup-checklist.md`](docs/setup-checklist.md) | Every environment variable, Supabase, Resend, WhatsApp, content and acceptance-criteria checkbox |
| [`docs/admin-guide.md`](docs/admin-guide.md) | Daily workflow for the team: reservations, calendar, content, roles, troubleshooting |
| [`docs/security.md`](docs/security.md) | Trust boundaries, RLS matrix, authorization, analytics privacy, retention and deletion |

---

## 13. Tests

```bash
npm test                     # 70+ unit + integration tests (Vitest, jsdom)
npx vitest run tests/unit    # pricing, availability, reservation rules, permissions, routing
npm run test:e2e             # Playwright specs (see note below)
```

The integration suite exercises the demo backend end to end: sign-in, booking creation,
duplicate guard, capacity and opening-hours rejection, confirmation workflow, staff scoping,
settings permissions, dashboard metrics, analytics aggregation and content management.
Rendering tests mount the real router and check EN/FR/AR pages, the booking form and the
admin auth guard.

**E2E note:** `tests/e2e` contains Playwright specs, but Playwright is not installed by
default. Install it before running them:

```bash
npm i -D @playwright/test && npx playwright install chromium
```

---

## 14. Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (proxies `/api` to 8788) |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | TypeScript project references |
| `npm test` | Unit + integration tests |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/data/seed.ts` |
| `npm run db:push` / `db:reset` | Apply migrations / reset local Supabase |
| `npm run cf:dev` | Build and serve with Wrangler Pages (Functions included) |
| `npm run cf:deploy` | Deploy to Cloudflare Pages |

---

## 15. Known limitations (honest list)

- Payments are not implemented. `price_snapshot`, totals and statuses are payment-ready, but
  no PSP is wired up.
- E2E specs require installing Playwright (see §13).
- The generated `src/types/database.generated.ts` is not committed; add it with
  `npm run db:types` if you want generated Supabase types.
- Demo mode cannot change passwords (it has no auth server); the admin explains this.
