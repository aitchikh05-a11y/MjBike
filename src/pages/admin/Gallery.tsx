import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit, Film, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/app/layouts/AdminLayout';
import { AdminError, AdminLoading, ConfirmDialog, LocaleTabs, SelectFilter } from '@/components/admin/widgets';
import { Field, Modal, Photo, Spinner } from '@/components/common/ui';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/app/providers/I18nProvider';
import { backend } from '@/services/backend';
import type { GalleryDraft } from '@/services/backend/types';
import { LOCALES, type GalleryItem, type Locale } from '@shared/domain/types';
import { cn } from '@/lib/utilities/cn';

type GalleryCategory = GalleryItem['category'];
const CATEGORIES: GalleryCategory[] = ['tours', 'coastal', 'customers', 'team', 'rentals', 'promo'];

const emptyLocaleMap = () => Object.fromEntries(LOCALES.map((locale) => [locale, ''])) as Record<Locale, string>;

const toDraft = (item: GalleryItem | null): GalleryDraft =>
  item
    ? { ...item }
    : {
        kind: 'image',
        media_url: '',
        thumbnail_url: null,
        category: 'tours',
        title: emptyLocaleMap(),
        caption: emptyLocaleMap(),
        is_published: false,
        is_featured: false,
        sort_order: 0,
      };

export function AdminGalleryPage() {
  const { t, locale } = useI18n();
  const gallery = useAsync(() => backend.listGallery(), []);
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);

  const filtered = useMemo(() => {
    const items = gallery.data ?? [];
    return category ? items.filter((item) => item.category === category) : items;
  }, [gallery.data, category]);

  const reorder = async (item: GalleryItem, direction: 'up' | 'down') => {
    await backend.reorderGalleryItem(item.id, direction);
    gallery.reload();
  };

  const togglePublish = async (item: GalleryItem) => {
    await backend.saveGalleryItem({ ...item, is_published: !item.is_published });
    gallery.reload();
  };

  return (
    <div>
      <AdminPageHeader
        title={t('admin.gallery.title')}
        subtitle={t('admin.gallery.subtitle')}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t('admin.gallery.create')}
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <SelectFilter
          label={t('admin.gallery.category')}
          value={category}
          onChange={setCategory}
          options={[
            { value: '', label: t('admin.common.all') },
            ...CATEGORIES.map((value) => ({ value, label: t(`gallery.filter${value.charAt(0).toUpperCase()}${value.slice(1)}`) })),
          ]}
        />
        <p className="ms-auto pb-2 text-[0.7rem] text-ink-400">
          {filtered.filter((item) => item.is_published).length} / {filtered.length} {t('admin.gallery.published')}
        </p>
      </div>

      {gallery.loading && <AdminLoading />}
      {gallery.error && <AdminError message={gallery.error} onRetry={gallery.reload} />}

      {gallery.data && filtered.length === 0 && <p className="card px-4 py-10 text-center text-sm text-ink-500">{t('admin.gallery.empty')}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <article key={item.id} className="card overflow-hidden">
            <div className="relative">
              {item.kind === 'video' ? (
                <div className="grid aspect-[4/3] place-items-center bg-ink-900 text-white">
                  <Film className="size-8" aria-hidden="true" />
                </div>
              ) : (
                <Photo src={item.media_url} alt="" className="aspect-[4/3] w-full" />
              )}
              <span className={cn('absolute start-2 top-2 chip text-[0.6rem]', item.is_published ? 'bg-brand-600 text-white' : 'bg-white/90 text-ink-700')}>
                {item.is_published ? t('admin.gallery.published') : t('admin.offers.draft')}
              </span>
              <span className="absolute end-2 top-2 chip bg-white/90 text-[0.6rem] text-ink-700">
                {item.kind === 'video' ? <Film className="size-3" aria-hidden="true" /> : <ImageIcon className="size-3" aria-hidden="true" />}
                {t(`gallery.filter${item.category.charAt(0).toUpperCase()}${item.category.slice(1)}`)}
              </span>
            </div>
            <div className="space-y-1 p-3">
              <p className="line-clamp-1 text-xs font-bold text-ink-900">{item.title[locale] || item.title.en || '—'}</p>
              <p className="line-clamp-2 text-[0.68rem] text-ink-500">{item.caption[locale] || item.caption.en}</p>
              <div className="flex items-center gap-1 pt-1">
                <button type="button" className="rounded p-1 text-ink-500 hover:bg-ink-100" aria-label={t('admin.gallery.moveUp')} onClick={() => void reorder(item, 'up')}>
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" className="rounded p-1 text-ink-500 hover:bg-ink-100" aria-label={t('admin.gallery.moveDown')} onClick={() => void reorder(item, 'down')}>
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" className="btn-secondary !px-2 !py-1 text-[0.62rem]" onClick={() => void togglePublish(item)}>
                  {item.is_published ? t('admin.offers.unpublish') : t('admin.offers.publish')}
                </button>
                <button type="button" className="ms-auto rounded p-1 text-ink-500 hover:bg-ink-100" aria-label={t('common.edit')} onClick={() => setEditing(item)}>
                  <Edit className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" className="rounded p-1 text-red-600 hover:bg-red-50" aria-label={t('common.delete')} onClick={() => setDeleteTarget(item)}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {(editing || creating) && (
        <GalleryEditor
          item={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            gallery.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.common.confirmDelete')}
        confirmLabel={t('common.delete')}
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void backend.deleteGalleryItem(deleteTarget.id).then(() => {
            setDeleteTarget(null);
            gallery.reload();
          });
        }}
      />
    </div>
  );
}

