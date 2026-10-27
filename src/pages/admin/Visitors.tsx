import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Eye, MousePointerClick, UserCheck, Users } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, Panel, StatCard } from '@/components/admin/widgets';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { ADMIN_PATHS } from '@/app/router/paths';
import { addDaysISO, todayISO } from '@shared/domain/availability';
import { cn } from '@/lib/utilities/cn';

const COLORS = ['#12b265', '#039b52', '#3fc97f', '#74dda3', '#a9ecc5', '#007c44'];

export function AdminVisitorsPage() {
  const { locale, t, date, number } = useI18n();
  const today = todayISO();
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const from = addDaysISO(today, -(Number(range) - 1));

  const analytics = useAsync(() => backend.getAnalyticsSummary(from, today), [from, today]);
  const customers = useAsync(() => backend.listIdentifiedCustomers(), []);

  const data = analytics.data;
  const tooltipStyle = { borderRadius: 12, border: '1px solid #ebedec', fontSize: 12 };

  return (
    <div>
      <AdminPageHeader
        title={t('admin.visitors.title')}
        subtitle={t('admin.visitors.subtitle')}
        actions={
          <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink-100">
            {(['7', '30', '90'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', range === value ? 'bg-brand-600 text-white' : 'text-ink-500')}
              >
                {value}d
              </button>
            ))}
          </div>
        }
      />

      {analytics.loading && <AdminLoading />}
      {analytics.error && <AdminError message={analytics.error} onRetry={analytics.reload} />}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('admin.visitors.uniqueVisitors')} value={number(data.visitors)} icon={<Users className="size-4" />} />
            <StatCard label={t('admin.visitors.pageViews')} value={number(data.pageViews)} icon={<Eye className="size-4" />} />
            <StatCard label={t('admin.visitors.conversions')} value={number(data.reservationRequests)} icon={<MousePointerClick className="size-4" />} />
            <StatCard label={t('admin.visitors.conversionRate')} value={`${data.conversionRate}%`} tone="brand" icon={<UserCheck className="size-4" />} />
          </div>

          <Panel title={t('admin.visitors.trend')}>
            {data.trend.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-400">{t('admin.visitors.noData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#12b265" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#12b265" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ebedec" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value: string) => value.slice(5)} stroke="#adb6b1" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#adb6b1" width={32} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => date(String(value))} />
                    <Area type="monotone" dataKey="visitors" name={t('admin.visitors.uniqueVisitors')} stroke="#12b265" fill="url(#visitorsGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="pageViews" name={t('admin.visitors.pageViews')} stroke="#0ea5e9" fill="transparent" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={t('admin.visitors.topPages')}>
              {data.topPages.length === 0 ? (
                <p className="text-xs text-ink-400">{t('admin.visitors.noData')}</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.visitors.path')}</th>
                      <th className="text-end">{t('admin.visitors.views')}</th>
                      <th className="text-end">{t('admin.visitors.visitorsCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((page) => (
                      <tr key={page.path}>
                        <td className="max-w-[16rem] truncate text-xs" dir="ltr">
                          {page.path}
                        </td>
                        <td className="text-end text-xs">{number(page.views)}</td>
                        <td className="text-end text-xs">{number(page.visitors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title={t('admin.visitors.referrers')}>
              {data.referrers.length === 0 ? (
                <p className="text-xs text-ink-400">{t('admin.visitors.noData')}</p>
              ) : (
                <ul className="space-y-2">
                  {data.referrers.slice(0, 8).map((referrer) => (
                    <li key={referrer.source} className="flex items-center gap-2 text-xs">
                      <span className="w-28 shrink-0 truncate text-ink-600" dir="ltr">
                        {referrer.source}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(referrer.share, 2)}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-end tabular-nums text-ink-500">{referrer.share}%</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-ink-100 pt-2 text-[0.65rem] text-ink-400">{t('admin.visitors.direct')}: {data.referrers.find((referrer) => !referrer.source)?.visits ?? 0}</p>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title={t('admin.visitors.devices')}>
              {data.devices.length === 0 ? (
                <p className="text-xs text-ink-400">{t('admin.visitors.noData')}</p>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.devices} dataKey="visits" nameKey="device" innerRadius={35} outerRadius={65} paddingAngle={2}>
                        {data.devices.map((entry, index) => (
                          <Cell key={entry.device} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-2 space-y-1 text-[0.68rem] text-ink-600">
                {data.devices.map((device) => (
                  <li key={device.device} className="flex justify-between">
                    <span className="capitalize">{device.device}</span>
                    <span>
                      {device.visits} ({device.share}%)
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title={t('admin.visitors.browsers')}>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.browsers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ebedec" vertical={false} />
                    <XAxis dataKey="browser" tick={{ fontSize: 9 }} stroke="#adb6b1" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#adb6b1" width={26} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="visits" fill="#3fc97f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title={t('admin.visitors.campaigns')}>
              {data.campaigns.length === 0 ? (
                <p className="text-xs text-ink-400">{t('admin.visitors.noData')}</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-ink-600">
                  {data.campaigns.map((campaign) => (
                    <li key={campaign.campaign} className="flex justify-between">
                      <span>{campaign.campaign}</span>
                      <span className="tabular-nums">{campaign.visits}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-ink-100 pt-2 text-[0.65rem] text-ink-400">{t('admin.visitors.retentionText')}</p>
            </Panel>
          </div>

          <Panel title={t('admin.visitors.identifiedCustomers')}>
            <p className="mb-3 rounded-xl bg-ink-50 px-3 py-2 text-[0.7rem] text-ink-600">{t('admin.visitors.anonymousNote')}</p>
            {customers.data && customers.data.length === 0 ? (
              <p className="text-xs text-ink-400">{t('admin.customers.empty')}</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.customers.detailTitle')}</th>
                    <th>{t('common.email')}</th>
                    <th>{t('admin.customers.bookings')}</th>
                    <th>{t('admin.customers.lastBooking')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(customers.data ?? []).slice(0, 8).map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <Link to={ADMIN_PATHS.customer(customer.id)} className="text-xs font-semibold text-brand-700 hover:underline">
                          {customer.full_name}
                        </Link>
                      </td>
                      <td className="text-xs" dir="ltr">
                        {customer.email}
                      </td>
                      <td className="text-xs">{customer.reservations_count ?? 0}</td>
                      <td className="text-xs">{customer.last_booking_at ? date(customer.last_booking_at.slice(0, 10)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-3 flex items-center justify-between text-[0.65rem] text-ink-400">
              <span>
                {t('admin.visitors.rangeHint')}: {date(from)} → {date(today)}
              </span>
              <Link to={ADMIN_PATHS.customers} className="font-semibold text-brand-700 hover:underline">
                {t('admin.visitors.viewCustomers')} →
              </Link>
            </div>
          </Panel>

          <p className="text-[0.68rem] text-ink-400">
            {t('admin.visitors.exportNote')} · {locale.toUpperCase()}
          </p>
        </div>
      )}
    </div>
  );
}
