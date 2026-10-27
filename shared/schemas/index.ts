import { z } from 'zod';
import {
  ADMIN_ROLES,
  BICYCLE_STATUSES,
  CONTACT_METHODS,
  LOCALES,
  NOTE_CATEGORIES,
  NOTE_PRIORITIES,
  RESERVATION_STATUSES,
  SERVICE_KINDS,
} from '../domain/types';

const localeSchema = z.enum(LOCALES);
const idSchema = z.string().min(1).max(64);

/* ------------------------------------------------------------------ */
/* Reservations                                                        */
/* ------------------------------------------------------------------ */

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Please enter your full name.')
  .max(80, 'Name is too long.')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u, 'Please use letters, spaces, hyphens or apostrophes only.');

export const phoneSchema = z
  .string()
  .trim()
  .min(8, 'Please enter a valid phone number.')
  .max(20, 'Phone number is too long.')
  .regex(/^\+?[0-9][0-9\s().-]{6,18}$/, 'Enter a phone number with its country code, e.g. +212 612 345 678.');

export const reservationCreateSchema = z.object({
  locale: localeSchema,
  reservation_type: z.enum(SERVICE_KINDS),
  service_id: idSchema,
  offer_id: idSchema.nullish(),
  full_name: nameSchema,
  email: z.email('Please enter a valid email address.').max(160),
  phone: phoneSchema,
  preferred_contact: z.enum(CONTACT_METHODS),
  quantity: z.coerce.number().int('Enter a whole number.').min(1, 'At least one bike or participant.').max(30, 'For groups larger than 30, please contact us directly.'),
  reservation_date: z.iso.date('Choose a valid date.'),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Choose a valid start time.'),
  duration_hours: z.coerce.number().positive('Choose a duration.').max(48, 'Maximum duration is 48 hours.'),
  addons: z.array(z.string().max(64)).max(10).optional().default([]),
  message: z.string().trim().max(1200, 'Please keep your message under 1200 characters.').optional().default(''),
  privacy_accepted: z.literal(true, { message: 'You must accept the privacy policy.' }),
  // Anti-spam honeypot: must stay empty.
  company: z.string().max(0).optional().default(''),
});

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;

export const reservationUpdateSchema = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
  reason: z.string().trim().max(500).optional(),
  internal_notes: z.string().trim().max(2000).optional(),
  assigned_staff_id: z.string().uuid().nullable().optional(),
  proposed_date: z.iso.date().nullable().optional(),
  proposed_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  force: z.boolean().optional().default(false),
});

export type ReservationUpdateInput = z.input<typeof reservationUpdateSchema>;

export const reservationLookupSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MJB-\d{6}-[A-Z2-9]{4}$/, 'Enter the reference in the format MJB-260101-ABCD.'),
  email: z.email('Enter the email used for the booking.'),
});

export const contactMessageSchema = z.object({
  full_name: nameSchema,
  email: z.email('Please enter a valid email address.').max(160),
  phone: phoneSchema.optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Add a subject.').max(140),
  message: z.string().trim().min(10, 'Tell us a little more.').max(2000),
  locale: localeSchema,
  privacy_accepted: z.literal(true, { message: 'You must accept the privacy policy.' }),
  company: z.string().max(0).optional().default(''),
});

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: z.email('Enter your administrator email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const passwordRequestSchema = z.object({
  email: z.email('Enter your administrator email.'),
});

export const passwordUpdateSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Use at least 10 characters.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[0-9]/, 'Include a number.'),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

/* ------------------------------------------------------------------ */
/* Content management                                                 */
/* ------------------------------------------------------------------ */

const translationShape = {
  locale: localeSchema,
};

export const serviceUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens.'),
  kind: z.enum(SERVICE_KINDS),
  image_url: z.string().max(500).default(''),
  gallery: z.array(z.string().max(500)).max(8).default([]),
  price_unit: z.enum(['per_person', 'per_bike', 'per_group']),
  base_price: z.coerce.number().min(0).max(100000),
  duration_options: z
    .array(z.object({ hours: z.coerce.number().positive().max(48), price: z.coerce.number().min(0).max(100000) }))
    .max(12)
    .default([]),
  default_duration_hours: z.coerce.number().positive().max(48),
  capacity: z.coerce.number().int().min(1).max(200),
  min_units: z.coerce.number().int().min(1).max(50),
  max_units: z.coerce.number().int().min(1).max(200),
  addons: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        price: z.coerce.number().min(0).max(10000),
        name: z.record(z.enum(LOCALES), z.string().max(120)),
        description: z.record(z.enum(LOCALES), z.string().max(240)),
      }),
    )
    .max(8)
    .default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  translations: z
    .array(
      z.object({
        ...translationShape,
        name: z.string().trim().min(2).max(120),
        short_description: z.string().trim().min(10).max(240),
        description: z.string().trim().min(20).max(4000),
        highlights: z.array(z.string().max(160)).max(8).default([]),
        meta_title: z.string().max(160).nullable().optional(),
        meta_description: z.string().max(300).nullable().optional(),
      }),
    )
    .length(3, 'Provide content for EN, FR and AR.'),
});

