/**
 * Domain types shared by the browser app, Cloudflare Pages Functions and tests.
 * These mirror the Supabase schema in `supabase/migrations`.
 */

export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const DIRECTIONS: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  fr: 'ltr',
  ar: 'rtl',
};

export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  fr: { native: 'Français', english: 'French' },
  ar: { native: 'العربية', english: 'Arabic' },
};

/* ------------------------------------------------------------------ */
/* Roles & admin                                                       */
/* ------------------------------------------------------------------ */

export const ADMIN_ROLES = ['super_admin', 'admin', 'staff'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

export const ROLE_RANK: Record<AdminRole, number> = { staff: 1, admin: 2, super_admin: 3 };

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export const SERVICE_KINDS = ['rental', 'tour', 'lesson', 'experience', 'event'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export type PriceUnit = 'per_person' | 'per_bike' | 'per_group';

export interface DurationOption {
  /** Duration in hours. 0.5 = 30 minutes. */
  hours: number;
  /** Price in MAD for one unit at this duration. */
  price: number;
}

export interface ServiceTranslation {
  locale: Locale;
  name: string;
  short_description: string;
  description: string;
  highlights: string[];
  meta_title: string | null;
  meta_description: string | null;
}

export interface Service {
  id: string;
  slug: string;
  kind: ServiceKind;
  image_url: string;
  gallery: string[];
  price_unit: PriceUnit;
  base_price: number;
  duration_options: DurationOption[];
  default_duration_hours: number;
  capacity: number;
  min_units: number;
  max_units: number;
  /** Extra bookable services, e.g. helmet, child seat, guide. */
  addons: ServiceAddon[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  translations: ServiceTranslation[];
}

export interface ServiceAddon {
  id: string;
  /** Price in MAD, charged once per reservation. */
  price: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
}

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */

export type OfferStatus = 'draft' | 'published' | 'archived';

export interface OfferTranslation {
  locale: Locale;
  title: string;
  short_description: string;
  description: string;
  included: string[];
}

export interface Offer {
  id: string;
  slug: string;
  service_id: string | null;
  image_url: string;
  price: number;
  compare_at_price: number | null;
  duration_hours: number;
  validity_start: string;
  validity_end: string;
  capacity: number | null;
  bookings_count: number;
  status: OfferStatus;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  translations: OfferTranslation[];
}

/* ------------------------------------------------------------------ */
/* Reservations                                                        */
/* ------------------------------------------------------------------ */

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'no_show',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Statuses that consume inventory. */
export const BLOCKING_STATUSES: ReservationStatus[] = ['pending', 'confirmed'];

/** Statuses that represent a realised (billable) booking. */
export const REVENUE_STATUSES: ReservationStatus[] = ['confirmed', 'completed'];

export type ReservationType = ServiceKind;

export const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export interface ReservationItem {
  id: string;
  reservation_id: string;
  service_id: string | null;
  service_slug: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  duration_hours: number;
  line_total: number;
  bicycle_id: string | null;
}

export interface ReservationNote {
  id: string;
  reservation_id: string;
  author_id: string | null;
  author_name: string;
  note: string;
  is_customer_communication: boolean;
  created_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  reservation_id: string;
  from_status: ReservationStatus | null;
  to_status: ReservationStatus;
  changed_by: string | null;
  changed_by_name: string;
  reason: string | null;
  created_at: string;
}

/** Snapshot of the price inputs at the moment of booking. Never recalculated later. */
export interface PriceSnapshot {
  service_name: string;
  service_slug: string;
  offer_title?: string | null;
  price_unit: PriceUnit;
  unit_price: number;
  quantity: number;
  duration_hours: number;
  addons: { id: string; name: string; price: number }[];
  subtotal: number;
  total: number;
  currency: 'MAD';
}

export interface Reservation {
  id: string;
  reference: string;
  status: ReservationStatus;
  reservation_type: ReservationType;
  service_id: string | null;
  offer_id: string | null;
  customer_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  preferred_contact: ContactMethod;
  participants: number;
  reservation_date: string;
  start_time: string;
  duration_hours: number;
  addons: { id: string; name: string; price: number }[];
  message: string | null;
  locale: Locale;
  total_price: number;
  price_snapshot: PriceSnapshot | null;
  privacy_accepted: boolean;
  assigned_staff_id: string | null;
  internal_notes: string | null;
  cancellation_reason: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  source: 'website' | 'admin' | 'phone';
  created_at: string;
  updated_at: string;
  items: ReservationItem[];
  history: StatusHistoryEntry[];
  notes: ReservationNote[];
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  locale: Locale;
  first_seen_at: string;
  last_booking_at: string | null;
  marketing_consent: boolean;
  reservations_count?: number;
  total_value?: number;
  notes?: CustomerNote[];
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  author_id: string | null;
  author_name: string;
  note: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

export interface AvailabilityRule {
  id: string;
  service_id: string | null;
  day_of_week: number; // 0 = Sunday … 6 = Saturday
  open_time: string;
  close_time: string;
  slot_interval_minutes: number;
  capacity: number | null;
  is_active: boolean;
}

export interface AvailabilityBlock {
  id: string;
  service_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  is_active: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export const BICYCLE_STATUSES = ['available', 'rented', 'maintenance', 'inactive'] as const;
export type BicycleStatus = (typeof BICYCLE_STATUSES)[number];

export interface Bicycle {
  id: string;
  internal_code: string;
  name: string;
  category: string;
  size: string | null;
  service_id: string | null;
  quantity: number;
  status: BicycleStatus;
  purchase_date: string | null;
  last_service_at: string | null;
  maintenance_notes: string | null;
  image_url: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export interface GalleryItem {
  id: string;
  kind: 'image' | 'video';
  media_url: string;
  thumbnail_url: string | null;
  title: Record<Locale, string>;
  caption: Record<Locale, string>;
  category: 'tours' | 'coastal' | 'customers' | 'team' | 'rentals' | 'promo';
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  customer_country: string | null;
  rating: number | null;
  quote: Record<Locale, string>;
  service_label: Record<Locale, string>;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  business_name: string;
  tagline: Record<Locale, string>;
  phone: string;
  whatsapp: string;
  email: string;
  address: Record<Locale, string>;
  maps_url: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  youtube_url: string;
  opening_hours: { days: string; hours: string }[];
  about_claims: { value: string; label: Record<Locale, string> }[];
  faq: { question: Record<Locale, string>; answer: Record<Locale, string> }[];
  currency: string;
  timezone: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

export const NOTE_CATEGORIES = [
  'customer_follow_up',
  'maintenance',
  'inventory',
  'staff',
  'marketing',
  'finance',
  'general',
] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const NOTE_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type NotePriority = (typeof NOTE_PRIORITIES)[number];

export interface AdminNote {
  id: string;
  title: string;
  body: string;
  category: NoteCategory;
  priority: NotePriority;
  note_date: string | null;
  follow_up_date: string | null;
  is_completed: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  reservation_id: string | null;
  customer_id: string | null;
  offer_id: string | null;
  calendar_event_id: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  event_type: 'tour' | 'maintenance' | 'staff' | 'block' | 'other';
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  channel: 'email' | 'whatsapp';
  template: string;
  recipient: string;
  reservation_id: string | null;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: 'page_view' | 'reservation_submitted' | 'offer_view' | 'cta_click';
  path: string;
  locale: Locale;
  anonymous_id: string;
  session_id: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_category: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  country: string | null;
  created_at: string;
}
