import type { Reservation } from '../../../shared/domain/types';
import type { Env } from './supabase';

interface LocaleCopy {
  language: string;
  greeting: (name: string) => string;
  receivedSubject: string;
  receivedTitle: string;
  receivedBody: string;
  pendingNotice: string;
  detailsTitle: string;
  reference: string;
  date: string;
  time: string;
  duration: string;
  people: string;
  total: string;
  notPaid: string;
  contactTitle: string;
  contactBody: string;
  contactAckBody: string;
  signOff: string;
  confirmedSubject: string;
  confirmedBody: string;
  rejectedSubject: string;
  rejectedBody: string;
  cancelledSubject: string;
  cancelledBody: string;
  contactSubject: string;
  contactThanks: string;
  adminSubject: string;
  adminNewRequest: string;
  adminOpen: string;
}

const COPY: Record<'en' | 'fr' | 'ar', LocaleCopy> = {
  en: {
    language: 'en',
    greeting: (name) => `Hello ${name},`,
    receivedSubject: 'We received your request — MJ Bike Tangier',
    receivedTitle: 'Your request has been received',
    receivedBody: 'Thank you for your request. It is not confirmed yet: we check availability by hand and reply as soon as possible.',
    pendingNotice: 'This is a request, not a confirmed booking. We will email you once it is confirmed.',
    detailsTitle: 'Your request',
    reference: 'Reference',
    date: 'Date',
    time: 'Start time',
    duration: 'Duration',
    people: 'Bikes / participants',
    total: 'Estimated total',
    notPaid: 'No payment has been taken.',
    contactTitle: 'Questions?',
    contactBody: 'Reply to this email or send us a WhatsApp message. We are open every day from 09:00 to 21:00.',
    signOff: 'See you on the road,\nMJ Bike Tangier',
    confirmedSubject: 'Your booking is confirmed — MJ Bike Tangier',
    confirmedBody: 'Good news: your booking is confirmed. We look forward to riding with you.',
    rejectedSubject: 'About your booking request — MJ Bike Tangier',
    rejectedBody: 'We are sorry, we cannot accept this request as it stands. Reply to this email and we will find another slot together.',
    cancelledSubject: 'Your booking has been cancelled — MJ Bike Tangier',
    cancelledBody: 'Your booking has been cancelled as requested. If this was not intentional, reply to this email and we will re-open it.',
    contactSubject: 'We received your message — MJ Bike Tangier',
    contactAckBody: 'Thank you for getting in touch. We answer messages every day between 09:00 and 21:00.',
    contactThanks: 'Your message',
    adminSubject: 'New reservation request',
    adminNewRequest: 'A new reservation request is waiting for confirmation.',
    adminOpen: 'Open in the admin',
  },
  fr: {
    language: 'fr',
    greeting: (name) => `Bonjour ${name},`,
    receivedSubject: 'Nous avons reçu votre demande — MJ Bike Tangier',
    receivedTitle: 'Votre demande a bien été reçue',
    receivedBody: 'Merci pour votre demande. Elle n’est pas encore confirmée : nous vérifions la disponibilité à la main et répondons dès que possible.',
    pendingNotice: 'Il s’agit d’une demande, pas d’une réservation confirmée. Nous vous écrirons dès qu’elle sera confirmée.',
    detailsTitle: 'Votre demande',
    reference: 'Référence',
    date: 'Date',
    time: 'Heure de départ',
    duration: 'Durée',
    people: 'Vélos / participants',
    total: 'Total estimé',
    notPaid: 'Aucun paiement n’a été prélevé.',
    contactTitle: 'Une question ?',
    contactBody: 'Répondez à cet e-mail ou écrivez-nous sur WhatsApp. Nous sommes ouverts tous les jours de 09 h à 21 h.',
    signOff: 'À bientôt sur la route,\nMJ Bike Tangier',
    confirmedSubject: 'Votre réservation est confirmée — MJ Bike Tangier',
    confirmedBody: 'Bonne nouvelle : votre réservation est confirmée. Nous avons hâte de rouler avec vous.',
    rejectedSubject: 'Votre demande de réservation — MJ Bike Tangier',
    rejectedBody: 'Nous sommes désolés, nous ne pouvons pas accepter cette demande en l’état. Répondez à cet e-mail et nous trouverons un autre créneau ensemble.',
    cancelledSubject: 'Votre réservation a été annulée — MJ Bike Tangier',
    cancelledBody: 'Votre réservation a été annulée comme demandé. Si ce n’était pas intentionnel, répondez à cet e-mail et nous la réouvrirons.',
    contactSubject: 'Nous avons reçu votre message — MJ Bike Tangier',
    contactAckBody: 'Merci de nous avoir écrit. Nous répondons tous les jours entre 09 h et 21 h.',
    contactThanks: 'Votre message',
    adminSubject: 'Nouvelle demande de réservation',
    adminNewRequest: 'Une nouvelle demande de réservation attend une confirmation.',
    adminOpen: 'Ouvrir dans l’admin',
  },
  ar: {
    language: 'ar',
    greeting: (name) => `مرحباً ${name}،`,
    receivedSubject: 'تلقّينا طلبكم — MJ Bike Tangier',
    receivedTitle: 'تلقّينا طلبكم',
    receivedBody: 'شكراً لطلبكم. لم يتم تأكيده بعد: نتحقق من التوفر يدوياً ونرد في أقرب وقت ممكن.',
    pendingNotice: 'هذا طلب وليس حجزاً مؤكداً. سنراسلكم بالبريد حين يتم التأكيد.',
    detailsTitle: 'تفاصيل طلبكم',
    reference: 'المرجع',
    date: 'التاريخ',
    time: 'وقت الانطلاق',
    duration: 'المدة',
    people: 'الدراجات / المشاركون',
    total: 'المجموع التقديري',
    notPaid: 'لم يتم تحصيل أي مبلغ.',
    contactTitle: 'لديكم سؤال؟',
    contactBody: 'ردّوا على هذا البريد أو راسلونا على واتساب. نعمل كل يوم من 09:00 إلى 21:00.',
    signOff: 'إلى اللقاء على الطريق،\nMJ Bike Tangier',
    confirmedSubject: 'تم تأكيد حجزكم — MJ Bike Tangier',
    confirmedBody: 'خبر سار: تم تأكيد حجزكم. نتطلع إلى الجولة معكم.',
    rejectedSubject: 'بخصوص طلب الحجز — MJ Bike Tangier',
    rejectedBody: 'نعتذر، لا يمكننا قبول هذا الطلب كما هو. ردّوا على هذا البريد وسنجد موعداً آخر معاً.',
    cancelledSubject: 'تم إلغاء حجزكم — MJ Bike Tangier',
    cancelledBody: 'تم إلغاء حجزكم بناءً على طلبكم. إن لم يكن ذلك مقصوداً فردّوا على هذا البريد وسنعيد تفعيله.',
    contactSubject: 'تلقّينا رسالتكم — MJ Bike Tangier',
    contactAckBody: 'شكراً لتواصلكم. نجيب على الرسائل كل يوم بين 09:00 و21:00.',
    contactThanks: 'رسالتكم',
    adminSubject: 'طلب حجز جديد',
    adminNewRequest: 'هناك طلب حجز جديد بانتظار التأكيد.',
    adminOpen: 'افتح في لوحة التحكم',
  },
};

