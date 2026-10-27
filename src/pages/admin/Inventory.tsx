import { useMemo, useState } from 'react';
import { Bike, Edit, Plus, Wrench } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, Panel, SelectFilter, StatCard, TextFilter } from '@/components/admin/widgets';
import { Field, Modal, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import type { BicycleDraft } from '@/services/backend/types';
import { BICYCLE_STATUSES, type Bicycle, type BicycleStatus } from '@shared/domain/types';
import { cn } from '@/lib/utilities/cn';

const STATUS_STYLES: Record<BicycleStatus, string> = {
  available: 'bg-brand-50 text-brand-800',
  rented: 'bg-sky-50 text-sky-800',
  maintenance: 'bg-amber-50 text-amber-800',
  inactive: 'bg-ink-100 text-ink-500',
};

const toDraft = (bicycle: Bicycle | null): BicycleDraft =>
  bicycle
    ? { ...bicycle }
    : {
        internal_code: '',
        name: '',
        category: 'city',
        size: null,
        service_id: null,
        quantity: 1,
        status: 'available',
        purchase_date: null,
        last_service_at: null,
        maintenance_notes: null,
        image_url: null,
      };

export function AdminInventoryPage() {
  const { t, locale, date, number } = useI18n();
  const bicycles = useAsync(() => backend.listBicycles(), []);
  const services = useAsync(() => backend.listServices(), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Bicycle | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    let list = bicycles.data ?? [];
    if (status) list = list.filter((bicycle) => bicycle.status === status);
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((bicycle) => bicycle.internal_code.toLowerCase().includes(term) || bicycle.name.toLowerCase().includes(term) || bicycle.category.toLowerCase().includes(term));
    }
    return list;
  }, [bicycles.data, status, search]);

  const totals = useMemo(() => {
    const bikes = bicycles.data ?? [];
    return {
      units: bikes.reduce((sum, bicycle) => sum + bicycle.quantity, 0),
      available: bikes.filter((bicycle) => bicycle.status === 'available').reduce((sum, bicycle) => sum + bicycle.quantity, 0),
      maintenance: bikes.filter((bicycle) => bicycle.status === 'maintenance').length,
      models: bikes.length,
    };
  }, [bicycles.data]);

  return (
    <div>
      <AdminPageHeader
        title={t('admin.inventory.title')}
        subtitle={t('admin.inventory.subtitle')}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t('admin.inventory.create')}
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('admin.inventory.models')} value={number(totals.models)} icon={<Bike className="size-4" />} />
        <StatCard label={t('admin.inventory.totalFleet')} value={number(totals.units)} />
        <StatCard label={t('admin.inventory.available')} value={number(totals.available)} tone="brand" />
        <StatCard label={t('admin.inventory.inMaintenance')} value={number(totals.maintenance)} tone={totals.maintenance > 0 ? 'warning' : 'default'} icon={<Wrench className="size-4" />} />
      </div>

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <TextFilter label={t('admin.common.search')} value={search} onChange={setSearch} placeholder={t('admin.common.searchPlaceholder')} />
        <SelectFilter
          label={t('admin.inventory.status')}
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: t('admin.common.all') }, ...BICYCLE_STATUSES.map((value) => ({ value, label: t(`admin.inventory.status${value.charAt(0).toUpperCase()}${value.slice(1)}`) }))]}
        />
      </div>

      {bicycles.loading && <AdminLoading />}
      {bicycles.error && <AdminError message={bicycles.error} onRetry={bicycles.reload} />}

      {bicycles.data && filtered.length === 0 && <p className="card px-4 py-10 text-center text-sm text-ink-500">{t('admin.inventory.empty')}</p>}

      {filtered.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.inventory.internalCode')}</th>
                <th>{t('admin.inventory.name')}</th>
                <th>{t('admin.inventory.category')}</th>
                <th>{t('admin.inventory.size')}</th>
                <th className="text-center">{t('admin.inventory.quantity')}</th>
                <th>{t('admin.inventory.status')}</th>
                <th>{t('admin.inventory.lastService')}</th>
                <th>{t('admin.inventory.service')}</th>
                <th className="text-end">{t('common.edit')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bicycle) => {
                const service = services.data?.find((entry) => entry.id === bicycle.service_id);
                return (
                  <tr key={bicycle.id}>
                    <td className="font-mono text-xs font-semibold" dir="ltr">
                      {bicycle.internal_code}
                    </td>
                    <td className="text-xs">{bicycle.name}</td>
                    <td className="text-xs capitalize">{bicycle.category}</td>
                    <td className="text-xs">{bicycle.size ?? '—'}</td>
                    <td className="text-center text-xs">{bicycle.quantity}</td>
                    <td>
                      <span className={cn('chip text-[0.62rem]', STATUS_STYLES[bicycle.status])}>
                        {t(`admin.inventory.status${bicycle.status.charAt(0).toUpperCase()}${bicycle.status.slice(1)}`)}
                      </span>
                    </td>
                    <td className="text-xs">{bicycle.last_service_at ? date(bicycle.last_service_at) : '—'}</td>
                    <td className="text-xs text-ink-500">{service?.translations.find((entry) => entry.locale === locale)?.name ?? '—'}</td>
                    <td className="text-end">
                      <button type="button" className="rounded p-1 text-ink-500 hover:bg-ink-100" aria-label={t('common.edit')} onClick={() => setEditing(bicycle)}>
                        <Edit className="size-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <BicycleEditor
          bicycle={editing}
          services={services.data ?? []}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            bicycles.reload();
          }}
        />
      )}
    </div>
  );
}

