import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Star, Users, MapPin } from 'lucide-react';
import type { GalleryItem, Offer, Service, Testimonial } from '@shared/domain/types';
import { discountPercent } from '@shared/domain/pricing';
import { useI18n } from '@/app/providers/I18nProvider';
import { buildPath } from '@/app/router/paths';
import { Photo } from '@/components/common/ui';
import { formatDuration, localizedValue, offerTranslation, price, serviceTranslation, unitSuffix } from '@/lib/utilities/localized';
import { cn } from '@/lib/utilities/cn';

export function ServiceCard({ service, featured = false }: { service: Service; featured?: boolean }) {
  const { locale, t } = useI18n();
  const translation = serviceTranslation(service, locale);
  const link = `${buildPath('booking', locale)}?service=${encodeURIComponent(service.slug)}`;
  const minPrice = Math.min(
    ...(service.duration_options.length ? service.duration_options.map((option) => option.price) : [service.base_price]),
  );

  return (
    <article className={cn('card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift', featured && 'ring-1 ring-brand-200')}>
      <div className="relative">
        <Photo src={service.image_url} alt={translation.name} aspect="aspect-[16/10]" imgClassName="transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute start-3 top-3 chip bg-white/95 text-ink-800 shadow-sm">
          {t(`booking.type${service.kind.charAt(0).toUpperCase()}${service.kind.slice(1)}` as string)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-bold tracking-tight text-ink-900">{translation.name}</h3>
        <p className="text-sm leading-relaxed text-ink-500">{translation.short_description}</p>
        <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-brand-600" aria-hidden="true" />
            <dt className="sr-only">{t('common.duration')}</dt>
            <dd>{formatDuration(service.default_duration_hours, t)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-brand-600" aria-hidden="true" />
            <dt className="sr-only">{t('booking.quantityPeople')}</dt>
            <dd>
              {service.capacity} {service.kind === 'rental' ? t('common.people') : t('common.people')}
            </dd>
          </div>
        </dl>
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-sm text-ink-500">
            {t('common.from')}{' '}
            <span className="text-base font-extrabold text-ink-900">{price(minPrice, locale)}</span>{' '}
            <span className="text-xs">{unitSuffix(service.price_unit, t)}</span>
          </p>
          <Link to={link} className="btn-primary !px-4 !py-2 text-xs" aria-label={`${t('common.bookNow')} — ${translation.name}`}>
            {t('common.bookNow')}
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function OfferCard({ offer }: { offer: Offer }) {
  const { locale, t } = useI18n();
  const translation = offerTranslation(offer, locale);
  const discount = discountPercent(offer.price, offer.compare_at_price);
  const link = `${buildPath('booking', locale)}?offer=${encodeURIComponent(offer.slug)}`;

  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative">
        <Photo src={offer.image_url} alt={translation.title} aspect="aspect-[16/10]" imgClassName="transition duration-500 group-hover:scale-[1.03]" />
        {discount !== null && (
          <span className="absolute end-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
            -{discount}%
          </span>
        )}
        <span className="absolute start-3 top-3 chip bg-white/95 text-brand-800 shadow-sm">{t('booking.offerBadge')}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-bold tracking-tight text-ink-900">{translation.title}</h3>
        <p className="text-sm leading-relaxed text-ink-500">{translation.short_description}</p>
        {translation.included.length > 0 && (
          <ul className="space-y-1 text-xs text-ink-600">
            {translation.included.slice(0, 3).map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto flex items-baseline gap-2 border-t border-ink-100 pt-3">
          <span className="text-xl font-extrabold text-ink-900">{price(offer.price, locale)}</span>
          {offer.compare_at_price && <span className="text-sm text-ink-400 line-through">{price(offer.compare_at_price, locale)}</span>}
          <span className="text-xs text-ink-500">/ {t('common.perPerson')}</span>
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Clock className="size-3.5 text-brand-600" aria-hidden="true" />
            {formatDuration(offer.duration_hours, t)}
          </span>
          <Link to={link} className="btn-primary !px-4 !py-2 text-xs">
            {t('offers.bookOffer')}
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function GalleryCard({ item, onOpen }: { item: GalleryItem; onOpen?: (item: GalleryItem) => void }) {
  const { locale, t } = useI18n();
  const title = localizedValue(item.title, locale);
  const caption = localizedValue(item.caption, locale);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      className="group relative block w-full overflow-hidden rounded-2xl bg-ink-100 text-start focus-visible:outline-offset-4"
      aria-label={`${t('gallery.openItem')}: ${title}`}
    >
      <Photo src={item.thumbnail_url || item.media_url} alt={title} aspect="aspect-square" imgClassName="transition duration-500 group-hover:scale-105" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 text-xs font-medium text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {caption || title}
      </span>
      {item.kind === 'video' && (
        <span className="absolute end-2 top-2 rounded-full bg-ink-950/70 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white">
          {t('gallery.video')}
        </span>
      )}
    </button>
  );
}

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const { locale, t } = useI18n();
  const quote = localizedValue(testimonial.quote, locale);
  const serviceLabel = localizedValue(testimonial.service_label, locale);

  return (
    <figure className="card flex h-full flex-col gap-4 p-5">
      {testimonial.rating && (
        <div className="flex items-center gap-0.5" aria-label={`${t('testimonials.ratingLabel')}: ${testimonial.rating}/5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={cn('size-4', index < (testimonial.rating ?? 0) ? 'fill-brand-500 text-brand-500' : 'text-ink-200')}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
      <blockquote className="flex-1 text-sm leading-relaxed text-ink-700">“{quote}”</blockquote>
      <figcaption className="border-t border-ink-100 pt-3 text-xs">
        <span className="font-semibold text-ink-900">{testimonial.customer_name}</span>
        {testimonial.customer_country && <span className="text-ink-500"> · {testimonial.customer_country}</span>}
        {serviceLabel && (
          <span className="mt-1 flex items-center gap-1 text-ink-500">
            <MapPin className="size-3 text-brand-600" aria-hidden="true" />
            {serviceLabel}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
