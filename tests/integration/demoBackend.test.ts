import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysISO, todayISO } from '@shared/domain/availability';
import { __resetDemoMemory, BackendError, DEMO_PASSWORD, demoBackend, resetDemoData } from '@/services/backend/demoBackend';
import { DEMO_IDS } from '@/data/seed';

const signIn = (email = 'owner@mjbiketangier.com') => demoBackend.signIn(email, DEMO_PASSWORD);

const bookingInput = (overrides: Partial<Parameters<typeof demoBackend.createReservation>[0]> = {}) => ({
  locale: 'en' as const,
  reservation_type: 'rental' as const,
  service_id: DEMO_IDS.services.cityRental,
  offer_id: null,
  full_name: 'Test Rider',
  email: 'test.rider@example.com',
  phone: '+212 600 000 000',
  preferred_contact: 'email' as const,
  quantity: 2,
  reservation_date: addDaysISO(todayISO(), 5),
  start_time: '10:00',
  duration_hours: 4,
  addons: ['helmet'],
  message: 'Please have two helmets ready.',
  privacy_accepted: true as const,
  company: '',
  ...overrides,
});

beforeEach(async () => {
  localStorage.clear();
  __resetDemoMemory();
  resetDemoData();
  await demoBackend.signOut();
});

describe('demo authentication', () => {
  it('signs in the seeded super admin', async () => {
    const profile = await signIn();
    expect(profile.role).toBe('super_admin');
    expect(await demoBackend.getSession()).toMatchObject({ email: 'owner@mjbiketangier.com' });
  });

  it('rejects a wrong password and unknown accounts', async () => {
    await expect(demoBackend.signIn('owner@mjbiketangier.com', 'wrong-password')).rejects.toBeInstanceOf(BackendError);
    await expect(demoBackend.signIn('nobody@example.com', DEMO_PASSWORD)).rejects.toMatchObject({ status: 401 });
  });

  it('starts with no session', async () => {
    expect(await demoBackend.getSession()).toBeNull();
  });
});

describe('public catalogue', () => {
  it('returns only published content', async () => {
    const data = await demoBackend.getPublicData();
    expect(data.services.length).toBeGreaterThan(0);
    expect(data.offers.every((offer) => offer.status === 'published')).toBe(true);
    expect(data.gallery.every((item) => item.is_published)).toBe(true);
    // No fabricated reviews: testimonials start empty.
    expect(data.testimonials).toHaveLength(0);
  });

  it('offers hours and slot availability for a future date', async () => {
    const date = addDaysISO(todayISO(), 5);
    const slots = await demoBackend.getAvailability({ serviceId: DEMO_IDS.services.cityRental, date, durationHours: 4 });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('time');
    expect(slots.some((slot) => slot.available)).toBe(true);
  });
});

