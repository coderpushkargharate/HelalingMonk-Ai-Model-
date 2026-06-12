import { useState } from 'react';
import { Activity, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { Role } from '../../lib/auth';
import AdminDashboard, { AdminView } from './AdminDashboard';
import UserManagement from './UserManagement';

// Top-level shell for the admin role: header + simple in-app view switching.
export default function AdminApp() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<AdminView>('home');
  const [usersRole, setUsersRole] = useState<Role | 'all'>('all');

  const openUsers = (role: Role | 'all') => {
    setUsersRole(role);
    setView('users');
  };

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
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8">
        {view === 'users' && (
          <div className="max-w-5xl mx-auto mb-4">
            <button
              onClick={() => setView('home')}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to overview
            </button>
          </div>
        )}

        {view === 'home' && <AdminDashboard onOpenUsers={openUsers} />}
        {view === 'users' && <UserManagement initialRole={usersRole} />}
      </main>
    </div>
  );
}
