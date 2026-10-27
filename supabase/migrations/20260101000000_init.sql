-- =====================================================================
-- MJ Bike Tangier — initial schema
--
-- Covers: content (services, offers, gallery, testimonials, settings),
-- reservations + items + status history + notes, customers, availability,
-- inventory, operations (calendar, admin notes), analytics, notifications
-- and audit logs.
--
-- Security model
--   * Public reads are limited to published content and availability rules.
--   * Guests never write to reservation tables directly: guest bookings go
--     through the `create_reservation` RPC (called by the Pages Function with
--     the service role) so capacity and pricing are validated server-side.
--   * Administrators read/write through RLS policies driven by
--     `public.current_role()`; a role in `profiles` is the only source of truth.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type admin_role as enum ('super_admin', 'admin', 'staff');
create type reservation_status as enum ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show');
create type service_kind as enum ('rental', 'tour', 'lesson', 'experience', 'event');
create type price_unit as enum ('per_person', 'per_bike', 'per_group');
create type offer_status as enum ('draft', 'published', 'archived');
create type bicycle_status as enum ('available', 'rented', 'maintenance', 'inactive');
create type gallery_category as enum ('tours', 'coastal', 'customers', 'team', 'rentals', 'promo');
create type note_category as enum ('customer_follow_up', 'maintenance', 'inventory', 'staff', 'marketing', 'finance', 'general');
create type note_priority as enum ('low', 'normal', 'high', 'urgent');
create type contact_method as enum ('email', 'phone', 'whatsapp');
create type reservation_source as enum ('website', 'admin', 'phone');
create type notification_channel as enum ('email', 'whatsapp');
create type notification_status as enum ('queued', 'sent', 'failed', 'skipped');
create type analytics_event_type as enum ('page_view', 'reservation_submitted', 'offer_view', 'cta_click');
create type calendar_event_type as enum ('tour', 'maintenance', 'staff', 'block', 'other');

-- ---------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profiles (administrators) — one row per Supabase Auth user
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role admin_role not null default 'staff',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  constraint profiles_email_lowercase check (email = lower(email))
);

create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------
-- Site settings (single row)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'MJ Bike Tangier',
  tagline jsonb not null default '{}'::jsonb,
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  address jsonb not null default '{}'::jsonb,
  maps_url text not null default '',
  instagram_url text not null default '',
  facebook_url text not null default '',
  tiktok_url text not null default '',
  youtube_url text not null default '',
  opening_hours jsonb not null default '[]'::jsonb,
  about_claims jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  currency text not null default 'MAD',
  timezone text not null default 'Africa/Casablanca',
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (true)
);
create unique index site_settings_only_one on public.site_settings ((true));

create trigger site_settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Services (rentals, tours, lessons, experiences, events)
-- ---------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  kind service_kind not null,
  image_url text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  price_unit price_unit not null default 'per_bike',
  base_price numeric(10, 2) not null default 0 check (base_price >= 0),
  duration_options jsonb not null default '[]'::jsonb,
  default_duration_hours numeric(4, 2) not null default 2 check (default_duration_hours > 0),
  capacity integer not null default 1 check (capacity > 0),
  min_units integer not null default 1 check (min_units > 0),
  max_units integer not null default 10 check (max_units >= min_units),
  addons jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Rental prices are only trustworthy when a duration ladder exists.
  constraint services_rental_needs_tiers check (
    kind <> 'rental' or jsonb_array_length(duration_options) > 0
  )
);

create index services_active_idx on public.services (is_active, kind, sort_order);
create trigger services_updated_at before update on public.services
for each row execute function public.set_updated_at();

create table public.service_translations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  locale text not null check (locale in ('en', 'fr', 'ar')),
  name text not null,
  short_description text not null,
  description text not null,
  highlights jsonb not null default '[]'::jsonb,
  meta_title text,
  meta_description text,
  unique (service_id, locale)
);

