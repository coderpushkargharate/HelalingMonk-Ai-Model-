import { useState } from 'react';
import { Activity, LogOut, UserPlus, CalendarDays } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import ReceptionDashboard from './ReceptionDashboard';
import BookAppointment from './BookAppointment';
import PatientForm from '../doctor/PatientForm';

type View = 'schedule' | 'book' | 'register';

// Top-level shell for the reception role: register patients (+ assign a doctor),
// view the day's schedule, and book appointments.
export default function ReceptionApp() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('register');

  const navBtn = (target: View, label: string, Icon: typeof UserPlus) => (
    <button
      onClick={() => setView(target)}
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
        view === target ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">HealingMonk</p>
              <p className="text-xs text-gray-500 leading-tight">Reception Desk</p>
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
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2">
          {navBtn('register', 'Register patient', UserPlus)}
          {navBtn('schedule', 'Schedule', CalendarDays)}
        </div>
      </div>

      <main className="px-4 py-8">
        {view === 'register' && (
          <PatientForm
            showAssignDoctor
            onBack={() => setView('schedule')}
            onCreated={() => setView('schedule')}
          />
        )}
        {view === 'schedule' && <ReceptionDashboard onBook={() => setView('book')} />}
        {view === 'book' && (
          <BookAppointment
            onBack={() => setView('schedule')}
            onBooked={() => setView('schedule')}
          />
        )}
      </main>
    </div>
  );
}