describe('guest reservations', () => {
  it('creates a pending reservation with a unique reference and a frozen price', async () => {
    const { reservation, duplicate } = await demoBackend.createReservation(bookingInput());
    expect(duplicate).toBe(false);
    expect(reservation.status).toBe('pending');
    expect(reservation.reference).toMatch(/^MJB-\d{6}-[A-Z2-9]{4}$/);
    expect(reservation.total_price).toBe(340); // 2 × 160 (4 h) + 20 helmet
    expect(reservation.price_snapshot).toMatchObject({ unit_price: 160, quantity: 2, duration_hours: 4 });
    expect(reservation.history[0]).toMatchObject({ from_status: null, to_status: 'pending' });
  });

  it('never claims confirmation on submission', async () => {
    const { reservation } = await demoBackend.createReservation(bookingInput());
    expect(reservation.status).not.toBe('confirmed');
  });

  it('detects an immediate duplicate request', async () => {
    const first = await demoBackend.createReservation(bookingInput());
    const second = await demoBackend.createReservation(bookingInput());
    expect(second.duplicate).toBe(true);
    expect(second.reservation.id).toBe(first.reservation.id);
  });

  it('rejects a booking outside opening hours', async () => {
    await expect(
      demoBackend.createReservation(bookingInput({ reservation_date: addDaysISO(todayISO(), 4), start_time: '19:00' })),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects an invalid email and a missing privacy consent', async () => {
    await expect(demoBackend.createReservation(bookingInput({ email: 'not-an-email' }))).rejects.toMatchObject({ status: 422 });
    await expect(
      demoBackend.createReservation(bookingInput({ privacy_accepted: false as unknown as true })),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('looks a reservation up by reference and email only', async () => {
    const { reservation } = await demoBackend.createReservation(bookingInput());
    const found = await demoBackend.lookupReservation(reservation.reference, 'test.rider@example.com');
    expect(found?.id).toBe(reservation.id);
    expect(await demoBackend.lookupReservation(reservation.reference, 'someone.else@example.com')).toBeNull();
  });

  it('keeps new customers in the identified customer list', async () => {
    await demoBackend.createReservation(bookingInput());
    await signIn();
    const customers = await demoBackend.listIdentifiedCustomers();
    expect(customers.some((customer) => customer.email === 'test.rider@example.com')).toBe(true);
  });
});

describe('admin reservation workflow', () => {
  it('confirms a pending reservation, writes history and an audit entry', async () => {
    await signIn();
    const { reservation } = await demoBackend.createReservation(bookingInput());
    const updated = await demoBackend.updateReservation(reservation.id, { status: 'confirmed' });
    expect(updated.status).toBe('confirmed');
    expect(updated.history.at(-1)).toMatchObject({ from_status: 'pending', to_status: 'confirmed' });
    const audit = await demoBackend.listAuditLogs();
    expect(audit.some((entry) => entry.action === 'reservation.status.confirmed')).toBe(true);
  });

  it('refuses an invalid transition', async () => {
    await signIn();
    const { reservation } = await demoBackend.createReservation(bookingInput());
    await demoBackend.updateReservation(reservation.id, { status: 'confirmed' });
    await expect(demoBackend.updateReservation(reservation.id, { status: 'rejected' })).rejects.toMatchObject({
      code: 'invalid_transition',
    });
  });

  it('adds internal notes and records the author', async () => {
    await signIn();
    const { reservation } = await demoBackend.createReservation(bookingInput());
    await demoBackend.addReservationNote(reservation.id, 'Called to confirm helmet sizes.', false);
    const detail = await demoBackend.getReservation(reservation.id);
    expect(detail?.notes.at(-1)).toMatchObject({ note: 'Called to confirm helmet sizes.', author_name: 'MJ Bike Owner' });
  });

  it('limits staff to their assigned reservations', async () => {
    await signIn('staff@mjbiketangier.com');
    const page = await demoBackend.listReservations({});
    expect(page.items.every((reservation) => reservation.assigned_staff_id === DEMO_IDS.profiles.staff)).toBe(true);
    expect(page.total).toBeLessThan(12);
  });

  it('blocks settings changes for non-super-admins', async () => {
    await signIn('admin@mjbiketangier.com');
    const settings = await demoBackend.getSettings();
    await expect(demoBackend.saveSettings(settings)).rejects.toMatchObject({ status: 403 });
  });

  it('computes dashboard metrics from real records', async () => {
    await signIn();
    const today = todayISO();
    const metrics = await demoBackend.getDashboardMetrics(addDaysISO(today, -30), addDaysISO(today, 30));
    const reservations = await demoBackend.listReservations({ limit: 100 });
    expect(metrics.totalPeriod).toBe(reservations.total);
    expect(metrics.pending).toBe(reservations.items.filter((item) => item.status === 'pending').length);
    expect(metrics.publishedOffers).toBe(3);
    expect(metrics.confirmedRevenue).toBeGreaterThan(0);
  });

  it('summarises first-party analytics without counting anonymous as identified', async () => {
    await signIn();
    const summary = await demoBackend.getAnalyticsSummary(addDaysISO(todayISO(), -30), todayISO());
    expect(summary.pageViews).toBeGreaterThan(0);
    expect(summary.visitors).toBeGreaterThan(0);
    expect(summary.visitors).toBeLessThanOrEqual(summary.pageViews);
    expect(summary.topPages.length).toBeGreaterThan(0);
  });
});

describe('content management', () => {
  it('saves an offer with three translations', async () => {
    await signIn();
    const offers = await demoBackend.listOffers();
    const offer = offers[0]!;
    const originalPrice = offer.price;
    const saved = await demoBackend.saveOffer({ ...offer, price: originalPrice - 10 });
    expect(saved.price).toBe(originalPrice - 10);
    const reloaded = await demoBackend.listOffers();
    expect(reloaded.find((item) => item.id === offer.id)?.price).toBe(originalPrice - 10);
  });

  it('reorders gallery items', async () => {
    await signIn();
    const gallery = await demoBackend.listGallery();
    const second = gallery[1]!;
    await demoBackend.reorderGalleryItem(second.id, 'up');
    const reordered = await demoBackend.listGallery();
    expect(reordered[0]?.id).toBe(second.id);
  });

  it('creates a maintenance block and a note', async () => {
    await signIn();
    const block = await demoBackend.saveBlock({
      service_id: null,
      start_date: addDaysISO(todayISO(), 7),
      end_date: addDaysISO(todayISO(), 7),
      start_time: '09:00',
      end_time: '12:00',
      reason: 'Workshop maintenance',
      is_active: true,
    });
    expect(block.id).toBeTruthy();

    const note = await demoBackend.saveNote({
      title: 'Order brake pads',
      body: 'Two sets for the city bikes.',
      category: 'inventory',
      priority: 'normal',
      note_date: todayISO(),
      follow_up_date: null,
      is_completed: false,
      is_pinned: false,
      is_archived: false,
      reservation_id: null,
      customer_id: null,
      offer_id: null,
      calendar_event_id: null,
    });
    expect(note.created_by_name).toBe('MJ Bike Owner');
    const notes = await demoBackend.listNotes();
    expect(notes.some((item) => item.title === 'Order brake pads')).toBe(true);
  });
});