export type EmailIntent = 'received' | 'confirmed' | 'rejected' | 'cancelled';

const resolveCopy = (locale: string | null | undefined): LocaleCopy =>
  COPY[(locale as 'en' | 'fr' | 'ar') ?? 'en'] ?? COPY.en;

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDate = (isoDate: string, language: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatDuration = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (Number.isInteger(hours)) return `${hours} h`;
  return `${Math.floor(hours)} h ${Math.round((hours % 1) * 60)} min`;
};

export interface EmailResult {
  subject: string;
  html: string;
  text: string;
}

export function reservationEmail(
  intent: EmailIntent,
  reservation: Pick<
    Reservation,
    'reference' | 'full_name' | 'email' | 'reservation_date' | 'start_time' | 'duration_hours' | 'participants' | 'total_price' | 'locale' | 'cancellation_reason'
  >,
  options: { siteUrl?: string; phone?: string; whatsapp?: string },
): EmailResult {
  const copy = resolveCopy(reservation.locale);
  const subject =
    intent === 'confirmed'
      ? copy.confirmedSubject
      : intent === 'rejected'
        ? copy.rejectedSubject
        : intent === 'cancelled'
          ? copy.cancelledSubject
          : copy.receivedSubject;
  const intro =
    intent === 'confirmed'
      ? copy.confirmedBody
      : intent === 'rejected'
        ? copy.rejectedBody
        : intent === 'cancelled'
          ? copy.cancelledBody
          : copy.receivedBody;

  const rows: [string, string][] = [
    [copy.reference, reservation.reference],
    [copy.date, formatDate(reservation.reservation_date, copy.language)],
    [copy.time, reservation.start_time.slice(0, 5)],
    [copy.duration, formatDuration(reservation.duration_hours)],
    [copy.people, String(reservation.participants)],
    [copy.total, `${reservation.total_price} MAD`],
  ];

  const table = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;color:#5f6b65;font-size:13px">${escapeHtml(label)}</td><td style="padding:6px 12px;font-weight:600;font-size:13px">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="${copy.language}" dir="${copy.language === 'ar' ? 'rtl' : 'ltr'}">
  <body style="margin:0;background:#f6f7f6;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#101a15">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
          <tr><td style="background:#039b52;padding:20px 24px;color:#fff;font-size:18px;font-weight:800">MJ Bike Tangier</td></tr>
          <tr><td style="padding:24px">
            <p style="margin:0 0 12px">${escapeHtml(copy.greeting(reservation.full_name))}</p>
            <h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(intent === 'received' ? copy.receivedTitle : subject.split(' — ')[0] ?? subject)}</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6">${escapeHtml(intro)}</p>
            ${intent === 'received' ? `<p style="margin:0 0 16px;padding:10px 12px;background:#fffbeb;border-radius:10px;font-size:13px">${escapeHtml(copy.pendingNotice)}</p>` : ''}
            ${
              intent === 'cancelled' && reservation.cancellation_reason
                ? `<p style="margin:0 0 16px;font-size:13px;color:#5f6b65">${escapeHtml(reservation.cancellation_reason)}</p>`
                : ''
            }
            <h2 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#5f6b65">${escapeHtml(copy.detailsTitle)}</h2>
            <table role="presentation" width="100%" style="border-collapse:collapse;background:#f6f7f6;border-radius:12px">${table}</table>
            <p style="margin:16px 0 0;font-size:12px;color:#5f6b65">${escapeHtml(copy.notPaid)}</p>
            <h2 style="margin:24px 0 8px;font-size:14px;color:#101a15">${escapeHtml(copy.contactTitle)}</h2>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#5f6b65">${escapeHtml(copy.contactBody)}</p>
            <p style="margin:16px 0 0;font-size:13px;white-space:pre-line">${escapeHtml(copy.signOff)}</p>
            <p style="margin:16px 0 0;font-size:12px;color:#5f6b65">
              ${escapeHtml(options.phone ?? '+212 613 993 957')} ·
              <a href="https://wa.me/${escapeHtml(options.whatsapp ?? '212613993957')}" style="color:#039b52">WhatsApp</a> ·
              <a href="${escapeHtml(options.siteUrl ?? 'https://mjbiketangier.com')}" style="color:#039b52">${escapeHtml(options.siteUrl ?? 'mjbiketangier.com')}</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    copy.greeting(reservation.full_name),
    '',
    intro,
    intent === 'received' ? copy.pendingNotice : '',
    '',
    `${copy.detailsTitle}:`,
    ...rows.map(([label, value]) => `- ${label}: ${value}`),
    '',
    copy.notPaid,
    '',
    copy.contactBody,
    '',
    copy.signOff,
    options.phone ?? '+212 613 993 957',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  return { subject, html, text };
}

