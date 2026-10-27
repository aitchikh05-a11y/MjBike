import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Archive, Edit, ExternalLink, Plus, Star, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, ConfirmDialog, LocaleTabs, Panel, SelectFilter, TextFilter } from '@/components/admin/widgets';
import { Field, Modal, Photo, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import type { OfferDraft } from '@/services/backend/types';
import { discountPercent } from '@shared/domain/pricing';
import { LOCALES, type Locale, type Offer, type OfferStatus } from '@shared/domain/types';
import { buildPath } from '@/app/router/paths';
import { cn } from '@/lib/utilities/cn';

const emptyTranslations = () =>
  LOCALES.map((locale) => ({ locale, title: '', short_description: '', description: '', included: [] as string[] }));

const toDraft = (offer: Offer | null): OfferDraft =>
  offer
    ? {
        ...offer,
        translations: LOCALES.map(
          (locale) =>
            offer.translations.find((entry) => entry.locale === locale) ?? {
              locale,
              title: '',
              short_description: '',
              description: '',
              included: [],
            },
        ),
      }
    : {
        slug: '',
        service_id: null,
        image_url: '',
        price: 0,
        compare_at_price: null,
        duration_hours: 3,
        validity_start: new Date().toISOString().slice(0, 10),
        validity_end: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
        capacity: null,
        status: 'draft',
        is_featured: false,
        sort_order: 0,
        translations: emptyTranslations(),
      };

export function AdminOffersPage() {
  const { t, locale, date, number } = useI18n();
  const [params, setParams] = useSearchParams();
  const offers = useAsync(() => backend.listOffers(), []);
  const services = useAsync(() => backend.listServices(), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Deep link from the dashboard: /admin/offers?new=1
  useEffect(() => {
    if (params.get('new') === '1') {
      setCreating(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    let list = offers.data ?? [];
    if (status) list = list.filter((offer) => offer.status === status);
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (offer) =>
          offer.slug.toLowerCase().includes(term) ||
          offer.translations.some((translation) => translation.title.toLowerCase().includes(term)),
      );
    }
    return list;
  }, [offers.data, status, search]);

  const changeStatus = async (offer: Offer, next: OfferStatus) => {
    setBusyId(offer.id);
    try {
      await backend.setOfferStatus(offer.id, next);
      offers.reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title={t('admin.offers.title')}
        subtitle={t('admin.offers.subtitle')}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t('admin.offers.create')}
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <TextFilter label={t('admin.common.search')} value={search} onChange={setSearch} placeholder={t('admin.common.searchPlaceholder')} />
        <SelectFilter
          label={t('admin.reservations.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: t('admin.common.all') },
            { value: 'published', label: t('admin.offers.published') },
            { value: 'draft', label: t('admin.offers.draft') },
            { value: 'archived', label: t('admin.offers.archived') },
          ]}
        />
        <p className="ms-auto pb-2 text-[0.7rem] text-ink-400">
          {filtered.length} / {offers.data?.length ?? 0}
        </p>
      </div>

      {offers.loading && <AdminLoading />}
      {offers.error && <AdminError message={offers.error} onRetry={offers.reload} />}

      {offers.data && filtered.length === 0 && <p className="card px-4 py-10 text-center text-sm text-ink-500">{t('admin.offers.empty')}</p>}

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((offer) => {
          const translation = offer.translations.find((entry) => entry.locale === locale) ?? offer.translations.find((entry) => entry.locale === 'en');
          const service = services.data?.find((entry) => entry.id === offer.service_id);
          const discount = discountPercent(offer.price, offer.compare_at_price);
          return (
            <article key={offer.id} className="card flex flex-col overflow-hidden">
              <div className="flex gap-3 p-3">
                <Photo src={offer.image_url} alt="" className="size-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-sm font-bold text-ink-900">{translation?.title || offer.slug}</h2>
                    <span
                      className={cn(
                        'chip shrink-0 text-[0.6rem]',
                        offer.status === 'published' && 'bg-brand-50 text-brand-800',
                        offer.status === 'draft' && 'bg-amber-50 text-amber-800',
                        offer.status === 'archived' && 'bg-ink-100 text-ink-500',
                      )}
                    >
                      {t(`admin.offers.${offer.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[0.7rem] text-ink-500">{translation?.short_description}</p>
                  <p className="mt-1.5 flex items-baseline gap-1.5 text-xs">
                    <span className="font-bold text-ink-900">{number(offer.price)} MAD</span>
                    {offer.compare_at_price && <span className="text-ink-400 line-through">{number(offer.compare_at_price)}</span>}
                    {discount && <span className="chip bg-brand-50 text-[0.6rem] text-brand-800">-{discount}%</span>}
                  </p>
                </div>
              </div>
              <p className="px-3 text-[0.65rem] text-ink-400">
                {service ? service.translations.find((entry) => entry.locale === locale)?.name : t('admin.offers.noService')} ·{' '}
                {date(offer.validity_start)} → {date(offer.validity_end)}
              </p>
              <div className="mt-2 flex items-center gap-1 border-t border-ink-100 px-3 py-2">
                <button type="button" className="btn-secondary !px-2 !py-1 text-[0.65rem]" onClick={() => setEditing(offer)}>
                  <Edit className="size-3" aria-hidden="true" />
                  {t('common.edit')}
                </button>
                {offer.status !== 'published' ? (
                  <button
                    type="button"
                    className="btn-secondary !px-2 !py-1 text-[0.65rem]"
                    disabled={busyId === offer.id}
                    onClick={() => void changeStatus(offer, 'published')}
                  >
                    {t('admin.offers.publish')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary !px-2 !py-1 text-[0.65rem]"
                    disabled={busyId === offer.id}
                    onClick={() => void changeStatus(offer, 'draft')}
                  >
                    {t('admin.offers.unpublish')}
                  </button>
                )}
                <button
                  type="button"
                  className="rounded p-1 text-ink-500 hover:bg-ink-100"
                  aria-label={t('admin.offers.archive')}
                  onClick={() => void changeStatus(offer, 'archived')}
                >
                  <Archive className="size-3.5" aria-hidden="true" />
                </button>
                <Link
                  to={buildPath('offers', locale)}
                  className="rounded p-1 text-ink-500 hover:bg-ink-100"
                  aria-label={t('admin.offers.previewPublic')}
                  target="_blank"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  className="ms-auto rounded p-1 text-red-600 hover:bg-red-50"
                  aria-label={t('common.delete')}
                  onClick={() => setDeleteTarget(offer)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {(editing || creating) && (
        <OfferEditor
          offer={editing}
          services={services.data ?? []}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            offers.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.common.confirmDelete')}
        description={t('admin.offers.deleteConfirm')}
        confirmLabel={t('common.delete')}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void backend.deleteOffer(deleteTarget.id).then(() => {
            setDeleteTarget(null);
            offers.reload();
          });
        }}
      />
    </div>
  );
}

function OfferEditor({
  offer,
  services,
  onClose,
  onSaved,
}: {
  offer: Offer | null;
  services: { id: string; translations: { locale: Locale; name: string }[] }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<OfferDraft>(() => toDraft(offer));
  const [tab, setTab] = useState<Locale>('en');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const translation = draft.translations.find((entry) => entry.locale === tab) ?? draft.translations[0]!;

  const updateTranslation = (patch: Partial<typeof translation>) => {
    setDraft({
      ...draft,
      translations: draft.translations.map((entry) => (entry.locale === tab ? { ...entry, ...patch } : entry)),
    });
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await backend.uploadMedia(file);
      setDraft((current) => ({ ...current, image_url: url }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await backend.saveOffer(draft);
      onSaved();
    } catch (caught) {
      const error = caught as { message?: string; fields?: Record<string, string> };
      setError(error.message ?? t('errors.generic'));
      setFieldErrors(error.fields ?? {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={offer ? t('admin.offers.edit') : t('admin.offers.create')}
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => void save()} disabled={saving}>
            {saving && <Spinner className="size-3.5 text-white" />}
            {t('common.save')}
          </button>
        </div>
      }
    >
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div>
          <LocaleTabs value={tab} onChange={setTab} />
          <div className="space-y-3">
            <Field label={t('admin.offers.titleLabel')} htmlFor={`offer-title-${tab}`} error={fieldErrors[`translations.${tab}.title`]} required>
              <input id={`offer-title-${tab}`} className="field" value={translation.title} onChange={(event) => updateTranslation({ title: event.target.value })} />
            </Field>
            <Field label={t('admin.offers.shortDescription')} htmlFor={`offer-short-${tab}`} error={fieldErrors[`translations.${tab}.short_description`]} required>
              <input
                id={`offer-short-${tab}`}
                className="field"
                maxLength={240}
                value={translation.short_description}
                onChange={(event) => updateTranslation({ short_description: event.target.value })}
              />
            </Field>
            <Field label={t('admin.offers.description')} htmlFor={`offer-description-${tab}`} error={fieldErrors[`translations.${tab}.description`]} required>
              <textarea
                id={`offer-description-${tab}`}
                rows={6}
                className="field"
                value={translation.description}
                onChange={(event) => updateTranslation({ description: event.target.value })}
              />
            </Field>
            <Field label={t('admin.offers.included')} htmlFor={`offer-included-${tab}`} hint={t('admin.offers.includedHint')}>
              <textarea
                id={`offer-included-${tab}`}
                rows={4}
                className="field"
                value={translation.included.join('\n')}
                onChange={(event) =>
                  updateTranslation({
                    included: event.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .slice(0, 10),
                  })
                }
              />
            </Field>
          </div>
        </div>

        <div className="space-y-3">
          <Panel title={t('admin.offers.pricing')}>
            <div className="space-y-3">
              <Field label={t('admin.offers.price')} htmlFor="offer-price" error={fieldErrors.price} required>
                <input
                  id="offer-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className="field"
                  value={draft.price}
                  onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })}
                />
              </Field>
              <Field label={t('admin.offers.comparePrice')} htmlFor="offer-compare">
                <input
                  id="offer-compare"
                  type="number"
                  min={0}
                  step="0.01"
                  className="field"
                  value={draft.compare_at_price ?? ''}
                  onChange={(event) => setDraft({ ...draft, compare_at_price: event.target.value ? Number(event.target.value) : null })}
                />
              </Field>
              <Field label={t('admin.offers.duration')} htmlFor="offer-duration" required>
                <input
                  id="offer-duration"
                  type="number"
                  min={0.5}
                  step="0.5"
                  className="field"
                  value={draft.duration_hours}
                  onChange={(event) => setDraft({ ...draft, duration_hours: Number(event.target.value) })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('admin.offers.validFrom')} htmlFor="offer-start">
                  <input id="offer-start" type="date" className="field" value={draft.validity_start} onChange={(event) => setDraft({ ...draft, validity_start: event.target.value })} />
                </Field>
                <Field label={t('admin.offers.validTo')} htmlFor="offer-end">
                  <input id="offer-end" type="date" className="field" value={draft.validity_end} onChange={(event) => setDraft({ ...draft, validity_end: event.target.value })} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title={t('admin.offers.media')}>
            {draft.image_url ? (
              <div className="relative overflow-hidden rounded-xl">
                <Photo src={draft.image_url} alt="" className="h-32 w-full" />
                <button
                  type="button"
                  className="absolute end-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[0.65rem] font-semibold text-red-700"
                  onClick={() => setDraft({ ...draft, image_url: '' })}
                >
                  {t('common.delete')}
                </button>
              </div>
            ) : (
              <p className="text-[0.7rem] text-ink-400">{t('admin.offers.noImage')}</p>
            )}
            <label className="btn-secondary mt-2 w-full cursor-pointer text-xs">
              {uploading ? <Spinner className="size-3.5" /> : null}
              {t('admin.offers.uploadImage')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
            <Field label={t('admin.offers.imageUrl')} htmlFor="offer-image-url">
              <input id="offer-image-url" className="field" dir="ltr" value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} />
            </Field>
          </Panel>

          <Panel title={t('admin.offers.basics')}>
            <div className="space-y-3">
              <Field label={t('admin.offers.slug')} htmlFor="offer-slug" error={fieldErrors.slug} required>
                <input id="offer-slug" className="field" dir="ltr" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
              </Field>
              <Field label={t('admin.offers.linkedService')} htmlFor="offer-service">
                <select
                  id="offer-service"
                  className="field"
                  value={draft.service_id ?? ''}
                  onChange={(event) => setDraft({ ...draft, service_id: event.target.value || null })}
                >
                  <option value="">{t('admin.offers.noService')}</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.translations.find((entry) => entry.locale === 'en')?.name ?? service.id}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('admin.reservations.status')} htmlFor="offer-status">
                <select id="offer-status" className="field" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OfferStatus })}>
                  <option value="draft">{t('admin.offers.draft')}</option>
                  <option value="published">{t('admin.offers.published')}</option>
                  <option value="archived">{t('admin.offers.archived')}</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('admin.offers.capacity')} htmlFor="offer-capacity">
                  <input
                    id="offer-capacity"
                    type="number"
                    min={1}
                    className="field"
                    value={draft.capacity ?? ''}
                    onChange={(event) => setDraft({ ...draft, capacity: event.target.value ? Number(event.target.value) : null })}
                  />
                </Field>
                <Field label={t('admin.offers.sort')} htmlFor="offer-sort">
                  <input id="offer-sort" type="number" min={0} className="field" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} />
                </Field>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-ink-700">
                <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} />
                <Star className="size-3.5 text-brand-600" aria-hidden="true" />
                {t('admin.offers.featured')}
              </label>
            </div>
          </Panel>
        </div>
      </div>
    </Modal>
  );
}
