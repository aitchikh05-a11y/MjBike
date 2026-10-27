/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/cloudflare-pages';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  contactMessageSchema,
  fieldErrors,
  reservationCreateSchema,
  reservationUpdateSchema,
  analyticsEventSchema,
  staffUpsertSchema,
} from '../../shared/schemas';
import { calculateQuote, buildPriceSnapshot } from '../../shared/domain/pricing';
import { canTransition, generateReference, REFERENCE_PATTERN } from '../../shared/domain/reservations';
import type { Offer, Reservation, Service } from '../../shared/domain/types';
import {
  adminClient,
  ApiError,
  audit,
  requireProfile,
  requireRole,
  type AdminProfile,
  type AppEnv,
  type Env,
} from './_lib/supabase';
import { adminNotificationEmail, contactEmail, reservationEmail, sendEmail } from './_lib/email';
import { reservationWhatsAppBody, sendWhatsAppTemplate } from './_lib/whatsapp';

type Row = Record<string, unknown>;

const app = new Hono<AppEnv>().basePath('/api');

app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
);

app.onError((error, context) => {
  if (error instanceof ApiError) {
    return context.json({ error: error.code, message: error.message, fields: error.fields ?? null }, error.status as 400);
  }
  console.error('[api] unhandled error', error);
  return context.json({ error: 'server_error', message: 'Something went wrong on our side. Please try again.' }, 500);
});

