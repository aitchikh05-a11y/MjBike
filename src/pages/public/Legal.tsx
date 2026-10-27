import { Link } from 'react-router-dom';
import { Seo } from '@/components/common/Seo';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath } from '@/app/router/paths';

interface Section {
  title: string;
  body: string;
}

function LegalPage({
  page,
  titleKey,
  introKey,
  sectionPrefix,
  count,
}: {
  page: 'privacy' | 'terms';
  titleKey: string;
  introKey: string;
  sectionPrefix: string;
  count: number;
}) {
  const { locale, t, date } = useI18n();
  const sections: Section[] = Array.from({ length: count }, (_, index) => ({
    title: t(`${sectionPrefix}.s${index + 1}Title`),
    body: t(`${sectionPrefix}.s${index + 1}Text`),
  }));

  return (
    <>
      <Seo page={page} title={t(`pages.${page}.title`)} description={t(`pages.${page}.description`)} />
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white py-14">
        <div className="container-page max-w-3xl">
          <p className="eyebrow mb-3">{t('meta.siteName')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{t(titleKey)}</h1>
          <p className="mt-2 text-xs text-ink-500">
            {t(`${sectionPrefix}.updated`)}: {date(new Date().toISOString().slice(0, 10))}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">{t(introKey)}</p>
        </div>
      </section>
      <section className="section">
        <div className="container-page max-w-3xl space-y-8">
          {sections.map((section, index) => (
            <article key={section.title} className="space-y-2">
              <h2 className="text-lg font-bold text-ink-900">
                {index + 1}. {section.title}
              </h2>
              <p className="text-sm leading-relaxed text-ink-600">{section.body}</p>
            </article>
          ))}
          <div className="flex flex-wrap gap-3 border-t border-ink-100 pt-6 text-sm">
            <Link to={buildPath('contact', locale)} className="btn-primary text-xs">
              {t('nav.contact')}
            </Link>
            <Link to={buildPath(page === 'privacy' ? 'terms' : 'privacy', locale)} className="btn-secondary text-xs">
              {t(page === 'privacy' ? 'footer.terms' : 'footer.privacy')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function PrivacyPage() {
  return <LegalPage page="privacy" titleKey="privacy.title" introKey="privacy.intro" sectionPrefix="privacy" count={8} />;
}

export function TermsPage() {
  return <LegalPage page="terms" titleKey="terms.title" introKey="terms.intro" sectionPrefix="terms" count={8} />;
}
