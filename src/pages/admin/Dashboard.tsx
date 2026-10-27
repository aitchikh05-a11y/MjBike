import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Clock,
  Eye,
  Plus,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, Panel, StatCard } from '@/components/admin/widgets';
import { StatusBadge } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/authentication/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { ADMIN_PATHS } from '@/app/router/paths';
import { addDaysISO, todayISO } from '@shared/domain/availability';
import { price } from '@/lib/utilities/localized';
import { cn } from '@/lib/utilities/cn';
import type { ReservationStatus } from '@shared/domain/types';

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#12b265',
  rejected: '#ef4444',
  cancelled: '#9ca3af',
  completed: '#0ea5e9',
  no_show: '#f97316',
};

export function AdminDashboardPage() {
  const { locale, t, date, number } = useI18n();
  const { profile, allowed } = useAuth();
  const today = todayISO();
  const [range, setRange] = useState<'today' | '7' | '30' | '90' | 'custom'>('30');
  const [from, setFrom] = useState(addDaysISO(today, -29));
  const [to, setTo] = useState(today);

  const applyRange = (next: typeof range) => {
    setRange(next);
    if (next === 'today') {
      setFrom(today);
      setTo(today);
    } else if (next === 'custom') {
      /* keep current inputs */
    } else {
      setFrom(addDaysISO(today, -(Number(next) - 1)));
      setTo(today);
    }
  };

  const metrics = useAsync(() => backend.getDashboardMetrics(from, to), [from, to]);
  const analytics = useAsync(
    () => (allowed('analytics:view') ? backend.getAnalyticsSummary(from, to) : Promise.resolve(null)),
    [from, to, allowed],
  );

  const tooltipStyle = useMemo(
    () => ({ borderRadius: 12, border: '1px solid #ebedec', fontSize: 12, boxShadow: '0 8px 24px -12px rgba(0,0,0,0.2)' }),
    [],
  );

  const rangeButtons: { key: typeof range; label: string }[] = [
    { key: 'today', label: t('admin.dashboard.rangeToday') },
    { key: '7', label: t('admin.dashboard.range7') },
    { key: '30', label: t('admin.dashboard.range30') },
    { key: '90', label: t('admin.dashboard.range90') },
    { key: 'custom', label: t('admin.dashboard.rangeCustom') },
  ];

  return (
    <div>
      <AdminPageHeader
        title={t('admin.dashboard.title')}
        subtitle={`${t('admin.dashboard.welcome')}${profile ? `, ${profile.full_name}` : ''} · ${date(from)} → ${date(to)}`}
        actions={
          <>
            <Link to={ADMIN_PATHS.calendar} className="btn-secondary text-xs">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {t('admin.dashboard.openCalendar')}
            </Link>
            <Link to={ADMIN_PATHS.reservations} className="btn-primary text-xs">
              <Plus className="size-3.5" aria-hidden="true" />
              {t('admin.dashboard.newReservation')}
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink-100">
          {rangeButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => applyRange(button.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                range === button.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {button.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex items-end gap-2">
            <label className="text-[0.7rem] font-semibold uppercase text-ink-500">
              {t('admin.dashboard.from')}
              <input type="date" className="field mt-1 !py-1.5 text-xs" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="text-[0.7rem] font-semibold uppercase text-ink-500">
              {t('admin.dashboard.to')}
              <input type="date" className="field mt-1 !py-1.5 text-xs" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} />
            </label>
          </div>
        )}
      </div>

      {metrics.loading && !metrics.data && <AdminLoading />}
      {metrics.error && <AdminError message={metrics.error} onRetry={metrics.reload} />}

      {metrics.data && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('admin.dashboard.todayReservations')} value={number(metrics.data.todayReservations)} icon={<CalendarCheck className="size-4" />} />
            <StatCard label={t('admin.dashboard.pending')} value={number(metrics.data.pending)} icon={<Clock className="size-4" />} tone="warning" hint={t('admin.dashboard.dataNote')} />
            <StatCard label={t('admin.dashboard.confirmed')} value={number(metrics.data.confirmed)} icon={<CalendarClock className="size-4" />} />
            <StatCard label={t('admin.dashboard.upcomingTours')} value={number(metrics.data.upcomingTours)} icon={<TrendingUp className="size-4" />} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('admin.dashboard.totalPeriod')} value={number(metrics.data.totalPeriod)} icon={<CalendarDays className="size-4" />} />
            <StatCard label={t('admin.dashboard.cancelled')} value={number(metrics.data.cancelled)} tone="danger" icon={<Clock className="size-4" />} />
            <StatCard
              label={t('admin.dashboard.revenue')}
              value={price(metrics.data.confirmedRevenue, locale)}
              hint={`${t('admin.dashboard.estimated')}: ${price(metrics.data.estimatedValue, locale)}`}
              tone="brand"
              icon={<CircleDollarSign className="size-4" />}
            />
            <StatCard label={t('admin.dashboard.publishedOffers')} value={number(metrics.data.publishedOffers)} icon={<Tag className="size-4" />} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Panel title={t('admin.dashboard.reservationsChart')}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.data.series}>
                    <defs>
                      <linearGradient id="reservationsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#12b265" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#12b265" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ebedec" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value: string) => value.slice(5)} stroke="#adb6b1" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#adb6b1" width={28} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => date(String(value))} />
                    <Area type="monotone" dataKey="reservations" name={t('admin.dashboard.totalPeriod')} stroke="#12b265" strokeWidth={2} fill="url(#reservationsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title={t('admin.dashboard.byStatus')}>
              {metrics.data.byStatus.length === 0 ? (
                <p className="py-10 text-center text-xs text-ink-400">{t('admin.dashboard.noRecent')}</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={metrics.data.byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {metrics.data.byStatus.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                        ))}
                      </Pie>
                      <Legend formatter={(value) => t(`admin.status.${value}`)} wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [String(value), t('admin.dashboard.totalPeriod')]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={t('admin.dashboard.revenueChart')}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.data.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ebedec" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value: string) => value.slice(5)} stroke="#adb6b1" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#adb6b1" width={40} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => date(String(value))} formatter={(value) => [price(Number(value), locale), t('admin.dashboard.revenue')]} />
                    <Bar dataKey="revenue" fill="#007c44" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title={t('admin.dashboard.byService')}>
              {metrics.data.byService.length === 0 ? (
                <p className="py-10 text-center text-xs text-ink-400">{t('admin.dashboard.noRecent')}</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.data.byService} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ebedec" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} stroke="#adb6b1" />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} stroke="#adb6b1" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#3fc97f" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel
              title={t('admin.dashboard.recent')}
              action={
                <Link to={ADMIN_PATHS.reservations} className="text-xs font-semibold text-brand-700 hover:underline">
                  {t('admin.dashboard.viewAll')} →
                </Link>
              }
            >
              {metrics.data.recent.length === 0 ? (
                <p className="py-8 text-center text-xs text-ink-400">{t('admin.dashboard.noRecent')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{t('admin.reservations.reference')}</th>
                        <th>{t('admin.reservations.customer')}</th>
                        <th>{t('admin.reservations.ride')}</th>
                        <th>{t('admin.reservations.status')}</th>
                        <th className="text-end">{t('admin.reservations.total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.data.recent.map((reservation) => (
                        <tr key={reservation.id}>
                          <td>
                            <Link to={ADMIN_PATHS.reservation(reservation.id)} className="font-mono text-xs font-semibold text-brand-700 hover:underline" dir="ltr">
                              {reservation.reference}
                            </Link>
                          </td>
                          <td className="max-w-[10rem] truncate">{reservation.full_name}</td>
                          <td className="whitespace-nowrap text-xs">
                            {date(reservation.reservation_date)} · {reservation.start_time}
                          </td>
                          <td>
                            <StatusBadge status={reservation.status} />
                          </td>
                          <td className="whitespace-nowrap text-end text-xs font-semibold">{price(reservation.total_price, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <div className="space-y-4">
              {allowed('analytics:view') && (
                <Panel title={t('admin.dashboard.trafficChart')}>
                  {analytics.loading && <AdminLoading />}
                  {analytics.data && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-ink-50 p-3">
                          <p className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase text-ink-500">
                            <Users className="size-3" aria-hidden="true" />
                            {t('admin.dashboard.visitors')}
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-ink-900">{number(analytics.data.visitors)}</p>
                        </div>
                        <div className="rounded-xl bg-ink-50 p-3">
                          <p className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase text-ink-500">
                            <Eye className="size-3" aria-hidden="true" />
                            {t('admin.dashboard.pageViews')}
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-ink-900">{number(analytics.data.pageViews)}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.data.trend}>
                            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(value: string) => value.slice(5)} stroke="#adb6b1" />
                            <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => date(String(value))} />
                            <Area type="monotone" dataKey="visitors" stroke="#039b52" fill="#d3f6e1" strokeWidth={1.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2 text-xs text-ink-500">
                        <span>
                          {t('admin.dashboard.conversion')}: <strong className="text-ink-900">{analytics.data.conversionRate}%</strong>
                        </span>
                        <Link to={ADMIN_PATHS.visitors} className="font-semibold text-brand-700 hover:underline">
                          {t('admin.nav.visitors')} →
                        </Link>
                      </div>
                    </>
                  )}
                  {!analytics.loading && !analytics.data && <p className="text-xs text-ink-400">{t('admin.dashboard.analyticsDisabled')}</p>}
                </Panel>
              )}

              <Panel title={t('admin.dashboard.quickActions')}>
                <div className="grid gap-2">
                  <Link to={ADMIN_PATHS.reservations} className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-xs font-semibold text-ink-800 hover:bg-ink-100">
                    <CalendarCheck className="size-4 text-brand-600" aria-hidden="true" />
                    {t('admin.reservations.newManual')}
                  </Link>
                  {allowed('offers:manage') && (
                    <Link to={`${ADMIN_PATHS.offers}?new=1`} className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-xs font-semibold text-ink-800 hover:bg-ink-100">
                      <Tag className="size-4 text-brand-600" aria-hidden="true" />
                      {t('admin.dashboard.newOffer')}
                    </Link>
                  )}
                  <Link to={ADMIN_PATHS.calendar} className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-xs font-semibold text-ink-800 hover:bg-ink-100">
                    <CalendarDays className="size-4 text-brand-600" aria-hidden="true" />
                    {t('admin.dashboard.openCalendar')}
                  </Link>
                </div>
                <p className="mt-3 text-[0.68rem] leading-relaxed text-ink-400">{t('admin.dashboard.dataNote')}</p>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
