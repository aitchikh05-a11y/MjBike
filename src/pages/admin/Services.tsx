import { useMemo, useState } from 'react';
import { Bike, Clock, Edit, Eye, EyeOff, Plus, Users } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, LocaleTabs, Panel, SelectFilter, TextFilter } from '@/components/admin/widgets';
import { Field, Modal, Photo, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import type { ServiceDraft } from '@/services/backend/types';
import { LOCALES, SERVICE_KINDS, type DurationOption, type Locale, type Service, type ServiceAddon, type ServiceKind, type ServiceTranslation } from '@shared/domain/types';
import { cn } from '@/lib/utilities/cn';

const blankTranslation = (locale: Locale): ServiceTranslation => ({
  locale,
  name: '',
  short_description: '',
  description: '',
  highlights: [],
  meta_title: null,
  meta_description: null,
});

const toDraft = (service: Service | null): ServiceDraft =>
  service
    ? {
        ...service,
        translations: LOCALES.map((locale) => service.translations.find((entry) => entry.locale === locale) ?? blankTranslation(locale)),
      }
    : {
        slug: '',
        kind: 'rental',
        image_url: '',
        gallery: [],
        price_unit: 'per_bike',
        base_price: 0,
        duration_options: [{ hours: 1, price: 0 }],
        default_duration_hours: 1,
        capacity: 8,
        min_units: 1,
        max_units: 8,
        addons: [],
        is_active: true,
        is_featured: false,
        sort_order: 0,
        translations: LOCALES.map(blankTranslation),
      };

export function AdminServicesPage() {
  const { t, locale, number } = useI18n();
  const services = useAsync(() => backend.listServices(), []);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    let list = services.data ?? [];
    if (kind) list = list.filter((service) => service.kind === kind);
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (service) => service.slug.includes(term) || service.translations.some((entry) => entry.name.toLowerCase().includes(term)),
      );
    }
    return list;
  }, [services.data, kind, search]);

  return (
    <div>
      <AdminPageHeader
        title={t('admin.services.title')}
        subtitle={t('admin.services.subtitle')}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t('admin.services.create')}
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <TextFilter label={t('admin.common.search')} value={search} onChange={setSearch} placeholder={t('admin.common.searchPlaceholder')} />
        <SelectFilter
          label={t('admin.services.kind')}
          value={kind}
          onChange={setKind}
          options={[{ value: '', label: t('admin.common.all') }, ...SERVICE_KINDS.map((value) => ({ value, label: t(`admin.services.kinds.${value}`) }))]}
        />
      </div>

      {services.loading && <AdminLoading />}
      {services.error && <AdminError message={services.error} onRetry={services.reload} />}

      {services.data && filtered.length === 0 && <p className="card px-4 py-10 text-center text-sm text-ink-500">{t('admin.services.empty')}</p>}

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((service) => {
          const translation = service.translations.find((entry) => entry.locale === locale) ?? service.translations[0];
          return (
            <article key={service.id} className="card flex gap-3 p-3">
              <Photo src={service.image_url} alt="" className="size-24 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 text-sm font-bold text-ink-900">{translation?.name ?? service.slug}</h2>
                  <button
                    type="button"
                    className="rounded p-1 text-ink-500 hover:bg-ink-100"
                    aria-label={service.is_active ? t('admin.services.deactivate') : t('admin.services.activate')}
                    onClick={() => void backend.saveService({ ...service, is_active: !service.is_active }).then(() => services.reload())}
                  >
                    {service.is_active ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5 text-red-600" aria-hidden="true" />}
                  </button>
                </div>
                <p className="mt-1 line-clamp-2 text-[0.7rem] text-ink-500">{translation?.short_description}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.65rem] text-ink-400">
                  <span className="chip bg-brand-50 text-brand-800">{t(`admin.services.kinds.${service.kind}`)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" aria-hidden="true" />
                    {service.duration_options.map((option) => `${option.hours}h`).join(' · ')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" aria-hidden="true" />
                    {service.capacity}
                  </span>
                </p>
                <p className="mt-1 text-xs font-bold text-ink-900">
                  {number(service.base_price)} MAD
                  <span className="ms-1 text-[0.65rem] font-normal text-ink-400">
                    /{service.price_unit === 'per_bike' ? t('common.perBike') : service.price_unit === 'per_person' ? t('common.perPerson') : t('common.perGroup')}
                  </span>
                </p>
                <button type="button" className="btn-secondary mt-2 !px-2 !py-1 text-[0.65rem]" onClick={() => setEditing(service)}>
                  <Edit className="size-3" aria-hidden="true" />
                  {t('common.edit')}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {(editing || creating) && (
        <ServiceEditor
          service={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            services.reload();
          }}
        />
      )}
    </div>
  );
}

function ServiceEditor({ service, onClose, onSaved }: { service: Service | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ServiceDraft>(() => toDraft(service));
  const [tab, setTab] = useState<Locale>('en');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const translation = draft.translations.find((entry) => entry.locale === tab) ?? blankTranslation(tab);

  const updateTranslation = (patch: Partial<ServiceTranslation>) =>
    setDraft({ ...draft, translations: draft.translations.map((entry) => (entry.locale === tab ? { ...entry, ...patch } : entry)) });

  const updateTier = (index: number, patch: Partial<DurationOption>) =>
    setDraft({ ...draft, duration_options: draft.duration_options.map((tier, position) => (position === index ? { ...tier, ...patch } : tier)) });

  const updateAddon = (index: number, patch: Partial<ServiceAddon>) =>
    setDraft({ ...draft, addons: draft.addons.map((addon, position) => (position === index ? { ...addon, ...patch } : addon)) });

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
    setErrors({});
    try {
      await backend.saveService(draft);
      onSaved();
    } catch (caught) {
      const failure = caught as { message?: string; fields?: Record<string, string> };
      setError(failure.message ?? t('errors.generic'));
      setErrors(failure.fields ?? {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={service ? t('admin.services.edit') : t('admin.services.create')}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
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
            <Field label={t('admin.services.name')} htmlFor={`service-name-${tab}`} error={errors[`translations.${tab}.name`]} required>
              <input id={`service-name-${tab}`} className="field" value={translation.name} onChange={(event) => updateTranslation({ name: event.target.value })} />
            </Field>
            <Field label={t('admin.services.shortDescription')} htmlFor={`service-short-${tab}`} error={errors[`translations.${tab}.short_description`]} required>
              <input
                id={`service-short-${tab}`}
                className="field"
                maxLength={240}
                value={translation.short_description}
                onChange={(event) => updateTranslation({ short_description: event.target.value })}
              />
            </Field>
            <Field label={t('admin.services.description')} htmlFor={`service-description-${tab}`} error={errors[`translations.${tab}.description`]} required>
              <textarea
                id={`service-description-${tab}`}
                rows={5}
                className="field"
                value={translation.description}
                onChange={(event) => updateTranslation({ description: event.target.value })}
              />
            </Field>
            <Field label={t('admin.services.highlights')} htmlFor={`service-highlights-${tab}`} hint={t('admin.services.highlightsHint')}>
              <textarea
                id={`service-highlights-${tab}`}
                rows={3}
                className="field"
                value={translation.highlights.join('\n')}
                onChange={(event) =>
                  updateTranslation({
                    highlights: event.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .slice(0, 8),
                  })
                }
              />
            </Field>
          </div>
        </div>

        <div className="space-y-3">
          <Panel title={t('admin.services.basics')}>
            <div className="space-y-3">
              <Field label={t('admin.offers.slug')} htmlFor="service-slug" error={errors.slug} required>
                <input id="service-slug" className="field" dir="ltr" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
              </Field>
              <Field label={t('admin.services.kind')} htmlFor="service-kind">
                <select id="service-kind" className="field" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as ServiceKind })}>
                  {SERVICE_KINDS.map((value) => (
                    <option key={value} value={value}>
                      {t(`admin.services.kinds.${value}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('admin.services.priceUnit')} htmlFor="service-price-unit">
                <select
                  id="service-price-unit"
                  className="field"
                  value={draft.price_unit}
                  onChange={(event) => setDraft({ ...draft, price_unit: event.target.value as ServiceDraft['price_unit'] })}
                >
                  <option value="per_bike">{t('common.perBike')}</option>
                  <option value="per_person">{t('common.perPerson')}</option>
                  <option value="per_group">{t('common.perGroup')}</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('admin.services.capacity')} htmlFor="service-capacity">
                  <input id="service-capacity" type="number" min={1} className="field" value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} />
                </Field>
                <Field label={t('admin.services.maxUnits')} htmlFor="service-max">
                  <input id="service-max" type="number" min={1} className="field" value={draft.max_units} onChange={(event) => setDraft({ ...draft, max_units: Number(event.target.value) })} />
                </Field>
              </div>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} />
                {t('admin.services.featured')}
              </label>
              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1 text-[0.7rem] text-ink-500">
                  <Bike className="size-3.5" aria-hidden="true" />
                  {t('admin.services.active')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.is_active}
                  onClick={() => setDraft({ ...draft, is_active: !draft.is_active })}
                  className={cn('relative h-5 w-9 rounded-full transition', draft.is_active ? 'bg-brand-600' : 'bg-ink-300')}
                >
                  <span className={cn('absolute top-0.5 size-4 rounded-full bg-white transition', draft.is_active ? 'start-4.5' : 'start-0.5')} />
                </button>
              </div>
            </div>
          </Panel>

          <Panel
            title={t('admin.services.durations')}
            action={
              <button
                type="button"
                className="text-[0.65rem] font-semibold text-brand-700 hover:underline"
                onClick={() => setDraft({ ...draft, duration_options: [...draft.duration_options, { hours: (draft.duration_options.at(-1)?.hours ?? 1) + 1, price: 0 }] })}
              >
                <Plus className="inline size-3" aria-hidden="true" /> {t('admin.services.addDuration')}
              </button>
            }
          >
            <div className="space-y-2">
              {draft.duration_options.map((tier, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0.5}
                    step="0.5"
                    className="field !w-16 !py-1.5 text-xs"
                    aria-label={t('admin.services.hours')}
                    value={tier.hours}
                    onChange={(event) => updateTier(index, { hours: Number(event.target.value) })}
                  />
                  <span className="text-[0.7rem] text-ink-400">h</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="field !py-1.5 text-xs"
                    aria-label={t('admin.services.price')}
                    value={tier.price}
                    onChange={(event) => updateTier(index, { price: Number(event.target.value) })}
                  />
                  <span className="text-[0.7rem] text-ink-400">MAD</span>
                  <button
                    type="button"
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    aria-label={t('common.delete')}
                    onClick={() => setDraft({ ...draft, duration_options: draft.duration_options.filter((_, position) => position !== index) })}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title={t('admin.services.addons')}
            action={
              <button
                type="button"
                className="text-[0.65rem] font-semibold text-brand-700 hover:underline"
                onClick={() =>
                  setDraft({
                    ...draft,
                    addons: [
                      ...draft.addons,
                      { id: `addon-${draft.addons.length + 1}`, price: 0, name: { en: '', fr: '', ar: '' }, description: { en: '', fr: '', ar: '' } },
                    ],
                  })
                }
              >
                <Plus className="inline size-3" aria-hidden="true" /> {t('admin.services.addAddon')}
              </button>
            }
          >
            {draft.addons.length === 0 && <p className="text-[0.7rem] text-ink-400">{t('admin.services.noAddons')}</p>}
            <div className="space-y-2">
              {draft.addons.map((addon, index) => (
                <div key={index} className="rounded-lg border border-ink-100 p-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      className="field !py-1 text-xs"
                      aria-label={t('admin.services.addonName')}
                      placeholder={t('admin.services.addonName')}
                      value={addon.name[tab] ?? ''}
                      onChange={(event) => updateAddon(index, { name: { ...addon.name, [tab]: event.target.value } })}
                    />
                    <input
                      type="number"
                      min={0}
                      className="field !w-20 !py-1 text-xs"
                      aria-label={t('admin.services.price')}
                      value={addon.price}
                      onChange={(event) => updateAddon(index, { price: Number(event.target.value) })}
                    />
                    <button
                      type="button"
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                      aria-label={t('common.delete')}
                      onClick={() => setDraft({ ...draft, addons: draft.addons.filter((_, position) => position !== index) })}
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-1 text-[0.6rem] text-ink-400">{LOCALES.map((entry) => entry.toUpperCase()).join(' · ')}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t('admin.services.media')}>
            {draft.image_url ? <Photo src={draft.image_url} alt="" className="h-28 w-full rounded-xl" /> : <p className="text-[0.7rem] text-ink-400">{t('admin.offers.noImage')}</p>}
            <label className="btn-secondary mt-2 w-full cursor-pointer text-xs">
              {uploading && <Spinner className="size-3.5" />}
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
          </Panel>
        </div>
      </div>
    </Modal>
  );
}