/** Reject cross-site form posts: only our own origins may call the API. */
function assertSameOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin');
  if (!origin) return; // same-origin fetches from the SPA omit Origin on GET; POSTs include it
  const siteUrl = env.SITE_URL?.replace(/\/$/, '');
  const allowed = new Set([siteUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8788', 'http://127.0.0.1:8788'].filter(Boolean));
  const host = new URL(origin).hostname;
  if (host.endsWith('.pages.dev') || host.endsWith('.mj-bike-tangier.pages.dev')) return;
  if (!allowed.has(origin)) {
    throw new ApiError(403, 'forbidden_origin', 'This origin is not allowed to post here.');
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const RESERVATION_SELECT = '*, reservation_items(*), reservation_status_history(*), reservation_notes(*)';

async function logNotification(
  client: SupabaseClient,
  entry: {
    channel: 'email' | 'whatsapp';
    template: string;
    recipient: string;
    reservationId: string | null;
    status: 'queued' | 'sent' | 'failed' | 'skipped';
    providerMessageId: string | null;
    error: string | null;
  },
) {
  try {
    await client.from('notification_logs').insert({
      channel: entry.channel,
      template: entry.template,
      recipient: entry.recipient,
      reservation_id: entry.reservationId,
      status: entry.status,
      provider_message_id: entry.providerMessageId,
      error: entry.error,
    });
  } catch (caught) {
    console.error('[api] notification log failed', caught);
  }
}

function localeName(locale: string | null | undefined, languages: { locale: string; name: string }[]): string {
  return languages.find((entry) => entry.locale === locale)?.name ?? languages.find((entry) => entry.locale === 'en')?.name ?? 'Service';
}

async function loadService(client: SupabaseClient, serviceId: string): Promise<Service> {
  const { data, error } = await client.from('services').select('*, translations:service_translations(*)').eq('id', serviceId).maybeSingle();
  if (error) throw new ApiError(500, 'service_lookup_failed', error.message);
  if (!data) throw new ApiError(404, 'not_found', 'That service is not available.');
  return data as unknown as Service;
}

async function loadOffer(client: SupabaseClient, offerId: string | null | undefined): Promise<Offer | null> {
  if (!offerId) return null;
  const { data } = await client.from('offers').select('*, translations:offer_translations(*)').eq('id', offerId).maybeSingle();
  return (data as unknown as Offer) ?? null;
}

async function sendBoth(
  client: SupabaseClient,
  env: Env,
  args: { to: string; subject: string; html: string; text: string; template: string; reservationId: string | null },
) {
  const result = await sendEmail(env, args);
  await logNotification(client, {
    channel: 'email',
    template: args.template,
    recipient: args.to,
    reservationId: args.reservationId,
    status: result.status,
    providerMessageId: result.providerMessageId,
    error: result.error,
  });
  return result;
}

/* ------------------------------------------------------------------ */
/* Public endpoints                                                    */
/* ------------------------------------------------------------------ */

app.get('/health', (context) =>
  context.json({
    ok: true,
    supabase: Boolean(context.env.SUPABASE_URL && context.env.SUPABASE_SERVICE_ROLE_KEY),
    email: Boolean(context.env.RESEND_API_KEY),
    whatsapp: Boolean(context.env.WHATSAPP_ACCESS_TOKEN && context.env.WHATSAPP_PHONE_NUMBER_ID),
    time: new Date().toISOString(),
  }),
);

/** Guest booking request. Prices and availability are always recomputed here. */
app.post('/reservations', async (context) => {
  assertSameOrigin(context.req.raw, context.env);
  const body = await context.req.json().catch(() => null);
  const parsed = reservationCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, 'validation', 'Please correct the highlighted fields.', fieldErrors(parsed.error));
  }
  const input = parsed.data;
  const client = adminClient(context.env);

  const service = await loadService(client, input.service_id);
  if (!service.is_active) throw new ApiError(404, 'not_found', 'That service is not available.');

  const offer = await loadOffer(client, input.offer_id);
  if (input.offer_id) {
    const today = new Date().toISOString().slice(0, 10);
    if (!offer || offer.status !== 'published' || offer.validity_end < today) {
      throw new ApiError(404, 'offer_unavailable', 'That offer is no longer available.');
    }
  }

  let quote;
  try {
    quote = calculateQuote({
      service,
      offer,
      durationHours: input.duration_hours,
      quantity: input.quantity,
      addonIds: input.addons ?? [],
    });
  } catch (caught) {
    throw new ApiError(422, 'pricing', caught instanceof Error ? caught.message : 'Unable to price this reservation.');
  }

  const serviceName = localeName(input.locale, service.translations ?? []);
  const snapshot = buildPriceSnapshot({
    quote,
    serviceName,
    serviceSlug: service.slug,
    offerTitle: offer?.translations?.find((entry) => entry.locale === input.locale)?.title ?? null,
  });

  // Duplicate guard: same email, service and slot, still open, requested in the last 10 minutes.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: duplicate } = await client
    .from('reservations')
    .select(RESERVATION_SELECT)
    .ilike('email', input.email)
    .eq('service_id', input.service_id)
    .eq('reservation_date', input.reservation_date)
    .eq('start_time', input.start_time.slice(0, 5))
    .in('status', ['pending', 'confirmed'])
    .gte('created_at', tenMinutesAgo)
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    return context.json({ reservation: duplicate, duplicate: true });
  }

  let reservation: Row | null = null;
  let lastError: { message?: string } | null = null;
  for (let attempt = 0; attempt < 3 && !reservation; attempt += 1) {
    const reference = generateReference();
    if (!REFERENCE_PATTERN.test(reference)) continue;
    const { data, error } = await client.rpc('create_reservation', {
      p_payload: {
        ...input,
        reference,
        total_price: quote.total,
        price_snapshot: snapshot,
        item: {
          name: serviceName,
          unit_price: quote.unitPrice,
          line_total: quote.subtotal,
        },
      },
    });

    if (!error && data) {
      reservation = data as Row;
      break;
    }
    lastError = error ?? null;
    // Unique violation on the reference: retry with a new one.
    if (!error || !/duplicate key|reference/i.test(error.message ?? '')) break;
  }

  if (!reservation) {
    const message = lastError?.message ?? 'The reservation could not be created.';
    if (/capacity/i.test(message)) throw new ApiError(409, 'capacity', 'This time slot is now fully booked. Please choose another time.');
    if (/blocked/i.test(message)) throw new ApiError(409, 'blocked', 'That time is not available (closure or maintenance).');
    if (/outside_hours|closed/i.test(message)) throw new ApiError(409, 'outside_hours', 'That time is outside our opening hours.');
    if (/offer_not_available/i.test(message)) throw new ApiError(404, 'offer_unavailable', 'That offer is no longer available.');
    throw new ApiError(500, 'reservation_failed', message);
  }

  const { data: full } = await client.from('reservations').select(RESERVATION_SELECT).eq('id', reservation.id as string).single();
  const created = (full ?? reservation) as unknown as Reservation;

  // Fire-and-forget side effects: the guest still gets a success response if email hiccups.
  const settings = await client.from('site_settings').select('phone, whatsapp, email').limit(1).maybeSingle();
  const siteUrl = context.env.SITE_URL ?? 'https://mjbiketangier.com';
  const customerEmail = reservationEmail('received', created, {
    siteUrl,
    phone: settings.data?.phone ?? undefined,
    whatsapp: settings.data?.whatsapp ?? undefined,
  });
  await sendBoth(client, context.env, {
    to: created.email,
    ...customerEmail,
    template: 'reservation_received',
    reservationId: created.id,
  });

  const adminEmail = context.env.ADMIN_EMAIL ?? settings.data?.email;
  if (adminEmail) {
    const notification = adminNotificationEmail(created, `${siteUrl}/admin/reservations/${created.id}`);
    await sendBoth(client, context.env, {
      to: adminEmail,
      ...notification,
      template: 'reservation_request_admin',
      reservationId: created.id,
    });
  }

  if (created.preferred_contact === 'whatsapp' && created.phone) {
    const result = await sendWhatsAppTemplate(context.env, {
      to: created.phone,
      body: reservationWhatsAppBody(created.reference, created.locale),
    });
    await logNotification(client, {
      channel: 'whatsapp',
      template: 'reservation_received',
      recipient: created.phone,
      reservationId: created.id,
      status: result.status,
      providerMessageId: result.providerMessageId,
      error: result.error,
    });
  }

  await client.from('analytics_events').insert({
    event_type: 'reservation_submitted',
    path: `/${input.locale}/`,
    locale: input.locale,
    anonymous_id: `server-${created.id}`,
    session_id: `server-${created.id}`,
    device_category: 'desktop',
    browser: 'Server',
    country: context.req.header('CF-IPCountry') ?? null,
  });

  return context.json({ reservation: created, duplicate: false }, 201);
});

