import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { Alert, Field, LoadingBlock } from '@/components/common/ui';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { backend, BackendError } from '@/services/backend';
import { contactMessageSchema, fieldErrors } from '@shared/schemas';
import { buildPath } from '@/app/router/paths';
import { localizedValue, whatsappHref } from '@/lib/utilities/localized';

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  privacy_accepted: boolean;
}

const EMPTY: FormState = { full_name: '', email: '', phone: '', subject: '', message: '', privacy_accepted: false };

export function ContactPage() {
  const { locale, t } = useI18n();
  const { data, loading } = usePublicData();
  const settings = data?.settings;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const localMessage = (field: string, fallback?: string) => {
    const translated = (t(`validation.${field}`) as string) ?? '';
    return translated && !translated.startsWith('validation.') ? translated : fallback;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    const parsed = contactMessageSchema.safeParse({ ...form, locale });
    if (!parsed.success) {
      const raw = fieldErrors(parsed.error);
      setErrors(Object.fromEntries(Object.entries(raw).map(([key, message]) => [key, localMessage(key, message) ?? message])));
      return;
    }
    setStatus('sending');
    try {
      await backend.submitContactMessage({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject,
        message: form.message,
        locale,
        privacy_accepted: true,
      });
      setStatus('success');
      setForm(EMPTY);
    } catch (caught) {
      setStatus('error');
      if (caught instanceof BackendError && caught.fields) setErrors(caught.fields);
      setServerError(caught instanceof Error ? caught.message : t('contact.error'));
    }
  };

  return (
    <>
      <Seo page="contact" title={t('pages.contact.title')} description={t('pages.contact.description')} />
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white py-14 lg:py-20">
        <div className="container-page max-w-3xl">
          <p className="eyebrow mb-3">{t('nav.contact')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{t('contact.title')}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-600 sm:text-base">{t('contact.intro')}</p>
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <div className="card p-5 sm:p-7">
            <h2 className="text-lg font-bold text-ink-900">{t('contact.formTitle')}</h2>
            <p className="mt-1 text-xs text-ink-500">{t('contact.responseTime')}</p>

            {status === 'success' && (
              <div className="mt-5">
                <Alert tone="success" title={t('contact.success')} />
              </div>
            )}
            {serverError && (
              <div className="mt-5">
                <Alert tone="error" title={serverError} />
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('contact.name')} htmlFor="contact-name" required error={errors.full_name} className="sm:col-span-1">
                  <input
                    id="contact-name"
                    name="full_name"
                    className={`field ${errors.full_name ? 'field-error' : ''}`}
                    value={form.full_name}
                    onChange={(event) => update('full_name', event.target.value)}
                    autoComplete="name"
                    required
                    aria-invalid={Boolean(errors.full_name)}
                  />
                </Field>
                <Field label={t('contact.email')} htmlFor="contact-email" required error={errors.email}>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    className={`field ${errors.email ? 'field-error' : ''}`}
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    autoComplete="email"
                    dir="ltr"
                    required
                    aria-invalid={Boolean(errors.email)}
                  />
                </Field>
                <Field label={t('contact.phone')} htmlFor="contact-phone" error={errors.phone}>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    className={`field ${errors.phone ? 'field-error' : ''}`}
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    autoComplete="tel"
                    dir="ltr"
                    inputMode="tel"
                  />
                </Field>
                <Field label={t('contact.subject')} htmlFor="contact-subject" required error={errors.subject}>
                  <input
                    id="contact-subject"
                    name="subject"
                    className={`field ${errors.subject ? 'field-error' : ''}`}
                    value={form.subject}
                    onChange={(event) => update('subject', event.target.value)}
                    required
                    aria-invalid={Boolean(errors.subject)}
                  />
                </Field>
              </div>
              <Field label={t('contact.message')} htmlFor="contact-message" required error={errors.message}>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  className={`field ${errors.message ? 'field-error' : ''}`}
                  value={form.message}
                  onChange={(event) => update('message', event.target.value)}
                  required
                  aria-invalid={Boolean(errors.message)}
                />
              </Field>
              <div>
                <label className="flex items-start gap-2 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    checked={form.privacy_accepted}
                    onChange={(event) => update('privacy_accepted', event.target.checked)}
                    aria-invalid={Boolean(errors.privacy_accepted)}
                  />
                  <span>
                    {t('contact.privacy')}{' '}
                    <Link to={buildPath('privacy', locale)} className="font-semibold text-brand-700 underline underline-offset-2">
                      {t('footer.privacy')}
                    </Link>
                  </span>
                </label>
                {errors.privacy_accepted && (
                  <p className="field-message" role="alert">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {localMessage('privacy_accepted', errors.privacy_accepted)}
                  </p>
                )}
              </div>
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={status === 'sending'}>
                {status === 'sending' ? t('contact.sending') : t('contact.send')}
                {status !== 'sending' && <Send className="size-4" aria-hidden="true" />}
              </button>
            </form>
          </div>

          <aside className="space-y-4">
            {loading && <LoadingBlock />}
            {settings && (
              <>
                <div className="card space-y-4 p-5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">{t('contact.detailsTitle')}</h2>
                  <ul className="space-y-3 text-sm">
                    {settings.phone && (
                      <li>
                        <a href={`tel:${settings.phone}`} className="flex items-start gap-2.5 text-ink-700 hover:text-brand-700">
                          <Phone className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                          <span dir="ltr">{settings.phone}</span>
                        </a>
                      </li>
                    )}
                    {settings.whatsapp && (
                      <li>
                        <a
                          href={whatsappHref(settings.whatsapp, t('contact.intro'))}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-start gap-2.5 text-ink-700 hover:text-brand-700"
                        >
                          <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                          {t('common.whatsapp')}
                        </a>
                      </li>
                    )}
                    {settings.email && (
                      <li>
                        <a href={`mailto:${settings.email}`} className="flex items-start gap-2.5 text-ink-700 hover:text-brand-700">
                          <Mail className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                          {settings.email}
                        </a>
                      </li>
                    )}
                    <li className="flex items-start gap-2.5 text-ink-700">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                      {settings.maps_url ? (
                        <a href={settings.maps_url} target="_blank" rel="noreferrer noopener" className="hover:text-brand-700">
                          {localizedValue(settings.address, locale)}
                        </a>
                      ) : (
                        localizedValue(settings.address, locale)
                      )}
                    </li>
                    <li className="flex items-start gap-2.5 text-ink-700">
                      <Clock className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                      <span>
                        <span className="block text-xs text-ink-500">{t('contact.hoursTitle')}</span>
                        {settings.opening_hours.map((entry) => (
                          <span key={entry.days} className="block">
                            {entry.days}: <span dir="ltr">{entry.hours}</span>
                          </span>
                        ))}
                      </span>
                    </li>
                  </ul>
                  {settings.maps_url && (
                    <a href={settings.maps_url} target="_blank" rel="noreferrer noopener" className="btn-secondary w-full text-xs">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {t('contact.mapCta')}
                    </a>
                  )}
                </div>

                <div className="card p-5">
                  <h2 className="text-sm font-bold text-ink-900">{t('contact.faqTitle')}</h2>
                  <dl className="mt-3 space-y-3">
                    {settings.faq.slice(0, 4).map((entry) => (
                      <div key={localizedValue(entry.question, locale)}>
                        <dt className="text-xs font-semibold text-ink-800">{localizedValue(entry.question, locale)}</dt>
                        <dd className="mt-1 text-xs leading-relaxed text-ink-500">{localizedValue(entry.answer, locale)}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link to={buildPath('faq', locale)} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                    {t('footer.faq')} →
                  </Link>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-900">
                  <CheckCircle2 className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                  {t('contact.responseTime')}
                </div>
              </>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
