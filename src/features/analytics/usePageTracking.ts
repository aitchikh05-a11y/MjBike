import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { backend } from '@/services/backend';
import { useConsent } from '@/app/providers/ConsentProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import type { AnalyticsEventInput } from '@shared/schemas';

function deviceCategory(): AnalyticsEventInput['device_category'] {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function browserName(): string {
  const agent = navigator.userAgent;
  if (agent.includes('Edg/')) return 'Edge';
  if (agent.includes('OPR/')) return 'Opera';
  if (agent.includes('Firefox/')) return 'Firefox';
  if (agent.includes('Chrome/')) return 'Chrome';
  if (agent.includes('Safari/')) return 'Safari';
  return 'Other';
}

function sessionId(): string {
  try {
    const key = 'mjb.analytics.session';
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `session-${crypto.randomUUID()}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `session-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * First-party, consent-gated page view tracking.
 * Nothing is stored on the server when analytics consent is denied.
 */
export function usePageTracking() {
  const { pathname, search } = useLocation();
  const { consent, anonymousId } = useConsent();
  const { locale } = useI18n();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== 'granted') return;
    if (pathname.startsWith('/admin')) return;
    if (lastPath.current === pathname + search) return;
    lastPath.current = pathname + search;

    const params = new URLSearchParams(search);
    const payload: AnalyticsEventInput = {
      event_type: 'page_view',
      path: pathname,
      locale,
      anonymous_id: anonymousId,
      session_id: sessionId(),
      referrer: document.referrer || null,
      utm_source: params.get('utm_source') ?? null,
      utm_medium: params.get('utm_medium') ?? null,
      utm_campaign: params.get('utm_campaign') ?? null,
      device_category: deviceCategory(),
      browser: browserName(),
      country: null,
    };
    void backend.trackEvent(payload);
  }, [pathname, search, consent, anonymousId, locale]);
}

export function trackConversion(locale: string, anonymousId: string) {
  void backend.trackEvent({
    event_type: 'reservation_submitted',
    path: `/${locale}/reservations/`,
    locale: locale as AnalyticsEventInput['locale'],
    anonymous_id: anonymousId,
    session_id: sessionId(),
    referrer: document.referrer || null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    device_category: deviceCategory(),
    browser: browserName(),
    country: null,
  });
}
