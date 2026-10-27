/**
 * Local demo backend.
 *
 * Active when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not configured.
 * It implements the same `Backend` contract as `supabaseBackend`, keeps its data in
 * localStorage and mirrors the behaviour of the SQL schema + Pages Functions:
 * the same pricing, availability and status-transition rules run in both.
 *
 * Nothing here is a substitute for server-side validation in production: privileged
 * writes always go through the Cloudflare Functions when Supabase is configured.
 */
import {
  addDaysISO,
  checkAvailability,
  generateSlots,
  todayISO,
  type OccupiedSlot,
} from '@shared/domain/availability';
import { calculateQuote, buildPriceSnapshot } from '@shared/domain/pricing';
import { canTransition, generateReference } from '@shared/domain/reservations';
import { can, type Permission } from '@shared/domain/permissions';
import { DEFAULT_LOCALE, type AdminRole, type Locale, type Profile, type Reservation, type ReservationStatus } from '@shared/domain/types';
import {
  fieldErrors,
  reservationCreateSchema,
  reservationUpdateSchema,
  contactMessageSchema,
  offerUpsertSchema,
  serviceUpsertSchema,
  galleryItemSchema,
  testimonialSchema,
  noteUpsertSchema,
  availabilityBlockSchema,
  type AnalyticsEventInput,
  type ReservationCreateInput,
  type ReservationUpdateInput,
} from '@shared/schemas';
import {
  DEMO_IDS,
  SEED_AVAILABILITY_BLOCKS,
  SEED_AVAILABILITY_RULES,
  SEED_BICYCLES,
  SEED_GALLERY,
  SEED_OFFERS,
  SEED_SERVICES,
  SEED_SETTINGS,
  SEED_TESTIMONIALS,
} from '@/data/seed';
import type {
  AnalyticsSummary,
  AvailabilityQuery,
  Backend,
  BicycleDraft,
  BlockDraft,
  ContactMessageInput,
  CreateReservationResult,
  CustomerRecord,
  DashboardMetrics,
  EventDraft,
  GalleryDraft,
  NoteDraft,
  OfferDraft,
  PublicData,
  ReservationFilters,
  ReservationPage,
  ServiceDraft,
  SlotInfo,
  StaffDraft,
  TestimonialDraft,
} from './types';
import type {
  AdminNote,
  AnalyticsEvent,
  AuditLog,
  AvailabilityBlock,
  AvailabilityRule,
  Bicycle,
  CalendarEvent,
  Customer,
  CustomerNote,
  GalleryItem,
  NotificationLog,
  Offer,
  ReservationNote,
  Service,
  Testimonial,
} from '@shared/domain/types';

const STORAGE_KEY = 'mjb.demo.state.v1';
export const DEMO_PASSWORD = 'MjBike!2026';
export const DEMO_ACCOUNTS: { email: string; role: AdminRole; name: string }[] = [
  { email: 'owner@mjbiketangier.com', role: 'super_admin', name: 'MJ Bike Owner' },
  { email: 'admin@mjbiketangier.com', role: 'admin', name: 'Sara Admin' },
  { email: 'staff@mjbiketangier.com', role: 'staff', name: 'Youssef Staff' },
];

export class BackendError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;

  constructor(code: string, message: string, status = 400, fields?: Record<string, string>) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

interface DemoCustomer extends Customer {
  notes: CustomerNote[];
}