create index service_translations_locale_idx on public.service_translations (locale);

-- ---------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  service_id uuid references public.services (id) on delete set null,
  image_url text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  duration_hours numeric(4, 2) not null check (duration_hours > 0),
  validity_start date not null,
  validity_end date not null,
  capacity integer check (capacity is null or capacity > 0),
  bookings_count integer not null default 0,
  status offer_status not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_validity_order check (validity_end >= validity_start)
);

create index offers_published_idx on public.offers (status, validity_start, validity_end);
create trigger offers_updated_at before update on public.offers
for each row execute function public.set_updated_at();

create table public.offer_translations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  locale text not null check (locale in ('en', 'fr', 'ar')),
  title text not null,
  short_description text not null,
  description text not null,
  included jsonb not null default '[]'::jsonb,
  unique (offer_id, locale)
);

-- ---------------------------------------------------------------------
-- Customers (created by guest bookings; never self-service)
-- ---------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  locale text not null default 'en' check (locale in ('en', 'fr', 'ar')),
  first_seen_at timestamptz not null default now(),
  last_booking_at timestamptz,
  marketing_consent boolean not null default false,
  notes_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_email_key on public.customers (lower(email));
create index customers_last_booking_idx on public.customers (last_booking_at desc nulls last);
create trigger customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  note text not null check (length(note) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);

-- ---------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  slot_interval_minutes integer not null default 60 check (slot_interval_minutes between 15 and 240),
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint availability_rules_hours check (close_time > open_time)
);

