import {
  PatientInfo,
  AssessmentCapture,
  getAssessment,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  Severity,
} from '../lib/clinicalKnowledge';
import { FileText, Printer, RotateCcw, Activity, AlertTriangle } from 'lucide-react';

interface Props {
  patient: PatientInfo;
  captures: AssessmentCapture[];
  onRestart: () => void;
}

const SEVERITY_SCORE: Record<Severity, number> = { normal: 0, mild: 1, moderate: 2, severe: 3 };

export default function ClinicalReport({ patient, captures, onRestart }: Props) {
  const findings = captures
    .map((c) => ({ capture: c, assessment: getAssessment(c.assessmentId)! }))
    .filter((f) => f.assessment);

  const flagged = findings.filter(
    (f) => f.capture.severity && f.capture.severity !== 'normal'
  );

  // Simple overall posture health score: 100 minus weighted deviations.
  const totalPenalty = findings.reduce(
    (sum, f) => sum + (f.capture.severity ? SEVERITY_SCORE[f.capture.severity] : 0),
    0
  );
  const maxPenalty = findings.length * 3 || 1;
  const overallScore = Math.max(0, Math.round(100 - (totalPenalty / maxPenalty) * 100));

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white">
      <div className="max-w-4xl mx-auto px-6 print:px-0">
        {/* Action bar (hidden when printing) */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" /> Assessment Report
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
            <button
              onClick={onRestart}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" /> New Assessment
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 print:shadow-none">
          {/* Header */}
          <div className="border-b border-gray-200 pb-5 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-bold text-lg">HealingMonk</p>
                <p className="text-gray-500 text-sm">AI Clinical Posture & Movement Report</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Patient summary */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Patient</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Info label="Name" value={patient.name || '—'} />
              <Info label="Age / Gender" value={[patient.age, patient.gender].filter(Boolean).join(' / ') || '—'} />
              <Info label="Phone" value={patient.phone || '—'} />
              <Info label="Email" value={patient.email || '—'} />
              <Info label="Height" value={patient.height ? `${patient.height} cm` : '—'} />
              <Info label="Weight" value={patient.weight ? `${patient.weight} kg` : '—'} />
              <Info label="BMI" value={bmi(patient.height, patient.weight)} />
              <Info label="Pain Areas" value={patient.painAreas.join(', ') || '—'} />
            </div>
            {patient.complaint && (
              <div className="mt-3">
                <Info label="Chief Complaint" value={patient.complaint} />
              </div>
            )}
          </section>

          {/* Overall score */}
          <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-5 flex items-center gap-4">
              <div className="relative">
                <Activity className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{overallScore}<span className="text-lg text-gray-400">/100</span></p>
                <p className="text-sm text-gray-600">Posture Health Score</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="text-3xl font-bold text-gray-900">{findings.length}</p>
              <p className="text-sm text-gray-600">Assessments Completed</p>
            </div>
            <div className="bg-red-50 rounded-xl p-5">
              <p className="text-3xl font-bold text-red-600">{flagged.length}</p>
              <p className="text-sm text-gray-600">Findings Needing Attention</p>
            </div>
          </section>

          {/* Findings */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Findings</h2>
            <div className="space-y-5">
              {findings.map(({ capture, assessment }) => {
                const sev = capture.severity;
                const color = sev ? SEVERITY_COLOR[sev] : '#9ca3af';
                return (
                  <div key={assessment.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <img
                        src={capture.imageData}
                        alt={assessment.name}
                        className="w-full md:w-56 h-44 object-cover bg-gray-900"
                      />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
                            <p className="text-xs text-gray-500">
                              {assessment.bodyRegion} · {assessment.category}
                            </p>
                          </div>
                          {sev && (
                            <span
                              className="text-xs font-semibold px-2.5 py-1 rounded text-white whitespace-nowrap"
                              style={{ backgroundColor: color }}
                            >
                              {SEVERITY_LABEL[sev]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="text-sm text-gray-500">{assessment.measurementName}:</span>
                          <span className="text-2xl font-bold" style={{ color }}>
                            {capture.value !== null ? `${capture.value}${assessment.unit}` : 'N/A'}
                          </span>
                        </div>

                        {/* Range reference table */}
                        <div className="grid grid-cols-4 gap-1 mt-3 text-center text-[11px]">
                          <RangeCell label="Normal" value={assessment.ranges.normal} active={sev === 'normal'} color={SEVERITY_COLOR.normal} />
                          <RangeCell label="Mild" value={assessment.ranges.mild} active={sev === 'mild'} color={SEVERITY_COLOR.mild} />
                          <RangeCell label="Moderate" value={assessment.ranges.moderate} active={sev === 'moderate'} color={SEVERITY_COLOR.moderate} />
                          <RangeCell label="Severe" value={assessment.ranges.severe} active={sev === 'severe'} color={SEVERITY_COLOR.severe} />
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                          <span>Pain area: <b className="text-gray-700">{assessment.painArea}</b></span>
                          <span>Correlation: <b className="text-gray-700">{assessment.painCorrelation}</b></span>
                          <span>AI feasibility: <b className="text-gray-700">{assessment.aiFeasibility}</b></span>
                          <span>Source: <b className="text-gray-700">{assessment.source}</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Exercises for flagged findings */}
                    {sev && sev !== 'normal' && (
                      <div className="bg-amber-50 border-t border-amber-100 p-4">
                        <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-2">
                          <AlertTriangle className="w-3.5 h-3.5" /> Recommended Exercises
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {assessment.exercises.map((ex) => (
                            <div key={ex.name} className="bg-white rounded-lg p-2 border border-amber-100">
                              <p className="font-medium text-gray-800 text-sm">{ex.name}</p>
                              <p className="text-xs text-gray-500">{ex.sets} sets × {ex.reps} · {ex.frequency}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <p className="text-[11px] text-gray-400 mt-8 border-t border-gray-100 pt-4">
            Disclaimer: This report is generated using AI-based MediaPipe pose estimation and is intended to assist a
            qualified therapist. It is not a substitute for in-person clinical examination. Measurement values are
            camera-based estimates and should be validated by the therapist.
          </p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 break-words">{value}</p>
    </div>
  );
}

function RangeCell({ label, value, active, color }: { label: string; value: string; active: boolean; color: string }) {
  return (
    <div
      className="rounded p-1.5 border"
      style={{
        backgroundColor: active ? color : '#f9fafb',
        borderColor: active ? color : '#e5e7eb',
        color: active ? '#fff' : '#6b7280',
      }}
    >
      <p className="font-semibold">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function bmi(height: string, weight: string): string {
  const h = parseFloat(height) / 100;
  const w = parseFloat(weight);
  if (!h || !w) return '—';
  return (w / (h * h)).toFixed(1);
}
