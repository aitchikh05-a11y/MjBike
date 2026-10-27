import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bike,
  CalendarCheck,
  CalendarDays,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Package,
  Settings,
  ShieldAlert,
  StickyNote,
  Tag,
  TrendingUp,
  Users,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Spinner } from '@/components/common/ui';
import { useAuth } from '@/features/authentication/AuthProvider';
import { ADMIN_NAV, can } from '@shared/domain/permissions';
import { ADMIN_PATHS, buildPath } from '@/app/router/paths';
import { ROLE_LABELS } from '@shared/domain/types';
import { isDemoMode, resetDemoData } from '@/services/backend';
import { useI18n } from '@/app/providers/I18nProvider';
import { cn } from '@/lib/utilities/cn';

const ICONS: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  Tag,
  Bike,
  Package,
  Images,
  MessageSquareQuote,
  StickyNote,
  TrendingUp,
  Settings,
};

export function RequireAuth({ permission, children }: { permission?: Parameters<typeof can>[1]; children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-50">
        <div className="flex flex-col items-center gap-3 text-sm text-ink-500">
          <Spinner className="size-7" />
          {t('admin.loadingSession')}
        </div>
      </div>
    );
  }

  if (!profile) {
    return <NavigateToLogin from={location.pathname} />;
  }

  if (permission && !can(profile.role, permission)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-600">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink-900">{t('admin.notAuthorizedTitle')}</h1>
          <p className="mt-2 text-sm text-ink-500">{t('admin.notAuthorizedText')}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to={ADMIN_PATHS.dashboard} className="btn-primary text-xs">
              {t('admin.nav.dashboard')}
            </Link>
            <Link to={buildPath('home', 'en')} className="btn-secondary text-xs">
              {t('admin.nav.backToSite')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function NavigateToLogin({ from }: { from: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`${ADMIN_PATHS.login}?next=${encodeURIComponent(from)}`, { replace: true });
  }, [navigate, from]);
  return null;
}

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const items = ADMIN_NAV.filter((item) => can(profile?.role, item.permission));

  return (
    <div className="min-h-dvh bg-ink-50/70">
      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 start-0 z-50 w-64 shrink-0 border-e border-ink-100 bg-white transition-transform lg:static lg:z-auto lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0',
          )}
          aria-label={t('admin.nav.menu')}
        >
          <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
            <Logo />
            <button type="button" className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden" onClick={() => setOpen(false)} aria-label={t('common.close')}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="px-3 py-3">
            <p className="px-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-400">{t('admin.brand')}</p>
          </div>
          <nav className="flex flex-col gap-0.5 px-2 pb-4">
            {items.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.82rem] font-medium transition',
                      isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-ink-100 p-3">
            <Link
              to={buildPath('home', 'en')}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-500 hover:bg-ink-50"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {t('admin.nav.backToSite')}
            </Link>
            {profile && (
              <div className="mt-2 rounded-xl bg-ink-50 p-3">
                <p className="truncate text-xs font-semibold text-ink-900">{profile.full_name}</p>
                <p className="truncate text-[0.7rem] text-ink-500">{profile.email}</p>
                <span className="mt-1.5 inline-flex rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100">
                  {ROLE_LABELS[profile.role]}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-600 hover:bg-white"
                >
                  <LogOut className="size-3.5 rtl:rotate-180" aria-hidden="true" />
                  {t('admin.signOut')}
                </button>
              </div>
            )}
          </div>
        </aside>

        {open && <button type="button" className="fixed inset-0 z-40 bg-ink-950/40 lg:hidden" onClick={() => setOpen(false)} aria-label={t('common.close')} />}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-100 bg-white/95 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden" onClick={() => setOpen(true)} aria-label={t('admin.nav.menu')}>
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <p className="text-sm font-semibold text-ink-800">{t('admin.brand')}</p>
            </div>
            <div className="flex items-center gap-3">
              {profile && (
                <div className="hidden text-end sm:block">
                  <p className="text-xs font-semibold text-ink-800">{profile.full_name}</p>
                  <p className="text-[0.7rem] text-ink-500">{ROLE_LABELS[profile.role]}</p>
                </div>
              )}
              {isDemoMode && (
                <button
                  type="button"
                  onClick={() => {
                    resetDemoData();
                    window.location.reload();
                  }}
                  className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-[0.7rem] font-semibold text-amber-800 ring-1 ring-amber-200 sm:inline-flex"
                  title="Reset the local demo database"
                >
                  {t('admin.demoMode')}
                </button>
              )}
            </div>
          </header>

          {isDemoMode && (
            <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[0.72rem] text-amber-900 lg:px-6">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <p>
                <strong>{t('admin.demoMode')}.</strong> {t('admin.dashboard.missingConfig')} Emails are logged, not sent.
              </p>
            </div>
          )}

          <main className="px-4 py-6 lg:px-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
