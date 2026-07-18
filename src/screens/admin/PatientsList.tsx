import { useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Patient, listPatients } from '../../lib/auth';
import { formatDate } from '../../lib/format';

export default function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { patients } = await listPatients({ scope: 'all', q: q.trim() || undefined });
      setPatients(patients);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doctorName = (d: Patient['assignedDoctor']) =>
    d && typeof d === 'object' ? d.name : '—';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
          <p className="text-gray-600 text-sm">All registered patients across the clinic.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex gap-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / mobile / ID"
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button type="submit" className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-3 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading patients…</div>
        ) : patients.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No patients yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Age / Gender</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Pain areas</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.patientId}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.age ?? '—'}{p.gender ? ` · ${p.gender}` : ''}</td>
                  <td className="px-4 py-3 text-gray-600">{p.mobile || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.painAreas.length ? p.painAreas.join(', ') : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{doctorName(p.assignedDoctor)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