function GalleryEditor({ item, onClose, onSaved }: { item: GalleryItem | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<GalleryDraft>(() => toDraft(item));
  const [tab, setTab] = useState<Locale>('en');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await backend.uploadMedia(file);
      setDraft((current) => ({ ...current, media_url: url, kind: file.type.startsWith('video') ? 'video' : 'image' }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await backend.saveGalleryItem(draft);
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
      title={item ? t('admin.gallery.edit') : t('admin.gallery.create')}
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
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="btn-secondary cursor-pointer text-xs">
          {uploading && <Spinner className="size-3.5" />}
          {t('admin.gallery.upload')}
          <input
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
        <Field label={t('admin.gallery.url')} htmlFor="gallery-url">
          <input id="gallery-url" className="field" dir="ltr" value={draft.media_url} onChange={(event) => setDraft({ ...draft, media_url: event.target.value })} />
        </Field>
      </div>

      {draft.media_url && draft.kind === 'image' && <Photo src={draft.media_url} alt="" className="mt-3 h-40 w-full rounded-xl" />}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={t('admin.gallery.kind')} htmlFor="gallery-kind">
          <select id="gallery-kind" className="field" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as GalleryDraft['kind'] })}>
            <option value="image">{t('admin.gallery.image')}</option>
            <option value="video">{t('admin.gallery.video')}</option>
          </select>
        </Field>
        <Field label={t('admin.gallery.category')} htmlFor="gallery-category">
          <select id="gallery-category" className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as GalleryCategory })}>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`gallery.filter${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3">
        <LocaleTabs value={tab} onChange={setTab} />
        <div className="space-y-3">
          <Field label={t('admin.gallery.titleLabel')} htmlFor={`gallery-title-${tab}`}>
            <input
              id={`gallery-title-${tab}`}
              className="field"
              value={draft.title[tab] ?? ''}
              onChange={(event) => setDraft({ ...draft, title: { ...draft.title, [tab]: event.target.value } })}
            />
          </Field>
          <Field label={t('admin.gallery.caption')} htmlFor={`gallery-caption-${tab}`}>
            <textarea
              id={`gallery-caption-${tab}`}
              rows={2}
              className="field"
              value={draft.caption[tab] ?? ''}
              onChange={(event) => setDraft({ ...draft, caption: { ...draft.caption, [tab]: event.target.value } })}
            />
          </Field>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} />
          {t('admin.gallery.published')}
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" className="size-3.5 rounded border-ink-300 text-brand-600" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} />
          {t('admin.gallery.featured')}
        </label>
        <div className="ms-auto flex items-center gap-1.5">
          <span className="text-[0.65rem] text-ink-400">{t('admin.gallery.sort')}</span>
          <input
            type="number"
            min={0}
            className="field !w-16 !py-1 text-xs"
            aria-label={t('admin.gallery.sort')}
            value={draft.sort_order}
            onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })}
          />
        </div>
      </div>
    </Modal>
  );
}
