import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router/AppRouter';
import { ConsentProvider } from '@/app/providers/ConsentProvider';
import { AuthProvider } from '@/features/authentication/AuthProvider';
import '@/styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ConsentProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConsentProvider>
  </StrictMode>,
);