create unique index availability_rules_unique on public.availability_rules (
  coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid),
  day_of_week
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  reason text not null check (length(reason) between 3 and 200),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint availability_blocks_dates check (end_date >= start_date),
  constraint availability_blocks_times check (
    (start_time is null and end_time is null) or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index availability_blocks_dates_idx on public.availability_blocks (start_date, end_date);

-- ---------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------
create table public.bicycles (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique,
  name text not null,
  category text not null,
  size text,
  service_id uuid references public.services (id) on delete set null,
  quantity integer not null default 1 check (quantity >= 0),
  status bicycle_status not null default 'available',
  purchase_date date,
  last_service_at date,
  maintenance_notes text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bicycles_status_idx on public.bicycles (status, category);
create trigger bicycles_updated_at before update on public.bicycles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^MJB-[0-9]{6}-[A-Z2-9]{4}$'),
  status reservation_status not null default 'pending',
  reservation_type service_kind not null,
  service_id uuid references public.services (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  preferred_contact contact_method not null default 'email',
  participants integer not null check (participants between 1 and 30),
  reservation_date date not null,
  start_time time not null,
  duration_hours numeric(4, 2) not null check (duration_hours > 0 and duration_hours <= 48),
  addons jsonb not null default '[]'::jsonb,
  message text,
  locale text not null default 'en' check (locale in ('en', 'fr', 'ar')),
  total_price numeric(10, 2) not null check (total_price >= 0),
  price_snapshot jsonb,
  privacy_accepted boolean not null default false,
  assigned_staff_id uuid references public.profiles (id) on delete set null,
  internal_notes text,
  cancellation_reason text,
  proposed_date date,
  proposed_time time,
  source reservation_source not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_date_idx on public.reservations (reservation_date, start_time);
create index reservations_status_idx on public.reservations (status, created_at desc);
create index reservations_customer_idx on public.reservations (customer_id);
create index reservations_staff_idx on public.reservations (assigned_staff_id);
create index reservations_email_idx on public.reservations (lower(email));
create index reservations_service_date_idx on public.reservations (service_id, reservation_date);

create trigger reservations_updated_at before update on public.reservations
for each row execute function public.set_updated_at();

create table public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service_slug text,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  duration_hours numeric(4, 2) not null check (duration_hours > 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  bicycle_id uuid references public.bicycles (id) on delete set null
);

create index reservation_items_reservation_idx on public.reservation_items (reservation_id);

create table public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  from_status reservation_status,
  to_status reservation_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_by_name text not null default '',
  reason text,
  created_at timestamptz not null default now()
);

create index reservation_status_history_reservation_idx on public.reservation_status_history (reservation_id, created_at);

create table public.reservation_notes (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  note text not null check (length(note) between 1 and 4000),
  is_customer_communication boolean not null default false,
  created_at timestamptz not null default now()
);

create index reservation_notes_reservation_idx on public.reservation_notes (reservation_id, created_at desc);

-- Record every status change automatically (Functions and the admin UI both benefit).
create or replace function public.log_reservation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.reservation_status_history (reservation_id, from_status, to_status, changed_by, changed_by_name, reason)
    values (new.id, null, new.status, auth.uid(), coalesce((select full_name from public.profiles where id = auth.uid()), 'Website'), null);
    return new;
  end if;

  if new.status is distinct from old.status then
    select full_name into actor_name from public.profiles where id = auth.uid();
    insert into public.reservation_status_history (reservation_id, from_status, to_status, changed_by, changed_by_name, reason)
    values (new.id, old.status, new.status, auth.uid(), coalesce(actor_name, 'System'), null);
  end if;
  return new;
end;
$$;

create trigger reservations_status_history
after insert or update of status on public.reservations
for each row execute function public.log_reservation_status_change();

-- ---------------------------------------------------------------------
-- Operations: calendar events, admin notes, gallery, testimonials
-- ---------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type calendar_event_type not null default 'other',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint calendar_events_range check (end_at > start_at)
);

create index calendar_events_start_idx on public.calendar_events (start_at);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 140),
  body text not null check (length(body) between 3 and 4000),
  category note_category not null default 'general',
  priority note_priority not null default 'normal',
  note_date date,
  follow_up_date date,
  is_completed boolean not null default false,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  reservation_id uuid references public.reservations (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_notes_open_idx on public.admin_notes (is_completed, is_archived, priority);
create trigger admin_notes_updated_at before update on public.admin_notes
for each row execute function public.set_updated_at();

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'video')),
  media_url text not null,
  thumbnail_url text,
  title jsonb not null default '{}'::jsonb,
  caption jsonb not null default '{}'::jsonb,
  category gallery_category not null default 'tours',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index gallery_items_published_idx on public.gallery_items (is_published, category, sort_order);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_country text,
  rating smallint check (rating is null or rating between 1 and 5),
  quote jsonb not null default '{}'::jsonb,
  service_label jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index testimonials_published_idx on public.testimonials (is_published, sort_order);

-- ---------------------------------------------------------------------
-- Contact messages (website contact form)
-- ---------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  locale text not null default 'en',
  is_handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_created_idx on public.contact_messages (created_at desc);

-- ---------------------------------------------------------------------
-- Logs: notifications, audit, analytics
-- ---------------------------------------------------------------------
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  channel notification_channel not null,
  template text not null,
  recipient text not null,
  reservation_id uuid references public.reservations (id) on delete set null,
  status notification_status not null default 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index notification_logs_created_idx on public.notification_logs (created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type analytics_event_type not null,
  path text not null,
  locale text not null check (locale in ('en', 'fr', 'ar')),
  anonymous_id text not null,
  session_id text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_category text check (device_category in ('mobile', 'tablet', 'desktop')),
  browser text,
  country text,
  customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now()
);

create index analytics_events_created_idx on public.analytics_events (created_at desc);
create index analytics_events_anonymous_idx on public.analytics_events (anonymous_id);
create index analytics_events_type_idx on public.analytics_events (event_type, created_at);

-- =====================================================================
-- Permission helpers
-- =====================================================================
create or replace function public.current_role()
returns admin_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('staff', 'admin', 'super_admin') from public.profiles where id = auth.uid() and is_active), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('admin', 'super_admin') from public.profiles where id = auth.uid() and is_active), false);
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid() and is_active), false);
$$;

