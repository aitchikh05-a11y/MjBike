import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, Check, Clock, Info, ShieldCheck, Users } from 'lucide-react';
import { calculateQuote, allowedDurations, PricingError } from '@shared/domain/pricing';
import { addDaysISO, todayISO } from '@shared/domain/availability';
import { CONTACT_METHODS, type Offer, type Reservation, type Service, type ServiceKind } from '@shared/domain/types';
import { fieldErrors, reservationCreateSchema } from '@shared/schemas';
import { backend, BackendError } from '@/services/backend';
import type { SlotInfo } from '@/services/backend/types';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath } from '@/app/router/paths';
import { Field, Photo, Spinner } from '@/components/common/ui';
import { formatDuration, offerTranslation, price, serviceTranslation } from '@/lib/utilities/localized';
import { trackConversion } from '@/features/analytics/usePageTracking';
import { useConsent } from '@/app/providers/ConsentProvider';
import { cn } from '@/lib/utilities/cn';

interface BookingFormProps {
  services: Service[];
  offers: Offer[];
  initialServiceSlug?: string | null;
  initialOfferSlug?: string | null;
  onSuccess: (reservation: Reservation) => void;
}

interface FormState {
  serviceId: string;
  quantity: number;
  date: string;
  time: string;
  duration: number;
  addons: string[];
  fullName: string;
  email: string;
  phone: string;
  preferredContact: (typeof CONTACT_METHODS)[number];
  message: string;
  privacy: boolean;
  company: string;
}

const KIND_ORDER: ServiceKind[] = ['rental', 'tour', 'experience', 'lesson', 'event'];

