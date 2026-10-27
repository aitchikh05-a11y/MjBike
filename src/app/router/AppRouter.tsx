import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { PublicSiteProviders, PublicDataLoader } from '@/app/providers/AppProviders';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { AdminLayout, RequireAuth } from '@/app/layouts/AdminLayout';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingBlock } from '@/components/common/ui';
import { LOCALES, type Locale } from '@shared/domain/types';
import { buildPath, detectPreferredLocale, matchPublicPath } from './paths';
import type { Permission } from '@shared/domain/permissions';

/* ------------------------------------------------------------------ */
/* Lazy pages                                                          */
/* ------------------------------------------------------------------ */
const HomePage = lazy(() => import('@/pages/public/Home').then((module) => ({ default: module.HomePage })));
const ServicesPage = lazy(() => import('@/pages/public/Services').then((module) => ({ default: module.ServicesPage })));
const OffersPage = lazy(() => import('@/pages/public/Offers').then((module) => ({ default: module.OffersPage })));
const GalleryPage = lazy(() => import('@/pages/public/Gallery').then((module) => ({ default: module.GalleryPage })));
const BookingPage = lazy(() => import('@/pages/public/Booking').then((module) => ({ default: module.BookingPage })));
const ConfirmationPage = lazy(() => import('@/pages/public/Confirmation').then((module) => ({ default: module.ConfirmationPage })));
const LookupPage = lazy(() => import('@/pages/public/Lookup').then((module) => ({ default: module.LookupPage })));
const ContactPage = lazy(() => import('@/pages/public/Contact').then((module) => ({ default: module.ContactPage })));
const AboutPage = lazy(() => import('@/pages/public/About').then((module) => ({ default: module.AboutPage })));
const FaqPage = lazy(() => import('@/pages/public/Faq').then((module) => ({ default: module.FaqPage })));
const PrivacyPage = lazy(() => import('@/pages/public/Legal').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/public/Legal').then((module) => ({ default: module.TermsPage })));
const NotFoundPage = lazy(() => import('@/pages/public/NotFound').then((module) => ({ default: module.NotFoundPage })));

const AdminLoginPage = lazy(() => import('@/pages/admin/Login').then((module) => ({ default: module.AdminLoginPage })));
const AdminResetPasswordPage = lazy(() => import('@/pages/admin/Login').then((module) => ({ default: module.AdminResetPasswordPage })));
const AdminUpdatePasswordPage = lazy(() => import('@/pages/admin/Login').then((module) => ({ default: module.AdminUpdatePasswordPage })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/Dashboard').then((module) => ({ default: module.AdminDashboardPage })));
const AdminReservationsPage = lazy(() => import('@/pages/admin/Reservations').then((module) => ({ default: module.AdminReservationsPage })));
const AdminReservationDetailPage = lazy(() => import('@/pages/admin/Reservations').then((module) => ({ default: module.AdminReservationDetailPage })));
const AdminCalendarPage = lazy(() => import('@/pages/admin/Calendar').then((module) => ({ default: module.AdminCalendarPage })));
const AdminCustomersPage = lazy(() => import('@/pages/admin/Customers').then((module) => ({ default: module.AdminCustomersPage })));
const AdminCustomerDetailPage = lazy(() => import('@/pages/admin/Customers').then((module) => ({ default: module.AdminCustomerDetailPage })));
const AdminOffersPage = lazy(() => import('@/pages/admin/Offers').then((module) => ({ default: module.AdminOffersPage })));
const AdminServicesPage = lazy(() => import('@/pages/admin/Services').then((module) => ({ default: module.AdminServicesPage })));
const AdminInventoryPage = lazy(() => import('@/pages/admin/Inventory').then((module) => ({ default: module.AdminInventoryPage })));
const AdminGalleryPage = lazy(() => import('@/pages/admin/Gallery').then((module) => ({ default: module.AdminGalleryPage })));
const AdminTestimonialsPage = lazy(() => import('@/pages/admin/Testimonials').then((module) => ({ default: module.AdminTestimonialsPage })));
const AdminNotesPage = lazy(() => import('@/pages/admin/Notes').then((module) => ({ default: module.AdminNotesPage })));
const AdminVisitorsPage = lazy(() => import('@/pages/admin/Visitors').then((module) => ({ default: module.AdminVisitorsPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/Settings').then((module) => ({ default: module.AdminSettingsPage })));

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <LoadingBlock />
    </div>
  );
}

/** Everything below is admin-only, English UI, never indexed. */
function adminPage(element: ReactNode, permission: Permission) {
  return (
    <RequireAuth permission={permission}>
      <Suspense fallback={<PageFallback />}>{element}</Suspense>
    </RequireAuth>
  );
}

function AdminShell() {
  return (
    <I18nProvider locale="en">
      <Suspense
        fallback={
          <div className="grid min-h-dvh place-items-center bg-ink-50">
            <LoadingBlock />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </I18nProvider>
  );
}

/** `/` resolves to the visitor's preferred language. */
function LocaleRedirect({ to }: { to?: string }) {
  return <Navigate to={to ?? buildPath('home', detectPreferredLocale())} replace />;
}

/** Validates the locale segment and provides translations + the public shell. */
function LocaleLayout() {
  const { locale } = useParams();
  if (!locale || !(LOCALES as readonly string[]).includes(locale)) {
    return <LocaleRedirect />;
  }
  return (
    <I18nProvider locale={locale as Locale}>
      <PublicLayout />
    </I18nProvider>
  );
}

/** Renders the page that matches the current localized slug. */
function PublicPageSwitch() {
  const { pathname } = useLocation();
  const match = matchPublicPath(pathname);

  switch (match?.page) {
    case 'home':
      return <HomePage />;
    case 'rentals':
      return <ServicesPage page="rentals" />;
    case 'tours':
      return <ServicesPage page="tours" />;
    case 'experiences':
      return <ServicesPage page="experiences" />;
    case 'offers':
      return <OffersPage />;
    case 'gallery':
      return <GalleryPage />;
    case 'booking':
      return <BookingPage />;
    case 'reservationStatus':
      return <ConfirmationPage />;
    case 'lookup':
      return <LookupPage />;
    case 'contact':
      return <ContactPage />;
    case 'about':
      return <AboutPage />;
    case 'faq':
      return <FaqPage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'terms':
      return <TermsPage />;
    default:
      return <NotFoundPage />;
  }
}

/** 404 outside any known language folder: show it in the preferred language. */
function UnmatchedRoute() {
  const locale = detectPreferredLocale();
  return (
    <I18nProvider locale={locale}>
      <PublicDataLoader>
        <div className="flex min-h-dvh flex-col bg-white">
          <Header />
          <main className="flex-1">
            <Suspense fallback={<PageFallback />}>
              <NotFoundPage />
            </Suspense>
          </main>
          <Footer />
        </div>
      </PublicDataLoader>
    </I18nProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export const routes = [
  {
    element: <PublicSiteProviders />,
    children: [
      { index: true, element: <LocaleRedirect /> },
      {
        path: ':locale',
        element: <LocaleLayout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageFallback />}>
                <PublicPageSwitch />
              </Suspense>
            ),
          },
          {
            path: '*',
            element: (
              <Suspense fallback={<PageFallback />}>
                <PublicPageSwitch />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: 'admin',
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      {
        path: 'login',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AdminLoginPage />
          </Suspense>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AdminResetPasswordPage />
          </Suspense>
        ),
      },
      {
        path: 'update-password',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AdminUpdatePasswordPage />
          </Suspense>
        ),
      },
      {
        element: (
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { path: 'dashboard', element: adminPage(<AdminDashboardPage />, 'dashboard:view') },
          { path: 'reservations', element: adminPage(<AdminReservationsPage />, 'reservations:view_assigned') },
          { path: 'reservations/:id', element: adminPage(<AdminReservationDetailPage />, 'reservations:view_assigned') },
          { path: 'calendar', element: adminPage(<AdminCalendarPage />, 'calendar:view') },
          { path: 'customers', element: adminPage(<AdminCustomersPage />, 'customers:view') },
          { path: 'customers/:id', element: adminPage(<AdminCustomerDetailPage />, 'customers:view') },
          { path: 'offers', element: adminPage(<AdminOffersPage />, 'offers:manage') },
          { path: 'services', element: adminPage(<AdminServicesPage />, 'services:manage') },
          { path: 'inventory', element: adminPage(<AdminInventoryPage />, 'inventory:view') },
          { path: 'gallery', element: adminPage(<AdminGalleryPage />, 'gallery:manage') },
          { path: 'testimonials', element: adminPage(<AdminTestimonialsPage />, 'testimonials:manage') },
          { path: 'notes', element: adminPage(<AdminNotesPage />, 'notes:manage_own') },
          { path: 'visitors', element: adminPage(<AdminVisitorsPage />, 'analytics:view') },
          { path: 'settings', element: adminPage(<AdminSettingsPage />, 'settings:manage') },
        ],
      },
    ],
  },
  { path: '*', element: <UnmatchedRoute /> },
];

export const router = createBrowserRouter(routes);
