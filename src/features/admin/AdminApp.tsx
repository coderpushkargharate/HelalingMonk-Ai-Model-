import { Activity, LogOut, LayoutGrid, CalendarDays, Users, FileText, IndianRupee, UserCog } from 'lucide-react';
import { Routes, Route, Navigate, Outlet, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/store/auth.store';
import { Role } from '@/services/api';
import AdminDashboard from '@/features/admin/AdminDashboard';
import UserManagement from '@/features/admin/UserManagement';
import PatientsList from '@/features/admin/PatientsList';
import ReportsList from '@/features/admin/ReportsList';
import AppointmentsList from '@/features/admin/AppointmentsList';
import PaymentsList from '@/features/admin/PaymentsList';
import ReceptionDashboard from '@/features/reception/ReceptionDashboard';
import BookAppointment from '@/features/reception/BookAppointment';

// Admin (s-admin) URL space:
//   /admin              → overview (live totals)
//   /admin/patients     → all patients
//   /admin/reports      → all assessment reports
//   /admin/appointments → all appointments
//   /admin/payments     → all payments
//   /admin/users        → user management (?role= to pre-filter)
//   /admin/schedule     → clinic schedule (calendar) + /admin/book
const navCls = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
    isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`;

const NAV = [
  { to: '/admin', end: true, icon: LayoutGrid, label: 'Overview' },
  { to: '/admin/patients', icon: Users, label: 'Patients' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/appointments', icon: CalendarDays, label: 'Appointments' },
  { to: '/admin/payments', icon: IndianRupee, label: 'Payments' },
  { to: '/admin/users', icon: UserCog, label: 'Users' },
];

function Chrome() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">HealingMonk</p>
              <p className="text-xs text-gray-500 leading-tight">Admin Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.name}</span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function UsersRoute() {
  const [params] = useSearchParams();
  const role = (params.get('role') as Role | 'all') || 'all';
  return <UserManagement initialRole={role} />;
}

export default function AdminApp() {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route element={<Chrome />}>
        <Route index element={<AdminDashboard onNavigate={(p) => navigate(p)} />} />
        <Route path="patients" element={<PatientsList />} />
        <Route path="reports" element={<ReportsList />} />
        <Route path="appointments" element={<AppointmentsList />} />
        <Route path="payments" element={<PaymentsList />} />
        <Route path="users" element={<UsersRoute />} />
        <Route path="schedule" element={<ReceptionDashboard onBook={() => navigate('/admin/book')} />} />
        <Route
          path="book"
          element={<BookAppointment onBack={() => navigate('/admin/schedule')} onBooked={() => navigate('/admin/schedule')} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
