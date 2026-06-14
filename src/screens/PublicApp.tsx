import { useState } from 'react';
import Landing from './Landing';
import PatientIntake from './PatientIntake';
import PositionSelect from './PositionSelect';
import ClinicalCapture from './ClinicalCapture';
import ClinicalReport from './ClinicalReport';
import { CLINICAL_ASSESSMENTS, PatientInfo, AssessmentCapture } from '../lib/clinicalKnowledge';

type Screen = 'landing' | 'patient_intake' | 'position_select' | 'clinical_capture' | 'clinical_report';

interface Props {
  /** Open the staff / patient (JWT) login screen. */
  onLogin: () => void;
}

// The public (guest) experience: the home page plus the self-serve AI
// assessment demo flow — patient details → select positions → capture → report.
// Signed-in staff/patients get their role apps via <AppRoot>.
export default function PublicApp({ onLogin }: Props) {
  const [screen, setScreen] = useState<Screen>('landing');
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [assessmentIds, setAssessmentIds] = useState<string[]>([]);
  const [captures, setCaptures] = useState<AssessmentCapture[]>([]);

  const restart = () => {
    setPatient(null);
    setAssessmentIds([]);
    setCaptures([]);
    setScreen('landing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {screen === 'landing' && (
        <Landing
          onStart={() => setScreen('patient_intake')}
          onLogin={onLogin}
          user={null}
          onLogout={() => {}}
        />
      )}

      {screen === 'patient_intake' && (
        <PatientIntake
          initial={patient}
          onNext={(info) => {
            setPatient(info);
            setScreen('position_select');
          }}
        />
      )}

      {screen === 'position_select' && (
        <PositionSelect
          initial={assessmentIds}
          onBack={() => setScreen('patient_intake')}
          onStart={(ids) => {
            setAssessmentIds(ids);
            setScreen('clinical_capture');
          }}
        />
      )}

      {screen === 'clinical_capture' && (
        <ClinicalCapture
          assessments={CLINICAL_ASSESSMENTS.filter((a) => assessmentIds.includes(a.id))}
          onBack={() => setScreen('position_select')}
          onComplete={(caps) => {
            setCaptures(caps);
            setScreen('clinical_report');
          }}
        />
      )}

      {screen === 'clinical_report' && patient && (
        <ClinicalReport patient={patient} captures={captures} onRestart={restart} />
      )}
    </div>
  );
}
