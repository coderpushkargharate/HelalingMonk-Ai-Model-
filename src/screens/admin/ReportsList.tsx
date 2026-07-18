import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ReportListItem, listAllReports } from '../../lib/auth';
import { formatDate } from '../../lib/format';

const SCORE_COLOR = (s: number | null) => {
  if (s == null) return 'text-gray-500';
  if (s >= 80) return 'text-green-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-600';
};

export default function ReportsList() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { reports } = await listAllReports('all');
      setReports(reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const doctorName = (d: ReportListItem['doctor']) => (d && typeof d === 'object' ? d.name : '—');

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Reports</h2>
          <p className="text-gray-600 text-sm">Every AI posture assessment saved by your doctors.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-3 rounded-lg">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading reports…</div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No reports yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Findings</th>
                <th className="px-4 py-3 font-medium">Flagged</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.patientInfo?.name || '—'}
                    {r.patientInfo?.patientId && (
                      <span className="ml-2 font-mono text-xs text-gray-400">{r.patientInfo.patientId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doctorName(r.doctor)}</td>
                  <td className={`px-4 py-3 font-bold ${SCORE_COLOR(r.overallScore)}`}>
                    {r.overallScore ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.findingsCount}</td>
                  <td className="px-4 py-3">
                    {r.flaggedCount > 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {r.flaggedCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
