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
import { CapturedImage } from './lib/painAssessment';

type Screen = 'landing' | 'auth' | 'camera' | 'instructions' | 'capture' | 'results' | 'report' | 'pain_assessment' | 'multi_position' | 'enhanced_report';

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
    if (user) {
      setScreen('camera');
    } else {
      setScreen('auth');
    }
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
    </div>
  );
}

export default App;