/** Contact form. */
app.post('/contact', async (context) => {
  assertSameOrigin(context.req.raw, context.env);
  const body = await context.req.json().catch(() => null);
  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, 'validation', 'Please correct the highlighted fields.', fieldErrors(parsed.error));
  }
  const client = adminClient(context.env);
  const message = parsed.data;

  const { error } = await client.from('contact_messages').insert({
    full_name: message.full_name,
    email: message.email,
    phone: message.phone || null,
    subject: message.subject,
    message: message.message,
    locale: message.locale,
  });
  if (error) throw new ApiError(500, 'contact_failed', error.message);

  const settings = await client.from('site_settings').select('email').limit(1).maybeSingle();
  const adminEmail = context.env.ADMIN_EMAIL ?? settings.data?.email;
  if (adminEmail) {
    await sendBoth(client, context.env, {
      to: adminEmail,
      subject: `Contact form — ${message.subject}`,
      html: `<p>${message.full_name} &lt;${message.email}&gt; ${message.phone ?? ''}</p><p>${message.message}</p>`,
      text: `${message.full_name} <${message.email}>\n${message.phone ?? ''}\n\n${message.message}`,
      template: 'contact_message_admin',
      reservationId: null,
    });
  }

  await sendBoth(client, context.env, {
    to: message.email,
    ...contactEmail(message, { siteUrl: context.env.SITE_URL }),
    template: 'contact_message_customer',
    reservationId: null,
  });

  return context.json({ ok: true });
});

/** First-party, consent-gated analytics collection. */
app.post('/analytics/collect', async (context) => {
  const body = await context.req.json().catch(() => null);
  const parsed = analyticsEventSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(422, 'validation', 'Invalid analytics event.');

  const client = adminClient(context.env);
  const event = parsed.data;
  const { error } = await client.from('analytics_events').insert({
    ...event,
    country: event.country ?? context.req.header('CF-IPCountry') ?? null,
  });
  if (error) throw new ApiError(500, 'analytics_failed', error.message);
  return context.json({ ok: true });
});

