import { describe, expect, it } from 'vitest';
import { allowedDurations, buildPriceSnapshot, calculateQuote, discountPercent, PricingError, resolveUnitPrice, roundMoney } from '@shared/domain/pricing';
import type { Service } from '@shared/domain/types';

const rental = {
  base_price: 50,
  price_unit: 'per_bike' as const,
  duration_options: [
    { hours: 1, price: 50 },
    { hours: 2, price: 90 },
    { hours: 4, price: 160 },
    { hours: 8, price: 280 },
  ],
  default_duration_hours: 4,
  min_units: 1,
  max_units: 10,
  capacity: 12,
  addons: [
    { id: 'helmet', price: 20, name: { en: 'Extra helmet', fr: 'Casque', ar: 'خوذة' }, description: { en: '', fr: '', ar: '' } },
    { id: 'child-seat', price: 40, name: { en: 'Child seat', fr: 'Siège', ar: 'مقعد' }, description: { en: '', fr: '', ar: '' } },
  ],
  slug: 'city-bike-rental',
} satisfies Partial<Service> & Record<string, unknown>;

const tour = {
  ...rental,
  price_unit: 'per_person' as const,
  duration_options: [{ hours: 3, price: 250 }],
  base_price: 250,
};

const groupRide = {
  ...rental,
  price_unit: 'per_group' as const,
  duration_options: [{ hours: 3, price: 1500 }],
  base_price: 1500,
  min_units: 4,
  max_units: 20,
};

describe('resolveUnitPrice', () => {
  it('returns the exact tier price', () => {
    expect(resolveUnitPrice(rental, 4)).toBe(160);
  });

  it('charges the next tier up when the duration sits between tiers', () => {
    expect(resolveUnitPrice(rental, 3)).toBe(160);
  });

  it('extends beyond the longest tier at its hourly rate', () => {
    expect(resolveUnitPrice(rental, 12)).toBe(420);
  });

  it('rounds money to two decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01);
  });
});

describe('calculateQuote', () => {
  it('multiplies per-bike prices by the quantity', () => {
    const quote = calculateQuote({ service: rental, durationHours: 4, quantity: 2, addonIds: [] });
    expect(quote.subtotal).toBe(320);
    expect(quote.total).toBe(320);
    expect(quote.priceUnit).toBe('per_bike');
  });

  it('adds fixed-price add-ons once per reservation', () => {
    const quote = calculateQuote({ service: rental, durationHours: 4, quantity: 3, addonIds: ['helmet', 'child-seat'] });
    expect(quote.subtotal).toBe(480);
    expect(quote.addonsTotal).toBe(60);
    expect(quote.total).toBe(540);
  });

  it('ignores the quantity for per-group pricing', () => {
    const quote = calculateQuote({ service: groupRide, durationHours: 3, quantity: 12, addonIds: [] });
    expect(quote.subtotal).toBe(1500);
    expect(quote.total).toBe(1500);
  });

  it('uses the offer price per person when an offer is chosen', () => {
    const quote = calculateQuote({
      service: tour,
      offer: { price: 260, duration_hours: 3, translations: [] },
      durationHours: 3,
      quantity: 2,
      addonIds: [],
    });
    expect(quote.unitPrice).toBe(260);
    expect(quote.total).toBe(520);
  });

  it('rejects quantities outside the service limits', () => {
    expect(() => calculateQuote({ service: groupRide, durationHours: 3, quantity: 2, addonIds: [] })).toThrow(PricingError);
  });

  it('rejects unknown add-ons', () => {
    expect(() => calculateQuote({ service: rental, durationHours: 4, quantity: 1, addonIds: ['jetpack'] })).toThrow(/Unknown add-on/);
  });

  it('rejects non-positive durations', () => {
    expect(() => calculateQuote({ service: rental, durationHours: 0, quantity: 1, addonIds: [] })).toThrow(PricingError);
  });
});

describe('buildPriceSnapshot', () => {
  it('freezes the calculation inputs', () => {
    const quote = calculateQuote({ service: rental, durationHours: 2, quantity: 1, addonIds: ['helmet'] });
    const snapshot = buildPriceSnapshot({ quote, serviceName: 'City bike rental', serviceSlug: 'city-bike-rental' });
    expect(snapshot).toMatchObject({
      service_name: 'City bike rental',
      unit_price: 90,
      quantity: 1,
      total: 110,
      currency: 'MAD',
    });
    expect(snapshot.addons).toHaveLength(1);
  });
});

describe('helpers', () => {
  it('lists allowed durations from tiers', () => {
    expect(allowedDurations(rental)).toEqual([1, 2, 4, 8]);
  });

  it('computes the discount percentage', () => {
    expect(discountPercent(260, 320)).toBe(19);
    expect(discountPercent(320, 320)).toBeNull();
    expect(discountPercent(320, null)).toBeNull();
  });
});