interface DemoState {
  version: 1;
  sessionUserId: string | null;
  profiles: Profile[];
  services: Service[];
  offers: Offer[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  settings: typeof SEED_SETTINGS;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  bicycles: Bicycle[];
  customers: DemoCustomer[];
  reservations: Reservation[];
  notes: AdminNote[];
  events: CalendarEvent[];
  analytics: AnalyticsEvent[];
  audit: AuditLog[];
  notifications: NotificationLog[];
  contactMessages: { id: string; full_name: string; email: string; subject: string; message: string; locale: Locale; created_at: string }[];
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const uid = (prefix = 'id'): string =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const nowISO = () => new Date().toISOString();

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/* ------------------------------------------------------------------ */
/* Seed                                                               */
/* ------------------------------------------------------------------ */

function seedProfiles(): Profile[] {
  return DEMO_ACCOUNTS.map((account, index) => ({
    id: [DEMO_IDS.profiles.owner, DEMO_IDS.profiles.admin, DEMO_IDS.profiles.staff][index] ?? uid('prf'),
    email: account.email,
    full_name: account.name,
    role: account.role,
    is_active: true,
    phone: null,
    created_at: '2025-01-05T09:00:00.000Z',
    last_sign_in_at: null,
  }));
}

interface SeedReservationInput {
  reference: string;
  name: string;
  email: string;
  phone: string;
  locale: Locale;
  serviceId: string;
  date: string;
  time: string;
  participants: number;
  duration: number;
  status: ReservationStatus;
  offerId?: string | null;
  source?: Reservation['source'];
  contact?: Reservation['preferred_contact'];
  message?: string;
}

function seedReservations(services: Service[], offers: Offer[], rules: AvailabilityRule[]): { reservations: Reservation[]; customers: DemoCustomer[] } {
  const today = todayISO();
  const specs: SeedReservationInput[] = [
    { reference: 'MJB-260101-AB12', name: 'Claire Dumont', email: 'claire.dumont@example.com', phone: '+33 6 12 34 56 78', locale: 'fr', serviceId: DEMO_IDS.services.cityRental, date: addDaysISO(today, -6), time: '10:00', participants: 2, duration: 4, status: 'completed' },
    { reference: 'MJB-260101-CD34', name: 'James Whitfield', email: 'james.whitfield@example.com', phone: '+44 7700 900123', locale: 'en', serviceId: DEMO_IDS.services.medinaTour, date: addDaysISO(today, -3), time: '09:00', participants: 2, duration: 3, status: 'completed' },
    { reference: 'MJB-260101-EF56', name: 'ياسمين العلوي', email: 'yasmine.alaoui@example.com', phone: '+212 661 234 567', locale: 'ar', serviceId: DEMO_IDS.services.sunsetTour, date: addDaysISO(today, -1), time: '17:00', participants: 2, duration: 3.5, status: 'completed', offerId: DEMO_IDS.offers.sunset },
    { reference: 'MJB-260101-GH78', name: 'Marco Rossi', email: 'marco.rossi@example.com', phone: '+39 340 123 4567', locale: 'en', serviceId: DEMO_IDS.services.ebikeRental, date: today, time: '10:00', participants: 1, duration: 3, status: 'confirmed' },
    { reference: 'MJB-260101-IJ90', name: 'Anna Schmidt', email: 'anna.schmidt@example.com', phone: '+49 151 23456789', locale: 'en', serviceId: DEMO_IDS.services.cityRental, date: today, time: '14:00', participants: 2, duration: 4, status: 'confirmed' },
    { reference: 'MJB-260101-KL12', name: 'Luc Bernard', email: 'luc.bernard@example.com', phone: '+33 7 88 99 00 11', locale: 'fr', serviceId: DEMO_IDS.services.medinaTour, date: addDaysISO(today, 1), time: '09:00', participants: 4, duration: 3, status: 'pending' },
    { reference: 'MJB-260101-MN34', name: 'Sofia Almeida', email: 'sofia.almeida@example.com', phone: '+351 912 345 678', locale: 'en', serviceId: DEMO_IDS.services.sunsetTour, date: addDaysISO(today, 2), time: '17:00', participants: 2, duration: 3.5, status: 'pending', offerId: DEMO_IDS.offers.sunset },
    { reference: 'MJB-260101-OP56', name: 'Tom Baker', email: 'tom.baker@example.com', phone: '+44 7911 123456', locale: 'en', serviceId: DEMO_IDS.services.lesson, date: addDaysISO(today, 2), time: '11:00', participants: 1, duration: 1.5, status: 'confirmed' },
    { reference: 'MJB-260101-QR78', name: 'Fatima Zahra', email: 'fatima.zahra@example.com', phone: '+212 662 345 678', locale: 'ar', serviceId: DEMO_IDS.services.teamBuilding, date: addDaysISO(today, 4), time: '15:00', participants: 14, duration: 3, status: 'pending', contact: 'whatsapp' },
    { reference: 'MJB-260101-ST90', name: 'Peter Novak', email: 'peter.novak@example.com', phone: '+420 601 234 567', locale: 'en', serviceId: DEMO_IDS.services.cityRental, date: addDaysISO(today, 6), time: '10:00', participants: 3, duration: 8, status: 'confirmed' },
    { reference: 'MJB-260101-UV12', name: 'Hélène Martin', email: 'helene.martin@example.com', phone: '+33 6 45 67 89 01', locale: 'fr', serviceId: DEMO_IDS.services.medinaTour, date: addDaysISO(today, -4), time: '15:00', participants: 2, duration: 3, status: 'cancelled' },
    { reference: 'MJB-260101-WX34', name: 'Daniel Costa', email: 'daniel.costa@example.com', phone: '+351 934 567 890', locale: 'en', serviceId: DEMO_IDS.services.ebikeRental, date: addDaysISO(today, 9), time: '09:00', participants: 2, duration: 6, status: 'pending' },
  ];

  const customers = new Map<string, DemoCustomer>();
  const reservations: Reservation[] = specs.map((spec, index) => {
    const service = services.find((item) => item.id === spec.serviceId) ?? (services[0] as Service);
    const offer = spec.offerId ? offers.find((item) => item.id === spec.offerId) ?? null : null;
    const translation = service.translations.find((item) => item.locale === 'en') ?? service.translations[0];
    const quote = calculateQuote({
      service,
      offer,
      durationHours: spec.duration,
      quantity: spec.participants,
      addonIds: index % 3 === 0 ? ['helmet'] : [],
    });
    const createdAt = `${addDaysISO(spec.date, index % 4 === 0 ? -4 : -2)}T0${(index % 9) + 1}:15:00.000Z`;
    const id = `rsv-0000-0000-0000-${String(index + 1).padStart(12, '0')}`;

    const existing = customers.get(spec.email.toLowerCase());
    const customer: DemoCustomer =
      existing ??
      {
        id: `cst-0000-0000-0000-${String(customers.size + 1).padStart(12, '0')}`,
        full_name: spec.name,
        email: spec.email,
        phone: spec.phone,
        locale: spec.locale,
        first_seen_at: createdAt,
        last_booking_at: spec.date,
        marketing_consent: false,
        notes: [],
      };
    customer.last_booking_at = spec.date > (customer.last_booking_at ?? '') ? spec.date : customer.last_booking_at;
    customers.set(spec.email.toLowerCase(), customer);

    const history: Reservation['history'] = [
      {
        id: uid('rsh'),
        reservation_id: id,
        from_status: null,
        to_status: 'pending',
        changed_by: null,
        changed_by_name: 'Website',
        reason: null,
        created_at: createdAt,
      },
    ];
    if (spec.status !== 'pending') {
      history.push({
        id: uid('rsh'),
        reservation_id: id,
        from_status: 'pending',
        to_status: spec.status,
        changed_by: DEMO_IDS.profiles.owner,
        changed_by_name: 'MJ Bike Owner',
        reason: spec.status === 'cancelled' ? 'Customer asked to cancel by phone.' : null,
        created_at: `${addDaysISO(spec.date, -1)}T18:30:00.000Z`,
      });
    }

    return {
      id,
      reference: spec.reference,
      status: spec.status,
      reservation_type: service.kind,
      service_id: service.id,
      offer_id: offer?.id ?? null,
      customer_id: customer.id,
      full_name: spec.name,
      email: spec.email,
      phone: spec.phone,
      preferred_contact: spec.contact ?? 'email',
      participants: spec.participants,
      reservation_date: spec.date,
      start_time: spec.time,
      duration_hours: spec.duration,
      addons: quote.addons,
      message: spec.message ?? null,
      locale: spec.locale,
      total_price: quote.total,
      price_snapshot: buildPriceSnapshot({
        quote,
        serviceName: translation?.name ?? service.slug,
        serviceSlug: service.slug,
        offerTitle: offer?.translations.find((item) => item.locale === 'en')?.title ?? null,
      }),
      privacy_accepted: true,
      assigned_staff_id: spec.status === 'pending' ? null : DEMO_IDS.profiles.staff,
      internal_notes: null,
      cancellation_reason: spec.status === 'cancelled' ? 'Customer asked to cancel by phone.' : null,
      proposed_date: null,
      proposed_time: null,
      source: spec.source ?? 'website',
      created_at: createdAt,
      updated_at: history[history.length - 1]?.created_at ?? createdAt,
      items: [
        {
          id: uid('rit'),
          reservation_id: id,
          service_id: service.id,
          service_slug: service.slug,
          name: translation?.name ?? service.slug,
          quantity: spec.participants,
          unit_price: quote.unitPrice,
          duration_hours: spec.duration,
          line_total: quote.subtotal,
          bicycle_id: null,
        },
      ],
      history,
      notes: [],
    } satisfies Reservation;
  });

  const customerList = [...customers.values()].map((customer) => {
    const own = reservations.filter((reservation) => reservation.customer_id === customer.id);
    return {
      ...customer,
      reservations_count: own.length,
      total_value: own.filter((reservation) => reservation.status === 'confirmed' || reservation.status === 'completed').reduce((sum, reservation) => sum + reservation.total_price, 0),
    };
  });

  void rules;
  return { reservations, customers: customerList };
}

function seedAnalytics(customers: DemoCustomer[]): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const paths = ['/en/', '/en/bike-rentals/', '/en/bike-tours/', '/en/offers/', '/fr/', '/fr/location-velos/', '/ar/'];
  const referrers = ['https://www.google.com/', 'https://www.instagram.com/', null, 'https://www.tripadvisor.com/'];
  const devices: AnalyticsEvent['device_category'][] = ['mobile', 'mobile', 'desktop', 'tablet'];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  let seedValue = 7;
  const random = () => {
    seedValue = (seedValue * 1103515245 + 12345) % 2147483648;
    return seedValue / 2147483648;
  };
  for (let day = 29; day >= 0; day -= 1) {
    const date = addDaysISO(todayISO(), -day);
    const visitors = 6 + Math.floor(random() * 12);
    for (let visitor = 0; visitor < visitors; visitor += 1) {
      const anonymous = `anon-${date}-${visitor}`;
      const session = `sess-${date}-${visitor}`;
      const pages = 1 + Math.floor(random() * 4);
      for (let view = 0; view < pages; view += 1) {
        events.push({
          id: uid('anl'),
          event_type: 'page_view',
          path: paths[Math.floor(random() * paths.length)] ?? '/en/',
          locale: 'en',
          anonymous_id: anonymous,
          session_id: session,
          referrer: view === 0 ? referrers[Math.floor(random() * referrers.length)] ?? null : null,
          utm_source: random() > 0.9 ? 'instagram' : null,
          utm_medium: null,
          utm_campaign: random() > 0.95 ? 'sunset-ride' : null,
          device_category: devices[Math.floor(random() * devices.length)] ?? 'mobile',
          browser: browsers[Math.floor(random() * browsers.length)] ?? 'Chrome',
          country: 'MA',
          created_at: `${date}T${String(9 + Math.floor(random() * 12)).padStart(2, '0')}:${String(Math.floor(random() * 60)).padStart(2, '0')}:00.000Z`,
        });
      }
    }
  }
  void customers;
  return events.slice(-2000);
}

function freshState(): DemoState {
  const profiles = seedProfiles();
  const { reservations, customers } = seedReservations(SEED_SERVICES, SEED_OFFERS, SEED_AVAILABILITY_RULES);
  return {
    version: 1,
    sessionUserId: null,
    profiles,
    services: clone(SEED_SERVICES),
    offers: clone(SEED_OFFERS),
    gallery: clone(SEED_GALLERY),
    testimonials: clone(SEED_TESTIMONIALS),
    settings: clone(SEED_SETTINGS),
    rules: clone(SEED_AVAILABILITY_RULES),
    blocks: clone(SEED_AVAILABILITY_BLOCKS),
    bicycles: clone(SEED_BICYCLES),
    customers,
    reservations,
    notes: [
      {
        id: uid('not'),
        title: 'Call Fatima about the team-building ride',
        body: 'Group of 14 for the team-building ride. Confirm the support vehicle and ask about a lunch stop after the ride.',
        category: 'customer_follow_up',
        priority: 'high',
        note_date: todayISO(),
        follow_up_date: addDaysISO(todayISO(), 1),
        is_completed: false,
        is_pinned: true,
        is_archived: false,
        reservation_id: 'rsv-0000-0000-0000-000000000009',
        customer_id: null,
        offer_id: null,
        calendar_event_id: null,
        created_by: DEMO_IDS.profiles.admin,
        created_by_name: 'Sara Admin',
        created_at: nowISO(),
        updated_at: nowISO(),
      },
      {
        id: uid('not'),
        title: 'Check brakes on CTY-02',
        body: 'Front brake cable is getting slack on the size L city bikes. Book a workshop slot before the weekend.',
        category: 'maintenance',
        priority: 'normal',
        note_date: todayISO(),
        follow_up_date: addDaysISO(todayISO(), 2),
        is_completed: false,
        is_pinned: false,
        is_archived: false,
        reservation_id: null,
        customer_id: null,
        offer_id: null,
        calendar_event_id: null,
        created_by: DEMO_IDS.profiles.staff,
        created_by_name: 'Youssef Staff',
        created_at: nowISO(),
        updated_at: nowISO(),
      },
    ],
    events: [
      {
        id: uid('evt'),
        title: 'Workshop — fleet service',
        event_type: 'maintenance',
        start_at: `${addDaysISO(todayISO(), 3)}T14:00:00.000Z`,
        end_at: `${addDaysISO(todayISO(), 3)}T17:00:00.000Z`,
        all_day: false,
        location: 'Workshop',
        notes: 'Brake pads and chain check on the city fleet.',
        created_by: DEMO_IDS.profiles.admin,
        created_at: nowISO(),
      },
    ],
    analytics: seedAnalytics(customers),
    audit: [],
    notifications: [],
    contactMessages: [],
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

const memoryStore: { state: DemoState | null } = { state: null };

function loadState(): DemoState {
  if (memoryStore.state) return memoryStore.state;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === 1 && Array.isArray(parsed.reservations)) {
        memoryStore.state = parsed;
        return parsed;
      }
    }
  } catch {
    /* corrupted or unavailable storage: fall back to a fresh demo database */
  }
  memoryStore.state = freshState();
  persistState(memoryStore.state);
  return memoryStore.state;
}

