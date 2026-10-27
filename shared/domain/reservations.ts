import type { ReservationStatus } from './types';

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No-show',
};

export const RESERVATION_STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  confirmed: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  cancelled: 'bg-ink-100 text-ink-600 ring-1 ring-ink-200',
  completed: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  no_show: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200',
};

export const RESERVATION_STATUS_DOT: Record<ReservationStatus, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-brand-600',
  rejected: 'bg-red-500',
  cancelled: 'bg-ink-400',
  completed: 'bg-sky-500',
  no_show: 'bg-orange-500',
};

/** Allowed status transitions for administrators. */
export const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show', 'pending'],
  rejected: ['pending'],
  cancelled: ['pending'],
  completed: [],
  no_show: ['completed'],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: ReservationStatus): boolean {
  return status === 'completed' || status === 'no_show';
}

/** A short human readable code plus randomness. Collision-safe via DB unique index. */
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReference(random: () => number = Math.random, now: Date = new Date()): string {
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .replace(/-/g, '');
  let suffix = '';
  for (let index = 0; index < 4; index += 1) {
    suffix += REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length)];
  }
  return `MJB-${datePart}-${suffix}`;
}

export const REFERENCE_PATTERN = /^MJB-\d{6}-[A-Z2-9]{4}$/;

export function reservationDurationLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (Number.isInteger(hours)) return `${hours} h`;
  return `${Math.floor(hours)} h ${Math.round((hours % 1) * 60)} min`;
}