function BicycleEditor({
  bicycle,
  services,
  onClose,
  onSaved,
}: {
  bicycle: Bicycle | null;
  services: { id: string; translations: { locale: string; name: string }[] }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<BicycleDraft>(() => toDraft(bicycle));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await backend.saveBicycle(draft);
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
      title={bicycle ? t('admin.inventory.edit') : t('admin.inventory.create')}
      size="lg"
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
      <Panel>
        {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.inventory.internalCode')} htmlFor="bike-code" required>
            <input id="bike-code" className="field" dir="ltr" value={draft.internal_code} onChange={(event) => setDraft({ ...draft, internal_code: event.target.value })} />
          </Field>
          <Field label={t('admin.inventory.name')} htmlFor="bike-name" required>
            <input id="bike-name" className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label={t('admin.inventory.category')} htmlFor="bike-category">
            <input id="bike-category" className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          </Field>
          <Field label={t('admin.inventory.size')} htmlFor="bike-size">
            <input id="bike-size" className="field" value={draft.size ?? ''} onChange={(event) => setDraft({ ...draft, size: event.target.value || null })} />
          </Field>
          <Field label={t('admin.inventory.quantity')} htmlFor="bike-quantity">
            <input id="bike-quantity" type="number" min={0} className="field" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} />
          </Field>
          <Field label={t('admin.inventory.status')} htmlFor="bike-status">
            <select id="bike-status" className="field" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as BicycleStatus })}>
              {BICYCLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.inventory.status${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.inventory.service')} htmlFor="bike-service">
            <select id="bike-service" className="field" value={draft.service_id ?? ''} onChange={(event) => setDraft({ ...draft, service_id: event.target.value || null })}>
              <option value="">—</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.translations.find((entry) => entry.locale === 'en')?.name ?? service.id}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.inventory.lastService')} htmlFor="bike-service-date">
            <input
              id="bike-service-date"
              type="date"
              className="field"
              value={draft.last_service_at ?? ''}
              onChange={(event) => setDraft({ ...draft, last_service_at: event.target.value || null })}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={t('admin.inventory.maintenanceNotes')} htmlFor="bike-notes">
            <textarea
              id="bike-notes"
              rows={3}
              className="field"
              value={draft.maintenance_notes ?? ''}
              onChange={(event) => setDraft({ ...draft, maintenance_notes: event.target.value || null })}
            />
          </Field>
        </div>
        <p className="mt-3 rounded-xl bg-ink-50 px-3 py-2 text-[0.7rem] text-ink-500">{t('admin.inventory.maintenanceWarning')}</p>
      </Panel>
    </Modal>
  );
}