-- =====================================================================
-- Reservation references
-- =====================================================================
create or replace function public.generate_reservation_reference()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  suffix text := '';
  candidate text;
  i integer;
begin
  for attempt in 1..20 loop
    suffix := '';
    for i in 1..4 loop
      suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := 'MJB-' || to_char(now() at time zone 'Africa/Casablanca', 'YYMMDD') || '-' || suffix;
    if not exists (select 1 from public.reservations where reference = candidate) then
      return candidate;
    end if;
  end loop;
  raise exception 'Unable to generate a unique reservation reference';
end;
$$;

-- =====================================================================
-- Availability engine (SQL mirror of shared/domain/availability.ts)
-- =====================================================================
create or replace function public.service_availability(
  p_service_id uuid,
  p_date date,
  p_duration numeric
)
returns table (slot_time text, available boolean, remaining integer, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service record;
  v_rule record;
  v_open integer;
  v_close integer;
  v_interval integer;
  v_capacity integer;
  v_minute integer;
  v_duration integer := greatest(1, round(p_duration * 60)::int);
  v_used integer;
  v_blocked boolean;
  v_slot text;
  v_reason text;
  v_remaining integer;
begin
  select id, capacity into v_service from public.services where id = p_service_id and is_active;
  if not found then
    return;
  end if;

  select * into v_rule
  from public.availability_rules r
  where r.is_active
    and r.day_of_week = extract(dow from p_date)::int
    and (r.service_id = p_service_id or r.service_id is null)
  order by (r.service_id is not null) desc
  limit 1;

  if not found then
    return query select null::text, false, 0, 'closed'::text;
    return;
  end if;

  v_open := extract(hour from v_rule.open_time)::int * 60 + extract(minute from v_rule.open_time)::int;
  v_close := extract(hour from v_rule.close_time)::int * 60 + extract(minute from v_rule.close_time)::int;
  v_interval := coalesce(v_rule.slot_interval_minutes, 60);
  v_capacity := coalesce(v_rule.capacity, v_service.capacity);

  v_minute := v_open;
  while v_minute + v_duration <= v_close loop
    v_slot := to_char((v_minute || ' minutes')::interval, 'HH24:MI');

    select coalesce(sum(r.participants), 0) into v_used
    from public.reservations r
    where r.service_id = p_service_id
      and r.reservation_date = p_date
      and r.status in ('pending', 'confirmed')
      and tsrange(
            p_date + r.start_time,
            p_date + r.start_time + (r.duration_hours || ' hours')::interval,
            '[)'
          ) && tsrange(
            p_date + v_slot::time,
            p_date + v_slot::time + (p_duration || ' hours')::interval,
            '[)'
          );

    select exists (
      select 1 from public.availability_blocks b
      where b.is_active
        and (b.service_id = p_service_id or b.service_id is null)
        and p_date between b.start_date and b.end_date
        and (
          b.start_time is null
          or tsrange(p_date + b.start_time, p_date + b.end_time, '[)')
             && tsrange(p_date + v_slot::time, p_date + v_slot::time + (p_duration || ' hours')::interval, '[)')
        )
    ) into v_blocked;

    v_remaining := greatest(v_capacity - v_used, 0);

    if p_date < (now() at time zone 'Africa/Casablanca')::date then
      v_reason := 'past';
    elsif v_blocked then
      v_reason := 'blocked';
    elsif v_remaining <= 0 then
      v_reason := 'capacity';
    else
      v_reason := null;
    end if;

    slot_time := v_slot;
    available := v_reason is null;
    remaining := v_remaining;
    reason := v_reason;
    return next;

    v_minute := v_minute + v_interval;
  end loop;
end;
$$;

-- =====================================================================
-- Guest booking RPC — concurrency-safe
-- =====================================================================
create or replace function public.create_reservation(p_payload jsonb)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services;
  v_offer public.offers;
  v_customer_id uuid;
  v_reservation public.reservations;
  v_participants integer := (p_payload ->> 'participants')::int;
  v_date date := (p_payload ->> 'reservation_date')::date;
  v_start time := (p_payload ->> 'start_time')::time;
  v_duration numeric := (p_payload ->> 'duration_hours')::numeric;
  v_used integer;
  v_blocked boolean;
  v_reference text;
  v_email text := lower(trim(p_payload ->> 'email'));
  v_dow integer := extract(dow from (p_payload ->> 'reservation_date')::date)::int;
  v_rule public.availability_rules;
begin
  select * into v_service from public.services where id = (p_payload ->> 'service_id')::uuid and is_active;
  if not found then
    raise exception 'service_not_available' using errcode = 'P0002';
  end if;

  if (p_payload ->> 'offer_id') is not null and (p_payload ->> 'offer_id') <> '' then
    select * into v_offer from public.offers
    where id = (p_payload ->> 'offer_id')::uuid
      and status = 'published'
      and current_date between validity_start and validity_end;
    if not found then
      raise exception 'offer_not_available' using errcode = 'P0002';
    end if;
  end if;

  -- Serialise concurrent bookings for the same service and day.
  perform pg_advisory_xact_lock(hashtext(v_service.id::text || ':' || v_date::text));

  select * into v_rule from public.availability_rules r
  where r.is_active and r.day_of_week = v_dow and (r.service_id = v_service.id or r.service_id is null)
  order by (r.service_id is not null) desc limit 1;
  if not found then
    raise exception 'closed' using errcode = 'P0001';
  end if;

  if v_start < v_rule.open_time or (v_start + (v_duration || ' hours')::interval) > v_rule.close_time then
    raise exception 'outside_hours' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.availability_blocks b
    where b.is_active
      and (b.service_id = v_service.id or b.service_id is null)
      and v_date between b.start_date and b.end_date
      and (
        b.start_time is null
        or tsrange(v_date + b.start_time, v_date + b.end_time, '[)')
           && tsrange(v_date + v_start, v_date + v_start + (v_duration || ' hours')::interval, '[)')
      )
  ) into v_blocked;
  if v_blocked then
    raise exception 'blocked' using errcode = 'P0001';
  end if;

  select coalesce(sum(r.participants), 0) into v_used
  from public.reservations r
  where r.service_id = v_service.id
    and r.reservation_date = v_date
    and r.status in ('pending', 'confirmed')
    and tsrange(v_date + r.start_time, v_date + r.start_time + (r.duration_hours || ' hours')::interval, '[)')
        && tsrange(v_date + v_start, v_date + v_start + (v_duration || ' hours')::interval, '[)');

  if v_used + v_participants > coalesce(v_rule.capacity, v_service.capacity) then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  -- Reuse or create the customer record.
  select id into v_customer_id from public.customers where lower(email) = v_email;
  if v_customer_id is null then
    insert into public.customers (full_name, email, phone, locale, last_booking_at)
    values (p_payload ->> 'full_name', v_email, p_payload ->> 'phone', coalesce(p_payload ->> 'locale', 'en'), v_date)
    returning id into v_customer_id;
  else
    update public.customers
    set full_name = p_payload ->> 'full_name',
        phone = p_payload ->> 'phone',
        locale = coalesce(p_payload ->> 'locale', locale),
        last_booking_at = greatest(coalesce(last_booking_at, v_date::timestamptz), v_date::timestamptz)
    where id = v_customer_id;
  end if;

  v_reference := coalesce(p_payload ->> 'reference', public.generate_reservation_reference());

  insert into public.reservations (
    reference, status, reservation_type, service_id, offer_id, customer_id,
    full_name, email, phone, preferred_contact, participants, reservation_date,
    start_time, duration_hours, addons, message, locale, total_price,
    price_snapshot, privacy_accepted, source
  ) values (
    v_reference, 'pending', v_service.kind, v_service.id,
    nullif(p_payload ->> 'offer_id', '')::uuid, v_customer_id,
    p_payload ->> 'full_name', v_email, p_payload ->> 'phone',
    coalesce((p_payload ->> 'preferred_contact')::contact_method, 'email'),
    v_participants, v_date, v_start, v_duration,
    coalesce(p_payload -> 'addons', '[]'::jsonb),
    nullif(p_payload ->> 'message', ''),
    coalesce(p_payload ->> 'locale', 'en'),
    coalesce((p_payload ->> 'total_price')::numeric, 0),
    p_payload -> 'price_snapshot',
    coalesce((p_payload ->> 'privacy_accepted')::boolean, false),
    coalesce((p_payload ->> 'source')::reservation_source, 'website')
  ) returning * into v_reservation;

  insert into public.reservation_items (reservation_id, service_id, service_slug, name, quantity, unit_price, duration_hours, line_total)
  values (
    v_reservation.id, v_service.id, v_service.slug,
    coalesce(p_payload #>> '{item,name}', v_service.slug),
    v_participants,
    coalesce((p_payload #>> '{item,unit_price}')::numeric, 0),
    v_duration,
    coalesce((p_payload #>> '{item,line_total}')::numeric, 0)
  );

  return v_reservation;
end;
$$;

-- =====================================================================
-- Guest lookup — requires reference AND email
-- =====================================================================
create or replace function public.lookup_reservation(p_reference text, p_email text)
returns setof public.reservations
language sql
stable
security definer
set search_path = public
as $$
  select * from public.reservations
  where reference = upper(trim(p_reference))
    and lower(email) = lower(trim(p_email))
  limit 1;
$$;

-- =====================================================================
-- Analytics summary (first-party, aggregated)
-- =====================================================================
create or replace function public.analytics_summary(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with events as (
    select * from public.analytics_events
    where created_at::date between p_from and p_to
  ),
  views as (select * from events where event_type = 'page_view')
  select jsonb_build_object(
    'visitors', (select count(distinct anonymous_id) from views),
    'pageViews', (select count(*) from views),
    'reservationRequests', (select count(*) from events where event_type = 'reservation_submitted'),
    'topPages', coalesce((
      select jsonb_agg(row_to_json(page))
      from (
        select path, count(*) as views, count(distinct anonymous_id) as visitors
        from views group by path order by count(*) desc limit 8
      ) page
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(row_to_json(ref))
      from (
        select coalesce(nullif(regexp_replace(coalesce(referrer, ''), '^https?://(www\.)?([^/]+).*$', '\2'), ''), '') as source,
               count(*) as visits
        from views group by 1 order by count(*) desc limit 8
      ) ref
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(row_to_json(device))
      from (
        select coalesce(device_category, 'unknown') as device, count(*) as visits
        from views group by 1 order by count(*) desc
      ) device
    ), '[]'::jsonb),
    'browsers', coalesce((
      select jsonb_agg(row_to_json(browser))
      from (
        select coalesce(browser, 'unknown') as browser, count(*) as visits
        from views group by 1 order by count(*) desc limit 6
      ) browser
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(row_to_json(country))
      from (
        select country, count(*) as visits from views where country is not null group by country order by count(*) desc limit 10
      ) country
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(row_to_json(campaign))
      from (
        select utm_campaign as campaign, count(*) as visits from views where utm_campaign is not null group by 1 order by count(*) desc limit 10
      ) campaign
    ), '[]'::jsonb),
    'trend', coalesce((
      select jsonb_agg(row_to_json(day) order by day.date)
      from (
        select d::date as date,
               (select count(distinct anonymous_id) from views where created_at::date = d::date) as visitors,
               (select count(*) from views where created_at::date = d::date) as "pageViews",
               (select count(*) from events where event_type = 'reservation_submitted' and created_at::date = d::date) as reservations
        from generate_series(p_from, p_to, interval '1 day') d
      ) day
    ), '[]'::jsonb)
  );
$$;

-- =====================================================================
-- Gallery ordering
-- =====================================================================
create or replace function public.reorder_gallery_item(p_id uuid, p_direction text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.gallery_items;
  v_neighbour public.gallery_items;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_current from public.gallery_items where id = p_id;
  if not found then
    return;
  end if;

  if p_direction = 'up' then
    select * into v_neighbour from public.gallery_items
    where sort_order < v_current.sort_order or (sort_order = v_current.sort_order and id <> v_current.id and created_at < v_current.created_at)
    order by sort_order desc, created_at desc limit 1;
  else
    select * into v_neighbour from public.gallery_items
    where sort_order > v_current.sort_order or (sort_order = v_current.sort_order and id <> v_current.id and created_at > v_current.created_at)
    order by sort_order asc, created_at asc limit 1;
  end if;

  if not found then
    return;
  end if;

  update public.gallery_items set sort_order = v_current.sort_order where id = v_neighbour.id;
  update public.gallery_items set sort_order = v_neighbour.sort_order where id = v_current.id;
end;
$$;

-- =====================================================================
-- Row level security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.services enable row level security;
alter table public.service_translations enable row level security;
alter table public.offers enable row level security;
alter table public.offer_translations enable row level security;
alter table public.customers enable row level security;
alter table public.customer_notes enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.bicycles enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.reservation_status_history enable row level security;
alter table public.reservation_notes enable row level security;
alter table public.calendar_events enable row level security;
alter table public.admin_notes enable row level security;
alter table public.gallery_items enable row level security;
alter table public.testimonials enable row level security;
alter table public.contact_messages enable row level security;
alter table public.notification_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;

-- Profiles ------------------------------------------------------------
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_admin_read on public.profiles for select to authenticated using (public.is_admin());
create policy profiles_super_admin_write on public.profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Site settings -------------------------------------------------------
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_admin_write on public.site_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Content (public catalogue) -----------------------------------------
create policy services_public_read on public.services for select to anon, authenticated using (is_active or public.is_staff());
create policy services_admin_write on public.services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy service_translations_public_read on public.service_translations for select to anon, authenticated
  using (exists (select 1 from public.services s where s.id = service_id and (s.is_active or public.is_staff())));
create policy service_translations_admin_write on public.service_translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy offers_public_read on public.offers for select to anon, authenticated
  using (
    public.is_staff()
    or (status = 'published' and current_date between validity_start and validity_end)
  );
create policy offers_admin_write on public.offers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy offer_translations_public_read on public.offer_translations for select to anon, authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id and (public.is_staff() or o.status = 'published')));
create policy offer_translations_admin_write on public.offer_translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy gallery_public_read on public.gallery_items for select to anon, authenticated using (is_published or public.is_staff());
create policy gallery_admin_write on public.gallery_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy testimonials_public_read on public.testimonials for select to anon, authenticated using (is_published or public.is_staff());
create policy testimonials_admin_write on public.testimonials for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Availability --------------------------------------------------------
create policy availability_rules_public_read on public.availability_rules for select to anon, authenticated using (is_active or public.is_staff());
create policy availability_rules_admin_write on public.availability_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy availability_blocks_public_read on public.availability_blocks for select to anon, authenticated using (is_active or public.is_staff());
create policy availability_blocks_staff_write on public.availability_blocks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Customers -----------------------------------------------------------
create policy customers_admin_read on public.customers for select to authenticated using (public.is_admin());
create policy customers_admin_write on public.customers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy customer_notes_read on public.customer_notes for select to authenticated
  using (public.is_admin() or (public.is_staff() and author_id = auth.uid()));
create policy customer_notes_write on public.customer_notes for insert to authenticated
  with check (public.is_admin());

-- Reservations --------------------------------------------------------
create policy reservations_read on public.reservations for select to authenticated
  using (
    public.is_admin()
    or (public.is_staff() and assigned_staff_id = auth.uid())
  );
create policy reservations_staff_update on public.reservations for update to authenticated
  using (public.is_admin() or (public.is_staff() and assigned_staff_id = auth.uid()))
  with check (public.is_admin() or (public.is_staff() and assigned_staff_id = auth.uid()));
create policy reservations_admin_insert on public.reservations for insert to authenticated
  with check (public.is_admin());
create policy reservations_admin_delete on public.reservations for delete to authenticated
  using (public.is_super_admin());

create policy reservation_items_read on public.reservation_items for select to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = reservation_id and (public.is_admin() or (public.is_staff() and r.assigned_staff_id = auth.uid()))
  ));
create policy reservation_items_write on public.reservation_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy reservation_history_read on public.reservation_status_history for select to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = reservation_id and (public.is_admin() or (public.is_staff() and r.assigned_staff_id = auth.uid()))
  ));

create policy reservation_notes_read on public.reservation_notes for select to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = reservation_id and (public.is_admin() or (public.is_staff() and r.assigned_staff_id = auth.uid()))
  ));
