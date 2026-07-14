import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import MarketingLayout from '../components/site/MarketingLayout';
import { CLINICAL_ASSESSMENTS } from '../lib/clinicalKnowledge';
import type { PatientInfo, AssessmentCapture, ExtraShot } from '../lib/clinicalKnowledge';

// Route components are lazy-loaded so each screen ships in its own chunk. In
// particular the capture/report screens (which pull in MediaPipe and jsPDF)
// download only when the user actually reaches them — the marketing site and
// intake stay lightweight.
const Home = lazy(() => import('./marketing/Home'));
const Technology = lazy(() => import('./marketing/Technology'));
const Assessments = lazy(() => import('./marketing/Assessments'));
const HowItWorks = lazy(() => import('./marketing/HowItWorks'));
const About = lazy(() => import('./marketing/About'));
const PatientIntake = lazy(() => import('./PatientIntake'));
const PositionSelect = lazy(() => import('./PositionSelect'));
const ClinicalCapture = lazy(() => import('./ClinicalCapture'));
const ClinicalReport = lazy(() => import('./ClinicalReport'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
    </div>
  );
}

// Overall doctor notes + key points for the public report. Kept on the client
// and captured in the printed/PDF output (this guest flow has no saved DB
// record to persist to — the per-posture scores work the same way).
function DoctorNotesSection() {
  const [notes, setNotes] = useState('');
  const [points, setPoints] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const addPoint = () => {
    const p = draft.trim();
    if (!p) return;
    setPoints((prev) => [...prev, p]);
    setDraft('');
  };

  return (
    <section className="mt-8 border-t border-gray-200 pt-5">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="w-4 h-4 text-blue-700" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Doctor Notes &amp; Key Points</h2>
        <span className="ml-auto text-[10px] text-blue-500 font-medium print:hidden">To be filled by the doctor</span>
      </div>

      {/* Overall clinical notes */}
      <label className="block text-xs text-gray-600 mb-1">Clinical notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add clinical notes, observations, and prescribed plan for this patient…"
        className="w-full min-h-[100px] border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />

      {/* Key points list */}
      <label className="block text-xs text-gray-600 mt-4 mb-1">Key points</label>
      {points.length > 0 && (
        <ul className="list-disc pl-5 mb-2 space-y-1">
          {points.map((p, i) => (
            <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
              <span className="flex-1">{p}</span>
              <button
                type="button"
                onClick={() => setPoints((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-red-500 hover:text-red-700 print:hidden"
                aria-label="Remove point"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 print:hidden">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPoint();
            }
          }}
          placeholder="Add a key point and press Enter…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button
          type="button"
          onClick={addPoint}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          Add point
        </button>
      </div>
    </section>
  );
}

// The public (guest) experience with real URLs. Marketing pages share the nav +
// footer via MarketingLayout; the assessment flow is a focused, chrome-less flow.
// Flow state is held here; a hard refresh mid-flow returns the user to the start.
export default function PublicApp() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [assessmentIds, setAssessmentIds] = useState<string[]>([]);
  const [captures, setCaptures] = useState<AssessmentCapture[]>([]);
  const [extraShots, setExtraShots] = useState<ExtraShot[]>([]);

  const restart = () => {
    setPatient(null);
    setAssessmentIds([]);
    setCaptures([]);
    setExtraShots([]);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f6faf8]">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Marketing site — shares the nav bar + footer */}
          <Route element={<MarketingLayout />}>
            <Route index element={<Home />} />
            <Route path="technology" element={<Technology />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="about" element={<About />} />
          </Route>

          {/* Focused assessment flow */}
          <Route
            path="assessment"
            element={
              <PatientIntake
                initial={patient}
                onNext={(info) => {
                  setPatient(info);
                  navigate('/assessment/positions');
                }}
              />
            }
          />

          <Route
            path="assessment/positions"
            element={
              <PositionSelect
                initial={assessmentIds}
                onBack={() => navigate('/assessment')}
                onStart={(ids) => {
                  setAssessmentIds(ids);
                  navigate('/assessment/capture');
                }}
              />
            }
          />

          <Route
            path="assessment/capture"
            element={
              assessmentIds.length > 0 ? (
                <ClinicalCapture
                  assessments={CLINICAL_ASSESSMENTS.filter((a) => assessmentIds.includes(a.id))}
                  onBack={() => navigate('/assessment/positions')}
                  onComplete={(caps, extras) => {
                    setCaptures(caps);
                    setExtraShots(extras);
                    navigate('/assessment/report');
                  }}
                />
              ) : (
                <Navigate to="/assessment" replace />
              )
            }
          />

          <Route
            path="assessment/report"
            element={
              patient && captures.length > 0 ? (
                <ClinicalReport
                  patient={patient}
                  captures={captures}
                  extraShots={extraShots}
                  onRestart={restart}
                  doctorMode
                  notesSection={<DoctorNotesSection />}
                />
              ) : (
                <Navigate to="/assessment" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
