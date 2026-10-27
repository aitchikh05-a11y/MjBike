import type { Env } from './supabase';

/**
 * Optional WhatsApp Business Cloud API delivery.
 * Stays inert unless WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are configured.
 */
export function whatsappConfigured(env: Env): boolean {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppTemplate(
  env: Env,
  args: { to: string; body: string },
): Promise<{ status: 'sent' | 'skipped' | 'failed'; providerMessageId: string | null; error: string | null }> {
  if (!whatsappConfigured(env)) {
    return { status: 'skipped', providerMessageId: null, error: 'WhatsApp Cloud API is not configured.' };
  }

  const to = args.to.replace(/[^\d]/g, '');
  if (!to) return { status: 'skipped', providerMessageId: null, error: 'Invalid WhatsApp number.' };

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body: args.body.slice(0, 4000) },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return { status: 'failed', providerMessageId: null, error: `WhatsApp ${response.status}: ${detail.slice(0, 400)}` };
    }

    const payload = (await response.json()) as { messages?: { id?: string }[] };
    return { status: 'sent', providerMessageId: payload.messages?.[0]?.id ?? null, error: null };
  } catch (caught) {
    return { status: 'failed', providerMessageId: null, error: caught instanceof Error ? caught.message : 'Unknown WhatsApp error' };
  }
}

/**
 * WhatsApp messages can only be initiated with an approved template, so this
 * helper is used only when the customer chose WhatsApp and a template exists.
 * Until then the email channel is authoritative and WhatsApp stays "skipped".
 */
export function reservationWhatsAppBody(reference: string, locale: string): string {
  if (locale === 'fr') {
    return `Bonjour ! Nous avons reçu votre demande ${reference}. Elle n'est pas encore confirmée : nous vérifions la disponibilité et revenons vers vous très vite. — MJ Bike Tangier`;
  }
  if (locale === 'ar') {
    return `مرحباً! تلقينا طلبكم ${reference}. لم يتم تأكيده بعد: نتحقق من التوفر وسنعود إليكم قريباً. — MJ Bike Tangier`;
  }
  return `Hello! We received your request ${reference}. It is not confirmed yet: we are checking availability and will come back to you shortly. — MJ Bike Tangier`;
}
