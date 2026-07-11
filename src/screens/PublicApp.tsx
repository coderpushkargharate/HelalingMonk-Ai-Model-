import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
