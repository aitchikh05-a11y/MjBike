import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Field, Spinner } from '@/components/common/ui';
import { useAuth } from '@/features/authentication/AuthProvider';
import { useI18n } from '@/app/providers/I18nProvider';
import { ADMIN_PATHS } from '@/app/router/paths';
import { backend, DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoMode } from '@/services/backend';
import { loginSchema, passwordRequestSchema, passwordUpdateSchema, fieldErrors } from '@shared/schemas';
import { buildPath } from '@/app/router/paths';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh bg-ink-50 lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-brand-950 lg:block">
        <img src="/images/hero-cycling-tangier.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950/85 via-ink-950/70 to-brand-900/80" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Logo variant="light" />
          <div>
            <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight">{t('meta.defaultTitle')}</h2>
            <p className="mt-3 max-w-sm text-sm text-white/70">{t('admin.loginText')}</p>
            <div className="mt-8 flex items-center gap-2 text-xs text-white/50">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Session protected by Supabase Auth + Row Level Security
            </div>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} MJ Bike Tangier</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <div className="card p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">{t('admin.brand')}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
            <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-5 text-center text-xs text-ink-400">
            <Link to={buildPath('home', 'en')} className="hover:text-ink-700">
              {t('admin.nav.backToSite')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminLoginPage() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = params.get('next');
  const target = next && next.startsWith('/admin') ? next : ADMIN_PATHS.dashboard;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(target, { replace: true });
    } catch (caught) {
      setServerError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('admin.loginTitle')} subtitle={t('admin.loginText')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {serverError && (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-800" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {serverError}
          </p>
        )}
        <Field label={t('admin.email')} htmlFor="login-email" required error={errors.email}>
          <div className="relative">
            <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              dir="ltr"
              autoComplete="username"
              className={`field ps-9 ${errors.email ? 'field-error' : ''}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </Field>
        <Field label={t('admin.password')} htmlFor="login-password" required error={errors.password}>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="login-password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              className={`field ps-9 ${errors.password ? 'field-error' : ''}`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </Field>
        <div className="flex justify-end">
          <Link to={ADMIN_PATHS.resetPassword} className="text-xs font-semibold text-brand-700 hover:underline">
            {t('admin.forgot')}
          </Link>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading && <Spinner className="size-4 text-white" />}
          {loading ? t('admin.signingIn') : t('admin.signIn')}
        </button>
      </form>

      {isDemoMode && (
        <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3">
          <p className="text-[0.7rem] font-semibold text-amber-900">{t('admin.demoMode')}</p>
          <p className="mt-1 text-[0.68rem] text-amber-800">
            {t('admin.password')}: <code className="rounded bg-white px-1 py-0.5 font-mono">{DEMO_PASSWORD}</code>
          </p>
          <div className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-start text-[0.7rem] hover:bg-amber-100"
              >
                <span className="truncate">{account.email}</span>
                <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-800">{account.role}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export function AdminResetPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = passwordRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).email ?? t('validation.email'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await backend.requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('admin.resetTitle')} subtitle={t('admin.resetText')}>
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-900">{t('admin.resetSent')}</p>
          <Link to={ADMIN_PATHS.login} className="btn-secondary w-full">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t('admin.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-800">{error}</p>}
          <Field label={t('admin.email')} htmlFor="reset-email" required>
            <input
              id="reset-email"
              type="email"
              dir="ltr"
              className="field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading && <Spinner className="size-4 text-white" />}
            {t('admin.resetSend')}
          </button>
          <Link to={ADMIN_PATHS.login} className="btn-ghost w-full text-xs">
            {t('admin.backToLogin')}
          </Link>
        </form>
      )}
    </AuthShell>
  );
}

export function AdminUpdatePasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase places the recovery token in the URL hash and detects the session itself.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token') && !isDemoMode) {
      // Still allow the form: the user might already have a session.
    }
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = passwordUpdateSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await backend.updatePassword(password);
      setDone(true);
      setTimeout(() => navigate(ADMIN_PATHS.login, { replace: true }), 1500);
    } catch (caught) {
      setErrors({ password: caught instanceof Error ? caught.message : t('errors.generic') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('admin.updatePassword')} subtitle={t('admin.loginText')}>
      {done ? (
        <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-900">{t('admin.passwordUpdated')}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label={t('admin.newPassword')} htmlFor="new-password" required error={errors.password}>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                id="new-password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                className="field ps-9"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </Field>
          <Field label={t('admin.confirmPassword')} htmlFor="confirm-password" required error={errors.confirm}>
            <input
              id="confirm-password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              className="field"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading && <Spinner className="size-4 text-white" />}
            {t('admin.updatePassword')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