function persistState(state: DemoState) {
  memoryStore.state = state;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota errors must never break the UI; the in-memory copy stays authoritative */
  }
}

/** Wipes the local demo database (used by the "Demo mode" button in the admin). */
export function resetDemoData(): void {
  memoryStore.state = freshState();
  persistState(memoryStore.state);
}

/* ------------------------------------------------------------------ */
/* Backend implementation                                             */
/* ------------------------------------------------------------------ */

class DemoBackend implements Backend {
  readonly mode = 'demo' as const;

  private get state(): DemoState {
    return loadState();
  }

  private persist() {
    persistState(this.state);
  }

  private currentProfile(): Profile | null {
    const state = this.state;
    return state.profiles.find((profile) => profile.id === state.sessionUserId) ?? null;
  }

  private requireProfile(): Profile {
    const profile = this.currentProfile();
    if (!profile) throw new BackendError('unauthorized', 'Your session has expired. Please sign in again.', 401);
    return profile;
  }

  private requirePermission(permission: Permission): Profile {
    const profile = this.requireProfile();
    if (!can(profile.role, permission)) {
      throw new BackendError('forbidden', 'Your role does not allow this action.', 403);
    }
    return profile;
  }

  private audit(profile: Profile | null, action: string, entityType: string, entityId: string | null, details?: Record<string, unknown>) {
    this.state.audit.unshift({
      id: uid('aud'),
      actor_id: profile?.id ?? null,
      actor_email: profile?.email ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? null,
      created_at: nowISO(),
    });
    this.state.audit = this.state.audit.slice(0, 500);
  }

  private logNotification(entry: Omit<NotificationLog, 'id' | 'created_at'>) {
    this.state.notifications.unshift({ ...entry, id: uid('ntf'), created_at: nowISO() });
    this.state.notifications = this.state.notifications.slice(0, 500);
  }

  private occupiedSlots(date: string): OccupiedSlot[] {
    return this.state.reservations
      .filter((reservation) => reservation.reservation_date === date)
      .map((reservation) => ({
        date: reservation.reservation_date,
        startTime: reservation.start_time,
        durationHours: reservation.duration_hours,
        quantity: reservation.participants,
        status: reservation.status,
        serviceId: reservation.service_id,
      }));
  }

  private serviceById(id: string | null): Service | undefined {
    if (!id) return undefined;
    return this.state.services.find((service) => service.id === id);
  }

  /* ------------------------------- auth ------------------------------- */

  async getSession(): Promise<Profile | null> {
    await sleep(40);
    return this.currentProfile();
  }

  async signIn(email: string, password: string): Promise<Profile> {
    await sleep(320);
    const normalized = email.trim().toLowerCase();
    const profile = this.state.profiles.find((item) => item.email.toLowerCase() === normalized);
    const known = DEMO_ACCOUNTS.some((account) => account.email === normalized);
    if (!profile || !known || password !== DEMO_PASSWORD) {
      throw new BackendError('invalid_credentials', 'Those credentials do not match an administrator account.', 401);
    }
    if (!profile.is_active) throw new BackendError('account_disabled', 'This account has been deactivated.', 403);
    profile.last_sign_in_at = nowISO();
    this.state.sessionUserId = profile.id;
    this.audit(profile, 'auth.sign_in', 'profile', profile.id);
    this.persist();
    return profile;
  }

  async signOut(): Promise<void> {
    this.state.sessionUserId = null;
    this.persist();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await sleep(200);
    // Always resolves: never reveal whether an administrator email exists.
    void email;
  }

  async updatePassword(): Promise<void> {
    throw new BackendError(
      'demo_mode',
      'Password changes need Supabase Auth. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use this page.',
      501,
    );
  }

  /* ---------------------------- public site --------------------------- */

