# Admin guide (MJ Bike Tangier)

Sign in at `/admin/login` with your email and password. Use **Forgot password?** on the login
screen if you do not have one; Super Admins can also invite team members from *Settings → Team*.

## Daily routine

1. **Dashboard** — check *Pending requests*. Anything waiting more than a few hours is a
   customer you have not answered yet.
2. **Reservations** — open each pending request, verify the bike/experience, the date and the
   availability, then **Confirm**, **Reject** (with a reason) or **Propose an alternative**.
   The customer is emailed automatically.
3. **Calendar** — scan today/tomorrow for over-booked days (red/green density).
4. **Notes** — clear today's tasks and follow-ups.

## Reservation workflow

| Action | Effect |
| --- | --- |
| Confirm | Status → `confirmed`, capacity is held, confirmation email sent, history + audit written |
| Reject | Status → `rejected`, reason stored, rejection email sent, capacity released |
| Propose alternative | Stores the proposed date/time and emails the customer; the request stays pending until they reply |
| Cancel | Status → `cancelled`, cancellation email sent, capacity released |
| Complete / No-show | Close the booking after the ride; only `completed` counts as realised revenue |
| Notes | Internal only, never visible to the customer; the *communication history* tab shows every email/WhatsApp attempt |

Notes about prices: the **price snapshot** on the reservation is frozen at creation time and
the totals are always recomputed by the server. Never edit price fields by hand — if the price
is wrong, change the service price and create a new reservation.

A request is **never** confirmed by the customer submitting the form. The confirmation email
only goes out when a staff member confirms it.

## Calendar

- Month / week / day views, colour-coded by status.
- **Availability block** — closes a date or a time window (holiday, maintenance, private
  event). Blocks immediately prevent new bookings in that window.
- **Manual booking** — create a reservation on behalf of a customer (phone bookings,
  walk-ins). It goes through the same validation and capacity checks.
- **Reschedule** — move a booking to another slot; capacity and opening hours are re-checked.

## Content

| Module | Watch out for |
| --- | --- |
| Services | Duration tiers and add-ons drive pricing. Change a price → new bookings use it, old ones keep the snapshot. |
| Offers | Set real validity dates. Unpublished offers disappear from the site instantly. |
| Gallery | Upload real photos, add alt text in all three languages, then use the arrows to order. |
| Testimonials | Only add real, consented quotes. Never invent reviews or star ratings. |
| Inventory | Mark a bicycle `maintenance` to keep it out of the bookable pool. |
| Settings | Business phone, WhatsApp, email, Maps link, opening hours, FAQ, team and role changes. |

Each translatable field has EN / FR / AR tabs. The site falls back to English when a
translation is empty, but the language switcher keeps the same page, so fill all three.

## Roles

| Role | Can do |
| --- | --- |
| Super Admin | Everything, including settings, team, roles and audit log |
| Admin | Reservations, calendar, customers, offers, services, inventory, gallery, testimonials, notes, analytics |
| Staff | Assigned reservations, calendar, inventory status, own notes |

If a page is hidden but you reach it by URL, you will see a "not allowed" panel — permissions
are enforced by the database, not just the menu.

## Analytics and privacy

*Visitors* shows first-party numbers only. Nothing is recorded before a visitor accepts the
consent banner, and anonymous visitors are reported separately from identified customers.
Never paste customer names or emails into notes unless the customer needs them for the booking.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| "Local demo mode" badge | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing in the build environment |
| Booking form says *unavailable* | The slot is blocked, full, outside 09:00–21:00 or the service is unpublished |
| Customer did not receive an email | Check *communication history*; `skipped` = no `RESEND_API_KEY`, `failed` = Resend rejected the address/domain |
| Cannot see Settings | Your role is Admin or Staff — ask a Super Admin |
| Charts empty | No events yet for the selected range, or consent was never given on the site |