create policy reservation_notes_insert on public.reservation_notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.reservations r
      where r.id = reservation_id and (public.is_admin() or (public.is_staff() and r.assigned_staff_id = auth.uid()))
    )
  );

-- Inventory -----------------------------------------------------------
create policy bicycles_staff_read on public.bicycles for select to authenticated using (public.is_staff());
create policy bicycles_staff_write on public.bicycles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Operations ----------------------------------------------------------
create policy calendar_events_staff_read on public.calendar_events for select to authenticated using (public.is_staff());
create policy calendar_events_staff_write on public.calendar_events for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy admin_notes_read on public.admin_notes for select to authenticated
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()));
create policy admin_notes_staff_write on public.admin_notes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy contact_messages_admin_read on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_messages_admin_write on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Logs ----------------------------------------------------------------
create policy notification_logs_admin_read on public.notification_logs for select to authenticated using (public.is_admin());
create policy audit_logs_super_admin_read on public.audit_logs for select to authenticated using (public.is_super_admin());
create policy analytics_admin_read on public.analytics_events for select to authenticated using (public.is_admin());
-- Guests may append privacy-friendly events (consent is enforced in the UI and the Function).
create policy analytics_public_insert on public.analytics_events for insert to anon, authenticated with check (true);

-- =====================================================================
-- Grants
-- =====================================================================
grant usage on schema public to anon, authenticated;