const kindLabelKey = (kind: ServiceKind) => `booking.type${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;

export function BookingForm({ services, offers, initialServiceSlug, initialOfferSlug, onSuccess }: BookingFormProps) {
  const { locale, t } = useI18n();
  const { anonymousId } = useConsent();

  const initialOffer = useMemo(
    () => offers.find((offer) => offer.slug === initialOfferSlug) ?? null,
    [offers, initialOfferSlug],
  );
  const initialService = useMemo(() => {
    if (initialOffer?.service_id) return services.find((service) => service.id === initialOffer.service_id) ?? null;
    if (initialServiceSlug) return services.find((service) => service.slug === initialServiceSlug) ?? null;
    return services.find((service) => service.is_featured) ?? services[0] ?? null;
  }, [initialOffer, initialServiceSlug, services]);

  const today = todayISO();
  const [form, setForm] = useState<FormState>(() => ({
    serviceId: initialService?.id ?? '',
    quantity: Math.max(1, initialService?.min_units ?? 1),
    date: addDaysISO(today, 1),
    time: '',
    duration: initialOffer?.duration_hours ?? initialService?.default_duration_hours ?? 4,
    addons: [],
    fullName: '',
    email: '',
    phone: '',
    preferredContact: 'email',
    message: '',
    privacy: false,
    company: '',
  }));

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const lastSubmit = useRef<string | null>(null);

  const selectedService = services.find((service) => service.id === form.serviceId) ?? null;
  const selectedOffer = selectedService && initialOffer?.service_id === selectedService.id ? initialOffer : null;
  const translation = selectedService ? serviceTranslation(selectedService, locale) : null;
  const offerCopy = selectedOffer ? offerTranslation(selectedOffer, locale) : null;
  const durationOptions = selectedService ? allowedDurations(selectedService) : [];
  const isGroupPriced = selectedService?.price_unit === 'per_group';

  const quote = useMemo(() => {
    if (!selectedService) return null;
    try {
      return calculateQuote({
        service: selectedService,
        offer: selectedOffer ? { price: selectedOffer.price, duration_hours: selectedOffer.duration_hours, translations: selectedOffer.translations } : null,
        durationHours: form.duration,
        quantity: form.quantity,
        addonIds: form.addons,
      });
    } catch (error) {
      if (error instanceof PricingError) return null;
      throw error;
    }
  }, [selectedService, selectedOffer, form.duration, form.quantity, form.addons]);

  const loadSlots = useCallback(async () => {
    if (!selectedService || !form.date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const result = await backend.getAvailability({ serviceId: selectedService.id, date: form.date, durationHours: form.duration });
      setSlots(result);
      setForm((current) => {
        if (current.time && result.some((slot) => slot.time === current.time && slot.available)) return current;
        const firstAvailable = result.find((slot) => slot.available);
        return { ...current, time: firstAvailable?.time ?? '' };
      });
    } catch (caught) {
      setSlotsError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedService, form.date, form.duration, t]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setAvailabilityNotice(null);
  };

  const selectService = (service: Service) => {
    setForm((current) => ({
      ...current,
      serviceId: service.id,
      duration: service.default_duration_hours,
      quantity: Math.max(service.min_units, 1),
      addons: [],
      time: '',
    }));
    setErrors({});
  };

  const localiseError = (field: string, fallback: string) => {
    const key = `validation.${field}`;
    const value = t(key);
    return value.startsWith('validation.') ? fallback : value;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setAvailabilityNotice(null);
    if (!selectedService) {
      setErrors({ service_id: t('booking.invalidService') });
      return;
    }

    const payload = {
      locale,
      reservation_type: selectedService.kind,
      service_id: selectedService.id,
      offer_id: selectedOffer?.id ?? null,
      full_name: form.fullName,
      email: form.email,
      phone: form.phone,
      preferred_contact: form.preferredContact,
      quantity: form.quantity,
      reservation_date: form.date,
      start_time: form.time,
      duration_hours: form.duration,
      addons: form.addons,
      message: form.message,
      privacy_accepted: form.privacy,
      company: form.company,
    };

    const parsed = reservationCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const raw = fieldErrors(parsed.error);
      setErrors(Object.fromEntries(Object.entries(raw).map(([key, message]) => [key, localiseError(key, message)])));
      if (raw.reservation_date || raw.start_time || raw.duration_hours) setAvailabilityNotice(t('booking.notConfirmedNotice'));
      return;
    }

    const fingerprint = JSON.stringify([parsed.data.service_id, parsed.data.reservation_date, parsed.data.start_time, parsed.data.email]);
    if (lastSubmit.current === fingerprint) {
      setAvailabilityNotice(t('booking.duplicateWarning'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await backend.createReservation(parsed.data);
      lastSubmit.current = fingerprint;
      if (result.duplicate) {
        setAvailabilityNotice(t('booking.duplicateWarning'));
      }
      trackConversion(locale, anonymousId);
      onSuccess(result.reservation);
    } catch (caught) {
      if (caught instanceof BackendError) {
        if (caught.fields) {
          setErrors(Object.fromEntries(Object.entries(caught.fields).map(([key, message]) => [key, localiseError(key, message)])));
        }
        if (['unavailable', 'capacity', 'closed', 'outside_hours', 'lead_time'].includes(caught.code)) {
          setAvailabilityNotice(caught.message);
          void loadSlots();
        } else {
          setServerError(caught.message);
        }
      } else {
        setServerError(t('errors.network'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (services.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-600">
        <p>{t('services.noServices')}</p>
        <Link to={buildPath('contact', locale)} className="btn-primary mt-4 text-xs">
          {t('nav.contact')}
        </Link>
      </div>
    );
  }

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: services.filter((service) => service.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start" noValidate>
      <div className="space-y-6">
        {/* Service selection */}
        <fieldset className="card p-5 sm:p-6">
          <legend className="text-base font-bold text-ink-900">{t('booking.stepService')}</legend>
          <div className="mt-4 space-y-5">
            {grouped.map((group) => (
              <div key={group.kind}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{t(kindLabelKey(group.kind))}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((service) => {
                    const copy = serviceTranslation(service, locale);
                    const selected = service.id === form.serviceId;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => selectService(service)}
                        aria-pressed={selected}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 text-start transition',
                          selected ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/30' : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50',
                        )}
                      >
                        <Photo src={service.image_url} alt="" aspect="aspect-square" className="size-14 shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-900">{copy.name}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                            <Clock className="size-3" aria-hidden="true" />
                            {formatDuration(service.default_duration_hours, t)}
                            <span className="text-ink-300">·</span>
                            {price(service.base_price, locale)}
                          </span>
                        </span>
                        {selected && <Check className="size-4 shrink-0 text-brand-600" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {errors.service_id && (
            <p className="field-message" role="alert">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {errors.service_id}
            </p>
          )}
        </fieldset>

        {/* Date, time, duration */}
        <fieldset className="card space-y-4 p-5 sm:p-6">
          <legend className="text-base font-bold text-ink-900">{t('booking.stepDetails')}</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('booking.date')} htmlFor="booking-date" required error={errors.reservation_date} hint={`${t('common.openingHours')}: 09:00 – 21:00`}>
              <input
                id="booking-date"
                type="date"
                className={`field ${errors.reservation_date ? 'field-error' : ''}`}
                min={today}
                max={addDaysISO(today, 180)}
                value={form.date}
                onChange={(event) => update('date', event.target.value)}
                required
              />
            </Field>

            <Field label={t('booking.duration')} htmlFor="booking-duration" required error={errors.duration_hours}>
              <select
                id="booking-duration"
                className={`field ${errors.duration_hours ? 'field-error' : ''}`}
                value={form.duration}
                onChange={(event) => update('duration', Number(event.target.value))}
                required
              >
                {durationOptions.map((hours) => (
                  <option key={hours} value={hours}>
                    {formatDuration(hours, t)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="field-label mb-0">{t('booking.chooseSlot')}</span>
              {slotsLoading && <Spinner className="size-4" />}
            </div>
            {slotsError && <p className="field-message">{slotsError}</p>}
            {!slotsLoading && slots.length === 0 && !slotsError && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('booking.closedToday')}</p>
            )}
            {slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t('booking.chooseSlot')}>
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    role="radio"
                    aria-checked={form.time === slot.time}
                    disabled={!slot.available}
                    title={slot.reason}
                    onClick={() => update('time', slot.time)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                      form.time === slot.time
                        ? 'border-brand-500 bg-brand-600 text-white'
                        : slot.available
                          ? 'border-ink-200 bg-white text-ink-800 hover:border-brand-400'
                          : 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300 line-through',
                    )}
                  >
                    <span dir="ltr">{slot.time}</span>
                    {slot.available && slot.remaining <= 3 && (
                      <span className="mt-0.5 block text-[0.6rem] font-medium opacity-80">
                        {slot.remaining} {t('booking.remaining')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {errors.start_time && <p className="field-message">{errors.start_time}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={isGroupPriced ? t('booking.quantityPeople') : selectedService?.kind === 'rental' ? t('booking.quantityBikes') : t('booking.quantityPeople')}
              htmlFor="booking-quantity"
              required
              error={errors.quantity}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary !size-10 !rounded-full !p-0"
                  onClick={() => update('quantity', Math.max(selectedService?.min_units ?? 1, form.quantity - 1))}
                  aria-label={`- ${t('booking.quantityPeople')}`}
                  disabled={form.quantity <= (selectedService?.min_units ?? 1)}
                >
                  −
                </button>
                <input
                  id="booking-quantity"
                  type="number"
                  inputMode="numeric"
                  min={selectedService?.min_units ?? 1}
                  max={selectedService?.max_units ?? 20}
                  value={form.quantity}
                  onChange={(event) => update('quantity', Math.max(1, Number(event.target.value) || 1))}
                  className="field text-center"
                  disabled={isGroupPriced}
                />
                <button
                  type="button"
                  className="btn-secondary !size-10 !rounded-full !p-0"
                  onClick={() => update('quantity', Math.min(selectedService?.max_units ?? 20, form.quantity + 1))}
                  aria-label={`+ ${t('booking.quantityPeople')}`}
                  disabled={isGroupPriced || form.quantity >= (selectedService?.max_units ?? 20)}
                >
                  +
                </button>
              </div>
            </Field>

            <Field label={t('booking.preferredContact')} htmlFor="booking-contact" required>
              <select
                id="booking-contact"
                className="field"
                value={form.preferredContact}
                onChange={(event) => update('preferredContact', event.target.value as FormState['preferredContact'])}
              >
                <option value="email">{t('booking.contactEmail')}</option>
                <option value="phone">{t('booking.contactPhone')}</option>
                <option value="whatsapp">{t('booking.contactWhatsapp')}</option>
              </select>
            </Field>
          </div>

          {selectedService && selectedService.addons.length > 0 && (
            <div>
              <p className="field-label">{t('booking.addons')}</p>
              <p className="field-hint mb-2 mt-0">{t('booking.addonsHint')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedService.addons.map((addon) => {
                  const checked = form.addons.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition',
                        checked ? 'border-brand-400 bg-brand-50/60' : 'border-ink-200 hover:border-ink-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        checked={checked}
                        onChange={(event) =>
                          update('addons', event.target.checked ? [...form.addons, addon.id] : form.addons.filter((id) => id !== addon.id))
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-ink-900">{addon.name[locale] ?? addon.name.en}</span>
                        <span className="mt-0.5 block text-[0.7rem] text-ink-500">{addon.description[locale] ?? addon.description.en}</span>
                      </span>
                      <span className="text-xs font-bold text-ink-800">{addon.price === 0 ? t('common.included') : price(addon.price, locale)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </fieldset>

        {/* Customer details */}
        <fieldset className="card space-y-4 p-5 sm:p-6">
          <legend className="text-base font-bold text-ink-900">{t('booking.stepReview')}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('booking.fullName')} htmlFor="booking-name" required error={errors.full_name}>
              <input
                id="booking-name"
                name="name"
                className={`field ${errors.full_name ? 'field-error' : ''}`}
                autoComplete="name"
                value={form.fullName}
                onChange={(event) => update('fullName', event.target.value)}
                required
                aria-invalid={Boolean(errors.full_name)}
              />
            </Field>
            <Field label={t('booking.email')} htmlFor="booking-email" required error={errors.email}>
              <input
                id="booking-email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                className={`field ${errors.email ? 'field-error' : ''}`}
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                required
                aria-invalid={Boolean(errors.email)}
              />
            </Field>
            <Field label={t('booking.phone')} htmlFor="booking-phone" required error={errors.phone} hint={t('booking.phoneHint')}>
              <input
                id="booking-phone"
                name="phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+212 612 345 678"
                className={`field ${errors.phone ? 'field-error' : ''}`}
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                required
                aria-invalid={Boolean(errors.phone)}
              />
            </Field>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="booking-company">Company</label>
              <input
                id="booking-company"
                tabIndex={-1}
                autoComplete="off"
                value={form.company}
                onChange={(event) => update('company', event.target.value)}
              />
            </div>
          </div>
          <Field label={t('booking.message')} htmlFor="booking-message" error={errors.message} hint={t('booking.messageHint')}>
            <textarea
              id="booking-message"
              name="message"
              rows={3}
              maxLength={1200}
              className={`field ${errors.message ? 'field-error' : ''}`}
              value={form.message}
              onChange={(event) => update('message', event.target.value)}
            />
          </Field>

          <div>
            <label className="flex items-start gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                checked={form.privacy}
                onChange={(event) => update('privacy', event.target.checked)}
                required
                aria-invalid={Boolean(errors.privacy_accepted)}
              />
              <span>
                {t('booking.privacy')}{' '}
                <Link to={buildPath('privacy', locale)} className="font-semibold text-brand-700 underline underline-offset-2" target="_blank">
                  {t('booking.privacyLink')}
                </Link>{' '}
                {t('booking.privacySuffix')}
              </span>
            </label>
            {errors.privacy_accepted && (
              <p className="field-message" role="alert">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                {localiseError('privacy_accepted', errors.privacy_accepted)}
              </p>
            )}
          </div>
        </fieldset>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24">
        <div className="card overflow-hidden">
          {selectedService && <Photo src={selectedService.image_url} alt={translation?.name ?? ''} aspect="aspect-[16/9]" />}
          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t('booking.summary')}</p>
              <h2 className="mt-1 text-lg font-bold text-ink-900">{offerCopy?.title ?? translation?.name ?? t('booking.summaryEmpty')}</h2>
              {selectedOffer && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[0.7rem] font-semibold text-brand-800">
                  <Check className="size-3" aria-hidden="true" />
                  {t('booking.offerApplied')}
                </p>
              )}
            </div>

            {!selectedService && <p className="text-sm text-ink-500">{t('booking.summaryEmpty')}</p>}

            {selectedService && (
              <>
                <dl className="space-y-2 border-y border-ink-100 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-500">{t('booking.date')}</dt>
                    <dd className="font-medium text-ink-900">{form.date}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-500">{t('booking.startTime')}</dt>
                    <dd className="font-medium text-ink-900" dir="ltr">
                      {form.time || '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-500">{t('common.duration')}</dt>
                    <dd className="font-medium text-ink-900">{formatDuration(form.duration, t)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-500">{isGroupPriced ? t('booking.quantityPeople') : t('common.people')}</dt>
                    <dd className="inline-flex items-center gap-1 font-medium text-ink-900">
                      <Users className="size-3.5 text-brand-600" aria-hidden="true" />
                      {isGroupPriced ? `${form.quantity}` : form.quantity}
                    </dd>
                  </div>
                </dl>

                {quote && (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-500">
                        {t('booking.subtotal')}
                        <span className="ms-1 text-xs">
                          ({price(quote.unitPrice, locale)} × {quote.priceUnit === 'per_group' ? 1 : quote.quantity})
                        </span>
                      </span>
                      <span className="font-medium text-ink-900">{price(quote.subtotal, locale)}</span>
                    </div>
                    {quote.addons.map((addon) => (
                      <div key={addon.id} className="flex justify-between gap-3 text-xs text-ink-500">
                        <span>
                          {t('booking.addonsLine')}: {addon.name}
                        </span>
                        <span>{price(addon.price, locale)}</span>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-3 border-t border-ink-100 pt-2">
                      <span className="font-semibold text-ink-800">{t('booking.estimatedTotal')}</span>
                      <span className="text-xl font-extrabold text-brand-700">{price(quote.total, locale)}</span>
                    </div>
                    <p className="pt-1 text-[0.7rem] leading-relaxed text-ink-400">{t('booking.totalNote')}</p>
                  </div>
                )}
              </>
            )}

            {availabilityNotice && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {availabilityNotice}
              </div>
            )}
            {serverError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {serverError}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting || !selectedService}>
              {submitting ? <Spinner className="size-4 text-white" /> : <CalendarCheck className="size-4" aria-hidden="true" />}
              {submitting ? t('booking.submitting') : t('booking.submitRequest')}
            </button>

            <div className="flex items-start gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-[0.7rem] leading-relaxed text-ink-600">
              <Info className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
              {t('booking.notConfirmedNotice')}
            </div>
            <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-ink-400">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {t('privacy.s2Text')}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
