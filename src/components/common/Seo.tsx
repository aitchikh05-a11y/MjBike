import { useEffect } from 'react';
import { useI18n } from '@/app/providers/I18nProvider';
import { alternatesFor, buildPath, type PublicPage } from '@/app/router/paths';
import { htmlLang } from '@/locales';

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || 'https://mjbiketangier.com';

interface SeoProps {
  page: PublicPage;
  title: string;
  description: string;
  /** Absolute or root-relative image used for social previews. */
  image?: string;
  robots?: string;
  type?: 'website' | 'article';
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    if (hreflang) element.setAttribute('hreflang', hreflang);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Per-page SEO: title, description, canonical URL, hreflang alternates and Open Graph tags.
 * Canonical URLs are absolute so search engines never index two language variants as duplicates.
 */
export function Seo({ page, title, description, image, robots = 'index,follow', type = 'website' }: SeoProps) {
  const { locale } = useI18n();
  const canonical = `${SITE_URL}${buildPath(page, locale)}`;
  const socialImage = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : `${SITE_URL}/images/hero-cycling-tangier.jpg`;

  useEffect(() => {
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', robots);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:site_name', 'MJ Bike Tangier');
    setMeta('property', 'og:locale', htmlLang(locale).replace('-', '_'));
    setMeta('property', 'og:image', socialImage);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', socialImage);

    setLink('canonical', canonical);
    for (const alternate of alternatesFor(page)) {
      setLink('alternate', `${SITE_URL}${buildPath(page, alternate.locale)}`, alternate.locale);
    }
    setLink('alternate', `${SITE_URL}${buildPath(page, 'en')}`, 'x-default');
  }, [title, description, canonical, socialImage, robots, type, locale, page]);

  return null;
}
