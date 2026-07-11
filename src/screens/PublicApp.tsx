import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Landing from './Landing';
import PatientIntake from './PatientIntake';
import PositionSelect from './PositionSelect';
import ClinicalCapture from './ClinicalCapture';
import ClinicalReport from './ClinicalReport';
import { CLINICAL_ASSESSMENTS, PatientInfo, AssessmentCapture } from '../lib/clinicalKnowledge';

// The public (guest) experience with real URLs:
//   /                      → home
//   /assessment            → patient details
//   /assessment/positions  → choose poses
//   /assessment/capture    → live capture
//   /assessment/report     → report
// The free AI assessment demo. Flow state is held here; a hard refresh mid-flow
// sends the user back to the start step.
export default function PublicApp() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [assessmentIds, setAssessmentIds] = useState<string[]>([]);
  const [captures, setCaptures] = useState<AssessmentCapture[]>([]);

  const restart = () => {
    setPatient(null);
    setAssessmentIds([]);
    setCaptures([]);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f6faf8]">
      <Routes>
        <Route
          index
          element={
            <Landing
              onStart={() => navigate('/assessment')}
              onLogin={() => navigate('/login')}
              user={null}
              onLogout={() => {}}
            />
          }
        />

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
                onComplete={(caps) => {
                  setCaptures(caps);
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
              <ClinicalReport patient={patient} captures={captures} onRestart={restart} />
            ) : (
              <Navigate to="/assessment" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
