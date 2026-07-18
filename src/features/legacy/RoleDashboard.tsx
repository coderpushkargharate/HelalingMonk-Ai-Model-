import { Activity, LogOut } from 'lucide-react';
import { useAuth } from '@/store/auth.store';
import { Role } from '@/services/api';

// Lightweight placeholder home for roles whose feature modules are not built
// yet (reception, patient). Lists the modules from the architecture so the
// surface is visible; individual screens land in follow-up work.
const ROLE_MODULES: Partial<Record<Role, { title: string; items: string[] }>> = {
  reception: {
    title: 'Reception',
    items: ['Booking', 'Payments', 'Calendar'],
  },
  patient: {
    title: 'My Health',
    items: ['Reports', 'Exercises', 'Reminders'],
  },
};

export default function RoleDashboard() {
  const { user, logout } = useAuth();
  const config = user ? ROLE_MODULES[user.role] : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">HealingMonk</p>
              <p className="text-xs text-gray-500 leading-tight capitalize">{config?.title ?? user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome, {user?.name}</h2>
        <p className="text-gray-600 mb-8">Your modules are on the way.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(config?.items ?? []).map((item) => (
            <div
              key={item}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm opacity-80"
            >
              <h3 className="font-semibold text-gray-900">{item}</h3>
              <span className="mt-2 inline-block text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
