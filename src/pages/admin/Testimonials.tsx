import { useState } from 'react';
import { Edit, Plus, Star, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, ConfirmDialog, LocaleTabs, Panel } from '@/components/admin/widgets';
import { Field, Modal, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import { LOCALES, type Locale, type Testimonial } from '@shared/domain/types';
import type { TestimonialDraft } from '@/services/backend/types';
import { cn } from '@/lib/utilities/cn';

const emptyLocalised = () => Object.fromEntries(LOCALES.map((locale) => [locale, ''])) as Record<Locale, string>;

const toDraft = (testimonial: Testimonial | null): TestimonialDraft =>
  testimonial
    ? { ...testimonial }
    : {
        customer_name: '',
        customer_country: null,
        rating: 5,
        quote: emptyLocalised(),
        service_label: emptyLocalised(),
        is_published: false,
        sort_order: 0,
      };

export function AdminTestimonialsPage() {
  const { locale, t } = useI18n();
  const testimonials = useAsync(() => backend.listTestimonials(), []);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);

  return (
    <div>
      <AdminPageHeader
        title={t('admin.testimonials.title')}
        subtitle={t('admin.testimonials.subtitle')}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t('admin.testimonials.create')}
          </button>
        }
      />

      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[0.72rem] text-amber-900">{t('admin.testimonials.consentWarning')}</p>

      {testimonials.loading && <AdminLoading />}
      {testimonials.error && <AdminError message={testimonials.error} onRetry={testimonials.reload} />}

      {testimonials.data && testimonials.data.length === 0 && (
        <div className="card px-4 py-12 text-center text-sm text-ink-500">{t('admin.testimonials.empty')}</div>
      )}

      {testimonials.data && testimonials.data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {testimonials.data.map((testimonial) => (
            <article key={testimonial.id} className="card space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-900">{testimonial.customer_name}</p>
                  <p className="text-[0.68rem] text-ink-500">
                    {testimonial.customer_country ?? '—'} · {testimonial.service_label[locale] || testimonial.service_label.en}
                  </p>
                </div>
                <span className={cn('chip text-[0.6rem]', testimonial.is_published ? 'bg-brand-50 text-brand-800' : 'bg-ink-100 text-ink-500')}>
                  {testimonial.is_published ? t('admin.testimonials.published') : t('admin.offers.draft')}
                </span>
              </div>
              {testimonial.rating && (
                <div className="flex gap-0.5" aria-label={`${testimonial.rating}/5`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className={cn('size-3.5', index < (testimonial.rating ?? 0) ? 'fill-brand-500 text-brand-500' : 'text-ink-200')} aria-hidden="true" />
                  ))}
                </div>
              )}
              <p className="line-clamp-3 text-xs text-ink-600">{testimonial.quote[locale] || testimonial.quote.en}</p>
              <div className="flex gap-1.5">
                <button type="button" className="btn-secondary !px-2 !py-1 text-[0.65rem]" onClick={() => setEditing(testimonial)}>
                  <Edit className="size-3" aria-hidden="true" />
                  {t('admin.common.edit')}
                </button>
                <button
                  type="button"
                  className="btn-secondary !px-2 !py-1 text-[0.65rem]"
                  onClick={() => void backend.saveTestimonial({ ...testimonial, is_published: !testimonial.is_published }).then(() => testimonials.reload())}
                >
                  {testimonial.is_published ? t('admin.offers.unpublish') : t('admin.offers.publish')}
                </button>
                <button type="button" className="ms-auto rounded p-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(testimonial)} aria-label={t('admin.common.delete')}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <TestimonialEditor
          testimonial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            testimonials.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.common.confirmDelete')}
        confirmLabel={t('admin.common.delete')}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void backend.deleteTestimonial(deleteTarget.id).then(() => {
            setDeleteTarget(null);
            testimonials.reload();
          });
        }}
      />
    </div>
  );
}

function TestimonialEditor({ testimonial, onClose, onSaved }: { testimonial: Testimonial | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<TestimonialDraft>(() => toDraft(testimonial));
  const [tab, setTab] = useState<Locale>('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await backend.saveTestimonial(draft);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={testimonial ? t('admin.testimonials.edit') : t('admin.testimonials.create')}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            {t('admin.common.cancel')}
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => void save()} disabled={saving}>
            {saving && <Spinner className="size-3.5 text-white" />}
            {t('admin.common.save')}
          </button>
        </div>
      }
    >
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.testimonials.name')} htmlFor="testimonial-name" required>
            <input id="testimonial-name" className="field" value={draft.customer_name} onChange={(event) => setDraft({ ...draft, customer_name: event.target.value })} />
          </Field>
          <Field label={t('admin.testimonials.country')} htmlFor="testimonial-country">
            <input id="testimonial-country" className="field" value={draft.customer_country ?? ''} onChange={(event) => setDraft({ ...draft, customer_country: event.target.value || null })} />
          </Field>
          <Field label={t('admin.testimonials.rating')} htmlFor="testimonial-rating">
            <select id="testimonial-rating" className="field" value={draft.rating ?? ''} onChange={(event) => setDraft({ ...draft, rating: event.target.value ? Number(event.target.value) : null })}>
              <option value="">—</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} ★
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.gallery.sort')} htmlFor="testimonial-sort">
            <input id="testimonial-sort" type="number" min={0} className="field" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} />
          </Field>
        </div>

        <div className="mt-4">
          <LocaleTabs value={tab} onChange={setTab} />
          <Field label={t('admin.testimonials.quote')} htmlFor={`testimonial-quote-${tab}`} required>
            <textarea
              id={`testimonial-quote-${tab}`}
              rows={3}
              className="field"
              value={draft.quote[tab] ?? ''}
              onChange={(event) => setDraft({ ...draft, quote: { ...draft.quote, [tab]: event.target.value } })}
            />
          </Field>
          <div className="mt-3">
            <Field label={t('admin.testimonials.service')} htmlFor={`testimonial-service-${tab}`}>
              <input
                id={`testimonial-service-${tab}`}
                className="field"
                value={draft.service_label[tab] ?? ''}
                onChange={(event) => setDraft({ ...draft, service_label: { ...draft.service_label, [tab]: event.target.value } })}
              />
            </Field>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-1.5 text-xs">
          <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} />
          {t('admin.testimonials.published')}
        </label>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      </Panel>
    </Modal>
  );
}
