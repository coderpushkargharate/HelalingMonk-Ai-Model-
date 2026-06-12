import { useState } from 'react';
import { Activity, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { Patient } from '../../lib/auth';
import { CLINICAL_ASSESSMENTS, AssessmentCapture } from '../../lib/clinicalKnowledge';
import DoctorDashboard from './DoctorDashboard';
import PatientForm from './PatientForm';
import PatientProfile from './PatientProfile';
import DoctorReportView from './DoctorReportView';
import PositionSelect from '../PositionSelect';
import ClinicalCapture from '../ClinicalCapture';

type View = 'dashboard' | 'register' | 'profile' | 'select_positions' | 'capture' | 'report';

// Top-level shell for the doctor role. Drives the Phase 1 flow:
// patients → patient profile → AI assessment (positions → capture) → report.
export default function DoctorApp() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessmentIds, setAssessmentIds] = useState<string[]>([]);
  const [captures, setCaptures] = useState<AssessmentCapture[]>([]);

  const openPatient = (p: Patient) => {
    setPatient(p);
    setView('profile');
  };

  const backToDashboard = () => {
    setPatient(null);
    setView('dashboard');
  };

  // The assessment screens (PositionSelect / ClinicalCapture / report) are
  // full-screen and bring their own chrome, so we render them without the
  // doctor header.
  if (patient && view === 'select_positions') {
    return (
      <PositionSelect
        initial={assessmentIds}
        onBack={() => setView('profile')}
        onStart={(ids) => {
          setAssessmentIds(ids);
          setView('capture');
        }}
      />
    );
  }

  if (patient && view === 'capture') {
    return (
      <ClinicalCapture
        assessments={CLINICAL_ASSESSMENTS.filter((a) => assessmentIds.includes(a.id))}
        onBack={() => setView('select_positions')}
        onComplete={(caps) => {
          setCaptures(caps);
          setView('report');
        }}
      />
    );
  }

  if (patient && view === 'report') {
    return <DoctorReportView patient={patient} captures={captures} onDone={() => setView('profile')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">HealingMonk</p>
              <p className="text-xs text-gray-500 leading-tight">Doctor Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">Dr. {user?.name}</span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8">
        {view === 'dashboard' && (
          <DoctorDashboard onRegister={() => setView('register')} onOpenPatient={openPatient} />
        )}
        {view === 'register' && (
          <PatientForm onBack={backToDashboard} onCreated={openPatient} />
        )}
        {view === 'profile' && patient && (
          <PatientProfile
            patient={patient}
            onBack={backToDashboard}
            onStartAssessment={() => {
              setAssessmentIds([]);
              setCaptures([]);
              setView('select_positions');
            }}
          />
        )}
      </main>
    </div>
  );
}
