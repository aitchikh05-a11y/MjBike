import { useMemo, useState } from 'react';
import { Seo } from '@/components/common/Seo';
import { EmptyState, LoadingBlock, Modal } from '@/components/common/ui';
import { GalleryCard } from '@/components/common/cards';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { localizedValue } from '@/lib/utilities/localized';
import { cn } from '@/lib/utilities/cn';
import type { GalleryItem } from '@shared/domain/types';

const CATEGORIES = ['all', 'tours', 'coastal', 'customers', 'team', 'rentals', 'promo'] as const;

export function GalleryPage() {
  const { locale, t } = useI18n();
  const { data, loading } = usePublicData();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all');
  const [active, setActive] = useState<GalleryItem | null>(null);

  const items = useMemo(() => {
    const all = data?.gallery ?? [];
    return category === 'all' ? all : all.filter((item) => item.category === category);
  }, [data, category]);

  const label = (value: (typeof CATEGORIES)[number]) =>
    ({
      all: t('gallery.filterAll'),
      tours: t('gallery.filterTours'),
      coastal: t('gallery.filterCoastal'),
      customers: t('gallery.filterCustomers'),
      team: t('gallery.filterTeam'),
      rentals: t('gallery.filterRentals'),
      promo: t('gallery.filterPromo'),
    })[value];

  return (
    <>
      <Seo page="gallery" title={t('pages.gallery.title')} description={t('pages.gallery.description')} />
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white py-14 lg:py-20">
        <div className="container-page max-w-3xl">
          <p className="eyebrow mb-3">{t('nav.gallery')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{t('gallery.title')}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-600 sm:text-base">{t('gallery.intro')}</p>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t('gallery.title')}>
            {CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={category === value}
                onClick={() => setCategory(value)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition',
                  category === value ? 'bg-brand-600 text-white shadow-soft' : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
                )}
              >
                {label(value)}
              </button>
            ))}
          </div>

          {loading && <LoadingBlock />}
          {!loading && items.length === 0 && (
            <div className="mt-8">
              <EmptyState title={t('gallery.empty')} />
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <GalleryCard key={item.id} item={item} onOpen={setActive} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active ? localizedValue(active.title, locale) : ''}
        size="lg"
      >
        {active && (
          <figure className="space-y-3">
            {active.kind === 'video' ? (
              <video controls poster={active.thumbnail_url ?? undefined} className="w-full rounded-xl bg-ink-900">
                <source src={active.media_url} />
                {t('gallery.video')}
              </video>
            ) : (
              <img src={active.media_url} alt={localizedValue(active.title, locale)} className="w-full rounded-xl" loading="lazy" />
            )}
            <figcaption className="text-sm text-ink-600">{localizedValue(active.caption, locale)}</figcaption>
          </figure>
        )}
      </Modal>
    </>
  );
}
