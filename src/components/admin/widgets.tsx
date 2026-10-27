import { useEffect, useId, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utilities/cn';
import { useI18n } from '@/app/providers/I18nProvider';
import { LOCALES, type Locale } from '@shared/domain/types';
import { LOCALE_LABELS } from '@shared/domain/types';

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'brand' | 'warning' | 'danger';
  trend?: number;
}) {
  const tones = {
    default: 'bg-white text-ink-900',
    brand: 'bg-brand-600 text-white',
    warning: 'bg-amber-50 text-amber-900',
    danger: 'bg-red-50 text-red-900',
  };
  return (
    <div className={cn('card p-4', tones[tone] === 'bg-white text-ink-900' ? '' : tones[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-[0.7rem] font-semibold uppercase tracking-wide', tone === 'brand' ? 'text-brand-100' : 'text-ink-500')}>{label}</p>
        {icon && <span className={cn('shrink-0', tone === 'brand' ? 'text-brand-100' : 'text-ink-400')}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {typeof trend === 'number' && (
          <span className={cn('inline-flex items-center gap-0.5 text-[0.68rem] font-semibold', trend >= 0 ? 'text-brand-600' : 'text-red-600')}>
            {trend >= 0 ? <ArrowUpRight className="size-3" aria-hidden="true" /> : <ArrowDownRight className="size-3" aria-hidden="true" />}
            {Math.abs(trend)}%
          </span>
        )}
        {hint && <p className={cn('text-[0.68rem]', tone === 'brand' ? 'text-brand-100' : 'text-ink-400')}>{hint}</p>}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          {title && <h2 className="text-sm font-bold text-ink-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card mb-4 flex flex-wrap items-end gap-3 p-3', className)}>{children}</div>;
}

export function TextFilter({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'search';
}) {
  const id = useId();
  return (
    <div className="min-w-[9rem] flex-1">
      <label htmlFor={id} className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="field !py-2 text-xs"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className="min-w-[9rem]">
      <label htmlFor={id} className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </label>
      <select id={id} className="field !py-2 text-xs" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdminLoading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-500" role="status">
      <Loader2 className="size-5 animate-spin text-brand-600" aria-hidden="true" />
      {label ?? t('admin.common.loading')}
    </div>
  );
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-800" role="alert">
      <AlertTriangle className="size-5" aria-hidden="true" />
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-1 text-xs">
          {t('admin.common.retry')}
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lift">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-ink-500">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={onClose} disabled={loading}>
            {t('admin.common.cancel')}
          </button>
          <button
            type="button"
            className={cn('btn text-xs text-white', tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700')}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tabs for editing EN / FR / AR content in the admin forms. */
export function LocaleTabs({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) {
  return (
    <div className="mb-3 flex gap-1 rounded-full bg-ink-100 p-1" role="tablist" aria-label="Content language">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          role="tab"
          aria-selected={value === locale}
          onClick={() => onChange(locale)}
          className={cn(
            'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition',
            value === locale ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {LOCALE_LABELS[locale].native}
        </button>
      ))}
    </div>
  );
}

export function Collapse({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-ink-200">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-xs font-semibold text-ink-800" aria-expanded={open}>
        {title}
        <ChevronDown className={cn('size-4 text-ink-400 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <div className="border-t border-ink-100 p-3">{children}</div>}
    </div>
  );
}
