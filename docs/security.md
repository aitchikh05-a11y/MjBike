# Security model

## Trust boundaries

| Zone | Code | Holds secrets | Trust |
| --- | --- | --- | --- |
| Browser | `src/**` | no | untrusted |
| Shared | `shared/**` | no | reused by both zones — **validation only, never authorization** |
| Edge Functions | `functions/api/**` | yes (service role, Resend, WhatsApp) | trusted |

Rules that follow from this:

1. Never import `@/lib/supabase/server` or the service-role key into `src/`.
2. Nothing in `src/` decides whether an operation is allowed; the UI hides controls for
   convenience, the database and the Functions enforce it.
3. `/api` requests are authenticated with the caller's Supabase access token
   (`Authorization: Bearer …`); the Functions re-read the profile and its role from Postgres on
   every privileged call — a forged or stale token cannot escalate privileges.
4. `POST` endpoints call `assertSameOrigin()` and reject unknown origins.

## Row Level Security

Enabled on **every** table in `supabase/migrations/20260101000000_init.sql`.

| Data | Anonymous | Staff | Admin | Super Admin |
| --- | --- | --- | --- | --- |
| Published services/offers/gallery | read | read | read + write | read + write |
| Testimonials | published only | read | read + write | read + write |
| Site settings | read (public subset) | read | read | read + write |
| Reservations | none (created through the API only) | assigned only | all | all |
| Customers / customer notes | none | read for assigned, notes need `notes:manage_own` | all | all |
| Inventory, availability | published availability only | read + write status | all | all |
| `admin_notes` | none | own notes | all (except private super-admin notes) | all |
| `audit_logs`, `notification_logs` | none | none | read | read |
| `profiles` (team) | none | own row | own row | all |

Guests can never `insert` into `reservations` directly: `create_reservation(jsonb)` is
`security definer`, re-validates everything and is the only write path.

## Authorization

- Role → permission map lives in `shared/domain/permissions.ts` and is mirrored in SQL helper
  functions (`is_staff()`, `has_permission(text)`).
- Every admin route is wrapped in `RequireAuth` + `adminPage(element, permission)`, so a stale
  bookmark renders a 403 panel instead of the page.
- Destructive actions require explicit confirmation (`ConfirmDialog`) and are always recorded
  in `audit_logs` with actor, entity, action and a before/after diff.

## Input handling

- All payloads are parsed with Zod schemas in `shared/schemas/index.ts` in the browser **and**
  again in the Functions — never trust the first parse.
- Prices, totals and availability are recomputed server-side; client-supplied prices are
  ignored (`price_snapshot` is written by the server or the SQL function).
- Free-text fields are trimmed and length-capped; SQL injection is not possible through the
  supabase-js query builder, and RPCs use typed arguments.
- Uploads: images must be JPEG/PNG/WebP under 8 MB; SVG is rejected (script vector); the
  `media` bucket is public-read / staff-write only.

## Abuse and spam

- The reservation and contact endpoints are rate limited per IP inside the Function
  (in-memory sliding window on the edge isolate; Cloudflare Rate Limiting rules are the
  hardening step for production).
- Honeypot field + the requirement to accept the privacy policy reduce bot traffic.
- Duplicate guard: identical email + service + date + start time within 60 seconds is
  rejected with the original reference instead of creating a second pending row.

## Session and password handling

- Supabase Auth issues short-lived JWTs; the browser client refreshes them automatically.
- Passwords never touch our tables. Reset and invite links redirect to
  `/admin/update-password` and are single use.
- Super admins can invite staff; only the Super Admin role can change roles.
- Sign-out clears the local session and the cached profile.

## Analytics privacy

- No third-party trackers, no fingerprinting, no long-lived identifiers.
- `analytics_events` stores an anonymous id, session id, path, referrer host, device class and
  the Cloudflare country code — never an IP address, never form contents.
- Collection is gated by consent; declining sends nothing.
- Identified customer linkage happens only when the visitor submits a booking (explicit
  business purpose), and the admin surfaces anonymous and identified traffic separately.

## Secrets and environment

- Only `VITE_*` variables reach the bundle; they must be public by definition (Supabase URL +
  anon key are protected by RLS).
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and WhatsApp credentials exist only in
  Cloudflare Pages environment variables.
- `.env*` is git-ignored; only `.env.example` is committed (with empty values).
- Rotate: service role key, Resend key and WhatsApp token on staff departure; rotate the
  Supabase JWT secret only with a forced global sign-out.

## Data retention and deletion

| Data | Retention |
| --- | --- |
| Reservations | 3 years (accounting/insurance), then anonymised |
| Customers | until deletion request |
| Analytics events | 13 months, then aggregated or purged |
| Notification logs | 12 months |
| Audit logs | 24 months (immutable) |

Deletion request procedure:

```sql
-- 1. export what must be kept for accounting
select reference, created_at, total_amount from public.reservations where customer_id = $1;
-- 2. detach the personal record
update public.customers set
  full_name = 'Deleted customer', email = 'deleted+' || id || '@example.invalid',
  phone = null, consent_marketing = false, deleted_at = now()
where id = $1;
-- 3. purge analytics linkage
update public.analytics_events set customer_id = null where customer_id = $1;
```

## Reporting a vulnerability

Email the address configured in `/admin/settings` with steps to reproduce; do not open a public
issue. Acknowledge within 72 hours.
