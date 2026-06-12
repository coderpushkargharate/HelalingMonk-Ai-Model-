import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import Landing from './Landing';
import CameraSetup from './CameraSetup';
import Instructions from './Instructions';
import Capture from './Capture';
import Results from './Results';
import Report from './Report';
import PainAssessment from './PainAssessment';
import MultiPositionCapture from './MultiPositionCapture';
import EnhancedReport from './EnhancedReport';
import PatientIntake from './PatientIntake';
import PositionSelect from './PositionSelect';
import ClinicalCapture from './ClinicalCapture';
import ClinicalReport from './ClinicalReport';
import { CapturedImage } from '../lib/painAssessment';
import { CLINICAL_ASSESSMENTS, PatientInfo, AssessmentCapture } from '../lib/clinicalKnowledge';

type Screen = 'landing' | 'camera' | 'instructions' | 'capture' | 'results' | 'report' | 'pain_assessment' | 'multi_position' | 'enhanced_report' | 'patient_intake' | 'position_select' | 'clinical_capture' | 'clinical_report';

interface Assessment {
  id: string;
  overallScore: number;
  postureScore: number;
  mobilityScore: number;
  stabilityScore: number;
  findings: Finding[];
  programs: Program[];
}

interface Finding {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

interface Program {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  imageUrl: string;
}

// The doctor-driven movement-assessment / pose-capture flow (the AI Engine).
export default function AssessmentFlow() {
  const { user, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [selectedPainAreas, setSelectedPainAreas] = useState<string[]>([]);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [language] = useState<'en' | 'hi'>('hi'); // Default to Hindi

  // Clinical (doctor-driven) flow state.
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [clinicalAssessmentIds, setClinicalAssessmentIds] = useState<string[]>([]);
  const [clinicalCaptures, setClinicalCaptures] = useState<AssessmentCapture[]>([]);

  const handleStartAssessment = () => {
    // New doctor-driven clinical flow: patient details → select positions →
    // manual capture → report.
    setScreen('patient_intake');
  };

  const handleIntakeNext = (info: PatientInfo) => {
    setPatient(info);
    setScreen('position_select');
  };

  const handlePositionsStart = (assessmentIds: string[]) => {
    setClinicalAssessmentIds(assessmentIds);
    setScreen('clinical_capture');
  };

  const handleClinicalComplete = (captures: AssessmentCapture[]) => {
    setClinicalCaptures(captures);
    setScreen('clinical_report');
  };

  const handleViewReport = () => {
    setScreen('report');
  };

  const handlePainAssessmentContinue = (areas: string[]) => {
    setSelectedPainAreas(areas);
    setScreen('multi_position');
  };

  const handlePainAssessmentSkip = () => {
    if (assessment) {
      setScreen('enhanced_report');
    }
  };

  const handleMultiPositionComplete = (images: CapturedImage[]) => {
    setCapturedImages(images);
    setScreen('enhanced_report');
  };

  const handleRestart = () => {
    setAssessment(null);
    setSelectedPainAreas([]);
    setCapturedImages([]);
    setPatient(null);
    setClinicalAssessmentIds([]);
    setClinicalCaptures([]);
    setScreen('landing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {screen === 'landing' && <Landing onStart={handleStartAssessment} user={user} onLogout={logout} />}
      {screen === 'camera' && <CameraSetup onReady={() => setScreen('instructions')} />}
      {screen === 'instructions' && <Instructions onStart={() => setScreen('capture')} />}
      {screen === 'capture' && <Capture onComplete={(data) => {
        setAssessment(data);
        setScreen('pain_assessment');
      }} />}
      {screen === 'results' && assessment && <Results assessment={assessment} onViewReport={handleViewReport} onRestart={handleRestart} />}
      {screen === 'report' && assessment && <Report assessment={assessment} onRestart={handleRestart} />}
      {screen === 'pain_assessment' && <PainAssessment onContinue={handlePainAssessmentContinue} onSkip={handlePainAssessmentSkip} language={language} />}
      {screen === 'multi_position' && <MultiPositionCapture selectedAreas={selectedPainAreas} onComplete={handleMultiPositionComplete} onSkip={handlePainAssessmentSkip} language={language} />}
      {screen === 'enhanced_report' && assessment && <EnhancedReport assessment={assessment} capturedImages={capturedImages} selectedAreas={selectedPainAreas} onRestart={handleRestart} />}

      {/* Clinical doctor-driven flow */}
      {screen === 'patient_intake' && <PatientIntake initial={patient} onNext={handleIntakeNext} />}
      {screen === 'position_select' && (
        <PositionSelect
          initial={clinicalAssessmentIds}
          onBack={() => setScreen('patient_intake')}
          onStart={handlePositionsStart}
        />
      )}
      {screen === 'clinical_capture' && (
        <ClinicalCapture
          assessments={CLINICAL_ASSESSMENTS.filter((a) => clinicalAssessmentIds.includes(a.id))}
          onComplete={handleClinicalComplete}
          onBack={() => setScreen('position_select')}
        />
      )}
      {screen === 'clinical_report' && patient && (
        <ClinicalReport patient={patient} captures={clinicalCaptures} onRestart={handleRestart} />
      )}
    </div>
  );
}
