import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  addHours,
  checkAvailability,
  dayOfWeek,
  fromMinutes,
  generateSlots,
  rangesOverlap,
  toMinutes,
  todayISO,
  usedCapacity,
  type AvailabilityContext,
} from '@shared/domain/availability';
import type { AvailabilityRule } from '@shared/domain/types';

const rules: AvailabilityRule[] = Array.from({ length: 7 }, (_, day) => ({
  id: `rule-${day}`,
  service_id: null,
  day_of_week: day,
  open_time: '09:00',
  close_time: '21:00',
  slot_interval_minutes: 60,
  capacity: null,
  is_active: true,
}));

const context: AvailabilityContext = {
  capacity: 6,
  rules,
  blocks: [],
  occupied: [],
  timezone: 'Africa/Casablanca',
  leadTimeHours: 0,
  now: new Date('2025-06-01T08:00:00.000Z'),
};

const futureDate = addDaysISO(todayISO(), 5);

describe('time helpers', () => {
  it('converts times to minutes and back', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(fromMinutes(570)).toBe('09:30');
    expect(addHours('09:00', 3.5)).toBe('12:30');
    expect(addHours('23:00', 2)).toBe('01:00');
  });

  it('detects overlapping ranges', () => {
    expect(rangesOverlap(0, 60, 30, 90)).toBe(true);
    expect(rangesOverlap(0, 60, 60, 90)).toBe(false);
  });

  it('computes the weekday without timezone drift', () => {
    expect(dayOfWeek('2025-01-05')).toBe(0); // Sunday
    expect(dayOfWeek('2025-01-06')).toBe(1); // Monday
  });

  it('adds days across month boundaries', () => {
    expect(addDaysISO('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDaysISO('2025-03-01', -1)).toBe('2025-02-28');
  });
});

describe('checkAvailability', () => {
  it('accepts a booking inside opening hours with capacity left', () => {
    const result = checkAvailability({ date: futureDate, startTime: '10:00', durationHours: 4 }, context, 'svc-1');
    expect(result.available).toBe(true);
    expect(result.remainingCapacity).toBe(6);
  });

  it('rejects dates in the past', () => {
    const result = checkAvailability({ date: addDaysISO(todayISO(), -1), startTime: '10:00', durationHours: 2 }, context, 'svc-1');
    expect(result.reason).toBe('past');
  });

  it('rejects a booking that ends after closing time', () => {
    const result = checkAvailability({ date: futureDate, startTime: '19:00', durationHours: 4 }, context, 'svc-1');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('outside_hours');
  });

  it('rejects a booking starting before opening time', () => {
    const result = checkAvailability({ date: futureDate, startTime: '08:00', durationHours: 2 }, context, 'svc-1');
    expect(result.reason).toBe('outside_hours');
  });

  it('rejects closed days', () => {
    const closed: AvailabilityContext = {
      ...context,
      rules: rules.map((rule) => ({ ...rule, is_active: rule.day_of_week !== dayOfWeek(futureDate) })),
    };
    const result = checkAvailability({ date: futureDate, startTime: '10:00', durationHours: 2 }, closed, 'svc-1');
    expect(result.reason).toBe('closed');
  });

  it('rejects a blocked window but allows the rest of the day', () => {
    const blocked: AvailabilityContext = {
      ...context,
      blocks: [
        {
          id: 'block-1',
          service_id: null,
          start_date: futureDate,
          end_date: futureDate,
          start_time: '10:00',
          end_time: '12:00',
          reason: 'Workshop',
          is_active: true,
          created_at: '2025-01-01T00:00:00.000Z',
        },
      ],
    };
    expect(checkAvailability({ date: futureDate, startTime: '10:00', durationHours: 2 }, blocked, 'svc-1').reason).toBe('blocked');
    expect(checkAvailability({ date: futureDate, startTime: '14:00', durationHours: 2 }, blocked, 'svc-1').available).toBe(true);
  });

  it('rejects when blocking reservations fill the capacity', () => {
    const full: AvailabilityContext = {
      ...context,
      occupied: [
        { date: futureDate, startTime: '10:00', durationHours: 3, quantity: 6, status: 'confirmed', serviceId: 'svc-1' },
      ],
    };
    const result = checkAvailability({ date: futureDate, startTime: '11:00', durationHours: 2 }, full, 'svc-1');
    expect(result.reason).toBe('capacity');
    expect(result.remainingCapacity).toBe(0);
  });

  it('does not count cancelled or rejected reservations against capacity', () => {
    const context2: AvailabilityContext = {
      ...context,
      occupied: [
        { date: futureDate, startTime: '10:00', durationHours: 3, quantity: 6, status: 'cancelled', serviceId: 'svc-1' },
        { date: futureDate, startTime: '10:00', durationHours: 3, quantity: 6, status: 'rejected', serviceId: 'svc-1' },
      ],
    };
    expect(checkAvailability({ date: futureDate, startTime: '11:00', durationHours: 2 }, context2, 'svc-1').available).toBe(true);
  });

  it('enforces the lead time', () => {
    const soon = new Date();
    const result = checkAvailability(
      { date: todayISO(), startTime: '10:00', durationHours: 2 },
      { ...context, leadTimeHours: 48, now: soon },
      'svc-1',
    );
    expect(result.available).toBe(false);
    expect(['lead_time', 'past']).toContain(result.reason);
  });
});

describe('usedCapacity', () => {
  it('sums only overlapping blocking reservations for the same service', () => {
    const occupied = [
      { date: futureDate, startTime: '10:00', durationHours: 2, quantity: 2, status: 'confirmed' as const, serviceId: 'svc-1' },
      { date: futureDate, startTime: '12:00', durationHours: 2, quantity: 1, status: 'pending' as const, serviceId: 'svc-1' },
      { date: futureDate, startTime: '10:00', durationHours: 2, quantity: 4, status: 'cancelled' as const, serviceId: 'svc-1' },
      { date: futureDate, startTime: '10:00', durationHours: 2, quantity: 5, status: 'confirmed' as const, serviceId: 'svc-2' },
    ];
    expect(usedCapacity({ date: futureDate, startTime: '10:00', durationHours: 2 }, occupied, 'svc-1')).toBe(2);
  });
});

describe('generateSlots', () => {
  it('stops generating when the duration would pass closing time', () => {
    const slots = generateSlots({ date: futureDate, durationHours: 4, rules, serviceId: null });
    expect(slots[0]).toBe('09:00');
    expect(slots.at(-1)).toBe('17:00');
    expect(slots).not.toContain('18:00');
  });

  it('returns nothing when the day is closed', () => {
    const closedRules = rules.map((rule) => ({ ...rule, is_active: rule.day_of_week !== dayOfWeek(futureDate) }));
    expect(generateSlots({ date: futureDate, durationHours: 2, rules: closedRules, serviceId: null })).toEqual([]);
  });
});
