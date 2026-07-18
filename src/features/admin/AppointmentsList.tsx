import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Appointment, AppointmentStatus, listAppointments } from '@/services/api';
import { formatDate } from '@/utils/formatter';

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
  no_show: 'bg-red-100 text-red-700',
};

const name = (v: Appointment['patient'] | Appointment['doctor']) =>
  v && typeof v === 'object' ? v.name : '—';

export default function AppointmentsList() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { appointments } = await listAppointments({ scope: 'all' });
      setAppts(appointments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
          <p className="text-gray-600 text-sm">All bookings across doctors and reception.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-3 rounded-lg">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading appointments…</div>
        ) : appts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No appointments yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{formatDate(a.scheduledAt, true)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{name(a.patient)}</td>
                  <td className="px-4 py-3 text-gray-600">{name(a.doctor)}</td>
                  <td className="px-4 py-3 text-gray-600">{a.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[a.status]}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
