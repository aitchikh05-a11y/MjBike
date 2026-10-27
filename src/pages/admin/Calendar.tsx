import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Ban } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, ConfirmDialog, Panel, SelectFilter } from '@/components/admin/widgets';
import { ManualReservationModal } from '@/components/admin/ManualReservationModal';
import { Field, Modal, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/authentication/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { ADMIN_PATHS } from '@/app/router/paths';
import { RESERVATION_STATUS_DOT } from '@shared/domain/reservations';
import { addDaysISO, todayISO } from '@shared/domain/availability';
import { cn } from '@/lib/utilities/cn';
import type { AvailabilityBlock, CalendarEvent, Reservation } from '@shared/domain/types';

type View = 'month' | 'week' | 'day';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AdminCalendarPage() {
  const { locale, t, date } = useI18n();
  const { allowed } = useAuth();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [serviceFilter, setServiceFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>(todayISO());
  const [blockOpen, setBlockOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<AvailabilityBlock | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState({
    service_id: '',
    start_date: todayISO(),
    end_date: todayISO(),
    start_time: '',
    end_time: '',
    reason: '',
  });
  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'other' as CalendarEvent['event_type'],
    start_at: `${todayISO()}T09:00`,
    end_at: `${todayISO()}T10:00`,
    location: '',
    notes: '',
  });

  const range = useMemo(() => {
    if (view === 'day') {
      const day = format(cursor, 'yyyy-MM-dd');
      return { from: day, to: day };
    }
    if (view === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
  }, [view, cursor]);

  const reservations = useAsync(
    () =>
      backend.listReservations({
        from: range.from,
        to: range.to,
        type: serviceFilter || undefined,
        staffId: staffFilter || undefined,
        limit: 500,
        sort: 'reservation_date',
        direction: 'asc',
      }),
    [range.from, range.to, serviceFilter, staffFilter],
  );
  const blocks = useAsync(() => backend.listBlocks(), []);
  const events = useAsync(() => backend.listEvents(), []);
  const services = useAsync(() => backend.listServices().catch(() => []), []);
  const staff = useAsync(
    () => (allowed('reservations:view_all') ? backend.listStaff().catch(() => []) : Promise.resolve([])),
    [allowed],
  );

  const days = useMemo(() => {
    if (view === 'day') return [cursor];
    const start = view === 'week' ? startOfWeek(cursor, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = view === 'week' ? endOfWeek(cursor, { weekStartsOn: 1 }) : endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [view, cursor]);

  const itemsForDay = (day: Date) => (reservations.data?.items ?? []).filter((reservation) => reservation.reservation_date === format(day, 'yyyy-MM-dd'));
  const blocksForDay = (day: Date) =>
    (blocks.data ?? []).filter((block) => {
      const key = format(day, 'yyyy-MM-dd');
      return block.is_active && key >= block.start_date && key <= block.end_date;
    });
  const eventsForDay = (day: Date) =>
    (events.data ?? []).filter((event) => event.start_at.slice(0, 10) === format(day, 'yyyy-MM-dd'));

  const navigate = (direction: -1 | 1) => {
    if (view === 'day') setCursor((current) => addDays(current, direction));
    else if (view === 'week') setCursor((current) => addWeeks(current, direction));
    else setCursor((current) => addMonths(current, direction));
  };

  const saveBlock = async () => {
    if (!blockForm.reason.trim()) {
      setFormError(t('validation.required'));
      return;
    }
    setSavingBlock(true);
    setFormError(null);
    try {
      await backend.saveBlock({
        service_id: blockForm.service_id || null,
        start_date: blockForm.start_date,
        end_date: blockForm.end_date,
        start_time: blockForm.start_time || null,
        end_time: blockForm.end_time || null,
        reason: blockForm.reason,
        is_active: true,
      });
      blocks.reload();
      setBlockOpen(false);
      setBlockForm({ service_id: '', start_date: todayISO(), end_date: todayISO(), start_time: '', end_time: '', reason: '' });
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setSavingBlock(false);
    }
  };

  const saveEvent = async () => {
    setSavingBlock(true);
    setFormError(null);
    try {
      await backend.saveEvent({
        title: eventForm.title,
        event_type: eventForm.event_type,
        start_at: new Date(eventForm.start_at).toISOString(),
        end_at: new Date(eventForm.end_at).toISOString(),
        all_day: false,
        location: eventForm.location || null,
        notes: eventForm.notes || null,
      });
      events.reload();
      setEventOpen(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setSavingBlock(false);
    }
  };

  const selectedReservations = (reservations.data?.items ?? []).filter((reservation) => reservation.reservation_date === selectedDay);

  const renderReservationChip = (reservation: Reservation) => (
    <Link
      key={reservation.id}
      to={ADMIN_PATHS.reservation(reservation.id)}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.62rem] font-medium hover:bg-white"
      title={`${reservation.reference} · ${reservation.full_name}`}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', RESERVATION_STATUS_DOT[reservation.status])} aria-hidden="true" />
      <span className="truncate" dir="ltr">
        {reservation.start_time}
      </span>
      <span className="truncate text-ink-500">{reservation.full_name}</span>
    </Link>
  );

  return (
    <div>
      <AdminPageHeader
        title={t('admin.calendar.title')}
        subtitle={t('admin.calendar.subtitle')}
        actions={
          <>
            <button type="button" className="btn-secondary text-xs" onClick={() => setBlockOpen(true)}>
              <Ban className="size-3.5" aria-hidden="true" />
              {t('admin.calendar.addBlock')}
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setEventOpen(true)}>
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {t('admin.calendar.addEvent')}
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => setManualOpen(true)}>
              <Plus className="size-3.5" aria-hidden="true" />
              {t('admin.calendar.addReservation')}
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink-100">
            {(['month', 'week', 'day'] as View[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize', view === value ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-ink-900')}
              >
                {t(`admin.calendar.${value}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-full bg-white p-2 shadow-sm ring-1 ring-ink-100 hover:bg-ink-50" onClick={() => navigate(-1)} aria-label={t('admin.calendar.prev')}>
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button type="button" className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-ink-100 hover:bg-ink-50" onClick={() => setCursor(new Date())}>
              {t('admin.calendar.today')}
            </button>
            <button type="button" className="rounded-full bg-white p-2 shadow-sm ring-1 ring-ink-100 hover:bg-ink-50" onClick={() => navigate(1)} aria-label={t('admin.calendar.next')}>
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm font-bold text-ink-900">
            {view === 'day' ? date(format(cursor, 'yyyy-MM-dd')) : format(cursor, view === 'week' ? "'W'ww yyyy" : 'MMMM yyyy')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter
            label={t('admin.calendar.serviceFilter')}
            value={serviceFilter}
            onChange={setServiceFilter}
            options={[{ value: '', label: t('admin.common.all') }, ...(services.data ?? []).map((service) => ({ value: service.kind, label: t(`booking.type${service.kind.charAt(0).toUpperCase()}${service.kind.slice(1)}`) }))]}
          />
          {allowed('reservations:view_all') && (
            <SelectFilter
              label={t('admin.calendar.staffFilter')}
              value={staffFilter}
              onChange={setStaffFilter}
              options={[{ value: '', label: t('admin.common.all') }, ...(staff.data ?? []).map((profile) => ({ value: profile.id, label: profile.full_name }))]}
            />
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[0.7rem] text-ink-500">
        {(['pending', 'confirmed'] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', RESERVATION_STATUS_DOT[status])} aria-hidden="true" />
            {t(`admin.status.${status}`)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink-300" aria-hidden="true" />
          {t('admin.calendar.legendBlocked')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" aria-hidden="true" />
          {t('admin.calendar.legendEvent')}
        </span>
      </div>

      {reservations.loading && <AdminLoading />}
      {reservations.error && <AdminError message={reservations.error} onRetry={reservations.reload} />}

      {!reservations.loading && (
        <div className="card overflow-hidden">
          {view !== 'day' && (
            <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/60">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-[0.65rem] font-bold uppercase tracking-wide text-ink-500">
                  {day}
                </div>
              ))}
            </div>
          )}
          <div className={view === 'month' ? 'grid grid-cols-7' : view === 'week' ? 'grid grid-cols-7' : 'block'}>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayReservations = itemsForDay(day);
              const dayBlocks = blocksForDay(day);
              const dayEvents = eventsForDay(day);
              const outside = view === 'month' && !isSameMonth(day, cursor);
              const isSelected = key === selectedDay;

              if (view === 'day') {
                return (
                  <div key={key} className="divide-y divide-ink-100">
                    {Array.from({ length: 13 }, (_, index) => index + 9).map((hour) => {
                      const slotReservations = dayReservations.filter((reservation) => Number(reservation.start_time.slice(0, 2)) === hour);
                      const slotEvents = dayEvents.filter((event) => Number(event.start_at.slice(11, 13)) === hour);
                      return (
                        <div key={hour} className="flex gap-3 px-4 py-2.5">
                          <span className="w-14 shrink-0 text-xs font-semibold text-ink-400" dir="ltr">
                            {String(hour).padStart(2, '0')}:00
                          </span>
                          <div className="flex flex-1 flex-wrap gap-1.5">
                            {slotReservations.length === 0 && slotEvents.length === 0 && <span className="text-xs text-ink-300">—</span>}
                            {slotReservations.map((reservation) => (
                              <Link
                                key={reservation.id}
                                to={ADMIN_PATHS.reservation(reservation.id)}
                                className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-2 py-1 text-xs hover:bg-brand-50"
                              >
                                <span className={cn('size-2 rounded-full', RESERVATION_STATUS_DOT[reservation.status])} aria-hidden="true" />
                                <span className="font-mono text-[0.65rem] text-ink-500" dir="ltr">
                                  {reservation.start_time}
                                </span>
                                <span className="font-semibold text-ink-800">{reservation.full_name}</span>
                                <span className="text-ink-500">{reservation.items[0]?.name}</span>
                              </Link>
                            ))}
                            {slotEvents.map((event) => (
                              <span key={event.id} className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
                                {event.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={cn(
                    'min-h-[6.5rem] border-b border-e border-ink-100 p-1.5 text-start align-top transition hover:bg-brand-50/40',
                    outside && 'bg-ink-50/50 text-ink-400',
                    isSelected && 'bg-brand-50/70 ring-1 ring-inset ring-brand-300',
                    view === 'week' && 'min-h-[18rem]',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn('grid size-6 place-items-center rounded-full text-[0.7rem] font-bold', isToday(day) ? 'bg-brand-600 text-white' : 'text-ink-700')}>
                      {format(day, 'd')}
                    </span>
                    {dayBlocks.length > 0 && <span className="rounded bg-ink-200 px-1 text-[0.55rem] font-bold uppercase text-ink-700">{t('admin.calendar.closed')}</span>}
                  </div>
                  <div className={cn('mt-1 space-y-0.5', dayBlocks.length > 0 && 'opacity-60')}>
                    {dayReservations.slice(0, view === 'week' ? 12 : 3).map(renderReservationChip)}
                    {dayEvents.slice(0, view === 'week' ? 4 : 1).map((event) => (
                      <span key={event.id} className="block truncate rounded bg-sky-50 px-1.5 py-0.5 text-[0.62rem] font-medium text-sky-800">
                        {event.title}
                      </span>
                    ))}
                    {dayReservations.length > (view === 'week' ? 12 : 3) && (
                      <span className="block px-1.5 text-[0.6rem] font-semibold text-brand-700">+{dayReservations.length - (view === 'week' ? 12 : 3)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title={`${t('admin.calendar.noReservations')} · ${date(selectedDay)}`} className="xl:col-span-2">
          {selectedReservations.length === 0 ? (
            <p className="py-4 text-center text-xs text-ink-400">{t('admin.calendar.noReservations')}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {selectedReservations.map((reservation) => (
                <li key={reservation.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link to={ADMIN_PATHS.reservation(reservation.id)} className="truncate text-xs font-semibold text-brand-700 hover:underline">
                      {reservation.full_name} · {reservation.reference}
                    </Link>
                    <p className="text-[0.68rem] text-ink-500">
                      {reservation.items[0]?.name} · {reservation.start_time} · {reservation.duration_hours}h
                    </p>
                  </div>
                  <span className={cn('size-2 shrink-0 rounded-full', RESERVATION_STATUS_DOT[reservation.status])} title={t(`admin.status.${reservation.status}`)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('admin.calendar.blocks')}>
          {(blocks.data ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">{t('admin.calendar.noEvents')}</p>
          ) : (
            <ul className="space-y-2">
              {(blocks.data ?? []).map((block) => (
                <li key={block.id} className="flex items-start justify-between gap-2 rounded-lg bg-ink-50 px-2 py-1.5">
                  <div>
                    <p className="text-xs font-semibold text-ink-800">
                      {block.start_date} → {block.end_date}
                    </p>
                    <p className="text-[0.65rem] text-ink-500">{block.reason}</p>
                  </div>
                  <button type="button" className="rounded p-1 text-red-600 hover:bg-red-50" onClick={() => setBlockToDelete(block)} aria-label={t('admin.calendar.blockDelete')}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-ink-100 pt-3">
            <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-ink-400">{t('admin.calendar.events')}</p>
            {(events.data ?? []).length === 0 ? (
              <p className="text-xs text-ink-400">{t('admin.calendar.noEvents')}</p>
            ) : (
              <ul className="space-y-1.5">
                {(events.data ?? []).slice(0, 6).map((event) => (
                  <li key={event.id} className="rounded-lg bg-sky-50 px-2 py-1.5 text-[0.68rem] text-sky-900">
                    <span className="font-semibold">{event.title}</span>
                    <span className="ms-1 text-sky-700">{date(event.start_at.slice(0, 10))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={t('admin.calendar.blockTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => setBlockOpen(false)}>
              {t('admin.common.cancel')}
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => void saveBlock()} disabled={savingBlock}>
              {savingBlock && <Spinner className="size-3.5 text-white" />}
              {t('admin.calendar.blockSave')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{formError}</p>}
          <Field label={t('admin.calendar.blockService')} htmlFor="block-service">
            <select id="block-service" className="field" value={blockForm.service_id} onChange={(event) => setBlockForm({ ...blockForm, service_id: event.target.value })}>
              <option value="">{t('admin.common.all')}</option>
              {(services.data ?? []).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.translations.find((translation) => translation.locale === locale)?.name ?? service.slug}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('admin.calendar.blockStart')} htmlFor="block-start" required>
              <input id="block-start" type="date" className="field" value={blockForm.start_date} onChange={(event) => setBlockForm({ ...blockForm, start_date: event.target.value })} />
            </Field>
            <Field label={t('admin.calendar.blockEnd')} htmlFor="block-end" required>
              <input id="block-end" type="date" className="field" min={blockForm.start_date} value={blockForm.end_date} onChange={(event) => setBlockForm({ ...blockForm, end_date: event.target.value })} />
            </Field>
            <Field label={t('admin.calendar.blockStartTime')} htmlFor="block-start-time">
              <input id="block-start-time" type="time" className="field" value={blockForm.start_time} onChange={(event) => setBlockForm({ ...blockForm, start_time: event.target.value })} />
            </Field>
            <Field label={t('admin.calendar.blockEndTime')} htmlFor="block-end-time">
              <input id="block-end-time" type="time" className="field" value={blockForm.end_time} onChange={(event) => setBlockForm({ ...blockForm, end_time: event.target.value })} />
            </Field>
          </div>
          <Field label={t('admin.calendar.blockReason')} htmlFor="block-reason" required>
            <input id="block-reason" className="field" value={blockForm.reason} onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        title={t('admin.calendar.addEvent')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => setEventOpen(false)}>
              {t('admin.common.cancel')}
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => void saveEvent()} disabled={savingBlock || !eventForm.title}>
              {savingBlock && <Spinner className="size-3.5 text-white" />}
              {t('admin.common.save')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label={t('admin.calendar.eventTitle')} htmlFor="event-title" required>
            <input id="event-title" className="field" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('admin.calendar.eventStart')} htmlFor="event-start" required>
              <input id="event-start" type="datetime-local" className="field" value={eventForm.start_at} onChange={(event) => setEventForm({ ...eventForm, start_at: event.target.value })} />
            </Field>
            <Field label={t('admin.calendar.eventEnd')} htmlFor="event-end" required>
              <input id="event-end" type="datetime-local" className="field" value={eventForm.end_at} onChange={(event) => setEventForm({ ...eventForm, end_at: event.target.value })} />
            </Field>
          </div>
          <Field label={t('admin.calendar.eventLocation')} htmlFor="event-location">
            <input id="event-location" className="field" value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} />
          </Field>
          <Field label={t('admin.calendar.eventNotes')} htmlFor="event-notes">
            <textarea id="event-notes" rows={2} className="field" value={eventForm.notes} onChange={(event) => setEventForm({ ...eventForm, notes: event.target.value })} />
          </Field>
        </div>
      </Modal>

      <ManualReservationModal
        open={manualOpen}
        services={(services.data ?? []) as import('@shared/domain/types').Service[]}
        onClose={() => setManualOpen(false)}
        onCreated={() => {
          reservations.reload();
          setSelectedDay(todayISO());
        }}
      />

      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title={t('admin.calendar.blockDelete')}
        description={blockToDelete?.reason}
        confirmLabel={t('admin.common.delete')}
        tone="danger"
        onClose={() => setBlockToDelete(null)}
        onConfirm={() => {
          if (!blockToDelete) return;
          void backend.deleteBlock(blockToDelete.id).then(() => {
            blocks.reload();
            setBlockToDelete(null);
          });
        }}
      />

      <p className="mt-4 text-[0.68rem] text-ink-400">
        {t('admin.calendar.openHours')} 09:00 – 21:00 · {t('admin.calendar.capacityTitle')} — {t('admin.reservations.dateFrom')} {addDaysISO(todayISO(), 0)} → {range.to}
      </p>
    </div>
  );
}