/** Public guest lookup — requires reference AND email. */
app.post('/reservations/lookup', async (context) => {
  const body = (await context.req.json().catch(() => null)) as { reference?: string; email?: string } | null;
  if (!body?.reference || !body?.email) throw new ApiError(422, 'validation', 'Enter your reference and email.');
  const client = adminClient(context.env);
  const { data, error } = await client.rpc('lookup_reservation', { p_reference: body.reference, p_email: body.email });
  if (error) throw new ApiError(500, 'lookup_failed', error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return context.json({ reservation: null });
  const { data: full } = await client.from('reservations').select(RESERVATION_SELECT).eq('id', (row as Row).id as string).single();
  return context.json({ reservation: full });
});

/* ------------------------------------------------------------------ */
/* Admin endpoints                                                     */
/* ------------------------------------------------------------------ */

async function loadReservationForActor(
  client: SupabaseClient,
  profile: AdminProfile,
  id: string,
): Promise<Reservation> {
  const { data, error } = await client.from('reservations').select(RESERVATION_SELECT).eq('id', id).maybeSingle();
  if (error) throw new ApiError(500, 'reservation_lookup_failed', error.message);
  if (!data) throw new ApiError(404, 'not_found', 'Reservation not found.');
  const reservation = data as unknown as Reservation;
  if (profile.role === 'staff' && reservation.assigned_staff_id !== profile.id) {
    throw new ApiError(403, 'forbidden', 'This reservation is not assigned to you.');
  }
  return reservation;
}

app.patch('/admin/reservations/:id', async (context) => {
  assertSameOrigin(context.req.raw, context.env);
  const { profile } = await requireProfile(context.env, context.req.header('Authorization') ?? null);
  const client = adminClient(context.env);
  const id = context.req.param('id');

  const body = (await context.req.json().catch(() => null)) as (Row & { note?: string }) | null;
  const parsed = reservationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, 'validation', 'Please correct the highlighted fields.', fieldErrors(parsed.error));
  }

  const reservation = await loadReservationForActor(client, profile, id);
  const changes = parsed.data;
  const note = typeof body?.note === 'string' ? body.note : null;

  if (changes.status && changes.status !== reservation.status) {
    if (!canTransition(reservation.status, changes.status)) {
      throw new ApiError(409, 'invalid_transition', `Cannot move a ${reservation.status} reservation to ${changes.status}.`);
    }

    if (changes.status === 'confirmed' && !changes.force) {
      if (!reservation.service_id) throw new ApiError(409, 'capacity', 'This reservation has no service attached.');
      const { data: slots, error: slotError } = await client.rpc('service_availability', {
        p_service_id: reservation.service_id,
        p_date: reservation.reservation_date,
        p_duration: reservation.duration_hours,
      });
      if (slotError) throw new ApiError(500, 'availability_failed', slotError.message);
      const slot = (slots as { slot_time: string; available: boolean; remaining: number }[] | null)?.find(
        (entry) => entry.slot_time.slice(0, 5) === reservation.start_time.slice(0, 5),
      );
      // The pending reservation itself is counted by the RPC, so add its own places back.
      const free = (slot?.remaining ?? 0) + reservation.participants;
      if (!slot?.available && slot !== undefined) {
        throw new ApiError(409, 'capacity', 'This time slot is no longer available. Propose another time or force the confirmation.');
      }
      if (free < reservation.participants) {
        throw new ApiError(409, 'capacity', 'This time slot no longer has enough capacity.');
      }
    }
  }

  const patch: Row = {};
  for (const key of ['status', 'reason', 'internal_notes', 'assigned_staff_id', 'proposed_date', 'proposed_time'] as const) {
    if (changes[key] !== undefined) patch[key] = changes[key];
  }
  if (changes.status === 'cancelled' || changes.status === 'rejected') {
    patch.cancellation_reason = changes.reason ?? null;
  }

  const { error: updateError } = await client.from('reservations').update(patch).eq('id', id);
  if (updateError) throw new ApiError(500, 'update_failed', updateError.message);

  if (note) {
    await client.from('reservation_notes').insert({
      reservation_id: id,
      author_id: profile.id,
      author_name: profile.full_name,
      note,
      is_customer_communication: false,
    });
  }

  await audit(context.env, profile, `reservation.status.${changes.status ?? reservation.status}`, 'reservation', id, {
    from: reservation.status,
    to: changes.status ?? reservation.status,
    reason: changes.reason ?? null,
  });

  if (changes.status && changes.status !== reservation.status) {
    const intentMap: Record<string, 'confirmed' | 'rejected' | 'cancelled'> = {
      confirmed: 'confirmed',
      rejected: 'rejected',
      cancelled: 'cancelled',
    };
    const intent = intentMap[changes.status];
    if (intent && (intent !== 'cancelled' || reservation.status === 'confirmed' || reservation.status === 'pending')) {
      const settings = await client.from('site_settings').select('phone, whatsapp').limit(1).maybeSingle();
      const email = reservationEmail(intent, { ...reservation, cancellation_reason: changes.reason ?? reservation.cancellation_reason }, {
        siteUrl: context.env.SITE_URL,
        phone: settings.data?.phone ?? undefined,
        whatsapp: settings.data?.whatsapp ?? undefined,
      });
      await sendBoth(client, context.env, {
        to: reservation.email,
        ...email,
        template: `reservation_${intent}`,
        reservationId: id,
      });

      if (reservation.preferred_contact === 'whatsapp' && reservation.phone) {
        const result = await sendWhatsAppTemplate(context.env, {
          to: reservation.phone,
          body: reservationWhatsAppBody(reservation.reference, reservation.locale),
        });
        await logNotification(client, {
          channel: 'whatsapp',
          template: `reservation_${intent}`,
          recipient: reservation.phone,
          reservationId: id,
          status: result.status,
          providerMessageId: result.providerMessageId,
          error: result.error,
        });
      }
    }
  }

  const { data: updated } = await client.from('reservations').select(RESERVATION_SELECT).eq('id', id).single();
  return context.json({ reservation: updated });
});