grant select on public.site_settings, public.services, public.service_translations,
  public.offers, public.offer_translations, public.gallery_items, public.testimonials,
  public.availability_rules, public.availability_blocks to anon, authenticated;

grant select, insert, update, delete on public.services, public.service_translations,
  public.offers, public.offer_translations, public.gallery_items, public.testimonials,
  public.availability_rules, public.availability_blocks, public.bicycles,
  public.calendar_events, public.admin_notes, public.reservations,
  public.reservation_items, public.reservation_notes, public.customer_notes,
  public.customers, public.site_settings, public.contact_messages to authenticated;

grant select on public.profiles, public.reservation_status_history,
  public.notification_logs, public.audit_logs, public.analytics_events to authenticated;

grant insert on public.analytics_events to anon, authenticated;

grant execute on function public.service_availability(uuid, date, numeric) to anon, authenticated;
grant execute on function public.lookup_reservation(text, text) to anon, authenticated;
grant execute on function public.create_reservation(jsonb) to service_role;
grant execute on function public.analytics_summary(date, date) to authenticated;
grant execute on function public.reorder_gallery_item(uuid, text) to authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_staff(), public.is_admin(), public.is_super_admin() to authenticated;

-- =====================================================================
-- Storage bucket for media uploaded from the admin
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_staff_write on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());

create policy media_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff())
  with check (bucket_id = 'media' and public.is_staff());

create policy media_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());
