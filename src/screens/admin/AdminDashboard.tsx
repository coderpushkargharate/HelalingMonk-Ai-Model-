import { useEffect, useState } from 'react';
import { Users, FileText, CalendarDays, IndianRupee, Stethoscope, ClipboardList, ArrowRight } from 'lucide-react';
import { AdminStats, getAdminStats } from '../../lib/auth';
import { formatMoney } from '../../lib/format';

interface Props {
  /** Navigate to a section (patients / reports / appointments / payments / users). */
  onNavigate: (path: string) => void;
}

export default function AdminDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getAdminStats()
      .then(({ stats }) => !cancelled && setStats(stats))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load stats'));
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { key: 'patients', label: 'Patients', value: stats?.patients, icon: Users, color: 'bg-green-50 text-green-600', path: '/admin/patients' },
    { key: 'reports', label: 'Reports', value: stats?.reports, icon: FileText, color: 'bg-purple-50 text-purple-600', path: '/admin/reports' },
    { key: 'appointments', label: 'Appointments', value: stats?.appointments, icon: CalendarDays, color: 'bg-blue-50 text-blue-600', path: '/admin/appointments' },
    { key: 'revenue', label: 'Revenue collected', value: stats ? formatMoney(stats.revenuePaise) : undefined, icon: IndianRupee, color: 'bg-amber-50 text-amber-600', path: '/admin/payments', isMoney: true },
  ];

  const staff = [
    { key: 'doctors', title: 'Doctors', desc: 'Assessments · Notes', icon: Stethoscope, color: 'bg-blue-50 text-blue-600', count: stats?.usersByRole.doctor, path: '/admin/users?role=doctor' },
    { key: 'reception', title: 'Reception', desc: 'Booking · Payments', icon: ClipboardList, color: 'bg-amber-50 text-amber-600', count: stats?.usersByRole.reception, path: '/admin/users?role=reception' },
    { key: 'patients', title: 'Patient accounts', desc: 'Login · Reports', icon: Users, color: 'bg-green-50 text-green-600', count: stats?.usersByRole.patient, path: '/admin/users?role=patient' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clinic Overview</h2>
        <p className="text-gray-600 text-sm">Every patient, report, appointment and payment across your HealingMonk clinic.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>
      )}

      {/* Live totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => onNavigate(c.path)}
              className="text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className={`mt-3 font-bold text-gray-900 ${c.isMoney ? 'text-xl' : 'text-3xl'}`}>
                {c.value ?? '—'}
              </p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Staff modules */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Team</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {staff.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => onNavigate(m.path)}
              className="text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${m.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {m.count !== undefined && <span className="text-2xl font-bold text-gray-900">{m.count}</span>}
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">{m.title}</h4>
              <p className="text-sm text-gray-500 mt-1">{m.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-600">
                Manage <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
