import { Activity, LogOut, LayoutGrid, CalendarDays } from 'lucide-react';
import { Routes, Route, Navigate, Outlet, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { Role } from '../../lib/auth';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import ReceptionDashboard from '../reception/ReceptionDashboard';
import BookAppointment from '../reception/BookAppointment';

// Admin (s-admin) URL space:
//   /admin           → overview
//   /admin/users     → user management (?role= to pre-filter)
//   /admin/schedule  → clinic schedule
//   /admin/book      → book appointment
const navCls = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
    isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`;

function Chrome() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
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
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2">
          <NavLink to="/admin" end className={navCls}>
            <LayoutGrid className="w-4 h-4" /> Overview
          </NavLink>
          <NavLink to="/admin/schedule" className={navCls}>
            <CalendarDays className="w-4 h-4" /> Schedule
          </NavLink>
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
        <Route
          index
          element={
            <AdminDashboard
              onOpenUsers={(r) => navigate(`/admin/users${r !== 'all' ? `?role=${r}` : ''}`)}
            />
          }
        />
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
