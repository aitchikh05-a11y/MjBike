import { Link } from 'react-router-dom';
import { Check, ShieldCheck, Wrench, Compass } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { LoadingBlock, Photo, SectionHeading } from '@/components/common/ui';
import { useI18n } from '@/app/providers/I18nProvider';
import { usePublicData } from '@/app/providers/publicDataContext';
import { buildPath } from '@/app/router/paths';
import { localizedValue } from '@/lib/utilities/localized';

export function AboutPage() {
  const { locale, t } = useI18n();
  const { data, loading } = usePublicData();
  const settings = data?.settings;

  return (
    <>
      <Seo page="about" title={t('pages.about.title')} description={t('pages.about.description')} image="/images/gallery-group-fun.jpg" />
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white py-14 lg:py-20">
        <div className="container-page grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="eyebrow mb-3">{t('home.aboutEyebrow')}</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">{t('about.title')}</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">{t('about.intro')}</p>
            <div className="mt-7 flex gap-3">
              <Link to={buildPath('booking', locale)} className="btn-primary text-sm">
                {t('home.contactCta')}
              </Link>
              <Link to={buildPath('contact', locale)} className="btn-secondary text-sm">
                {t('nav.contact')}
              </Link>
            </div>
          </div>
          <Photo src="/images/hero-cycling-tangier.jpg" alt={t('about.title')} aspect="aspect-[4/3]" className="rounded-3xl" loading="eager" />
        </div>
      </section>

      {loading && <LoadingBlock />}

      {settings && (
        <section className="section">
          <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
            <div>
              <SectionHeading eyebrow={t('home.aboutEyebrow')} title={t('about.storyTitle')} />
              <p className="mt-4 text-sm leading-relaxed text-ink-600 sm:text-base">{t('about.storyText')}</p>
              <h2 className="mt-10 text-xl font-bold text-ink-900">{t('about.valuesTitle')}</h2>
              <ul className="mt-4 space-y-4">
                {[
                  { icon: Wrench, title: t('about.values1Title'), text: t('about.values1Text') },
                  { icon: Compass, title: t('about.values2Title'), text: t('about.values2Text') },
                  { icon: ShieldCheck, title: t('about.values3Title'), text: t('about.values3Text') },
                ].map((value) => (
                  <li key={value.title} className="flex gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                      <value.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{value.title}</p>
                      <p className="mt-0.5 text-sm text-ink-600">{value.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">{t('about.claimsTitle')}</h2>
                <dl className="mt-4 space-y-4">
                  {settings.about_claims.map((claim) => (
                    <div key={claim.value + localizedValue(claim.label, locale)} className="flex items-baseline gap-3">
                      <dt className="min-w-14 text-2xl font-extrabold text-brand-700">{claim.value}</dt>
                      <dd className="text-sm text-ink-600">{localizedValue(claim.label, locale)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 border-t border-ink-100 pt-3 text-xs text-ink-400">{t('about.claimsTitle')}</p>
              </div>
              <div className="card overflow-hidden">
                <Photo src="/images/gallery-cafe-stop.jpg" alt={t('gallery.filterTours')} aspect="aspect-[4/3]" />
                <div className="p-5">
                  <p className="text-sm font-semibold text-ink-900">{t('about.ctaTitle')}</p>
                  <p className="mt-1 text-xs text-ink-500">{t('about.ctaText')}</p>
                  <Link to={buildPath('booking', locale)} className="btn-primary mt-4 w-full text-xs">
                    {t('common.bookNow')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-ink-50/60 py-16">
        <div className="container-page">
          <SectionHeading title={t('about.ctaTitle')} description={t('about.ctaText')} align="center" />
          <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[t('about.values1Title'), t('about.values2Title'), t('about.values3Title')].map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-xl bg-white p-3 text-xs font-medium text-ink-700 shadow-sm">
                <Check className="size-4 text-brand-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
