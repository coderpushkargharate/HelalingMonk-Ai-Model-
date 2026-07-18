import { useEffect, useState } from 'react';
import { ChevronLeft, Activity, FileText, Stethoscope, ExternalLink } from 'lucide-react';
import { Patient, Report, listPatientReports } from '@/services/api';

interface Props {
  patient: Patient;
  onBack: () => void;
  onStartAssessment: () => void;
}

const SCORE_COLOR = (score: number | null) =>
  score === null ? 'text-gray-400' : score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-600';

export default function PatientProfile({ patient, onBack, onStartAssessment }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { reports } = await listPatientReports(patient.id);
        if (!cancelled) setReports(reports);
      } catch {
        /* timeline is non-critical; show empty on error */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back to patients
      </button>

      {/* Patient header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {patient.name}
              <span className="ml-3 text-sm font-mono text-gray-400">{patient.patientId}</span>
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {[patient.age ? `${patient.age} yrs` : null, patient.gender || null, patient.mobile || null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
            {patient.painAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {patient.painAreas.map((a) => (
                  <span key={a} className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            )}
            {patient.complaint && <p className="text-sm text-gray-600 mt-3 max-w-xl">{patient.complaint}</p>}
          </div>
          <button
            onClick={onStartAssessment}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
          >
            <Stethoscope className="w-4 h-4" /> Start AI Assessment
          </button>
        </div>
      </div>

      {/* Reports timeline */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reports Timeline</h3>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No assessments yet. Start the first AI assessment for this patient.
        </div>
      ) : (
        <ol className="space-y-3">
          {reports.map((r) => (
            <li
              key={r.id}
              onClick={() => r.shareId && window.open(`/r/${r.shareId}`, '_blank', 'noopener')}
              className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${
                r.shareId ? 'cursor-pointer hover:border-green-300 hover:shadow transition' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-50 rounded-lg p-2">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : 'Assessment'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.findingsCount} assessment{r.findingsCount === 1 ? '' : 's'} ·{' '}
                      <span className="text-red-500">{r.flaggedCount} flagged</span>
                      {typeof r.doctor === 'object' && r.doctor?.name ? ` · Dr. ${r.doctor.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.shareId && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </span>
                  )}
                  <p className={`text-2xl font-bold ${SCORE_COLOR(r.overallScore)}`}>
                    {r.overallScore ?? '—'}
                    <span className="text-sm text-gray-400">/100</span>
                  </p>
                </div>
              </div>
              {r.doctorNotes && (
                <p className="text-sm text-gray-600 mt-3 border-t border-gray-100 pt-3">
                  <span className="font-medium text-gray-700">Notes: </span>
                  {r.doctorNotes}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
