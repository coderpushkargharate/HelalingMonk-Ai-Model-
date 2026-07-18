import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/store/auth.store';
import App from '@/features/router/AppRouter';

// Client-side root for the SPA. Replaces the old Vite main.tsx: provides the
// router + auth context that App and every screen depend on. Mounted by Next
// via a dynamic ssr:false import (see app/[[...slug]]/ClientApp.tsx).
export default function AppShell() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}
