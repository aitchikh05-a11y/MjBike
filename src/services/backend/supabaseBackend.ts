import { getSupabase } from '@/lib/supabase/client';
import { ApiError, apiRequest } from '@/lib/utilities/api';
import { addDaysISO, todayISO } from '@shared/domain/availability';
import { fieldErrors, type AnalyticsEventInput, type ReservationCreateInput, type ReservationUpdateInput } from '@shared/schemas';
import type {
  AdminNote,
  AuditLog,
  AvailabilityBlock,
  AvailabilityRule,
  Bicycle,
  CalendarEvent,
  Customer,
  GalleryItem,
  Offer,
  Profile,
  Reservation,
  ReservationStatus,
  Service,
  SiteSettings,
  Testimonial,
} from '@shared/domain/types';
import { BackendError, DEMO_PASSWORD } from './demoBackend';
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

type Row = Record<string, unknown>;

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

function mapTranslations<T extends Row>(rows: T[] | null | undefined) {
  return (rows ?? []).map((row) => row as never);
}

function mapService(row: Row): Service {
  return {
    id: row.id as string,
    slug: row.slug as string,
    kind: row.kind as Service['kind'],
    image_url: (row.image_url as string) ?? '',
    gallery: (row.gallery as string[]) ?? [],
    price_unit: row.price_unit as Service['price_unit'],
    base_price: Number(row.base_price),
    duration_options: (row.duration_options as Service['duration_options']) ?? [],
    default_duration_hours: Number(row.default_duration_hours),
    capacity: Number(row.capacity),
    min_units: Number(row.min_units),
    max_units: Number(row.max_units),
    addons: (row.addons as Service['addons']) ?? [],
    is_active: Boolean(row.is_active),
    is_featured: Boolean(row.is_featured),
    sort_order: Number(row.sort_order),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    translations: mapTranslations(row.service_translations as Row[]),
  };
}

function mapOffer(row: Row): Offer {
  return {
    id: row.id as string,
    slug: row.slug as string,
    service_id: (row.service_id as string) ?? null,
    image_url: (row.image_url as string) ?? '',
    price: Number(row.price),
    compare_at_price: row.compare_at_price === null || row.compare_at_price === undefined ? null : Number(row.compare_at_price),
    duration_hours: Number(row.duration_hours),
    validity_start: row.validity_start as string,
    validity_end: row.validity_end as string,
    capacity: row.capacity === null ? null : Number(row.capacity),
    bookings_count: Number(row.bookings_count ?? 0),
    status: row.status as Offer['status'],
    is_featured: Boolean(row.is_featured),
    sort_order: Number(row.sort_order),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    translations: mapTranslations(row.offer_translations as Row[]),
  };
}

