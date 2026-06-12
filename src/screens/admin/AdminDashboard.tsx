import { useEffect, useState } from 'react';
import { Stethoscope, ClipboardList, Users, Brain, ArrowRight } from 'lucide-react';
import { Role, listUsers } from '../../lib/auth';

export type AdminView = 'home' | 'users';

interface Props {
  /** Navigate to user management, optionally pre-filtered by role. */
  onOpenUsers: (role: Role | 'all') => void;
}

// Mirrors the system architecture: Doctors / Reception / Patients / AI Engine.
const MODULES: {
  key: string;
  title: string;
  desc: string;
  icon: typeof Stethoscope;
  color: string;
  countRole?: Role;
  usersRole?: Role | 'all';
  ready: boolean;
}[] = [
  {
    key: 'doctors',
    title: 'Doctors',
    desc: 'Appointments · Assessments · Notes',
    icon: Stethoscope,
    color: 'bg-blue-50 text-blue-600',
    countRole: 'doctor',
    usersRole: 'doctor',
    ready: true,
  },
  {
    key: 'reception',
    title: 'Reception',
    desc: 'Booking · Payments · Calendar',
    icon: ClipboardList,
    color: 'bg-amber-50 text-amber-600',
    countRole: 'reception',
    usersRole: 'reception',
    ready: true,
  },
  {
    key: 'patients',
    title: 'Patients',
    desc: 'Reports · Exercises · Reminders',
    icon: Users,
    color: 'bg-green-50 text-green-600',
    countRole: 'patient',
    usersRole: 'patient',
    ready: true,
  },
  {
    key: 'ai',
    title: 'AI Engine',
    desc: 'MediaPipe · Angle Engine · Clinical Rules',
    icon: Brain,
    color: 'bg-purple-50 text-purple-600',
    ready: false,
  },
];

export default function AdminDashboard({ onOpenUsers }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const roles: Role[] = ['doctor', 'reception', 'patient'];
      const results = await Promise.allSettled(roles.map((r) => listUsers(r)));
      if (cancelled) return;
      const next: Record<string, number> = {};
      roles.forEach((r, i) => {
        const res = results[i];
        if (res.status === 'fulfilled') next[r] = res.value.users.length;
      });
      setCounts(next);
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clinic Overview</h2>
        <p className="text-gray-600 text-sm">Manage every module of your HealingMonk clinic from one place.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const count = m.countRole ? counts[m.countRole] : undefined;
          const clickable = m.ready && m.usersRole !== undefined;
          return (
            <button
              key={m.key}
              disabled={!clickable}
              onClick={() => clickable && onOpenUsers(m.usersRole!)}
              className={`text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all ${
                clickable ? 'hover:shadow-md hover:border-gray-300 cursor-pointer' : 'opacity-70 cursor-default'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${m.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {count !== undefined && (
                  <span className="text-2xl font-bold text-gray-900">{count}</span>
                )}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                {m.title}
                {!m.ready && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Coming soon
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{m.desc}</p>
              {clickable && (
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-600">
                  Manage <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          onClick={() => onOpenUsers('all')}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage all users
        </button>
      </div>
    </div>
  );
}