app.post('/admin/reservations/:id/notes', async (context) => {
  assertSameOrigin(context.req.raw, context.env);
  const { profile } = await requireProfile(context.env, context.req.header('Authorization') ?? null);
  const client = adminClient(context.env);
  const id = context.req.param('id');
  const body = (await context.req.json().catch(() => null)) as { note?: string; isCustomerCommunication?: boolean } | null;

  if (!body?.note || !body.note.trim()) throw new ApiError(422, 'validation', 'Write a note first.', { note: 'Write a note first.' });
  await loadReservationForActor(client, profile, id);

  const { error } = await client.from('reservation_notes').insert({
    reservation_id: id,
    author_id: profile.id,
    author_name: profile.full_name,
    note: body.note.trim(),
    is_customer_communication: Boolean(body.isCustomerCommunication),
  });
  if (error) throw new ApiError(500, 'note_failed', error.message);

  await audit(context.env, profile, 'reservation.note.add', 'reservation', id);
  return context.json({ ok: true });
});

app.post('/admin/staff', async (context) => {
  assertSameOrigin(context.req.raw, context.env);
  const { profile } = await requireRole(context.env, context.req.header('Authorization') ?? null, ['super_admin']);
  const body = await context.req.json().catch(() => null);
  const parsed = staffUpsertSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, 'validation', 'Please correct the fields.', fieldErrors(parsed.error));
  }
  const draft = parsed.data;
  const client = adminClient(context.env);

  // Generate a strong temporary password; the new administrator must change it.
  const temporaryPassword = `MJB-${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 4)}`;
  const { data: created, error } = await client.auth.admin.createUser({
    email: draft.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: draft.full_name },
  });

  if (error || !created.user) {
    throw new ApiError(400, 'user_create_failed', error?.message ?? 'The account could not be created.');
  }

  const { error: profileError } = await client.from('profiles').upsert({
    id: created.user.id,
    email: draft.email,
    full_name: draft.full_name,
    role: draft.role,
    phone: draft.phone ?? null,
    is_active: true,
  });
  if (profileError) throw new ApiError(500, 'profile_create_failed', profileError.message);

  await audit(context.env, profile, 'profile.create', 'profile', created.user.id, { role: draft.role });
  return context.json(
    {
      profile: {
        id: created.user.id,
        email: draft.email,
        full_name: draft.full_name,
        role: draft.role,
        phone: draft.phone ?? null,
        is_active: true,
        created_at: new Date().toISOString(),
        last_sign_in_at: null,
      },
      temporaryPassword,
    },
    201,
  );
});

app.get('/admin/notifications', async (context) => {
  const { profile } = await requireProfile(context.env, context.req.header('Authorization') ?? null);
  if (profile.role === 'staff') throw new ApiError(403, 'forbidden', 'Only administrators can read notification logs.');
  const client = adminClient(context.env);
  const { data, error } = await client.from('notification_logs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw new ApiError(500, 'notifications_failed', error.message);
  return context.json({ notifications: data });
});

app.notFound((context) => context.json({ error: 'not_found', message: 'Unknown API route.' }, 404));

export const onRequest = handle(app);