/** Admin-facing notification for a new request. */
export function adminNotificationEmail(reservation: Reservation, adminUrl: string): EmailResult {
  const copy = COPY.en;
  return {
    subject: `${copy.adminSubject} — ${reservation.reference}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#101a15">
      <p>${escapeHtml(copy.adminNewRequest)}</p>
      <ul>
        <li>${escapeHtml(copy.reference)}: <strong>${escapeHtml(reservation.reference)}</strong></li>
        <li>${escapeHtml(copy.date)}: ${escapeHtml(formatDate(reservation.reservation_date, 'en'))} ${escapeHtml(reservation.start_time.slice(0, 5))}</li>
        <li>${escapeHtml(copy.people)}: ${reservation.participants}</li>
        <li>${escapeHtml(copy.total)}: ${reservation.total_price} MAD</li>
        <li>${escapeHtml(reservation.full_name)} — ${escapeHtml(reservation.email)} — ${escapeHtml(reservation.phone)}</li>
      </ul>
      <p><a href="${escapeHtml(adminUrl)}" style="color:#039b52">${escapeHtml(copy.adminOpen)}</a></p>
    </div>`,
    text: `${copy.adminNewRequest}\n${copy.reference}: ${reservation.reference}\n${reservation.full_name} — ${reservation.email} — ${reservation.phone}\n${adminUrl}`,
  };
}