  async getPublicData(): Promise<PublicData> {
    await sleep(120);
    const state = this.state;
    return {
      settings: state.settings,
      services: [...state.services].filter((service) => service.is_active).sort((a, b) => a.sort_order - b.sort_order),
      offers: state.offers
        .filter((offer) => offer.status === 'published' && offer.validity_end >= todayISO())
        .sort((a, b) => a.sort_order - b.sort_order),
      gallery: state.gallery.filter((item) => item.is_published).sort((a, b) => a.sort_order - b.sort_order),
      testimonials: state.testimonials.filter((item) => item.is_published).sort((a, b) => a.sort_order - b.sort_order),
      rules: state.rules,
      blocks: state.blocks.filter((block) => block.is_active),
    };
  }

  async getAvailability(query: AvailabilityQuery): Promise<SlotInfo[]> {
    const service = this.serviceById(query.serviceId);
    if (!service) return [];
    const slots = generateSlots({
      date: query.date,
      durationHours: query.durationHours,
      rules: this.state.rules,
      serviceId: service.id,
    });
    return slots.map((time) => {
      const result = checkAvailability(
        { date: query.date, startTime: time, durationHours: query.durationHours },
        {
          capacity: service.capacity,
          rules: this.state.rules,
          blocks: this.state.blocks,
          occupied: this.occupiedSlots(query.date),
          timezone: this.state.settings.timezone,
          leadTimeHours: 2,
          now: new Date(),
        },
        service.id,
      );
      return { time, available: result.available, remaining: result.remainingCapacity, reason: result.reason };
    });
  }

  async createReservation(input: ReservationCreateInput): Promise<CreateReservationResult> {
    await sleep(280);
    const parsed = reservationCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;
    const service = this.serviceById(data.service_id);
    if (!service || !service.is_active) throw new BackendError('not_found', 'That service is not available.', 404);

    const offer = data.offer_id ? this.state.offers.find((item) => item.id === data.offer_id) : null;
    if (data.offer_id && (!offer || offer.status !== 'published' || offer.validity_end < todayISO())) {
      throw new BackendError('not_found', 'That offer is no longer available.', 404);
    }

    const availability = checkAvailability(
      { date: data.reservation_date, startTime: data.start_time, durationHours: data.duration_hours },
      {
        capacity: service.capacity,
        rules: this.state.rules,
        blocks: this.state.blocks,
        occupied: this.occupiedSlots(data.reservation_date),
        timezone: this.state.settings.timezone,
        leadTimeHours: 2,
        now: new Date(),
      },
      service.id,
    );
    if (!availability.available) {
      throw new BackendError(availability.reason ?? 'unavailable', availability.message ?? 'That time is not available.', 409);
    }
    if (data.quantity > availability.remainingCapacity) {
      throw new BackendError('capacity', `Only ${availability.remainingCapacity} places are left for that time.`, 409);
    }

    let quote;
    try {
      quote = calculateQuote({ service, offer, durationHours: data.duration_hours, quantity: data.quantity, addonIds: data.addons });
    } catch (caught) {
      throw new BackendError('pricing', caught instanceof Error ? caught.message : 'Unable to price this reservation.', 422);
    }

    // Duplicate guard: same person, same service and slot, still open, created in the last 10 minutes.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const duplicate = this.state.reservations.find(
      (reservation) =>
        reservation.email.toLowerCase() === data.email.toLowerCase() &&
        reservation.service_id === data.service_id &&
        reservation.reservation_date === data.reservation_date &&
        reservation.start_time.slice(0, 5) === data.start_time.slice(0, 5) &&
        (reservation.status === 'pending' || reservation.status === 'confirmed') &&
        reservation.created_at > tenMinutesAgo,
    );
    if (duplicate) return { reservation: duplicate, duplicate: true };

