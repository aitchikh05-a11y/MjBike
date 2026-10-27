import { describe, expect, it } from 'vitest';
import {
  canTransition,
  generateReference,
  isTerminal,
  REFERENCE_PATTERN,
  reservationDurationLabel,
  STATUS_TRANSITIONS,
} from '@shared/domain/reservations';
import { can, ROLE_PERMISSIONS } from '@shared/domain/permissions';
import { buildPath, PUBLIC_PAGES, SLUGS, LOCALES } from './helpers';

describe('reservation references', () => {
  it('matches the documented format', () => {
    const reference = generateReference();
    expect(REFERENCE_PATTERN.test(reference)).toBe(true);
    expect(reference).toMatch(/^MJB-\d{6}-[A-Z2-9]{4}$/);
  });

  it('is deterministic for a given clock and random source', () => {
    const now = new Date('2026-01-05T12:00:00.000Z');
    const reference = generateReference(() => 0, now);
    expect(reference).toBe('MJB-260105-AAAA');
  });

  it('never uses ambiguous characters', () => {
    for (let index = 0; index < 200; index += 1) {
      const suffix = generateReference().split('-')[2] ?? '';
      expect(suffix).not.toMatch(/[O0I1]/);
    }
  });
});

describe('status transitions', () => {
  it('allows the documented forward moves', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('confirmed', 'completed')).toBe(true);
    expect(canTransition('confirmed', 'no_show')).toBe(true);
    expect(canTransition('no_show', 'completed')).toBe(true);
  });

  it('blocks moves that would confuse the history', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('completed', 'pending')).toBe(false);
    expect(canTransition('rejected', 'confirmed')).toBe(false);
  });

  it('treats completed and no-show as terminal or near-terminal', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('no_show')).toBe(true);
    expect(isTerminal('pending')).toBe(false);
    expect(STATUS_TRANSITIONS.completed).toEqual([]);
  });
});

describe('roles', () => {
  it('keeps settings and user management exclusive to super admins', () => {
    expect(can('super_admin', 'settings:manage')).toBe(true);
    expect(can('admin', 'settings:manage')).toBe(false);
    expect(can('admin', 'users:manage')).toBe(false);
    expect(can('staff', 'users:manage')).toBe(false);
  });

  it('lets staff work on their own reservations and notes only', () => {
    expect(can('staff', 'reservations:view_assigned')).toBe(true);
    expect(can('staff', 'reservations:view_all')).toBe(false);
    expect(can('staff', 'notes:manage_own')).toBe(true);
    expect(can('staff', 'customers:view')).toBe(false);
    expect(can('staff', 'analytics:view')).toBe(false);
  });

  it('never grants a permission twice', () => {
    for (const role of ['staff', 'admin', 'super_admin'] as const) {
      const permissions = ROLE_PERMISSIONS[role];
      expect(new Set(permissions).size).toBe(permissions.length);
    }
  });
});

describe('localized routing', () => {
  it('builds a path for every page in every locale', () => {
    for (const locale of LOCALES) {
      for (const page of PUBLIC_PAGES) {
        const path = buildPath(page, locale);
        expect(path.startsWith(`/${locale}`)).toBe(true);
        expect(path.endsWith('/')).toBe(true);
      }
    }
  });

  it('uses distinct French and Arabic slugs for key pages', () => {
    expect(SLUGS.fr.rentals).toBe('location-velos');
    expect(SLUGS.fr.tours).toBe('balades-velo');
    expect(SLUGS.ar.rentals).toBe('tajir-darajat');
    expect(SLUGS.ar.booking).toBe('hajz');
  });

  it('appends the reference to the confirmation URL', () => {
    expect(buildPath('reservationStatus', 'en', { reference: 'MJB-260105-ABCD' })).toBe(
      '/en/reservations/confirmation?ref=MJB-260105-ABCD',
    );
  });
});

describe('duration labels', () => {
  it('formats hours and minutes', () => {
    expect(reservationDurationLabel(3)).toBe('3 h');
    expect(reservationDurationLabel(1.5)).toBe('1 h 30 min');
    expect(reservationDurationLabel(0.5)).toBe('30 min');
  });
});
