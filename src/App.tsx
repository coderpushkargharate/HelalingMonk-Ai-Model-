import { ReactElement } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { Role } from './lib/auth';
import PublicApp from './screens/PublicApp';
import Login from './screens/Login';
import AdminApp from './screens/admin/AdminApp';
import DoctorApp from './screens/doctor/DoctorApp';
import ReceptionApp from './screens/reception/ReceptionApp';
import PatientHome from './screens/patient/PatientHome';

// Each role gets its own URL space. Signed-in users land on their role home.
const HOME: Record<Role, string> = {
  admin: '/admin',
  doctor: '/doctor',
  reception: '/reception',
  patient: '/patient',
};

function Splash() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading…</p>
      </div>
    </div>
  );
}

// Guards a role's URL space: redirects guests to /login and wrong-role users to
// their own home.
function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={user ? <Navigate to={HOME[user.role]} replace /> : <Login />} />

      {/* Role-scoped URL spaces */}
      <Route path="/admin/*" element={<RequireRole role="admin"><AdminApp /></RequireRole>} />
      <Route path="/doctor/*" element={<RequireRole role="doctor"><DoctorApp /></RequireRole>} />
      <Route path="/reception/*" element={<RequireRole role="reception"><ReceptionApp /></RequireRole>} />
      <Route path="/patient/*" element={<RequireRole role="patient"><PatientHome /></RequireRole>} />

      {/* Public site + free AI assessment demo (also the catch-all) */}
      <Route path="/*" element={<PublicApp />} />
    </Routes>
  );
}
