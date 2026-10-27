import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import type { Service } from '@shared/domain/types';
import { addDaysISO, todayISO } from '@shared/domain/availability';
import { calculateQuote } from '@shared/domain/pricing';
import { backend, BackendError } from '@/services/backend';
import type { SlotInfo } from '@/services/backend/types';
import { useI18n } from '@/app/providers/I18nProvider';
import { Field, Modal, Spinner } from '@/components/common/ui';
import { formatDuration, price, serviceTranslation } from '@/lib/utilities/localized';
import type { Reservation } from '@shared/domain/types';

/**
 * Staff-created reservation. Uses the same validated API as the public form, so
 * availability, pricing and rate limits are enforced exactly the same way.
 */
export function ManualReservationModal({
  open,
  services,
  onClose,
  onCreated,
}: {
  open: boolean;
  services: Service[];
  onClose: () => void;
  onCreated: (reservation: Reservation) => void;
}) {
  const { locale, t } = useI18n();
  const today = todayISO();
  const firstService = services[0] ?? null;

  const [serviceId, setServiceId] = useState(firstService?.id ?? '');
  const [date, setDate] = useState(addDaysISO(today, 1));
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(firstService?.default_duration_hours ?? 3);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState<'email' | 'phone' | 'whatsapp'>('phone');
  const [note, setNote] = useState('');
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const service = services.find((item) => item.id === serviceId) ?? null;

  useEffect(() => {
    if (!open || !service) return;
    let active = true;
    setSlotsLoading(true);
    backend
      .getAvailability({ serviceId: service.id, date, durationHours: duration })
      .then((result) => {
        if (!active) return;
        setSlots(result);
        setTime((current) => (result.some((slot) => slot.time === current && slot.available) ? current : result.find((slot) => slot.available)?.time ?? ''));
      })
      .catch(() => active && setSlots([]))
      .finally(() => active && setSlotsLoading(false));
    return () => {
      active = false;
    };
  }, [open, service, date, duration]);

  const quote = useMemo(() => {
    if (!service) return null;
    try {
      return calculateQuote({ service, durationHours: duration, quantity, addonIds: [] });
    } catch {
      return null;
    }
  }, [service, duration, quantity]);

  const submit = async () => {
    if (!service) return;
    setSaving(true);
    setError(null);
    setFields({});
    try {
      const result = await backend.createReservation({
        locale,
        reservation_type: service.kind,
        service_id: service.id,
        offer_id: null,
        full_name: name,
        email,
        phone,
        preferred_contact: contact,
        quantity,
        reservation_date: date,
        start_time: time,
        duration_hours: duration,
        addons: [],
        message: note,
        privacy_accepted: true,
        company: '',
      });
      onCreated(result.reservation);
      setName('');
      setEmail('');
      setPhone('');
      setNote('');
      onClose();
    } catch (caught) {
      if (caught instanceof BackendError) {
        setFields(caught.fields ?? {});
        setError(caught.message);
      } else {
        setError(t('errors.network'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('admin.calendar.manualTitle')}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.7rem] text-ink-500">{t('admin.calendar.manualHint')}</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={onClose}>
              {t('admin.common.cancel')}
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => void submit()} disabled={saving || !time}>
              {saving ? <Spinner className="size-3.5 text-white" /> : <Plus className="size-3.5" aria-hidden="true" />}
              {t('admin.common.create')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <Field label={t('admin.services.title')} htmlFor="manual-service" required>
          <select
            id="manual-service"
            className="field"
            value={serviceId}
            onChange={(event) => {
              const next = services.find((item) => item.id === event.target.value);
              setServiceId(event.target.value);
              if (next) setDuration(next.default_duration_hours);
            }}
          >
            {services.map((item) => (
              <option key={item.id} value={item.id}>
                {serviceTranslation(item, locale).name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('admin.reservations.ride')} htmlFor="manual-date" required>
            <input id="manual-date" type="date" className="field" min={today} value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label={t('admin.reservations.durationLabel')} htmlFor="manual-duration" required>
            <select id="manual-duration" className="field" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              {(service?.duration_options.length ? service.duration_options.map((option) => option.hours) : [duration]).map((hours) => (
                <option key={hours} value={hours}>
                  {formatDuration(hours, t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.reservations.participants')} htmlFor="manual-quantity" required>
            <input
              id="manual-quantity"
              type="number"
              min={1}
              max={service?.max_units ?? 30}
              className="field"
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            />
          </Field>
        </div>

        <div>
          <p className="field-label">{t('booking.chooseSlot')}</p>
          {slotsLoading && <Spinner className="size-4" />}
          <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setTime(slot.time)}
                className={`rounded-lg border px-1 py-1.5 text-[0.7rem] font-semibold ${
                  time === slot.time ? 'border-brand-500 bg-brand-600 text-white' : slot.available ? 'border-ink-200 bg-white' : 'border-ink-100 bg-ink-50 text-ink-300 line-through'
                }`}
              >
                <span dir="ltr">{slot.time}</span>
              </button>
            ))}
          </div>
          {!slotsLoading && slots.length === 0 && <p className="mt-1 text-xs text-amber-700">{t('admin.calendar.closed')}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.reservations.customer')} htmlFor="manual-name" required error={fields.full_name}>
            <input id="manual-name" className="field" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          </Field>
          <Field label={t('common.email')} htmlFor="manual-email" required error={fields.email}>
            <input id="manual-email" type="email" dir="ltr" className="field" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
          </Field>
          <Field label={t('common.phone')} htmlFor="manual-phone" required error={fields.phone}>
            <input id="manual-phone" type="tel" dir="ltr" className="field" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+212 6..." autoComplete="off" />
          </Field>
          <Field label={t('admin.reservations.preferredContact')} htmlFor="manual-contact">
            <select id="manual-contact" className="field" value={contact} onChange={(event) => setContact(event.target.value as typeof contact)}>
              <option value="phone">{t('booking.contactPhone')}</option>
              <option value="whatsapp">{t('booking.contactWhatsapp')}</option>
              <option value="email">{t('booking.contactEmail')}</option>
            </select>
          </Field>
        </div>

        <Field label={t('admin.reservations.internalNotes')} htmlFor="manual-note" hint={t('admin.reservations.markCommunication')}>
          <textarea id="manual-note" rows={2} className="field" value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>

        {quote && (
          <div className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-sm">
            <span className="text-ink-600">{t('booking.estimatedTotal')}</span>
            <span className="font-bold text-ink-900">{price(quote.total, locale)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