function mapReservation(row: Row): Reservation {
  const items = (row.reservation_items as Row[]) ?? [];
  const history = (row.reservation_status_history as Row[]) ?? [];
  const notes = (row.reservation_notes as Row[]) ?? [];
  return {
    id: row.id as string,
    reference: row.reference as string,
    status: row.status as ReservationStatus,
    reservation_type: row.reservation_type as Reservation['reservation_type'],
    service_id: (row.service_id as string) ?? null,
    offer_id: (row.offer_id as string) ?? null,
    customer_id: (row.customer_id as string) ?? null,
    full_name: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    preferred_contact: row.preferred_contact as Reservation['preferred_contact'],
    participants: Number(row.participants),
    reservation_date: row.reservation_date as string,
    start_time: (row.start_time as string).slice(0, 5),
    duration_hours: Number(row.duration_hours),
    addons: (row.addons as Reservation['addons']) ?? [],
    message: (row.message as string) ?? null,
    locale: row.locale as Reservation['locale'],
    total_price: Number(row.total_price),
    price_snapshot: (row.price_snapshot as Reservation['price_snapshot']) ?? null,
    privacy_accepted: Boolean(row.privacy_accepted),
    assigned_staff_id: (row.assigned_staff_id as string) ?? null,
    internal_notes: (row.internal_notes as string) ?? null,
    cancellation_reason: (row.cancellation_reason as string) ?? null,
    proposed_date: (row.proposed_date as string) ?? null,
    proposed_time: (row.proposed_time as string) ?? null,
    source: (row.source as Reservation['source']) ?? 'website',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    items: items.map((item) => ({
      id: item.id as string,
      reservation_id: item.reservation_id as string,
      service_id: (item.service_id as string) ?? null,
      service_slug: (item.service_slug as string) ?? null,
      name: item.name as string,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      duration_hours: Number(item.duration_hours),
      line_total: Number(item.line_total),
      bicycle_id: (item.bicycle_id as string) ?? null,
    })),
    history: history
      .map((entry) => ({
        id: entry.id as string,
        reservation_id: entry.reservation_id as string,
        from_status: (entry.from_status as ReservationStatus) ?? null,
        to_status: entry.to_status as ReservationStatus,
        changed_by: (entry.changed_by as string) ?? null,
        changed_by_name: (entry.changed_by_name as string) ?? 'System',
        reason: (entry.reason as string) ?? null,
        created_at: entry.created_at as string,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    notes: notes.map((note) => ({
      id: note.id as string,
      reservation_id: note.reservation_id as string,
      author_id: (note.author_id as string) ?? null,
      author_name: (note.author_name as string) ?? '',
      note: note.note as string,
      is_customer_communication: Boolean(note.is_customer_communication),
      created_at: note.created_at as string,
    })),
  };
}

function mapProfile(row: Row): Profile {
  return {
    id: row.id as string,
    email: (row.email as string) ?? '',
    full_name: (row.full_name as string) ?? '',
    role: row.role as Profile['role'],
    is_active: Boolean(row.is_active),
    phone: (row.phone as string) ?? null,
    created_at: row.created_at as string,
    last_sign_in_at: (row.last_sign_in_at as string) ?? null,
  };
}

function mapCustomer(row: Row): CustomerRecord {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    locale: row.locale as Customer['locale'],
    first_seen_at: row.first_seen_at as string,
    last_booking_at: (row.last_booking_at as string) ?? null,
    marketing_consent: Boolean(row.marketing_consent),
    reservations_count: row.reservations_count === undefined ? undefined : Number(row.reservations_count),
    total_value: row.total_value === undefined ? undefined : Number(row.total_value),
    notes: ((row.customer_notes as Row[]) ?? []).map((note) => ({
      id: note.id as string,
      customer_id: note.customer_id as string,
      author_id: (note.author_id as string) ?? null,
      author_name: (note.author_name as string) ?? '',
      note: note.note as string,
      created_at: note.created_at as string,
    })),
  };
}

const RESERVATION_SELECT = '*, reservation_items(*), reservation_status_history(*), reservation_notes(*)';

export class SupabaseBackend implements Backend {
  mode = 'supabase' as const;

  private get db() {
    return getSupabase();
  }

  private async fail(error: { message: string; code?: string } | null, fallback = 'Database request failed.'): Promise<never> {
    throw new BackendError(error?.code ?? 'database_error', error?.message ?? fallback, 500);
  }

  /* ------------------------------- auth ------------------------------- */

  async getSession(): Promise<Profile | null> {
    const { data: sessionData } = await this.db.auth.getSession();
    if (!sessionData.session) return null;
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', sessionData.session.user.id)
      .maybeSingle();
    if (error) return this.fail(error);
    return data ? mapProfile(data as Row) : null;
  }

  async signIn(email: string, password: string): Promise<Profile> {
    const { data, error } = await this.db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new BackendError('invalid_credentials', error.message, 401);
    const { data: profile, error: profileError } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) return this.fail(profileError);
    if (!profile) {
      await this.db.auth.signOut();
      throw new BackendError('not_provisioned', 'This account is not provisioned as an administrator.', 403);
    }
    if (!profile.is_active) {
      await this.db.auth.signOut();
      throw new BackendError('inactive', 'This account has been deactivated.', 403);
    }
    return mapProfile(profile as Row);
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await this.db.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/update-password`,
    });
    // Do not leak whether the account exists.
    if (error && error.status && error.status >= 500) throw new BackendError('reset_failed', error.message, 500);
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.db.auth.updateUser({ password });
    if (error) throw new BackendError('password_update_failed', error.message, 400);
  }

  /* ---------------------------- public site ---------------------------- */

  async getPublicData(): Promise<PublicData> {
    const today = todayISO();
    const [settings, services, offers, gallery, testimonials, rules, blocks] = await Promise.all([
      this.db.from('site_settings').select('*').limit(1).maybeSingle(),
      this.db
        .from('services')
        .select('*, service_translations(*)')
        .eq('is_active', true)
        .order('sort_order'),
      this.db
        .from('offers')
        .select('*, offer_translations(*)')
        .eq('status', 'published')
        .lte('validity_start', today)
        .gte('validity_end', today)
        .order('sort_order'),
      this.db.from('gallery_items').select('*').eq('is_published', true).order('sort_order'),
      this.db.from('testimonials').select('*').eq('is_published', true).order('sort_order'),
      this.db.from('availability_rules').select('*').eq('is_active', true),
      this.db.from('availability_blocks').select('*').eq('is_active', true).gte('end_date', today),
    ]);

    for (const [label, result] of Object.entries({ settings, services, offers, gallery, testimonials, rules, blocks })) {
      if (result.error) throw new BackendError('load_failed', `${label}: ${result.error.message}`, 500);
    }

    if (!settings.data) throw new BackendError('not_configured', 'Site settings are missing. Run the database seed.', 500);

    return {
      settings: settings.data as SiteSettings,
      services: ((services.data as Row[]) ?? []).map(mapService),
      offers: ((offers.data as Row[]) ?? []).map(mapOffer),
      gallery: ((gallery.data as Row[]) ?? []) as unknown as GalleryItem[],
      testimonials: ((testimonials.data as Row[]) ?? []) as unknown as Testimonial[],
      rules: ((rules.data as Row[]) ?? []) as unknown as AvailabilityRule[],
      blocks: ((blocks.data as Row[]) ?? []) as unknown as AvailabilityBlock[],
    };
  }

  async getAvailability(query: AvailabilityQuery): Promise<SlotInfo[]> {
    const { data, error } = await this.db.rpc('service_availability', {
      p_service_id: query.serviceId,
      p_date: query.date,
      p_duration: query.durationHours,
    });
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []).map((row) => ({
      time: (row.slot_time as string).slice(0, 5),
      available: Boolean(row.available),
      remaining: Number(row.remaining ?? 0),
      reason: (row.reason as string) ?? undefined,
    }));
  }

  async createReservation(input: ReservationCreateInput): Promise<CreateReservationResult> {
    const payload = await apiRequest<{ reservation: Row; duplicate: boolean }>('/api/reservations', {
      method: 'POST',
      body: input,
    });
    return { reservation: mapReservation(payload.reservation), duplicate: payload.duplicate };
  }

  async lookupReservation(reference: string, email: string): Promise<Reservation | null> {
    const { data, error } = await this.db.rpc('lookup_reservation', {
      p_reference: reference.trim().toUpperCase(),
      p_email: email.trim().toLowerCase(),
    });
    if (error) return this.fail(error);
    if (!data) return null;
    return mapReservation(data as Row);
  }

  async submitContactMessage(input: ContactMessageInput): Promise<void> {
    await apiRequest('/api/contact', { method: 'POST', body: input });
  }

  async trackEvent(input: AnalyticsEventInput): Promise<void> {
    try {
      await fetch('/api/analytics/collect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        keepalive: true,
      });
    } catch {
      // Analytics must never break the page for the visitor.
    }
  }

  /* --------------------------- reservations --------------------------- */

  async listReservations(filters: ReservationFilters): Promise<ReservationPage> {
    let query = this.db.from('reservations').select(RESERVATION_SELECT, { count: 'exact' });
    if (filters.search) {
      const term = filters.search.replace(/[%,]/g, '').trim();
      query = query.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,reference.ilike.%${term}%`,
      );
    }
    if (filters.status?.length) query = query.in('status', filters.status);
    if (filters.type) query = query.eq('reservation_type', filters.type);
    if (filters.from) query = query.gte('reservation_date', filters.from);
    if (filters.to) query = query.lte('reservation_date', filters.to);
    if (filters.staffId) query = query.eq('assigned_staff_id', filters.staffId);

    const sortKey = filters.sort ?? 'created_at';
    query = query.order(sortKey, { ascending: filters.direction === 'asc' });
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return this.fail(error);
    return { items: ((data as Row[]) ?? []).map(mapReservation), total: count ?? 0 };
  }

  async getReservation(id: string): Promise<Reservation | null> {
    const { data, error } = await this.db.from('reservations').select(RESERVATION_SELECT).eq('id', id).maybeSingle();
    if (error) return this.fail(error);
    return data ? mapReservation(data as Row) : null;
  }

  async getReservationByReference(reference: string): Promise<Reservation | null> {
    const { data, error } = await this.db
      .from('reservations')
      .select(RESERVATION_SELECT)
      .eq('reference', reference)
      .maybeSingle();
    if (error) return this.fail(error);
    return data ? mapReservation(data as Row) : null;
  }

  async updateReservation(id: string, patch: ReservationUpdateInput & { note?: string }): Promise<Reservation> {
    const payload = await apiRequest<{ reservation: Row }>(`/api/admin/reservations/${id}`, {
      method: 'PATCH',
      body: patch,
    });
    return mapReservation(payload.reservation);
  }

  async addReservationNote(id: string, note: string, isCommunication: boolean): Promise<void> {
    await apiRequest(`/api/admin/reservations/${id}/notes`, {
      method: 'POST',
      body: { note, is_customer_communication: isCommunication },
    });
  }

  /* ----------------------------- customers ----------------------------- */

  async listCustomers(search?: string): Promise<CustomerRecord[]> {
    let query = this.db.from('customers').select('*, customer_notes(*)').order('last_booking_at', { ascending: false });
    if (search) {
      const term = search.replace(/[%,]/g, '').trim();
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []).map(mapCustomer);
  }

  async getCustomer(id: string): Promise<CustomerRecord | null> {
    const { data, error } = await this.db.from('customers').select('*, customer_notes(*)').eq('id', id).maybeSingle();
    if (error) return this.fail(error);
    return data ? mapCustomer(data as Row) : null;
  }

  async addCustomerNote(customerId: string, note: string): Promise<void> {
    const { data: user } = await this.db.auth.getUser();
    const { data: profile } = await this.db.from('profiles').select('full_name').eq('id', user.user?.id ?? '').maybeSingle();
    const { error } = await this.db.from('customer_notes').insert({
      customer_id: customerId,
      author_id: user.user?.id ?? null,
      author_name: profile?.full_name ?? 'Staff',
      note,
    });
    if (error) return this.fail(error);
  }

  /* ----------------------------- catalogue ----------------------------- */

  async listOffers(): Promise<Offer[]> {
    const { data, error } = await this.db
      .from('offers')
      .select('*, offer_translations(*)')
      .order('sort_order');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []).map(mapOffer);
  }

  async saveOffer(draft: OfferDraft): Promise<Offer> {
    const { translations, id, ...rest } = draft;
    const payload = { ...rest, ...(id ? { id } : {}) };
    const { data, error } = await this.db.from('offers').upsert(payload).select('*').single();
    if (error) return this.fail(error);
    const offerId = (data as Row).id as string;
    const { error: translationError } = await this.db
      .from('offer_translations')
      .upsert(translations.map((translation) => ({ ...translation, offer_id: offerId })), {
        onConflict: 'offer_id,locale',
      });
    if (translationError) return this.fail(translationError);
    const saved = await this.listOffers();
    const found = saved.find((offer) => offer.id === offerId);
    if (!found) throw new BackendError('save_failed', 'The offer was saved but could not be reloaded.', 500);
    return found;
  }

  async setOfferStatus(id: string, status: Offer['status']): Promise<void> {
    const { error } = await this.db.from('offers').update({ status }).eq('id', id);
    if (error) return this.fail(error);
  }

  async deleteOffer(id: string): Promise<void> {
    const { error } = await this.db.from('offers').delete().eq('id', id);
    if (error) return this.fail(error);
  }

  async listServices(): Promise<Service[]> {
    const { data, error } = await this.db
      .from('services')
      .select('*, service_translations(*)')
      .order('sort_order');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []).map(mapService);
  }

  async saveService(draft: ServiceDraft): Promise<Service> {
    const { translations, id, ...rest } = draft;
    const { data, error } = await this.db.from('services').upsert({ ...rest, ...(id ? { id } : {}) }).select('*').single();
    if (error) return this.fail(error);
    const serviceId = (data as Row).id as string;
    const { error: translationError } = await this.db
      .from('service_translations')
      .upsert(translations.map((translation) => ({ ...translation, service_id: serviceId })), {
        onConflict: 'service_id,locale',
      });
    if (translationError) return this.fail(translationError);
    const services = await this.listServices();
    const found = services.find((service) => service.id === serviceId);
    if (!found) throw new BackendError('save_failed', 'The service was saved but could not be reloaded.', 500);
    return found;
  }

  async listGallery(): Promise<GalleryItem[]> {
    const { data, error } = await this.db.from('gallery_items').select('*').order('sort_order');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []) as unknown as GalleryItem[];
  }

  async saveGalleryItem(draft: GalleryDraft): Promise<GalleryItem> {
    const { error, data } = await this.db.from('gallery_items').upsert(draft).select('*').single();
    if (error) return this.fail(error);
    return data as unknown as GalleryItem;
  }

  async deleteGalleryItem(id: string): Promise<void> {
    const { error } = await this.db.from('gallery_items').delete().eq('id', id);
    if (error) return this.fail(error);
  }

  async reorderGalleryItem(id: string, direction: 'up' | 'down'): Promise<void> {
    const { error } = await this.db.rpc('reorder_gallery_item', { p_id: id, p_direction: direction });
    if (error) return this.fail(error);
  }

  async listTestimonials(): Promise<Testimonial[]> {
    const { data, error } = await this.db.from('testimonials').select('*').order('sort_order');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []) as unknown as Testimonial[];
  }

  async saveTestimonial(draft: TestimonialDraft): Promise<Testimonial> {
    const { error, data } = await this.db.from('testimonials').upsert(draft).select('*').single();
    if (error) return this.fail(error);
    return data as unknown as Testimonial;
  }

  async deleteTestimonial(id: string): Promise<void> {
    const { error } = await this.db.from('testimonials').delete().eq('id', id);
    if (error) return this.fail(error);
  }

  async uploadMedia(file: File): Promise<string> {
    if (file.size > 5 * 1024 * 1024) throw new BackendError('too_large', 'Maximum file size is 5 MB.', 413);
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extension}`;
    const { error } = await this.db.storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false });
    if (error) return this.fail(error as { message: string });
    const { data } = this.db.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  }

  /* ----------------------------- inventory ----------------------------- */

  async listBicycles(): Promise<Bicycle[]> {
    const { data, error } = await this.db.from('bicycles').select('*').order('internal_code');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []) as unknown as Bicycle[];
  }

  async saveBicycle(draft: BicycleDraft): Promise<Bicycle> {
    const { error, data } = await this.db.from('bicycles').upsert(draft).select('*').single();
    if (error) return this.fail(error);
    return data as unknown as Bicycle;
  }

  /* ---------------------------- operations ---------------------------- */

  async listNotes(): Promise<AdminNote[]> {
    const { data, error } = await this.db.from('admin_notes').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []) as unknown as AdminNote[];
  }

  async saveNote(draft: NoteDraft): Promise<AdminNote> {
    const { data: user } = await this.db.auth.getUser();
    const { data: profile } = await this.db.from('profiles').select('full_name').eq('id', user.user?.id ?? '').maybeSingle();
    const payload = { ...draft, created_by: user.user?.id ?? null, created_by_name: profile?.full_name ?? 'Staff' };
    const { data, error } = await this.db.from('admin_notes').upsert(payload).select('*').single();
    if (error) return this.fail(error);
    return data as unknown as AdminNote;
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await this.db.from('admin_notes').delete().eq('id', id);
    if (error) return this.fail(error);
  }

  async listBlocks(): Promise<AvailabilityBlock[]> {
    const { data, error } = await this.db.from('availability_blocks').select('*').order('start_date');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []) as unknown as AvailabilityBlock[];
  }

  async saveBlock(draft: BlockDraft): Promise<AvailabilityBlock> {
    const { error, data } = await this.db.from('availability_blocks').upsert(draft).select('*').single();
    if (error) return this.fail(error);
    return data as unknown as AvailabilityBlock;
  }

  async deleteBlock(id: string): Promise<void> {
    const { error } = await this.db.from('availability_blocks').delete().eq('id', id);
    if (error) return this.fail(error);
  }

  async listEvents(): Promise<CalendarEvent[]> {
    const { data, error } = await this.db.from('calendar_events').select('*').order('start_at');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []) as unknown as CalendarEvent[];
  }

  async saveEvent(draft: EventDraft): Promise<CalendarEvent> {
    const { data: user } = await this.db.auth.getUser();
    const { error, data } = await this.db
      .from('calendar_events')
      .upsert({ ...draft, created_by: draft.id ? undefined : user.user?.id })
      .select('*')
      .single();
    if (error) return this.fail(error);
    return data as unknown as CalendarEvent;
  }

  async getSettings(): Promise<SiteSettings> {
    const { data, error } = await this.db.from('site_settings').select('*').limit(1).maybeSingle();
    if (error) return this.fail(error);
    if (!data) throw new BackendError('not_found', 'Site settings are not initialised.', 404);
    return data as unknown as SiteSettings;
  }

  async saveSettings(settings: SiteSettings): Promise<SiteSettings> {
    const { data, error } = await this.db.from('site_settings').update(settings).eq('id', settings.id).select('*').single();
    if (error) return this.fail(error);
    return data as unknown as SiteSettings;
  }

  /* -------------------------------- team -------------------------------- */

  async listStaff(): Promise<Profile[]> {
    const { data, error } = await this.db.from('profiles').select('*').order('created_at');
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []).map(mapProfile);
  }

  async saveStaff(draft: StaffDraft): Promise<{ profile: Profile; temporaryPassword?: string }> {
    const payload = await apiRequest<{ profile: Row; temporaryPassword?: string }>('/api/admin/staff', {
      method: 'POST',
      body: draft,
    });
    return { profile: mapProfile(payload.profile), temporaryPassword: payload.temporaryPassword };
  }

  /* ----------------------------- reporting ----------------------------- */

  async getDashboardMetrics(from: string, to: string): Promise<DashboardMetrics> {
    const [reservations, offers] = await Promise.all([
      this.db
        .from('reservations')
        .select(RESERVATION_SELECT)
        .gte('reservation_date', from)
        .lte('reservation_date', to)
        .order('reservation_date'),
      this.db.from('offers').select('id, status').eq('status', 'published'),
    ]);
    if (reservations.error) return this.fail(reservations.error);

    const rows = ((reservations.data as Row[]) ?? []).map(mapReservation);
    const today = todayISO();
    const series: DashboardMetrics['series'] = [];
    for (let cursor = from; cursor <= to; cursor = addDaysISO(cursor, 1)) {
      const dayReservations = rows.filter((reservation) => reservation.reservation_date === cursor);
      series.push({
        date: cursor,
        reservations: dayReservations.length,
        revenue: dayReservations
          .filter((reservation) => ['confirmed', 'completed'].includes(reservation.status))
          .reduce((sum, reservation) => sum + reservation.total_price, 0),
      });
    }

    const { data: services } = await this.db.from('services').select('id, service_translations(locale,name)');
    const serviceNames = new Map<string, string>(
      ((services as Row[]) ?? []).map((row) => [
        row.id as string,
        one((row.service_translations as { locale: string; name: string }[])?.filter((translation) => translation.locale === 'en'))?.name ??
          'Other',
      ]),
    );

    const byService = [...new Set(rows.map((reservation) => reservation.service_id))]
      .filter((id): id is string => Boolean(id))
      .map((id) => ({
        name: serviceNames.get(id) ?? 'Other',
        count: rows.filter((reservation) => reservation.service_id === id).length,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      todayReservations: rows.filter((reservation) => reservation.reservation_date === today && ['pending', 'confirmed'].includes(reservation.status)).length,
      pending: rows.filter((reservation) => reservation.status === 'pending').length,
      confirmed: rows.filter((reservation) => reservation.status === 'confirmed').length,
      upcomingTours: rows.filter(
        (reservation) => reservation.reservation_date >= today && ['pending', 'confirmed'].includes(reservation.status) && reservation.reservation_type !== 'rental',
      ).length,
      cancelled: rows.filter((reservation) => reservation.status === 'cancelled').length,
      totalPeriod: rows.length,
      confirmedRevenue: rows
        .filter((reservation) => ['confirmed', 'completed'].includes(reservation.status))
        .reduce((sum, reservation) => sum + reservation.total_price, 0),
      estimatedValue: rows
        .filter((reservation) => reservation.status === 'pending')
        .reduce((sum, reservation) => sum + reservation.total_price, 0),
      publishedOffers: (offers.data ?? []).length,
      series,
      byService,
      byStatus: (['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'] as ReservationStatus[])
        .map((status) => ({ status, count: rows.filter((reservation) => reservation.status === status).length }))
        .filter((entry) => entry.count > 0),
      recent: [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    };
  }

  async getAnalyticsSummary(from: string, to: string): Promise<AnalyticsSummary> {
    const { data, error } = await this.db.rpc('analytics_summary', { p_from: from, p_to: to });
    if (error) return this.fail(error);
    return data as AnalyticsSummary;
  }

  async listIdentifiedCustomers(): Promise<CustomerRecord[]> {
    return this.listCustomers();
  }

  async listAuditLogs(limit = 50): Promise<AuditLog[]> {
    const { data, error } = await this.db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) return this.fail(error);
    return ((data as Row[]) ?? []) as unknown as AuditLog[];
  }
}

export const supabaseBackend = new SupabaseBackend();

/** Demo credentials are only shown when the app runs without Supabase. */
export { DEMO_PASSWORD };

/** Re-exported so forms can surface validation errors coming from the API. */
export { ApiError, fieldErrors };
