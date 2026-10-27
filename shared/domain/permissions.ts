import type { AdminRole } from './types';

export const PERMISSIONS = [
  'dashboard:view',
  'reservations:view_all',
  'reservations:view_assigned',
  'reservations:update',
  'reservations:create_manual',
  'reservations:export',
  'customers:view',
  'customers:view_notes',
  'customers:manage_notes',
  'calendar:view',
  'calendar:manage',
  'offers:manage',
  'services:manage',
  'gallery:manage',
  'testimonials:manage',
  'inventory:view',
  'inventory:manage',
  'notes:view_all',
  'notes:manage_own',
  'analytics:view',
  'settings:manage',
  'users:manage',
  'audit:view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const STAFF: Permission[] = [
  'dashboard:view',
  'reservations:view_assigned',
  'reservations:update',
  'reservations:create_manual',
  'calendar:view',
  'calendar:manage',
  'inventory:view',
  'inventory:manage',
  'notes:manage_own',
];

const ADMIN: Permission[] = [
  ...STAFF,
  'reservations:view_all',
  'reservations:export',
  'customers:view',
  'customers:view_notes',
  'customers:manage_notes',
  'offers:manage',
  'services:manage',
  'gallery:manage',
  'testimonials:manage',
  'notes:view_all',
  'analytics:view',
];

const SUPER_ADMIN: Permission[] = [
  ...ADMIN,
  'settings:manage',
  'users:manage',
  'audit:view',
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  staff: STAFF,
  admin: ADMIN,
  super_admin: SUPER_ADMIN,
};

export function can(role: AdminRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Admin navigation items with the permission each one needs. */
export const ADMIN_NAV: { to: string; labelKey: string; icon: string; permission: Permission }[] = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard', permission: 'dashboard:view' },
  { to: '/admin/reservations', labelKey: 'nav.reservations', icon: 'CalendarCheck', permission: 'reservations:view_assigned' },
  { to: '/admin/calendar', labelKey: 'nav.calendar', icon: 'CalendarDays', permission: 'calendar:view' },
  { to: '/admin/customers', labelKey: 'nav.customers', icon: 'Users', permission: 'customers:view' },
  { to: '/admin/offers', labelKey: 'nav.offers', icon: 'Tag', permission: 'offers:manage' },
  { to: '/admin/services', labelKey: 'nav.services', icon: 'Bike', permission: 'services:manage' },
  { to: '/admin/inventory', labelKey: 'nav.inventory', icon: 'Package', permission: 'inventory:view' },
  { to: '/admin/gallery', labelKey: 'nav.gallery', icon: 'Images', permission: 'gallery:manage' },
  { to: '/admin/testimonials', labelKey: 'nav.testimonials', icon: 'MessageSquareQuote', permission: 'testimonials:manage' },
  { to: '/admin/notes', labelKey: 'nav.notes', icon: 'StickyNote', permission: 'notes:manage_own' },
  { to: '/admin/visitors', labelKey: 'nav.visitors', icon: 'TrendingUp', permission: 'analytics:view' },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: 'Settings', permission: 'settings:manage' },
];
