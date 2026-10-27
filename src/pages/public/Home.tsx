import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Compass, MapPin, Star, Users, Wrench, Instagram } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { Photo, SectionHeading, LoadingBlock, EmptyState } from '@/components/common/ui';
import { ServiceCard, OfferCard, GalleryCard, TestimonialCard } from '@/components/common/cards';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath } from '@/app/router/paths';
import { localizedValue, whatsappHref } from '@/lib/utilities/localized';
import type { Service } from '@shared/domain/types';

export function HomePage() {
  const { locale, t } = useI18n();
  const { data, loading, error, reload } = usePublicData();

  if (loading) {
    return (
      <>
        <Seo page="home" title={t('pages.home.title')} description={t('pages.home.description')} />
        <LoadingBlock />
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-sm text-ink-600">{error ?? t('errors.generic')}</p>
        <button type="button" onClick={() => void reload()} className="btn-primary mt-4">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const services = data.services;
  const featuredServices = services.filter((service) => service.is_featured).slice(0, 3);
  const otherServices: Service[] = services.filter((service) => !featuredServices.includes(service)).slice(0, 3);
  const shownServices = [...featuredServices, ...otherServices].slice(0, 6);
  const featuredOffers = data.offers.filter((offer) => offer.is_featured).slice(0, 3);
  const offers = featuredOffers.length ? featuredOffers : data.offers.slice(0, 3);
  const gallery = data.gallery.filter((item) => item.is_featured).slice(0, 6);
  const galleryFallback = gallery.length ? gallery : data.gallery.slice(0, 6);
  const settings = data.settings;

  return (
    <>
      <Seo page="home" title={t('pages.home.title')} description={t('pages.home.description')} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink-950">
        <Photo
          src="/images/hero-cycling-tangier.jpg"
          alt={t('home.heroTitle')}
          loading="eager"
          className="absolute inset-0 -z-10 size-full"
          imgClassName="size-full object-cover opacity-70"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/80 via-ink-950/55 to-ink-950/85" />
        <div className="container-page flex min-h-[min(88vh,780px)] flex-col justify-center py-20 text-white">
          <div className="max-w-2xl animate-[fade-up_0.7s_ease-out_both]">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-200 ring-1 ring-white/20">
              <MapPin className="size-3.5" aria-hidden="true" />
              {t('home.heroEyebrow')}
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{t('home.heroTitle')}</h1>
            <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-white/85 sm:text-lg">{t('home.heroText')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={buildPath('booking', locale)} className="btn-primary !px-6 !py-3.5 text-sm">
                <CalendarCheck className="size-4" aria-hidden="true" />
                {t('home.heroPrimary')}
              </Link>
              <Link to={buildPath('tours', locale)} className="btn-outline-light !px-6 !py-3.5 text-sm">
                <Compass className="size-4" aria-hidden="true" />
                {t('home.heroSecondary')}
              </Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6 text-xs sm:text-sm">
              {[t('home.heroStat1'), t('home.heroStat2'), t('home.heroStat3')].map((stat, index) => (
                <div key={stat}>
                  <dt className="sr-only">{`Stat ${index + 1}`}</dt>
                  <dd className="flex items-start gap-1.5 font-semibold text-white/80">{stat}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section" id="services">
        <div className="container-page">
          <SectionHeading
            eyebrow={t('home.servicesEyebrow')}
            title={t('home.servicesTitle')}
            description={t('home.servicesText')}
            action={
              <Link to={buildPath('rentals', locale)} className="btn-secondary shrink-0 text-xs">
                {t('common.viewAll')}
                <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
              </Link>
            }
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shownServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
          {shownServices.length === 0 && <EmptyState title={t('services.noServices')} />}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Wrench, title: t('about.values1Title'), text: t('about.values1Text') },
              { icon: Compass, title: t('about.values2Title'), text: t('about.values2Text') },
              { icon: Users, title: t('about.values3Title'), text: t('about.values3Text') },
            ].map((value) => (
              <div key={value.title} className="flex items-start gap-3 rounded-2xl bg-ink-50/70 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-brand-700 shadow-sm">
                  <value.icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">{value.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{value.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-950 py-16 text-white sm:py-20">
        <div className="container-page">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">{t('home.howEyebrow')}</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{t('home.howTitle')}</h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { title: t('home.how1Title'), text: t('home.how1Text') },
              { title: t('home.how2Title'), text: t('home.how2Text') },
              { title: t('home.how3Title'), text: t('home.how3Text') },
            ].map((step, index) => (
              <li key={step.title} className="relative rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <span className="grid size-9 place-items-center rounded-full bg-brand-400 text-sm font-extrabold text-brand-950">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-bold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Offers */}
      <section className="section">
        <div className="container-page">
          <SectionHeading
            eyebrow={t('home.offersEyebrow')}
            title={t('home.offersTitle')}
            description={t('home.offersText')}
            action={
              <Link to={buildPath('offers', locale)} className="btn-secondary shrink-0 text-xs">
                {t('common.viewAll')}
                <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
              </Link>
            }
          />
          {offers.length === 0 ? (
            <EmptyState title={t('home.offersEmpty')} />
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-ink-50/60 py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow={t('home.galleryEyebrow')}
            title={t('home.galleryTitle')}
            description={t('home.galleryText')}
            action={
              <Link to={buildPath('gallery', locale)} className="btn-secondary shrink-0 text-xs">
                {t('home.galleryCta')}
                <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
              </Link>
            }
          />
          {galleryFallback.length === 0 ? (
            <EmptyState title={t('gallery.empty')} />
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
              {galleryFallback.map((item) => (
                <GalleryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section className="section">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <Photo src="/images/gallery-group-fun.jpg" alt={t('home.aboutTitle')} aspect="aspect-[4/3]" className="rounded-3xl" />
            <div className="absolute -bottom-6 end-6 hidden rounded-2xl bg-brand-600 px-5 py-4 text-white shadow-lift sm:block">
              <p className="text-2xl font-extrabold">{settings.about_claims[0]?.value ?? '8'}</p>
              <p className="max-w-[9rem] text-[0.7rem] leading-tight text-brand-100">
                {localizedValue(settings.about_claims[0]?.label, locale)}
              </p>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">{t('home.aboutEyebrow')}</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t('home.aboutTitle')}</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600 sm:text-base">{t('home.aboutText')}</p>
            <ul className="mt-6 space-y-3">
              {[t('about.values1Title'), t('about.values2Title'), t('about.values3Title')].map((value) => (
                <li key={value} className="flex items-center gap-2 text-sm font-medium text-ink-800">
                  <Star className="size-4 fill-brand-500 text-brand-500" aria-hidden="true" />
                  {value}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={buildPath('about', locale)} className="btn-primary text-sm">
                {t('home.aboutCta')}
              </Link>
              <Link to={buildPath('contact', locale)} className="btn-secondary text-sm">
                {t('home.contactSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-ink-50/60 py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading eyebrow={t('home.testimonialsEyebrow')} title={t('home.testimonialsTitle')} description={t('home.testimonialsText')} />
          {data.testimonials.length === 0 ? (
            <div className="mt-8">
              <EmptyState title={t('home.testimonialsEmpty')} description={t('testimonials.intro')} />
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-12 text-white sm:px-12 sm:py-16">
            <div className="absolute -end-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-100">{t('home.contactEyebrow')}</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('home.contactTitle')}</h2>
              <p className="mt-3 text-sm text-brand-50 sm:text-base">{t('home.contactText')}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={buildPath('booking', locale)} className="btn bg-white text-brand-800 hover:bg-brand-50">
                  <CalendarCheck className="size-4" aria-hidden="true" />
                  {t('home.contactCta')}
                </Link>
                {settings.whatsapp && (
                  <a
                    href={whatsappHref(settings.whatsapp, t('home.contactText'))}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-outline-light"
                  >
                    {t('common.whatsapp')}
                  </a>
                )}
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noreferrer noopener" className="btn-outline-light">
                    <Instagram className="size-4" aria-hidden="true" />
                    Instagram
                  </a>
                )}
              </div>
              <p className="mt-5 text-xs text-brand-100">
                {t('common.openingHours')}: {settings.opening_hours.map((entry) => `${entry.days} ${entry.hours}`).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
