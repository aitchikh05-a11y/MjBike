import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, Users } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { EmptyState, LoadingBlock, Photo, SectionHeading } from '@/components/common/ui';
import { ServiceCard } from '@/components/common/cards';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath, type PublicPage } from '@/app/router/paths';
import { formatDuration, price, serviceTranslation } from '@/lib/utilities/localized';
import type { ServiceKind } from '@shared/domain/types';

const PAGE_KINDS: Record<string, ServiceKind[]> = {
  rentals: ['rental'],
  tours: ['tour'],
  experiences: ['experience', 'lesson', 'event'],
};

export function ServicesPage({ page }: { page: Extract<PublicPage, 'rentals' | 'tours' | 'experiences'> }) {
  const { locale, t } = useI18n();
  const { data, loading, error } = usePublicData();

  const seo = {
    rentals: { title: t('pages.rentals.title'), description: t('pages.rentals.description'), heading: t('services.rentalsTitle'), intro: t('services.rentalsText'), image: '/images/service-rentals.jpg' },
    tours: { title: t('pages.tours.title'), description: t('pages.tours.description'), heading: t('services.toursTitle'), intro: t('services.toursText'), image: '/images/service-tours.jpg' },
    experiences: { title: t('pages.experiences.title'), description: t('pages.experiences.description'), heading: t('services.teamTitle'), intro: t('services.teamText'), image: '/images/service-teambuilding.jpg' },
  }[page];

  if (loading) {
    return (
      <>
        <Seo page={page} title={seo.title} description={seo.description} />
        <LoadingBlock />
      </>
    );
  }

  const kinds = PAGE_KINDS[page] ?? [];
  const services = (data?.services ?? []).filter((service) => kinds.includes(service.kind));

  return (
    <>
      <Seo page={page} title={seo.title} description={seo.description} image={seo.image} />

      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white">
        <div className="container-page grid items-center gap-8 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="eyebrow mb-3">{t('meta.siteName')}</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">{seo.heading}</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">{seo.intro}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={buildPath('booking', locale)} className="btn-primary text-sm">
                {t('common.bookNow')}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link to={buildPath('offers', locale)} className="btn-secondary text-sm">
                {t('nav.offers')}
              </Link>
            </div>
          </div>
          <Photo src={seo.image} alt={seo.heading} aspect="aspect-[16/11]" className="rounded-3xl" loading="eager" />
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <SectionHeading title={t('services.title')} description={t('services.intro')} />
          {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
          {services.length === 0 ? (
            <div className="mt-8">
              <EmptyState title={t('services.noServices')} action={<Link to={buildPath('contact', locale)} className="btn-primary text-xs">{t('nav.contact')}</Link>} />
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </section>

      {page === 'rentals' && services.length > 0 && (
        <section className="bg-ink-50/60 py-16">
          <div className="container-page">
            <SectionHeading title={t('services.priceLabel')} description={t('booking.totalNote')} />
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {services.map((service) => {
                const translation = serviceTranslation(service, locale);
                return (
                  <div key={service.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold text-ink-900">{translation.name}</h3>
                      <span className="chip bg-brand-50 text-brand-800">{formatDuration(service.default_duration_hours, t)}</span>
                    </div>
                    <table className="mt-4 w-full text-sm">
                      <caption className="sr-only">{translation.name}</caption>
                      <tbody>
                        {service.duration_options.map((option) => (
                          <tr key={option.hours} className="border-b border-ink-100 last:border-0">
                            <th scope="row" className="py-2 text-start font-medium text-ink-600">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="size-3.5 text-brand-600" aria-hidden="true" />
                                {formatDuration(option.hours, t)}
                              </span>
                            </th>
                            <td className="py-2 text-end font-semibold text-ink-900">{price(option.price, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                        <Users className="size-3.5 text-brand-600" aria-hidden="true" />
                        {t('services.capacityLabel')}: {service.capacity}
                      </p>
                      <Link to={`${buildPath('booking', locale)}?service=${encodeURIComponent(service.slug)}`} className="text-xs font-semibold text-brand-700 hover:underline">
                        {t('common.bookNow')} →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {page === 'tours' && (
        <section className="bg-brand-950 py-16 text-white">
          <div className="container-page grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('home.howTitle')}</h2>
              <p className="mt-3 max-w-xl text-sm text-white/70">{t('home.how2Text')}</p>
            </div>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {[t('about.values1Title'), t('about.values2Title'), t('about.values3Title'), t('faq.a3')].map((item) => (
                <li key={item} className="flex items-start gap-2 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden="true" />
                  <span className="text-white/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
