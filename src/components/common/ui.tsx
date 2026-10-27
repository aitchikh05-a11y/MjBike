import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, AlertTriangle, Loader2, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utilities/cn';
import { useI18n } from '@/app/providers/I18nProvider';
import { RESERVATION_STATUS_DOT, RESERVATION_STATUS_LABELS } from '@shared/domain/reservations';
import type { ReservationStatus } from '@shared/domain/types';
import { useState } from 'react';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-600', className)} aria-hidden="true" />;
}

export function LoadingBlock({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-ink-500', className)} role="status" aria-live="polite">
      <Spinner className="size-7" />
      <p className="text-sm">{label ?? t('common.loading')}</p>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="skeleton h-48 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
        <div className="skeleton h-9 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center" role="alert">
      <span className="grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink-800">{message ?? t('errors.generic')}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-ink-200 bg-ink-50/50 px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-white text-ink-400 shadow-sm">{icon}</div>}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: ReservationStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-700', className)}>
      <span className={cn('size-1.5 rounded-full', RESERVATION_STATUS_DOT[status])} aria-hidden="true" />
      {t(`admin.status.${status}`) || RESERVATION_STATUS_LABELS[status]}
    </span>
  );
}

export function CustomerStatusBadge({ status }: { status: ReservationStatus }) {
  const { t } = useI18n();
  const styles: Record<ReservationStatus, string> = {
    pending: 'bg-amber-50 text-amber-800 ring-amber-200',
    confirmed: 'bg-brand-50 text-brand-800 ring-brand-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    cancelled: 'bg-ink-100 text-ink-600 ring-ink-200',
    completed: 'bg-sky-50 text-sky-800 ring-sky-200',
    no_show: 'bg-orange-50 text-orange-800 ring-orange-200',
  };
  return <span className={cn('chip ring-1', styles[status])}>{t(`status.${status}`)}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'start',
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'start' | 'center';
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' ? 'items-center text-center' : 'items-start',
        action ? 'sm:flex-row sm:items-end sm:justify-between' : '',
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl lg:text-[2.1rem]">{title}</h2>
        {description && <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    containerRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} tabIndex={-1} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift sm:rounded-2xl',
          sizes[size],
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <h2 id={titleId} className="text-base font-bold text-ink-900">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100" aria-label={t('common.close')}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-ink-100 bg-ink-50/60 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && (
          <span className="text-brand-700" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {!required && <span className="ms-1 text-xs font-normal text-ink-400">({t('common.optional')})</span>}
      </label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-message" id={`${htmlFor}-error`} role="alert">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Photo({
  src,
  alt,
  className,
  imgClassName,
  loading = 'lazy',
  aspect,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
  aspect?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn('grid place-items-center bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700', aspect ?? 'aspect-[4/3]', className)}>
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <div className={cn('overflow-hidden bg-ink-100', aspect, className)}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('size-full object-cover', imgClassName)}
      />
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-xs text-ink-500">
        {t('admin.common.page')} {page} {t('admin.common.of')} {pages}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary !px-3 !py-2" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t('common.previous')}</span>
        </button>
        <button type="button" className="btn-secondary !px-3 !py-2" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <span className="sr-only sm:not-sr-only">{t('common.next')}</span>
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    info: 'bg-sky-50 text-sky-900 ring-sky-200',
    success: 'bg-brand-50 text-brand-900 ring-brand-200',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200',
    error: 'bg-red-50 text-red-900 ring-red-200',
  };
  return (
    <div className={cn('rounded-xl px-4 py-3 text-sm ring-1', tones[tone])} role={tone === 'error' ? 'alert' : 'status'}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && 'mt-1', 'text-[0.8rem] leading-relaxed opacity-90')}>{children}</div>}
    </div>
  );
}
