import type {
  AdminNote,
  AnalyticsEvent,
  AuditLog,
  AvailabilityBlock,
  AvailabilityRule,
  Bicycle,
  CalendarEvent,
  Customer,
  GalleryItem,
  Offer,
  OfferStatus,
  Profile,
  Reservation,
  ReservationStatus,
  Service,
  SiteSettings,
  Testimonial,
  Locale,
} from '@shared/domain/types';
import type { AnalyticsEventInput, ReservationCreateInput, ReservationUpdateInput } from '@shared/schemas';

export type BackendMode = 'demo' | 'supabase';

export interface PublicData {
  settings: SiteSettings;
  services: Service[];
  offers: Offer[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
}

export interface SlotInfo {
  time: string;
  available: boolean;
  remaining: number;
  reason?: string;
}

export interface AvailabilityQuery {
  serviceId: string;
  date: string;
  durationHours: number;
}

export interface ReservationFilters {
  search?: string;
  status?: ReservationStatus[];
  type?: string;
  from?: string;
  to?: string;
  staffId?: string;
  sort?: 'created_at' | 'reservation_date' | 'updated_at';
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ReservationPage {
  items: Reservation[];
  total: number;
}

export interface CustomerRecord extends Customer {
  notes: Customer['notes'];
}

export type OfferDraft = Omit<Offer, 'id' | 'created_at' | 'updated_at' | 'bookings_count'> & { id?: string };

export type ServiceDraft = Omit<Service, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export type GalleryDraft = Omit<GalleryItem, 'id' | 'created_at'> & { id?: string };

export type TestimonialDraft = Omit<Testimonial, 'id' | 'created_at'> & { id?: string };

export type NoteDraft = Omit<AdminNote, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_name'> & { id?: string };

export type BlockDraft = Omit<AvailabilityBlock, 'id' | 'created_at'> & { id?: string };

export type EventDraft = Omit<CalendarEvent, 'id' | 'created_at' | 'created_by'> & { id?: string };

export type BicycleDraft = Omit<Bicycle, 'id' | 'created_at'> & { id?: string };

export interface AnalyticsSummary {
  visitors: number;
  pageViews: number;
  reservationRequests: number;
  conversionRate: number;
  trend: { date: string; visitors: number; pageViews: number; reservations: number }[];
  topPages: { path: string; views: number; visitors: number }[];
  landingPages: { path: string; visits: number }[];
  referrers: { source: string; visits: number; share: number }[];
  devices: { device: string; visits: number; share: number }[];
  browsers: { browser: string; visits: number; share: number }[];
  campaigns: { campaign: string; visits: number }[];
  countries: { country: string; visits: number }[];
  events: { event_type: string; count: number }[];
}

export interface DashboardMetrics {
  todayReservations: number;
  pending: number;
  confirmed: number;
  upcomingTours: number;
  cancelled: number;
  totalPeriod: number;
  confirmedRevenue: number;
  estimatedValue: number;
  publishedOffers: number;
  series: { date: string; reservations: number; revenue: number }[];
  byService: { name: string; count: number }[];
  byStatus: { status: ReservationStatus; count: number }[];
  recent: Reservation[];
}

export interface ContactMessageInput {
  full_name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  locale: Locale;
  privacy_accepted: true;
}

export interface StaffDraft {
  id?: string;
  email: string;
  full_name: string;
  role: Profile['role'];
  phone?: string | null;
  is_active?: boolean;
}

export interface CreateReservationResult {
  reservation: Reservation;
  duplicate: boolean;
}

/**
 * Data access contract implemented twice:
 *  - `demoBackend`  : localStorage store used when Supabase env vars are absent
 *  - `supabaseBackend`: Supabase Auth + Postgres with RLS, privileged writes via /api Functions
 */
export interface Backend {
  mode: BackendMode;

  /* auth */
  getSession(): Promise<Profile | null>;
  signIn(email: string, password: string): Promise<Profile>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;

  /* public site */
  getPublicData(): Promise<PublicData>;
  getAvailability(query: AvailabilityQuery): Promise<SlotInfo[]>;
  createReservation(input: ReservationCreateInput): Promise<CreateReservationResult>;
  lookupReservation(reference: string, email: string): Promise<Reservation | null>;
  submitContactMessage(input: ContactMessageInput): Promise<void>;
  trackEvent(input: AnalyticsEventInput): Promise<void>;

  /* reservations */
  listReservations(filters: ReservationFilters): Promise<ReservationPage>;
  getReservation(id: string): Promise<Reservation | null>;
  getReservationByReference(reference: string): Promise<Reservation | null>;
  updateReservation(id: string, patch: ReservationUpdateInput & { note?: string }): Promise<Reservation>;
  addReservationNote(id: string, note: string, isCommunication: boolean): Promise<void>;

  /* customers */
  listCustomers(search?: string): Promise<CustomerRecord[]>;
  getCustomer(id: string): Promise<CustomerRecord | null>;
  addCustomerNote(customerId: string, note: string): Promise<void>;

  /* catalogue */
  listOffers(): Promise<Offer[]>;
  saveOffer(draft: OfferDraft): Promise<Offer>;
  setOfferStatus(id: string, status: OfferStatus): Promise<void>;
  deleteOffer(id: string): Promise<void>;
  listServices(): Promise<Service[]>;
  saveService(draft: ServiceDraft): Promise<Service>;
  listGallery(): Promise<GalleryItem[]>;
  saveGalleryItem(draft: GalleryDraft): Promise<GalleryItem>;
  deleteGalleryItem(id: string): Promise<void>;
  reorderGalleryItem(id: string, direction: 'up' | 'down'): Promise<void>;
  listTestimonials(): Promise<Testimonial[]>;
  saveTestimonial(draft: TestimonialDraft): Promise<Testimonial>;
  deleteTestimonial(id: string): Promise<void>;
  uploadMedia(file: File): Promise<string>;

  /* inventory */
  listBicycles(): Promise<Bicycle[]>;
  saveBicycle(draft: BicycleDraft): Promise<Bicycle>;

  /* operations */
  listNotes(): Promise<AdminNote[]>;
  saveNote(draft: NoteDraft): Promise<AdminNote>;
  deleteNote(id: string): Promise<void>;
  listBlocks(): Promise<AvailabilityBlock[]>;
  saveBlock(draft: BlockDraft): Promise<AvailabilityBlock>;
  deleteBlock(id: string): Promise<void>;
  listEvents(): Promise<CalendarEvent[]>;
  saveEvent(draft: EventDraft): Promise<CalendarEvent>;
  getSettings(): Promise<SiteSettings>;
  saveSettings(settings: SiteSettings): Promise<SiteSettings>;

  /* team */
  listStaff(): Promise<Profile[]>;
  saveStaff(draft: StaffDraft): Promise<{ profile: Profile; temporaryPassword?: string }>;

  /* reporting */
  getDashboardMetrics(from: string, to: string): Promise<DashboardMetrics>;
  getAnalyticsSummary(from: string, to: string): Promise<AnalyticsSummary>;
  listIdentifiedCustomers(): Promise<CustomerRecord[]>;
  listAuditLogs(limit?: number): Promise<AuditLog[]>;
}

export type { AnalyticsEvent };
