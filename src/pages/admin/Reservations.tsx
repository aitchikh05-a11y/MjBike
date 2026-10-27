import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Download,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  Search,
  StickyNote,
  UserCheck,
} from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, ConfirmDialog, Panel, SelectFilter, TextFilter, Toolbar } from '@/components/admin/widgets';
import { ManualReservationModal } from '@/components/admin/ManualReservationModal';
import { Field, Pagination, StatusBadge } from '@/components/common/ui';
import { useAsync, useDebounced } from '@/hooks/useAsync';
import { useAuth } from '@/features/authentication/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { ADMIN_PATHS } from '@/app/router/paths';
import { canTransition, RESERVATION_STATUS_LABELS } from '@shared/domain/reservations';
import { RESERVATION_STATUSES, type ReservationStatus } from '@shared/domain/types';
import { price, whatsappHref } from '@/lib/utilities/localized';
import { cn } from '@/lib/utilities/cn';

const PAGE_SIZE = 20;

export function AdminReservationsPage() {
  const { locale, t, date } = useI18n();
  const { allowed } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [staff, setStaff] = useState('');
  const [sort, setSort] = useState<'created_at' | 'reservation_date' | 'updated_at'>('created_at');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const reservations = useAsync(
    () =>
      backend.listReservations({
        search: debouncedSearch || undefined,
        status: status ? [status as ReservationStatus] : undefined,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
        staffId: staff || undefined,
        sort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    [debouncedSearch, status, type, from, to, staff, sort, page],
  );

  const staffList = useAsync(() => (allowed('reservations:view_all') ? backend.listStaff().catch(() => []) : Promise.resolve([])), [allowed]);
  const services = useAsync(() => backend.listServices().catch(() => []) as Promise<import('@shared/domain/types').Service[]>, []);
  const [notice, setNotice] = useState<string | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await backend.listReservations({
        search: debouncedSearch || undefined,
        status: status ? [status as ReservationStatus] : undefined,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
        sort,
        limit: 1000,
        offset: 0,
      });
      const header = ['reference', 'status', 'full_name', 'email', 'phone', 'service', 'reservation_date', 'start_time', 'duration_hours', 'participants', 'total_price', 'created_at'];
      const rows = all.items.map((reservation) => [
        reservation.reference,
        reservation.status,
        reservation.full_name,
        reservation.email,
        reservation.phone,
        reservation.items[0]?.name ?? '',
        reservation.reservation_date,
        reservation.start_time,
        reservation.duration_hours,
        reservation.participants,
        reservation.total_price,
        reservation.created_at,
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mj-bike-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title={t('admin.reservations.title')}
        subtitle={t('admin.reservations.subtitle')}
        actions={
          <>
            {allowed('reservations:export') && (
              <button type="button" className="btn-secondary text-xs" onClick={() => void exportCsv()} disabled={exporting}>
                <Download className="size-3.5" aria-hidden="true" />
                {exporting ? t('admin.reservations.exporting') : t('admin.reservations.export')}
              </button>
            )}
            <button type="button" className="btn-primary text-xs" onClick={() => setManualOpen(true)}>
              <Plus className="size-3.5" aria-hidden="true" />
              {t('admin.reservations.newManual')}
            </button>
          </>
        }
      />

      {notice && (
        <div className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900" role="status">
          {notice}
        </div>
      )}

      <Toolbar>
        <div className="min-w-[14rem] flex-[2]">
          <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-ink-500" htmlFor="reservation-search">
            {t('common.search')}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="reservation-search"
              type="search"
              className="field ps-9 !py-2 text-xs"
              placeholder={t('admin.reservations.searchPlaceholder')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <SelectFilter
          label={t('admin.reservations.statusFilter')}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[{ value: '', label: t('admin.common.all') }, ...RESERVATION_STATUSES.map((value) => ({ value, label: t(`admin.status.${value}`) }))]}
        />
        <SelectFilter
          label={t('admin.reservations.typeFilter')}
          value={type}
          onChange={(value) => {
            setType(value);
            setPage(1);
          }}
          options={[
            { value: '', label: t('admin.common.all') },
            { value: 'rental', label: t('booking.typeRental') },
            { value: 'tour', label: t('booking.typeTour') },
            { value: 'lesson', label: t('booking.typeLesson') },
            { value: 'experience', label: t('booking.typeExperience') },
            { value: 'event', label: t('booking.typeEvent') },
          ]}
        />
        {allowed('reservations:view_all') && (
          <SelectFilter
            label={t('admin.reservations.staffFilter')}
            value={staff}
            onChange={(value) => {
              setStaff(value);
              setPage(1);
            }}
            options={[{ value: '', label: t('admin.common.all') }, ...(staffList.data ?? []).map((profile) => ({ value: profile.id, label: profile.full_name }))]}
          />
        )}
        <TextFilter label={t('admin.reservations.dateFrom')} type="date" value={from} onChange={(value) => { setFrom(value); setPage(1); }} />
        <TextFilter label={t('admin.reservations.dateTo')} type="date" value={to} onChange={(value) => { setTo(value); setPage(1); }} />
        <SelectFilter
          label={t('admin.reservations.sortBy')}
          value={sort}
          onChange={(value) => setSort(value as typeof sort)}
          options={[
            { value: 'created_at', label: t('admin.reservations.sortCreated') },
            { value: 'reservation_date', label: t('admin.reservations.sortRide') },
            { value: 'updated_at', label: t('admin.reservations.sortUpdated') },
          ]}
        />
      </Toolbar>

      {reservations.loading && <AdminLoading />}
      {reservations.error && <AdminError message={reservations.error} onRetry={reservations.reload} />}

      {reservations.data && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-2.5 text-xs text-ink-500">
            <span>
              {t('admin.reservations.showing', {
                count: reservations.data.items.length,
                total: reservations.data.total,
              })}
            </span>
            {allowed('reservations:export') && <span className="hidden sm:inline">{t('admin.common.exportCsvHint')}</span>}
          </div>

          {reservations.data.items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-ink-600">{search || status || type || from || to ? t('admin.reservations.empty') : t('admin.reservations.emptyAll')}</p>
              <button type="button" className="btn-primary mt-4 text-xs" onClick={() => setManualOpen(true)}>
                <Plus className="size-3.5" aria-hidden="true" />
                {t('admin.reservations.newManual')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table min-w-[52rem]">
                <thead>
                  <tr>
                    <th>{t('admin.reservations.reference')}</th>
                    <th>{t('admin.reservations.customer')}</th>
                    <th>{t('admin.reservations.service')}</th>
                    <th>{t('admin.reservations.ride')}</th>
                    <th>{t('admin.reservations.status')}</th>
                    <th>{t('admin.reservations.staffFilter')}</th>
                    <th className="text-end">{t('admin.reservations.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.data.items.map((reservation) => (
                    <tr key={reservation.id} className="cursor-pointer hover:bg-ink-50/60" onClick={() => navigate(ADMIN_PATHS.reservation(reservation.id))}>
                      <td>
                        <Link to={ADMIN_PATHS.reservation(reservation.id)} className="font-mono text-xs font-semibold text-brand-700 hover:underline" dir="ltr">
                          {reservation.reference}
                        </Link>
                        <span className="mt-0.5 block text-[0.65rem] text-ink-400">{date(reservation.reservation_date)}</span>
                      </td>
                      <td>
                        <span className="block text-xs font-semibold text-ink-900">{reservation.full_name}</span>
                        <span className="block text-[0.65rem] text-ink-500">{reservation.email}</span>
                      </td>
                      <td className="max-w-[12rem] truncate text-xs">{reservation.items[0]?.name ?? '—'}</td>
                      <td className="whitespace-nowrap text-xs">
                        {date(reservation.reservation_date)}
                        <span className="block text-[0.65rem] text-ink-400" dir="ltr">
                          {reservation.start_time} · {reservation.duration_hours}h
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={reservation.status} />
                      </td>
                      <td className="text-xs text-ink-500">
                        {(staffList.data ?? []).find((profile) => profile.id === reservation.assigned_staff_id)?.full_name ?? t('admin.reservations.unassigned')}
                      </td>
                      <td className="whitespace-nowrap text-end text-xs font-semibold">{price(reservation.total_price, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 pb-3">
            <Pagination page={page} pageSize={PAGE_SIZE} total={reservations.data.total} onPage={setPage} />
          </div>
        </div>
      )}

      <ManualReservationModal
        open={manualOpen}
        services={services.data ?? []}
        onClose={() => setManualOpen(false)}
        onCreated={(reservation) => {
          setNotice(`${t('admin.reservations.updated')} ${reservation.reference}`);
          reservations.reload();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                             */
/* ------------------------------------------------------------------ */

export function AdminReservationDetailPage() {
  const { id = '' } = useParams();
  const { locale, t, date, dateTime } = useI18n();
  const { allowed, profile } = useAuth();
  const navigate = useNavigate();
  const reservationState = useAsync(() => backend.getReservation(id), [id]);
  const staffList = useAsync(() => (allowed('reservations:view_all') ? backend.listStaff().catch(() => []) : Promise.resolve([])), [allowed]);

  const [tab, setTab] = useState<'overview' | 'notes' | 'history'>('overview');
  const [dialog, setDialog] = useState<null | 'confirm' | 'reject' | 'cancel' | 'complete' | 'no_show' | 'pending'>(null);
  const [reason, setReason] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [assigned, setAssigned] = useState<string>('');
  const [note, setNote] = useState('');
  const [isCommunication, setIsCommunication] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reservation = reservationState.data;
  const statusLabel = reservation ? t(`admin.status.${reservation.status}`) : '';

  const update = async (payload: Parameters<typeof backend.updateReservation>[1]) => {
    if (!reservation) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await backend.updateReservation(reservation.id, payload);
      reservationState.setData(updated);
      setMessage(t('admin.reservations.statusUpdated', { status: t(`admin.status.${updated.status}`) }));
      setDialog(null);
      setReason('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!reservation || note.trim().length < 2) return;
    setBusy(true);
    try {
      await backend.addReservationNote(reservation.id, note.trim(), isCommunication);
      reservationState.reload();
      setNote('');
      setIsCommunication(false);
      setMessage(t('admin.reservations.updated'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (reservationState.loading) return <AdminLoading />;
  if (reservationState.error) return <AdminError message={reservationState.error} onRetry={reservationState.reload} />;
  if (!reservation) return <AdminError message={t('errors.notFound')} />;

  const allowedTransitions = RESERVATION_STATUSES.filter((status) => canTransition(reservation.status, status));
  const requiresReason = (status: ReservationStatus | null) => status === 'rejected' || status === 'cancelled' || status === 'no_show';

  const actionButton = (label: string, status: ReservationStatus, tone: 'primary' | 'secondary' | 'danger' = 'secondary') => (
    <button
      key={status}
      type="button"
      className={cn('btn text-xs', tone === 'primary' ? 'bg-brand-600 text-white hover:bg-brand-700' : tone === 'danger' ? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100' : 'btn-secondary')}
      onClick={() => {
        setError(null);
        setDialog(status === 'confirmed' ? 'confirm' : status === 'rejected' ? 'reject' : status === 'cancelled' ? 'cancel' : status === 'completed' ? 'complete' : status === 'no_show' ? 'no_show' : 'pending');
        setReason(reservation.cancellation_reason ?? '');
      }}
    >
      {label}
    </button>
  );

  const statusActionLabels: Record<string, string> = {
    confirmed: t('admin.reservations.confirmBooking'),
    rejected: t('admin.reservations.rejectBooking'),
    cancelled: t('admin.reservations.cancelBooking'),
    completed: t('admin.reservations.markCompleted'),
    no_show: t('admin.reservations.markNoShow'),
    pending: t('admin.reservations.resetPending'),
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(ADMIN_PATHS.reservations)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('admin.reservations.title')}
        </button>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary text-xs no-print" onClick={() => window.print()}>
            <Printer className="size-3.5" aria-hidden="true" />
            {t('admin.reservations.print')}
          </button>
          <StatusBadge status={reservation.status} className="bg-white" />
        </div>
      </div>

      {message && <div className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900 no-print" role="status">{message}</div>}
      {error && <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 no-print" role="alert">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="card p-5 print-block">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-extrabold text-ink-900" dir="ltr">
                  {reservation.reference}
                </p>
                <h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink-900">{reservation.full_name}</h1>
                <p className="mt-0.5 text-xs text-ink-500">
                  {t('admin.reservations.created')}: {dateTime(reservation.created_at)} · {t('admin.reservations.sourceLabel')}: {reservation.source}
                </p>
              </div>
              <div className="text-end">
                <p className="text-[0.7rem] uppercase tracking-wide text-ink-400">{t('admin.reservations.total')}</p>
                <p className="text-xl font-extrabold text-brand-700">{price(reservation.total_price, locale)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl bg-ink-50/70 p-3 sm:grid-cols-2">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-400">{t('admin.reservations.ride')}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900">{date(reservation.reservation_date)}</p>
                <p className="text-xs text-ink-600" dir="ltr">
                  {reservation.start_time} · {reservation.duration_hours}h
                </p>
              </div>
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-400">{t('admin.reservations.service')}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900">{reservation.items[0]?.name ?? '—'}</p>
                <p className="text-xs text-ink-600">
                  {reservation.participants} {t('common.people')}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 no-print">
              {allowedTransitions.map((status) =>
                actionButton(statusActionLabels[status] ?? status, status, status === 'confirmed' ? 'primary' : status === 'rejected' || status === 'cancelled' ? 'danger' : 'secondary'),
              )}
              {allowedTransitions.length === 0 && <p className="text-xs text-ink-500">{statusLabel}</p>}
            </div>
          </div>

          <div className="card">
            <div className="flex gap-1 border-b border-ink-100 px-3 pt-3 no-print" role="tablist">
              {(['overview', 'notes', 'history'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'rounded-t-lg px-3 py-2 text-xs font-semibold',
                    tab === value ? 'bg-brand-50 text-brand-800' : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {value === 'overview' ? t('admin.reservations.overview') : value === 'notes' ? t('admin.reservations.notesTab') : t('admin.reservations.historyTab')}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'overview' && (
                <div className="space-y-5">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-400">{t('admin.reservations.customer')}</dt>
                      <dd className="mt-0.5 text-sm text-ink-900">{reservation.full_name}</dd>
                      <dd className="mt-1 flex flex-col gap-1 text-xs text-ink-600">
                        <a href={`mailto:${reservation.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-700" dir="ltr">
                          <Mail className="size-3" aria-hidden="true" />
                          {reservation.email}
                        </a>
                        <a href={`tel:${reservation.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-700" dir="ltr">
                          <Phone className="size-3" aria-hidden="true" />
                          {reservation.phone}
                        </a>
                        <span className="inline-flex items-center gap-1.5">
                          <UserCheck className="size-3" aria-hidden="true" />
                          {t('admin.reservations.preferredContact')}: {t(`booking.contact${reservation.preferred_contact.charAt(0).toUpperCase()}${reservation.preferred_contact.slice(1)}`)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-400">{t('admin.reservations.preferredContact')}</dt>
                      <dd className="mt-1 flex flex-wrap gap-2">
                        <a href={`mailto:${reservation.email}`} className="btn-secondary !px-2.5 !py-1.5 text-[0.7rem]" dir="ltr">
                          <Mail className="size-3" aria-hidden="true" />
                          {t('booking.contactEmail')}
                        </a>
                        <a href={`tel:${reservation.phone}`} className="btn-secondary !px-2.5 !py-1.5 text-[0.7rem]">
                          <Phone className="size-3" aria-hidden="true" />
                          {t('common.callUs')}
                        </a>
                        <a
                          href={whatsappHref(reservation.phone.replace(/^\+/, ''), `${reservation.reference}`)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn-secondary !px-2.5 !py-1.5 text-[0.7rem]"
                        >
                          <MessageSquare className="size-3" aria-hidden="true" />
                          {t('common.whatsapp')}
                        </a>
                      </dd>
                    </div>
                  </dl>

                  {reservation.message && (
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-400">{t('booking.message')}</p>
                      <p className="mt-1 whitespace-pre-line rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-700">{reservation.message}</p>
                    </div>
                  )}

                  {reservation.addons.length > 0 && (
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-400">{t('booking.addons')}</p>
                      <ul className="mt-1 space-y-1 text-xs text-ink-600">
                        {reservation.addons.map((addon) => (
                          <li key={addon.id}>
                            {addon.name} — {price(addon.price, locale)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reservation.price_snapshot && (
                    <div className="rounded-xl border border-ink-100 p-3">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-400">{t('admin.reservations.snapshotTitle')}</p>
                      <dl className="mt-2 grid gap-1 text-xs text-ink-600">
                        <div className="flex justify-between gap-2">
                          <dt>{reservation.price_snapshot.service_name}</dt>
                          <dd>
                            {price(reservation.price_snapshot.unit_price, locale)} × {reservation.price_snapshot.quantity}
                          </dd>
                        </div>
                        {reservation.price_snapshot.offer_title && (
                          <div className="flex justify-between gap-2 text-brand-700">
                            <dt>{reservation.price_snapshot.offer_title}</dt>
                            <dd>{t('booking.offerApplied')}</dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-2 border-t border-ink-100 pt-1 font-semibold text-ink-900">
                          <dt>{t('booking.estimatedTotal')}</dt>
                          <dd>{price(reservation.price_snapshot.total, locale)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  {reservation.internal_notes && (
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700">{t('admin.reservations.internalNotes')}</p>
                      <p className="mt-1 whitespace-pre-line text-xs text-amber-900">{reservation.internal_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'notes' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-ink-50 p-3">
                    <Field label={t('admin.reservations.addNote')} htmlFor="reservation-note">
                      <textarea
                        id="reservation-note"
                        rows={2}
                        className="field"
                        placeholder={t('admin.reservations.notePlaceholder')}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </Field>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-[0.7rem] text-ink-600">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-ink-300 text-brand-600"
                          checked={isCommunication}
                          onChange={(event) => setIsCommunication(event.target.checked)}
                        />
                        {t('admin.reservations.markCommunication')}
                      </label>
                      <button type="button" className="btn-primary !px-3 !py-1.5 text-[0.7rem]" onClick={() => void addNote()} disabled={busy || note.trim().length < 2}>
                        <StickyNote className="size-3" aria-hidden="true" />
                        {t('admin.common.save')}
                      </button>
                    </div>
                  </div>

                  {reservation.notes.length === 0 ? (
                    <p className="text-xs text-ink-400">{t('admin.reservations.notesEmpty')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {[...reservation.notes].reverse().map((entry) => (
                        <li key={entry.id} className={cn('rounded-xl border p-3', entry.is_customer_communication ? 'border-brand-200 bg-brand-50/50' : 'border-ink-100')}>
                          <div className="flex items-center justify-between gap-2 text-[0.65rem] text-ink-500">
                            <span className="font-semibold text-ink-700">{entry.author_name}</span>
                            <span>{dateTime(entry.created_at)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-xs text-ink-700">{entry.note}</p>
                          {entry.is_customer_communication && <span className="mt-1 inline-block text-[0.6rem] font-semibold uppercase text-brand-700">{t('admin.reservations.contactTab')}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div>
                  {reservation.history.length === 0 ? (
                    <p className="text-xs text-ink-400">{t('admin.reservations.historyEmpty')}</p>
                  ) : (
                    <ol className="space-y-3">
                      {reservation.history.map((entry) => (
                        <li key={entry.id} className="flex gap-3">
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                          <div>
                            <p className="text-xs font-semibold text-ink-900">
                              {entry.from_status ? `${t(`admin.status.${entry.from_status}`)} → ` : ''}
                              {t(`admin.status.${entry.to_status}`)}
                            </p>
                            <p className="text-[0.65rem] text-ink-500">
                              {entry.changed_by_name} · {dateTime(entry.created_at)}
                            </p>
                            {entry.reason && <p className="mt-1 rounded-lg bg-ink-50 px-2 py-1 text-[0.7rem] text-ink-600">{entry.reason}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: assignment, proposal, print summary */}
        <aside className="space-y-4 no-print">
          <Panel title={t('admin.reservations.statusActions')}>
            <div className="space-y-3">
              {allowed('reservations:view_all') && (
                <Field label={t('admin.reservations.assignStaff')} htmlFor="assigned-staff">
                  <div className="flex gap-2">
                    <select id="assigned-staff" className="field !py-2 text-xs" value={assigned || reservation.assigned_staff_id || ''} onChange={(event) => setAssigned(event.target.value)}>
                      <option value="">{t('admin.reservations.unassigned')}</option>
                      {(staffList.data ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.full_name} ({item.role})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-secondary !px-2.5 !py-1.5 text-[0.7rem]"
                      onClick={() => void update({ assigned_staff_id: assigned || null })}
                      disabled={busy}
                    >
                      {t('admin.common.save')}
                    </button>
                  </div>
                </Field>
              )}

              <div className="space-y-2 border-t border-ink-100 pt-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-500">{t('admin.reservations.proposedDate')}</p>
                <div className="flex gap-2">
                  <input type="date" className="field !py-2 text-xs" value={proposedDate || reservation.proposed_date || ''} onChange={(event) => setProposedDate(event.target.value)} />
                  <input type="time" className="field !py-2 text-xs" value={proposedTime || reservation.proposed_time || ''} onChange={(event) => setProposedTime(event.target.value)} />
                </div>
                <button
                  type="button"
                  className="btn-secondary w-full text-xs"
                  onClick={() => void update({ proposed_date: proposedDate || null, proposed_time: proposedTime || null })}
                  disabled={busy}
                >
                  <Clock className="size-3.5" aria-hidden="true" />
                  {t('admin.reservations.propose')}
                </button>
              </div>
            </div>
          </Panel>

          <Panel title={t('admin.reservations.internalNotes')}>
            <p className="mb-2 text-[0.68rem] text-ink-500">{t('admin.reservations.internalNotesHint')}</p>
            <textarea
              className="field text-xs"
              rows={3}
              value={reservation.internal_notes ?? ''}
              onChange={(event) => reservationState.setData({ ...reservation, internal_notes: event.target.value })}
            />
            <button type="button" className="btn-secondary mt-2 w-full text-xs" onClick={() => void update({ internal_notes: reservation.internal_notes ?? '' })} disabled={busy}>
              {t('admin.common.save')}
            </button>
          </Panel>

          <Panel title={t('admin.reservations.overview')}>
            <div className="space-y-2 text-xs text-ink-600">
              <p className="flex justify-between gap-2">
                <span>{t('admin.reservations.status')}</span>
                <StatusBadge status={reservation.status} />
              </p>
              <p className="flex justify-between gap-2">
                <span>{t('admin.reservations.created')}</span>
                <span className="font-medium text-ink-900">{dateTime(reservation.created_at)}</span>
              </p>
              <p className="flex justify-between gap-2">
                <span>{t('admin.reservations.historyTab')}</span>
                <span className="font-medium text-ink-900">{reservation.history.length}</span>
              </p>
              {reservation.assigned_staff_id === profile?.id && (
                <p className="rounded-lg bg-brand-50 px-2 py-1 text-[0.68rem] text-brand-800">{t('admin.reservations.staffFilter')}: {t('common.yes')}</p>
              )}
            </div>
          </Panel>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog !== null}
        title={
          dialog === 'confirm'
            ? t('admin.reservations.confirmTitle')
            : dialog === 'reject'
              ? t('admin.reservations.rejectTitle')
              : dialog === 'cancel'
                ? t('admin.reservations.cancelTitle')
                : t('admin.reservations.statusActions')
        }
        description={
          dialog === 'confirm'
            ? t('admin.reservations.confirmText')
            : dialog === 'reject'
              ? t('admin.reservations.rejectText')
              : dialog === 'cancel'
                ? t('admin.reservations.cancelText')
                : undefined
        }
        confirmLabel={t('common.confirm')}
        tone={dialog === 'reject' || dialog === 'cancel' ? 'danger' : 'primary'}
        loading={busy}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          const targetStatus: ReservationStatus =
            dialog === 'confirm' ? 'confirmed' : dialog === 'reject' ? 'rejected' : dialog === 'cancel' ? 'cancelled' : dialog === 'complete' ? 'completed' : dialog === 'no_show' ? 'no_show' : 'pending';
          if (requiresReason(targetStatus) && reason.trim().length < 3) {
            setError(t('admin.reservations.selectReason'));
            return;
          }
          void update({ status: targetStatus, reason: reason.trim() || undefined });
        }}
      >
        <div className="space-y-2">
          <label className="field-label" htmlFor="status-reason">
            {t('admin.reservations.reason')}
          </label>
          <textarea id="status-reason" rows={2} className="field" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('admin.reservations.reasonHint')} />
          <p className="text-[0.65rem] text-ink-400">
            {t('admin.reservations.statusFilter')}: {RESERVATION_STATUS_LABELS[reservation.status]}
          </p>
        </div>
      </ConfirmDialog>

    </div>
  );
}