export function contactEmail(
  message: { full_name: string; email: string; subject: string; message: string; locale: string },
  options: { siteUrl?: string },
): EmailResult {
  const copy = resolveCopy(message.locale);
  return {
    subject: copy.contactSubject,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#101a15">
      <p>${escapeHtml(copy.greeting(message.full_name))}</p>
      <p>${escapeHtml(copy.contactAckBody)}</p>
      <p style="background:#f6f7f6;padding:12px;border-radius:10px">${escapeHtml(message.message)}</p>
      <p style="white-space:pre-line">${escapeHtml(copy.signOff)}</p>
      <p><a href="${escapeHtml(options.siteUrl ?? 'https://mjbiketangier.com')}" style="color:#039b52">${escapeHtml(options.siteUrl ?? 'mjbiketangier.com')}</a></p>
    </div>`,
    text: `${copy.greeting(message.full_name)}\n\n${copy.contactAckBody}\n\n${copy.contactThanks}: ${message.subject}\n${message.message}\n\n${copy.signOff}`,
  };
}

/** Send through Resend. Returns the provider id, or null when email is not configured. */
export async function sendEmail(
  env: Env,
  args: { to: string; subject: string; html: string; text: string },
): Promise<{ status: 'sent' | 'skipped' | 'failed'; providerMessageId: string | null; error: string | null }> {
  if (!env.RESEND_API_KEY) {
    return { status: 'skipped', providerMessageId: null, error: 'RESEND_API_KEY is not configured.' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'MJ Bike Tangier <bookings@mjbiketangier.com>',
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: env.ADMIN_EMAIL || undefined,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return { status: 'failed', providerMessageId: null, error: `Resend ${response.status}: ${detail.slice(0, 400)}` };
    }

    const payload = (await response.json()) as { id?: string };
    return { status: 'sent', providerMessageId: payload.id ?? null, error: null };
  } catch (caught) {
    return { status: 'failed', providerMessageId: null, error: caught instanceof Error ? caught.message : 'Unknown email error' };
  }
}