export const offerUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens.'),
  service_id: z.string().nullable().default(null),
  image_url: z.string().max(500).default(''),
  price: z.coerce.number().min(0).max(100000),
  compare_at_price: z.coerce.number().min(0).max(100000).nullable().default(null),
  duration_hours: z.coerce.number().positive().max(72),
  validity_start: z.iso.date(),
  validity_end: z.iso.date(),
  capacity: z.coerce.number().int().min(1).max(500).nullable().default(null),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_featured: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  translations: z
    .array(
      z.object({
        ...translationShape,
        title: z.string().trim().min(3).max(120),
        short_description: z.string().trim().min(10).max(240),
        description: z.string().trim().min(20).max(4000),
        included: z.array(z.string().max(160)).max(10).default([]),
      }),
    )
    .length(3, 'Provide content for EN, FR and AR.'),
});

export const bicycleUpsertSchema = z.object({
  internal_code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  size: z.string().trim().max(20).nullable().default(null),
  service_id: z.string().nullable().default(null),
  quantity: z.coerce.number().int().min(0).max(500),
  status: z.enum(BICYCLE_STATUSES),
  purchase_date: z.iso.date().nullable().default(null),
  last_service_at: z.iso.date().nullable().default(null),
  maintenance_notes: z.string().max(1000).nullable().default(null),
  image_url: z.string().max(500).nullable().default(null),
});

export const availabilityBlockSchema = z.object({
  service_id: z.string().nullable().default(null),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .default(null),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .default(null),
  reason: z.string().trim().min(3).max(200),
  is_active: z.boolean().default(true),
});

export const noteUpsertSchema = z.object({
  title: z.string().trim().min(3, 'Add a title.').max(140),
  body: z.string().trim().min(3, 'Add some detail.').max(4000),
  category: z.enum(NOTE_CATEGORIES),
  priority: z.enum(NOTE_PRIORITIES),
  note_date: z.iso.date().nullable().default(null),
  follow_up_date: z.iso.date().nullable().default(null),
  is_completed: z.boolean().default(false),
  is_pinned: z.boolean().default(false),
  is_archived: z.boolean().default(false),
  reservation_id: z.string().nullable().default(null),
  customer_id: z.string().nullable().default(null),
  offer_id: z.string().nullable().default(null),
});

export const galleryItemSchema = z.object({
  kind: z.enum(['image', 'video']),
  media_url: z.string().min(3).max(600),
  thumbnail_url: z.string().max(600).nullable().default(null),
  category: z.enum(['tours', 'coastal', 'customers', 'team', 'rentals', 'promo']),
  title: z.record(z.enum(LOCALES), z.string().max(160)),
  caption: z.record(z.enum(LOCALES), z.string().max(300)),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const testimonialSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_country: z.string().trim().max(60).nullable().default(null),
  rating: z.coerce.number().int().min(1).max(5).nullable().default(null),
  quote: z.record(z.enum(LOCALES), z.string().min(10).max(1000)),
  service_label: z.record(z.enum(LOCALES), z.string().max(120)),
  is_published: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const staffUpsertSchema = z.object({
  email: z.email(),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(ADMIN_ROLES),
  phone: z.string().max(30).nullable().default(null),
});

export const analyticsEventSchema = z.object({
  event_type: z.enum(['page_view', 'reservation_submitted', 'offer_view', 'cta_click']),
  path: z.string().min(1).max(300),
  locale: localeSchema,
  anonymous_id: z.string().min(8).max(64),
  session_id: z.string().min(8).max(64),
  referrer: z.string().max(300).nullable().optional(),
  utm_source: z.string().max(120).nullable().optional(),
  utm_medium: z.string().max(120).nullable().optional(),
  utm_campaign: z.string().max(120).nullable().optional(),
  device_category: z.enum(['mobile', 'tablet', 'desktop']),
  browser: z.string().max(60),
  country: z.string().max(2).nullable().optional(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

/** Flatten a ZodError into `{ "field.path": "message" }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
