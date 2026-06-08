import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Landing from './screens/Landing';
import CameraSetup from './screens/CameraSetup';
import Instructions from './screens/Instructions';
import Capture from './screens/Capture';
import Results from './screens/Results';
import Report from './screens/Report';
import AuthScreen from './screens/AuthScreen';
import PainAssessment from './screens/PainAssessment';
import MultiPositionCapture from './screens/MultiPositionCapture';
import EnhancedReport from './screens/EnhancedReport';
import PatientIntake from './screens/PatientIntake';
import PositionSelect from './screens/PositionSelect';
import ClinicalCapture from './screens/ClinicalCapture';
import ClinicalReport from './screens/ClinicalReport';
import { CapturedImage } from './lib/painAssessment';
import { CLINICAL_ASSESSMENTS, PatientInfo, AssessmentCapture } from './lib/clinicalKnowledge';

type Screen = 'landing' | 'auth' | 'camera' | 'instructions' | 'capture' | 'results' | 'report' | 'pain_assessment' | 'multi_position' | 'enhanced_report' | 'patient_intake' | 'position_select' | 'clinical_capture' | 'clinical_report';

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

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [user, setUser] = useState(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [selectedPainAreas, setSelectedPainAreas] = useState<string[]>([]);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [language, setLanguage] = useState<'en' | 'hi'>('hi'); // Default to Hindi
  const [loading, setLoading] = useState(true);

  // Clinical (doctor-driven) flow state.
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [clinicalAssessmentIds, setClinicalAssessmentIds] = useState<string[]>([]);
  const [clinicalCaptures, setClinicalCaptures] = useState<AssessmentCapture[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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

  const handleAssessmentComplete = (data: Assessment) => {
    setAssessment(data);
    setScreen('results');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setScreen('landing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {screen === 'landing' && <Landing onStart={handleStartAssessment} user={user} onLogout={handleLogout} />}
      {screen === 'auth' && <AuthScreen onAuth={(user) => { setUser(user); setScreen('camera'); }} />}
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

export default App;