    const reference = (() => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const candidate = generateReference();
        if (!this.state.reservations.some((reservation) => reservation.reference === candidate)) return candidate;
      }
      throw new BackendError('reference', 'Unable to create a unique reference. Please try again.', 500);
    })();

    const now = nowISO();
    const id = uid('rsv');
    const translation = service.translations.find((item) => item.locale === data.locale) ?? service.translations[0];

    const existingCustomer = this.state.customers.find((customer) => customer.email.toLowerCase() === data.email.toLowerCase());
    let customer: DemoCustomer;
    if (existingCustomer) {
      existingCustomer.full_name = data.full_name;
      existingCustomer.phone = data.phone;
      existingCustomer.locale = data.locale;
      existingCustomer.last_booking_at = data.reservation_date;
      customer = existingCustomer;
    } else {
      customer = {
        id: uid('cst'),
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        locale: data.locale,
        first_seen_at: now,
        last_booking_at: data.reservation_date,
        marketing_consent: false,
        notes: [],
      };
      this.state.customers.push(customer);
    }

    const reservation: Reservation = {
      id,
      reference,
      status: 'pending',
      reservation_type: service.kind,
      service_id: service.id,
      offer_id: offer?.id ?? null,
      customer_id: customer.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      preferred_contact: data.preferred_contact,
      participants: data.quantity,
      reservation_date: data.reservation_date,
      start_time: data.start_time,
      duration_hours: data.duration_hours,
      addons: quote.addons,
      message: data.message || null,
      locale: data.locale,
      total_price: quote.total,
      price_snapshot: buildPriceSnapshot({
        quote,
        serviceName: translation?.name ?? service.slug,
        serviceSlug: service.slug,
        offerTitle: offer?.translations.find((item) => item.locale === data.locale)?.title ?? null,
      }),
      privacy_accepted: true,
      assigned_staff_id: null,
      internal_notes: null,
      cancellation_reason: null,
      proposed_date: null,
      proposed_time: null,
      source: 'website',
      created_at: now,
      updated_at: now,
      items: [
        {
          id: uid('rit'),
          reservation_id: id,
          service_id: service.id,
          service_slug: service.slug,
          name: translation?.name ?? service.slug,
          quantity: data.quantity,
          unit_price: quote.unitPrice,
          duration_hours: data.duration_hours,
          line_total: quote.subtotal,
          bicycle_id: null,
        },
      ],
      history: [
        {
          id: uid('rsh'),
          reservation_id: id,
          from_status: null,
          to_status: 'pending',
          changed_by: null,
          changed_by_name: 'Website',
          reason: null,
          created_at: now,
        },
      ],
      notes: [],
    };

    this.state.reservations.unshift(reservation);
    this.state.analytics.push({
      id: uid('anl'),
      event_type: 'reservation_submitted',
      path: data.locale,
      locale: data.locale,
      anonymous_id: 'demo-anonymous',
      session_id: 'demo-session',
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      device_category: 'desktop',
      browser: 'Demo',
      country: 'MA',
      created_at: now,
    });
    this.logNotification({
      channel: 'email',
      template: 'reservation_request_customer',
      recipient: reservation.email,
      reservation_id: reservation.id,
      status: 'skipped',
      provider_message_id: null,
      error: 'Demo mode: email is not configured.',
    });
    this.logNotification({
      channel: 'email',
      template: 'reservation_request_admin',
      recipient: this.state.settings.email,
      reservation_id: reservation.id,
      status: 'skipped',
      provider_message_id: null,
      error: 'Demo mode: email is not configured.',
    });
    this.persist();
    return { reservation, duplicate: false };
  }

  async lookupReservation(reference: string, email: string): Promise<Reservation | null> {
    await sleep(200);
    const normalized = reference.trim().toUpperCase();
    return (
      this.state.reservations.find(
        (reservation) => reservation.reference === normalized && reservation.email.toLowerCase() === email.trim().toLowerCase(),
      ) ?? null
    );
  }

  async submitContactMessage(input: ContactMessageInput): Promise<void> {
    await sleep(250);
    const parsed = contactMessageSchema.safeParse(input);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    this.state.contactMessages.unshift({
      id: uid('msg'),
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      locale: parsed.data.locale,
      created_at: nowISO(),
    });
    this.logNotification({
      channel: 'email',
      template: 'contact_message',
      recipient: this.state.settings.email,
      reservation_id: null,
      status: 'skipped',
      provider_message_id: null,
      error: 'Demo mode: email is not configured.',
    });
    this.persist();
  }

  async trackEvent(input: AnalyticsEventInput): Promise<void> {
    this.state.analytics.push({
      ...input,
      referrer: input.referrer ?? null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      country: input.country ?? null,
      id: uid('anl'),
      created_at: nowISO(),
    });
    this.state.analytics = this.state.analytics.slice(-2000);
    this.persist();
  }

  /* --------------------------- reservations --------------------------- */

  async listReservations(filters: ReservationFilters): Promise<ReservationPage> {
    this.requirePermission('reservations:view_assigned');
    const profile = this.requireProfile();
    const canSeeAll = can(profile.role, 'reservations:view_all');
    await sleep(90);

    let items = [...this.state.reservations];
    if (!canSeeAll) items = items.filter((reservation) => reservation.assigned_staff_id === profile.id);
    if (filters.search) {
      const term = filters.search.toLowerCase();
      items = items.filter(
        (reservation) =>
          reservation.reference.toLowerCase().includes(term) ||
          reservation.full_name.toLowerCase().includes(term) ||
          reservation.email.toLowerCase().includes(term) ||
          reservation.phone.includes(filters.search ?? ''),
      );
    }
    if (filters.status?.length) items = items.filter((reservation) => filters.status?.includes(reservation.status));
    if (filters.type) items = items.filter((reservation) => reservation.reservation_type === filters.type);
    if (filters.staffId) items = items.filter((reservation) => reservation.assigned_staff_id === filters.staffId);
    if (filters.from) items = items.filter((reservation) => reservation.reservation_date >= (filters.from as string));
    if (filters.to) items = items.filter((reservation) => reservation.reservation_date <= (filters.to as string));

    const sortKey = filters.sort ?? 'created_at';
    const direction = filters.direction === 'asc' ? 1 : -1;
    items.sort((a, b) => a[sortKey].localeCompare(b[sortKey]) * direction);

    const total = items.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 20;
    return { items: items.slice(offset, offset + limit), total };
  }

  async getReservation(id: string): Promise<Reservation | null> {
    const profile = this.requirePermission('reservations:view_assigned');
    const reservation = this.state.reservations.find((item) => item.id === id);
    if (!reservation) return null;
    if (!can(profile.role, 'reservations:view_all') && reservation.assigned_staff_id !== profile.id) {
      throw new BackendError('forbidden', 'This reservation is not assigned to you.', 403);
    }
    return reservation;
  }

  async getReservationByReference(reference: string): Promise<Reservation | null> {
    return this.state.reservations.find((reservation) => reservation.reference === reference.trim().toUpperCase()) ?? null;
  }

  async updateReservation(id: string, patch: ReservationUpdateInput & { note?: string }): Promise<Reservation> {
    const profile = this.requirePermission('reservations:update');
    const parsed = reservationUpdateSchema.safeParse(patch);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    const reservation = this.state.reservations.find((item) => item.id === id);
    if (!reservation) throw new BackendError('not_found', 'Reservation not found.', 404);
    if (!can(profile.role, 'reservations:view_all') && reservation.assigned_staff_id !== profile.id) {
      throw new BackendError('forbidden', 'This reservation is not assigned to you.', 403);
    }

    const now = nowISO();
    const changes = parsed.data;

    if (changes.status && changes.status !== reservation.status) {
      if (!canTransition(reservation.status, changes.status)) {
        throw new BackendError('invalid_transition', `Cannot move a ${reservation.status} reservation to ${changes.status}.`, 409);
      }
      if (changes.status === 'confirmed' && !changes.force) {
        const service = this.serviceById(reservation.service_id);
        if (service) {
          const availability = checkAvailability(
            { date: reservation.reservation_date, startTime: reservation.start_time, durationHours: reservation.duration_hours },
            {
              capacity: service.capacity,
              rules: this.state.rules,
              blocks: this.state.blocks,
              occupied: this.occupiedSlots(reservation.reservation_date).filter((slot) => slot.status === 'confirmed' && slot.startTime !== reservation.start_time),
              timezone: this.state.settings.timezone,
              leadTimeHours: 0,
              now: new Date(),
            },
            service.id,
          );
          if (!availability.available || availability.remainingCapacity < reservation.participants) {
            throw new BackendError('capacity', availability.message ?? 'This time slot no longer has capacity.', 409);
          }
        }
      }
      reservation.history.push({
        id: uid('rsh'),
        reservation_id: reservation.id,
        from_status: reservation.status,
        to_status: changes.status,
        changed_by: profile.id,
        changed_by_name: profile.full_name,
        reason: changes.reason ?? null,
        created_at: now,
      });
      reservation.status = changes.status;
      if (changes.status === 'cancelled' || changes.status === 'rejected') {
        reservation.cancellation_reason = changes.reason ?? reservation.cancellation_reason;
      }
      this.logNotification({
        channel: 'email',
        template: `reservation_${changes.status}`,
        recipient: reservation.email,
        reservation_id: reservation.id,
        status: 'skipped',
        provider_message_id: null,
        error: 'Demo mode: email is not configured.',
      });
      this.audit(profile, `reservation.status.${changes.status}`, 'reservation', reservation.id, { reason: changes.reason });
    }

    if (changes.internal_notes !== undefined) reservation.internal_notes = changes.internal_notes;
    if (changes.assigned_staff_id !== undefined) reservation.assigned_staff_id = changes.assigned_staff_id;
    if (changes.proposed_date !== undefined) reservation.proposed_date = changes.proposed_date;
    if (changes.proposed_time !== undefined) reservation.proposed_time = changes.proposed_time;
    if (patch.note) {
      reservation.notes.push({
        id: uid('rnt'),
        reservation_id: reservation.id,
        author_id: profile.id,
        author_name: profile.full_name,
        note: patch.note,
        is_customer_communication: false,
        created_at: now,
      });
    }
    reservation.updated_at = now;
    this.persist();
    return reservation;
  }

  async addReservationNote(id: string, note: string, isCommunication: boolean): Promise<void> {
    const profile = this.requirePermission('reservations:update');
    const reservation = this.state.reservations.find((item) => item.id === id);
    if (!reservation) throw new BackendError('not_found', 'Reservation not found.', 404);
    if (!note.trim()) throw new BackendError('validation', 'Write a note first.', 422, { note: 'Write a note first.' });
    reservation.notes.push({
      id: uid('rnt'),
      reservation_id: id,
      author_id: profile.id,
      author_name: profile.full_name,
      note: note.trim(),
      is_customer_communication: isCommunication,
      created_at: nowISO(),
    });
    this.audit(profile, 'reservation.note.add', 'reservation', id, { communication: isCommunication });
    this.persist();
  }

  /* ------------------------------ customers --------------------------- */

  async listCustomers(search?: string): Promise<CustomerRecord[]> {
    this.requirePermission('customers:view');
    await sleep(80);
    const term = search?.trim().toLowerCase();
    const customers = [...this.state.customers]
      .map((customer) => {
        const own = this.state.reservations.filter((reservation) => reservation.customer_id === customer.id);
        return {
          ...customer,
          reservations_count: own.length,
          total_value: own
            .filter((reservation) => reservation.status === 'confirmed' || reservation.status === 'completed')
            .reduce((sum, reservation) => sum + reservation.total_price, 0),
        };
      })
      .filter((customer) =>
        !term ||
        customer.full_name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term),
      );
    customers.sort((a, b) => (b.last_booking_at ?? '').localeCompare(a.last_booking_at ?? ''));
    return customers;
  }

  async getCustomer(id: string): Promise<CustomerRecord | null> {
    this.requirePermission('customers:view');
    const customer = this.state.customers.find((item) => item.id === id);
    if (!customer) return null;
    const own = this.state.reservations.filter((reservation) => reservation.customer_id === customer.id);
    return {
      ...customer,
      reservations_count: own.length,
      total_value: own
        .filter((reservation) => reservation.status === 'confirmed' || reservation.status === 'completed')
        .reduce((sum, reservation) => sum + reservation.total_price, 0),
    };
  }

  async addCustomerNote(customerId: string, note: string): Promise<void> {
    const profile = this.requirePermission('customers:manage_notes');
    const customer = this.state.customers.find((item) => item.id === customerId);
    if (!customer) throw new BackendError('not_found', 'Customer not found.', 404);
    if (!note.trim()) throw new BackendError('validation', 'Write a note first.', 422, { note: 'Write a note first.' });
    customer.notes.unshift({
      id: uid('cnt'),
      customer_id: customerId,
      author_id: profile.id,
      author_name: profile.full_name,
      note: note.trim(),
      created_at: nowISO(),
    });
    this.audit(profile, 'customer.note.add', 'customer', customerId);
    this.persist();
  }

  /* ------------------------------ catalogue --------------------------- */

  async listOffers(): Promise<Offer[]> {
    this.requirePermission('offers:manage');
    await sleep(100);
    return [...this.state.offers].sort((a, b) => a.sort_order - b.sort_order);
  }

  async saveOffer(draft: OfferDraft): Promise<Offer> {
    const profile = this.requirePermission('offers:manage');
    const parsed = offerUpsertSchema.safeParse(draft);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    const now = nowISO();
    const existing = draft.id ? this.state.offers.find((item) => item.id === draft.id) : undefined;
    const offer: Offer = {
      ...(parsed.data as unknown as Offer),
      id: existing?.id ?? uid('off'),
      bookings_count: existing?.bookings_count ?? 0,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    if (existing) Object.assign(existing, offer);
    else this.state.offers.push(offer);
    this.audit(profile, existing ? 'offer.update' : 'offer.create', 'offer', offer.id, { slug: offer.slug });
    this.persist();
    return offer;
  }

  async setOfferStatus(id: string, status: Offer['status']): Promise<void> {
    const profile = this.requirePermission('offers:manage');
    const offer = this.state.offers.find((item) => item.id === id);
    if (!offer) throw new BackendError('not_found', 'Offer not found.', 404);
    offer.status = status;
    offer.updated_at = nowISO();
    this.audit(profile, `offer.${status}`, 'offer', id);
    this.persist();
  }

  async deleteOffer(id: string): Promise<void> {
    const profile = this.requirePermission('offers:manage');
    this.state.offers = this.state.offers.filter((offer) => offer.id !== id);
    this.audit(profile, 'offer.delete', 'offer', id);
    this.persist();
  }

  async listServices(): Promise<Service[]> {
    this.requirePermission('services:manage');
    await sleep(100);
    return [...this.state.services].sort((a, b) => a.sort_order - b.sort_order);
  }

  async saveService(draft: ServiceDraft): Promise<Service> {
    const profile = this.requirePermission('services:manage');
    const parsed = serviceUpsertSchema.safeParse(draft);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    const now = nowISO();
    const existing = draft.id ? this.state.services.find((item) => item.id === draft.id) : undefined;
    const service: Service = {
      ...(parsed.data as unknown as Service),
      id: existing?.id ?? uid('svc'),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    if (existing) Object.assign(existing, service);
    else this.state.services.push(service);
    this.audit(profile, existing ? 'service.update' : 'service.create', 'service', service.id, { slug: service.slug });
    this.persist();
    return service;
  }

  async listGallery(): Promise<GalleryItem[]> {
    this.requirePermission('gallery:manage');
    await sleep(100);
    return [...this.state.gallery].sort((a, b) => a.sort_order - b.sort_order);
  }

  async saveGalleryItem(draft: GalleryDraft): Promise<GalleryItem> {
    const profile = this.requirePermission('gallery:manage');
    const parsed = galleryItemSchema.safeParse(draft);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    const existing = draft.id ? this.state.gallery.find((item) => item.id === draft.id) : undefined;
    const item: GalleryItem = {
      ...(parsed.data as unknown as GalleryItem),
      id: existing?.id ?? uid('gal'),
      created_at: existing?.created_at ?? nowISO(),
    };
    if (existing) Object.assign(existing, item);
    else this.state.gallery.push(item);
    this.audit(profile, existing ? 'gallery.update' : 'gallery.create', 'gallery_item', item.id);
    this.persist();
    return item;
  }

  async deleteGalleryItem(id: string): Promise<void> {
    const profile = this.requirePermission('gallery:manage');
    this.state.gallery = this.state.gallery.filter((item) => item.id !== id);
    this.audit(profile, 'gallery.delete', 'gallery_item', id);
    this.persist();
  }

  async reorderGalleryItem(id: string, direction: 'up' | 'down'): Promise<void> {
    const profile = this.requirePermission('gallery:manage');
    const sorted = [...this.state.gallery].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((item) => item.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= sorted.length) return;
    const current = sorted[index] as GalleryItem;
    const other = sorted[swapWith] as GalleryItem;
    const currentOrder = current.sort_order;
    current.sort_order = other.sort_order;
    other.sort_order = currentOrder;
    this.audit(profile, 'gallery.reorder', 'gallery_item', id, { direction });
    this.persist();
  }

  async listTestimonials(): Promise<Testimonial[]> {
    this.requirePermission('testimonials:manage');
    await sleep(100);
    return [...this.state.testimonials].sort((a, b) => a.sort_order - b.sort_order);
  }

  async saveTestimonial(draft: TestimonialDraft): Promise<Testimonial> {
    const profile = this.requirePermission('testimonials:manage');
    const parsed = testimonialSchema.safeParse(draft);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    const existing = draft.id ? this.state.testimonials.find((item) => item.id === draft.id) : undefined;
    const item: Testimonial = {
      ...(parsed.data as unknown as Testimonial),
      id: existing?.id ?? uid('tst'),
      created_at: existing?.created_at ?? nowISO(),
    };
    if (existing) Object.assign(existing, item);
    else this.state.testimonials.push(item);
    this.audit(profile, existing ? 'testimonial.update' : 'testimonial.create', 'testimonial', item.id);
    this.persist();
    return item;
  }

  async deleteTestimonial(id: string): Promise<void> {
    const profile = this.requirePermission('testimonials:manage');
    this.state.testimonials = this.state.testimonials.filter((item) => item.id !== id);
    this.audit(profile, 'testimonial.delete', 'testimonial', id);
    this.persist();
  }

  async uploadMedia(file: File): Promise<string> {
    this.requireProfile();
    if (file.size > 4 * 1024 * 1024) {
      throw new BackendError('file_too_large', 'In demo mode images must be under 4 MB. Configure Supabase Storage for larger files.', 413);
    }
    if (!/^image\/(png|jpe?g|webp|avif|gif)$/.test(file.type) && !/^video\/(mp4|webm)$/.test(file.type)) {
      throw new BackendError('invalid_file', 'Upload an image (JPG, PNG, WebP) or an MP4/WebM video.', 415);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new BackendError('upload_failed', 'The file could not be read.', 500));
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------ inventory --------------------------- */

  async listBicycles(): Promise<Bicycle[]> {
    this.requirePermission('inventory:view');
    await sleep(100);
    return [...this.state.bicycles].sort((a, b) => a.internal_code.localeCompare(b.internal_code));
  }

  async saveBicycle(draft: BicycleDraft): Promise<Bicycle> {
    const profile = this.requirePermission('inventory:manage');
    const now = nowISO();
    const existing = draft.id ? this.state.bicycles.find((item) => item.id === draft.id) : undefined;
    const bicycle: Bicycle = {
      ...draft,
      id: existing?.id ?? uid('bke'),
      created_at: existing?.created_at ?? now,
    };
    if (!bicycle.internal_code || !bicycle.name) {
      throw new BackendError('validation', 'A code and a name are required.', 422, {
        internal_code: !bicycle.internal_code ? 'Required.' : '',
        name: !bicycle.name ? 'Required.' : '',
      });
    }
    if (existing) Object.assign(existing, bicycle);
    else this.state.bicycles.push(bicycle);
    this.audit(profile, existing ? 'inventory.update' : 'inventory.create', 'bicycle', bicycle.id, { code: bicycle.internal_code });
    this.persist();
    return bicycle;
  }

  /* ------------------------------ operations -------------------------- */

  async listNotes(): Promise<AdminNote[]> {
    this.requirePermission('notes:manage_own');
    await sleep(80);
    return [...this.state.notes].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async saveNote(draft: NoteDraft): Promise<AdminNote> {
    const profile = this.requirePermission('notes:manage_own');
    const parsed = noteUpsertSchema.safeParse(draft);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    const now = nowISO();
    const existing = draft.id ? this.state.notes.find((item) => item.id === draft.id) : undefined;
    const note: AdminNote = {
      ...(parsed.data as unknown as AdminNote),
      id: existing?.id ?? uid('not'),
      created_by: existing?.created_by ?? profile.id,
      created_by_name: existing?.created_by_name ?? profile.full_name,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    if (existing) Object.assign(existing, note);
    else this.state.notes.push(note);
    this.audit(profile, existing ? 'note.update' : 'note.create', 'admin_note', note.id, { title: note.title });
    this.persist();
    return note;
  }

  async deleteNote(id: string): Promise<void> {
    const profile = this.requirePermission('notes:manage_own');
    this.state.notes = this.state.notes.filter((note) => note.id !== id);
    this.audit(profile, 'note.delete', 'admin_note', id);
    this.persist();
  }

  async listBlocks(): Promise<AvailabilityBlock[]> {
    this.requirePermission('calendar:view');
    await sleep(80);
    return [...this.state.blocks].sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  async saveBlock(draft: BlockDraft): Promise<AvailabilityBlock> {
    const profile = this.requirePermission('calendar:manage');
    const parsed = availabilityBlockSchema.safeParse(draft);
    if (!parsed.success) {
      throw new BackendError('validation', 'Please correct the highlighted fields.', 422, fieldErrors(parsed.error));
    }
    if (parsed.data.end_date < parsed.data.start_date) {
      throw new BackendError('validation', 'The end date must be on or after the start date.', 422, { end_date: 'Check the dates.' });
    }
    const existing = draft.id ? this.state.blocks.find((item) => item.id === draft.id) : undefined;
    const block: AvailabilityBlock = {
      ...(parsed.data as unknown as AvailabilityBlock),
      id: existing?.id ?? uid('blk'),
      created_at: existing?.created_at ?? nowISO(),
    };
    if (existing) Object.assign(existing, block);
    else this.state.blocks.push(block);
    this.audit(profile, existing ? 'availability_block.update' : 'availability_block.create', 'availability_block', block.id, {
      reason: block.reason,
    });
    this.persist();
    return block;
  }

  async deleteBlock(id: string): Promise<void> {
    const profile = this.requirePermission('calendar:manage');
    this.state.blocks = this.state.blocks.filter((block) => block.id !== id);
    this.audit(profile, 'availability_block.delete', 'availability_block', id);
    this.persist();
  }

  async listEvents(): Promise<CalendarEvent[]> {
    this.requirePermission('calendar:view');
    await sleep(80);
    return [...this.state.events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  }

  async saveEvent(draft: EventDraft): Promise<CalendarEvent> {
    const profile = this.requirePermission('calendar:manage');
    if (!draft.title.trim()) throw new BackendError('validation', 'Add a title.', 422, { title: 'Add a title.' });
    if (draft.end_at < draft.start_at) throw new BackendError('validation', 'The end must be after the start.', 422, { end_at: 'Check the times.' });
    const existing = draft.id ? this.state.events.find((item) => item.id === draft.id) : undefined;
    const event: CalendarEvent = {
      ...draft,
      id: existing?.id ?? uid('evt'),
      created_by: existing?.created_by ?? profile.id,
      created_at: existing?.created_at ?? nowISO(),
    };
    if (existing) Object.assign(existing, event);
    else this.state.events.push(event);
    this.audit(profile, existing ? 'calendar_event.update' : 'calendar_event.create', 'calendar_event', event.id);
    this.persist();
    return event;
  }

  async getSettings(): Promise<typeof SEED_SETTINGS> {
    await sleep(60);
    return this.state.settings;
  }

  async saveSettings(settings: typeof SEED_SETTINGS): Promise<typeof SEED_SETTINGS> {
    const profile = this.requirePermission('settings:manage');
    this.state.settings = { ...settings, updated_at: nowISO() };
    this.audit(profile, 'settings.update', 'site_settings', settings.id);
    this.persist();
    return this.state.settings;
  }

  /* -------------------------------- team ------------------------------ */

  async listStaff(): Promise<Profile[]> {
    this.requirePermission('users:manage');
    await sleep(60);
    return [...this.state.profiles].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  async saveStaff(draft: StaffDraft): Promise<{ profile: Profile; temporaryPassword?: string }> {
    const actor = this.requirePermission('users:manage');
    const now = nowISO();
    if (draft.id) {
      const profile = this.state.profiles.find((item) => item.id === draft.id);
      if (!profile) throw new BackendError('not_found', 'Team member not found.', 404);
      profile.full_name = draft.full_name || profile.full_name;
      profile.role = draft.role;
      if (draft.is_active !== undefined) profile.is_active = draft.is_active;
      if (draft.phone !== undefined) profile.phone = draft.phone;
      this.audit(actor, 'profile.update', 'profile', profile.id, { role: profile.role, active: profile.is_active });
      this.persist();
      return { profile };
    }
    const email = draft.email.trim().toLowerCase();
    if (this.state.profiles.some((item) => item.email.toLowerCase() === email)) {
      throw new BackendError('duplicate', 'A team member with this email already exists.', 409, { email: 'Already in use.' });
    }
    const profile: Profile = {
      id: uid('prf'),
      email,
      full_name: draft.full_name,
      role: draft.role,
      is_active: true,
      phone: draft.phone ?? null,
      created_at: now,
      last_sign_in_at: null,
    };
    this.state.profiles.push(profile);
    this.audit(actor, 'profile.create', 'profile', profile.id, { role: profile.role });
    this.persist();
    return { profile, temporaryPassword: DEMO_PASSWORD };
  }

  /* ------------------------------ reporting --------------------------- */

  async getDashboardMetrics(from: string, to: string): Promise<DashboardMetrics> {
    this.requirePermission('dashboard:view');
    await sleep(90);
    const today = todayISO();
    const reservations = this.state.reservations;
    const inPeriod = reservations.filter(
      (reservation) => reservation.reservation_date >= from && reservation.reservation_date <= to,
    );
    const revenueStatuses = new Set(['confirmed', 'completed']);
    const byStatus = (['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'] as ReservationStatus[]).map((status) => ({
      status,
      count: reservations.filter((reservation) => reservation.status === status).length,
    }));

    const series: DashboardMetrics['series'] = [];
    for (let date = from; date <= to; date = addDaysISO(date, 1)) {
      const dayReservations = reservations.filter((reservation) => reservation.reservation_date === date);
      series.push({
        date,
        reservations: dayReservations.length,
        revenue: Math.round(
          dayReservations
            .filter((reservation) => revenueStatuses.has(reservation.status))
            .reduce((sum, reservation) => sum + reservation.total_price, 0),
        ),
      });
    }

    const serviceCounts = new Map<string, number>();
    for (const reservation of inPeriod) {
      const service = this.serviceById(reservation.service_id);
      const name = service?.translations.find((item) => item.locale === 'en')?.name ?? 'Other';
      serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
    }

    return {
      todayReservations: reservations.filter((reservation) => reservation.reservation_date === today).length,
      pending: reservations.filter((reservation) => reservation.status === 'pending').length,
      confirmed: reservations.filter((reservation) => reservation.status === 'confirmed').length,
      upcomingTours: reservations.filter(
        (reservation) =>
          reservation.reservation_type === 'tour' &&
          reservation.reservation_date >= today &&
          (reservation.status === 'pending' || reservation.status === 'confirmed'),
      ).length,
      cancelled: reservations.filter((reservation) => reservation.status === 'cancelled').length,
      totalPeriod: inPeriod.length,
      confirmedRevenue: Math.round(
        inPeriod
          .filter((reservation) => reservation.status === 'confirmed' || reservation.status === 'completed')
          .reduce((sum, reservation) => sum + reservation.total_price, 0),
      ),
      estimatedValue: Math.round(
        inPeriod
          .filter((reservation) => reservation.status === 'pending')
          .reduce((sum, reservation) => sum + reservation.total_price, 0),
      ),
      publishedOffers: this.state.offers.filter((offer) => offer.status === 'published').length,
      series,
      byService: [...serviceCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      byStatus,
      recent: [...reservations].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    };
  }

  async getAnalyticsSummary(from: string, to: string): Promise<AnalyticsSummary> {
    this.requirePermission('analytics:view');
    await sleep(120);
    const events = this.state.analytics.filter((event) => {
      const date = event.created_at.slice(0, 10);
      return date >= from && date <= to;
    });
    const pageViews = events.filter((event) => event.event_type === 'page_view');
    const visitors = new Set(pageViews.map((event) => event.anonymous_id)).size;
    const reservationRequests = events.filter((event) => event.event_type === 'reservation_submitted').length;

    const trendMap = new Map<string, { visitors: Set<string>; pageViews: number; reservations: number }>();
    for (let date = from; date <= to; date = addDaysISO(date, 1)) {
      trendMap.set(date, { visitors: new Set(), pageViews: 0, reservations: 0 });
    }
    for (const event of events) {
      const date = event.created_at.slice(0, 10);
      const bucket = trendMap.get(date);
      if (!bucket) continue;
      if (event.event_type === 'page_view') {
        bucket.visitors.add(event.anonymous_id);
        bucket.pageViews += 1;
      }
      if (event.event_type === 'reservation_submitted') bucket.reservations += 1;
    }
    const trend = [...trendMap.entries()].map(([date, bucket]) => ({
      date,
      visitors: bucket.visitors.size,
      pageViews: bucket.pageViews,
      reservations: bucket.reservations,
    }));

    const pageMap = new Map<string, { views: number; visitors: Set<string> }>();
    for (const event of pageViews) {
      const entry = pageMap.get(event.path) ?? { views: 0, visitors: new Set<string>() };
      entry.views += 1;
      entry.visitors.add(event.anonymous_id);
      pageMap.set(event.path, entry);
    }

    const countBy = (key: (event: AnalyticsEvent) => string | null) => {
      const map = new Map<string, number>();
      for (const event of pageViews) {
        const value = key(event);
        if (!value) continue;
        map.set(value, (map.get(value) ?? 0) + 1);
      }
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const totalVisits = pageViews.length || 1;
    const referrers = countBy((event) => {
      if (!event.referrer) return '__direct__';
      try {
        return new URL(event.referrer).hostname.replace(/^www\./, '');
      } catch {
        return event.referrer;
      }
    }).map(([source, visits]) => ({ source: source === '__direct__' ? '' : source, visits, share: Math.round((visits / totalVisits) * 100) }));

    const devices = countBy((event) => event.device_category).map(([device, visits]) => ({
      device,
      visits,
      share: Math.round((visits / totalVisits) * 100),
    }));
    const browsers = countBy((event) => event.browser).map(([browser, visits]) => ({
      browser,
      visits,
      share: Math.round((visits / totalVisits) * 100),
    }));

    return {
      visitors,
      pageViews: pageViews.length,
      reservationRequests,
      conversionRate: visitors ? Math.round((reservationRequests / visitors) * 1000) / 10 : 0,
      trend,
      topPages: [...pageMap.entries()]
        .map(([path, entry]) => ({ path, views: entry.views, visitors: entry.visitors.size }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 8),
      landingPages: [...pageMap.entries()].slice(0, 8).map(([path, entry]) => ({ path, visits: entry.views })),
      referrers,
      devices,
      browsers,
      campaigns: countBy((event) => event.utm_campaign).map(([campaign, visits]) => ({ campaign, visits })),
      countries: countBy((event) => event.country).map(([country, visits]) => ({ country, visits })),
      events: ['page_view', 'reservation_submitted', 'offer_view', 'cta_click'].map((type) => ({
        event_type: type,
        count: events.filter((event) => event.event_type === type).length,
      })),
    };
  }

  async listIdentifiedCustomers(): Promise<CustomerRecord[]> {
    this.requirePermission('analytics:view');
    const customers = [...this.state.customers];
    customers.sort((a, b) => (b.last_booking_at ?? '').localeCompare(a.last_booking_at ?? ''));
    return customers.map((customer) => ({
      ...customer,
      reservations_count: this.state.reservations.filter((reservation) => reservation.customer_id === customer.id).length,
    }));
  }

  async listAuditLogs(limit = 50): Promise<AuditLog[]> {
    this.requirePermission('audit:view');
    return this.state.audit.slice(0, limit);
  }
}

export const demoBackend: Backend = new DemoBackend();

/** Exposed for tests: build a clean demo state without touching localStorage. */
export function __resetDemoMemory(): void {
  memoryStore.state = null;
}

export type { DemoState };
export const DEMO_DEFAULT_LOCALE = DEFAULT_LOCALE;
export const DEMO_NOTE = 'Demo data lives in your browser only. Configure Supabase to persist changes.';
export type { ReservationNote };
