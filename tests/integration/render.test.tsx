import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ConsentProvider } from '@/app/providers/ConsentProvider';
import { AuthProvider } from '@/features/authentication/AuthProvider';
import { routes } from '@/app/router/AppRouter';
import { __resetDemoMemory, resetDemoData } from '@/services/backend/demoBackend';

vi.mock('@/features/analytics/usePageTracking', () => ({ usePageTracking: () => {} }));

const renderAt = async (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ConsentProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConsentProvider>,
  );
  return router;
};

beforeEach(() => {
  localStorage.clear();
  __resetDemoMemory();
  resetDemoData();
});

describe('public site rendering', () => {
  it('renders the English homepage with the hero and navigation', async () => {
    await renderAt('/en/');
    expect(await screen.findByRole('heading', { level: 1, name: /discover tangier on two wheels/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /bike rentals/i }).length).toBeGreaterThan(0);
  });

  it('renders the French page at its localized slug', async () => {
    await renderAt('/fr/location-velos/');
    await waitFor(() => expect(document.documentElement.lang).toBe('fr'));
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('switches the document to RTL for Arabic', async () => {
    await renderAt('/ar/');
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(await screen.findByRole('heading', { level: 1, name: /طنجة/ })).toBeInTheDocument();
  });

  it('shows the booking form and its consent checkbox', async () => {
    await renderAt('/en/reservations/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: /privacy/i })).toBeInTheDocument();
  });

  it('renders a 404 page for an unknown localized slug', async () => {
    await renderAt('/en/this-page-does-not-exist/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('admin routing', () => {
  it('redirects an anonymous visitor from the dashboard to the login screen', async () => {
    const router = await renderAt('/admin/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'), { timeout: 3000 });
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the login screen with the form fields', async () => {
    await renderAt('/admin/login');
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
  });
});
