import type {
  AvailabilityBlock,
  AvailabilityRule,
  ReservationStatus,
} from './types';
import { BLOCKING_STATUSES as BLOCKING } from './types';

export type TimeString = string; // "HH:MM" or "HH:MM:SS"

export interface BookingWindow {
  date: string; // YYYY-MM-DD
  startTime: TimeString;
  durationHours: number;
}

export interface OccupiedSlot {
  date: string;
  startTime: TimeString;
  durationHours: number;
  quantity: number;
  status: ReservationStatus;
  serviceId: string | null;
}

export const toMinutes = (time: TimeString): number => {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
};

export const fromMinutes = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = Math.round(normalized % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const addHours = (time: TimeString, hours: number): string => fromMinutes(toMinutes(time) + Math.round(hours * 60));

export const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd;

/** Day of week for a YYYY-MM-DD string without timezone drift (0 = Sunday). */
export const dayOfWeek = (isoDate: string): number => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay();
};

export const todayISO = (timezone = 'Africa/Casablanca'): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  );

export const addDaysISO = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export interface AvailabilityContext {
  /** Capacity for the requested service (bikes or participant seats). */
  capacity: number;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  occupied: OccupiedSlot[];
  timezone?: string;
  /** Minimum notice before a booking can start, in hours. */
  leadTimeHours?: number;
  now?: Date;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: 'closed' | 'blocked' | 'past' | 'lead_time' | 'capacity' | 'outside_hours';
  message?: string;
  remainingCapacity: number;
}

export const blockingReservations = (slots: OccupiedSlot[]): OccupiedSlot[] =>
  slots.filter((slot) => (BLOCKING as readonly string[]).includes(slot.status));

/** Capacity consumed by overlapping bookings for a service on a given window. */
export function usedCapacity(
  window: BookingWindow,
  occupied: OccupiedSlot[],
  serviceId: string | null,
): number {
  const start = toMinutes(window.startTime);
  const end = start + Math.round(window.durationHours * 60);
  return blockingReservations(occupied)
    .filter((slot) => slot.date === window.date)
    .filter((slot) => serviceId === null || slot.serviceId === serviceId)
    .filter((slot) => {
      const slotStart = toMinutes(slot.startTime);
      const slotEnd = slotStart + Math.round(slot.durationHours * 60);
      return rangesOverlap(start, end, slotStart, slotEnd);
    })
    .reduce((sum, slot) => sum + slot.quantity, 0);
}

function ruleForDate(rules: AvailabilityRule[], date: string, serviceId: string | null): AvailabilityRule | undefined {
  const dow = dayOfWeek(date);
  const active = rules.filter((rule) => rule.is_active && rule.day_of_week === dow);
  return (
    active.find((rule) => serviceId !== null && rule.service_id === serviceId) ??
    active.find((rule) => rule.service_id === null)
  );
}

function applicableBlocks(blocks: AvailabilityBlock[], date: string, serviceId: string | null, window: BookingWindow) {
  const start = toMinutes(window.startTime);
  const end = start + Math.round(window.durationHours * 60);
  return blocks.filter((block) => {
    if (!block.is_active) return false;
    if (block.service_id !== null && block.service_id !== serviceId) return false;
    if (date < block.start_date || date > block.end_date) return false;
    // Whole-day closure
    if (!block.start_time || !block.end_time) return true;
    return rangesOverlap(start, end, toMinutes(block.start_time), toMinutes(block.end_time));
  });
}

/**
 * Single source of truth for availability. Used by the booking form (client hint),
 * the create-reservation Cloudflare Function and the Postgres RPC (defence in depth).
 */
export function checkAvailability(window: BookingWindow, context: AvailabilityContext, serviceId: string | null): AvailabilityResult {
  const { capacity, rules, blocks, occupied } = context;
  const today = todayISO(context.timezone ?? 'Africa/Casablanca');
  const remainingBase = capacity - usedCapacity(window, occupied, serviceId);

  if (window.date < today) {
    return { available: false, reason: 'past', message: 'The selected date is in the past.', remainingCapacity: remainingBase };
  }

  const rule = ruleForDate(rules, window.date, serviceId);
  if (!rule) {
    return { available: false, reason: 'closed', message: 'We are closed on the selected day.', remainingCapacity: remainingBase };
  }

  const start = toMinutes(window.startTime);
  const end = start + Math.round(window.durationHours * 60);
  const open = toMinutes(rule.open_time);
  const close = toMinutes(rule.close_time);
  if (start < open || end > close) {
    return {
      available: false,
      reason: 'outside_hours',
      message: `Bookings must fit within opening hours (${rule.open_time.slice(0, 5)}–${rule.close_time.slice(0, 5)}).`,
      remainingCapacity: remainingBase,
    };
  }

  if (applicableBlocks(blocks, window.date, serviceId, window).length > 0) {
    return { available: false, reason: 'blocked', message: 'That time is not available (closure or maintenance).', remainingCapacity: remainingBase };
  }

  const leadTimeHours = context.leadTimeHours ?? 2;
  if (context.now) {
    const nowUtc = context.now.getTime();
    const [year, month, day] = window.date.split('-').map(Number);
    const [hours, minutes] = window.startTime.split(':').map(Number);
    // Approximate start instant using the timezone offset at "now" (Africa/Casablanca).
    const offsetMinutes = timezoneOffsetMinutes(context.timezone ?? 'Africa/Casablanca', context.now);
    const startUtc = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0) - offsetMinutes * 60_000;
    if (startUtc - nowUtc < leadTimeHours * 3_600_000) {
      return {
        available: false,
        reason: 'lead_time',
        message: `Reservations require at least ${leadTimeHours} hours notice.`,
        remainingCapacity: remainingBase,
      };
    }
  }

  const effectiveCapacity = rule.capacity ?? capacity;
  const remaining = effectiveCapacity - usedCapacity(window, occupied, serviceId);
  if (remaining <= 0) {
    return { available: false, reason: 'capacity', message: 'This time slot is fully booked.', remainingCapacity: 0 };
  }

  return { available: true, remainingCapacity: remaining };
}

export function timezoneOffsetMinutes(timezone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}

/** Generate candidate start times for a day, respecting the closing time. */
export function generateSlots(args: {
  date: string;
  durationHours: number;
  rules: AvailabilityRule[];
  serviceId: string | null;
  intervalMinutes?: number;
}): string[] {
  const rule = ruleForDate(args.rules, args.date, args.serviceId);
  if (!rule) return [];
  const interval = args.intervalMinutes ?? rule.slot_interval_minutes ?? 60;
  const slots: string[] = [];
  const close = toMinutes(rule.close_time);
  for (let minute = toMinutes(rule.open_time); minute + args.durationHours * 60 <= close; minute += interval) {
    slots.push(fromMinutes(minute));
  }
  return slots;
}

export function isSameWindow(a: BookingWindow, b: BookingWindow): boolean {
  return a.date === b.date && a.startTime === b.startTime && a.durationHours === b.durationHours;
}
