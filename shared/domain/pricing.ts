import type { DurationOption, Offer, PriceSnapshot, PriceUnit, Service } from './types';

export class PricingError extends Error {
  code: 'invalid_duration' | 'invalid_quantity' | 'invalid_addon' | 'unavailable';
  constructor(code: PricingError['code'], message: string) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
  }
}

export interface QuoteInput {
  service: Pick<Service, 'base_price' | 'price_unit' | 'duration_options' | 'default_duration_hours' | 'min_units' | 'max_units' | 'capacity' | 'addons' | 'slug'> & {
    translations?: { locale: string; name: string }[];
  };
  offer?: Pick<Offer, 'price' | 'duration_hours' | 'translations'> | null;
  durationHours: number;
  quantity: number;
  addonIds: string[];
}

export interface Quote {
  unitPrice: number;
  quantity: number;
  durationHours: number;
  subtotal: number;
  addons: { id: string; name: string; price: number }[];
  addonsTotal: number;
  total: number;
  currency: 'MAD';
  priceUnit: PriceUnit;
}

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Resolve the unit price for a requested duration.
 * Rentals use duration tiers; tours are a flat per-person/per-group price.
 */
export function resolveUnitPrice(
  service: Pick<Service, 'base_price' | 'price_unit' | 'duration_options'>,
  durationHours: number,
): number {
  const tiers = [...(service.duration_options ?? [])].sort((a, b) => a.hours - b.hours);
  if (tiers.length === 0) return roundMoney(service.base_price);

  const exact = tiers.find((tier) => tier.hours === durationHours);
  if (exact) return roundMoney(exact.price);

  // Hourly rentals: interpolate beyond the longest tier using its hourly rate.
  const longest = tiers[tiers.length - 1] as DurationOption;
  if (durationHours > longest.hours) {
    const hourly = longest.price / longest.hours;
    return roundMoney(hourly * durationHours);
  }
  // Inside the ladder: charge the next tier up (never undercharge a longer ride).
  const next = tiers.find((tier) => tier.hours > durationHours);
  return roundMoney(next ? next.price : service.base_price);
}

export function allowedDurations(service: Pick<Service, 'duration_options' | 'default_duration_hours'>): number[] {
  if (service.duration_options?.length) {
    return [...new Set(service.duration_options.map((option) => option.hours))].sort((a, b) => a - b);
  }
  return [service.default_duration_hours || 4];
}

/**
 * Authoritative quote calculation. The browser uses this to show a live total and
 * the server recomputes with the same function — prices are never trusted from the client.
 */
export function calculateQuote(input: QuoteInput): Quote {
  const { service, offer, durationHours, quantity, addonIds } = input;

  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new PricingError('invalid_duration', 'Duration must be greater than zero.');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new PricingError('invalid_quantity', 'Quantity must be at least one.');
  }
  if (quantity < (service.min_units ?? 1) || quantity > (service.max_units ?? 20)) {
    throw new PricingError('invalid_quantity', `Quantity must be between ${service.min_units} and ${service.max_units}.`);
  }

  let unitPrice: number;
  let priceUnit = service.price_unit;

  if (offer) {
    unitPrice = roundMoney(offer.price);
    priceUnit = 'per_person';
  } else if (priceUnit === 'per_group') {
    unitPrice = resolveUnitPrice(service, durationHours);
  } else {
    unitPrice = resolveUnitPrice(service, durationHours);
  }

  const multiplicand = priceUnit === 'per_group' ? 1 : quantity;
  const subtotal = roundMoney(unitPrice * multiplicand);

  const availableAddons = service.addons ?? [];
  const addons = addonIds.map((id) => {
    const addon = availableAddons.find((item) => item.id === id);
    if (!addon) throw new PricingError('invalid_addon', `Unknown add-on: ${id}`);
    const label =
      addon.name && typeof addon.name === 'object'
        ? (addon.name.en ?? Object.values(addon.name)[0] ?? 'Add-on')
        : 'Add-on';
    return { id: addon.id, name: label, price: roundMoney(addon.price) };
  });
  const addonsTotal = roundMoney(addons.reduce((sum, addon) => sum + addon.price, 0));

  return {
    unitPrice,
    quantity,
    durationHours,
    subtotal,
    addons,
    addonsTotal,
    total: roundMoney(subtotal + addonsTotal),
    currency: 'MAD',
    priceUnit,
  };
}

export function buildPriceSnapshot(args: {
  quote: Quote;
  serviceName: string;
  serviceSlug: string;
  offerTitle?: string | null;
}): PriceSnapshot {
  const { quote } = args;
  return {
    service_name: args.serviceName,
    service_slug: args.serviceSlug,
    offer_title: args.offerTitle ?? null,
    price_unit: quote.priceUnit,
    unit_price: quote.unitPrice,
    quantity: quote.quantity,
    duration_hours: quote.durationHours,
    addons: quote.addons,
    subtotal: quote.subtotal,
    total: quote.total,
    currency: 'MAD',
  };
}

export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatMAD(amount: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-MA' : 'en-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
  return formatter.format(amount);
}
