import { useState } from 'react';
import { PatientInfo } from '../lib/clinicalKnowledge';
import { User, ClipboardList, AlertCircle, ArrowRight } from 'lucide-react';
import PageShell, { GlassCard } from '../components/PageShell';

interface Props {
  initial?: PatientInfo | null;
  onNext: (patient: PatientInfo) => void;
}

const PAIN_OPTIONS = ['Neck', 'Shoulder', 'Upper Back', 'Lower Back', 'Hip', 'Knee', 'Ankle'];

const emptyPatient: PatientInfo = {
  name: '',
  age: '',
  gender: '',
  phone: '',
  email: '',
  height: '',
  weight: '',
  painAreas: [],
  complaint: '',
};

export default function PatientIntake({ initial, onNext }: Props) {
  const [patient, setPatient] = useState<PatientInfo>(initial ?? emptyPatient);
  const [error, setError] = useState('');

  const set = (key: keyof PatientInfo, value: string) =>
    setPatient((p) => ({ ...p, [key]: value }));

  const togglePain = (area: string) =>
    setPatient((p) => ({
      ...p,
      painAreas: p.painAreas.includes(area)
        ? p.painAreas.filter((a) => a !== area)
        : [...p.painAreas, area],
    }));

  const handleNext = () => {
    if (!patient.name.trim()) {
      setError('Please enter the patient name.');
      return;
    }
    setError('');
    onNext(patient);
  };

  return (
    <PageShell step="Step 1 of 2 · Patient Details">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">New Assessment</h1>
          <p className="text-slate-500">Tell us about you before the scan.</p>
        </div>
      </div>

      <GlassCard className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Patient Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Full Name *">
            <input className="input" value={patient.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age">
              <input className="input" type="number" value={patient.age} onChange={(e) => set('age', e.target.value)} placeholder="35" />
            </Field>
            <Field label="Gender">
              <select className="input" value={patient.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
          </div>
          <Field label="Phone Number">
            <input className="input" value={patient.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 ..." />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={patient.email} onChange={(e) => set('email', e.target.value)} placeholder="patient@email.com" />
          </Field>
          <Field label="Height (cm)">
            <input className="input" type="number" value={patient.height} onChange={(e) => set('height', e.target.value)} placeholder="170" />
          </Field>
          <Field label="Weight (kg)">
            <input className="input" type="number" value={patient.weight} onChange={(e) => set('weight', e.target.value)} placeholder="68" />
          </Field>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Pain Area(s)</p>
          <div className="flex flex-wrap gap-2">
            {PAIN_OPTIONS.map((area) => {
              const active = patient.painAreas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => togglePain(area)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <Field label="Chief Complaint / Notes">
            <textarea
              className="input min-h-[70px]"
              value={patient.complaint}
              onChange={(e) => set('complaint', e.target.value)}
              placeholder="e.g. Neck pain and stiffness for 3 weeks, worse in the morning."
            />
          </Field>
        </div>
      </GlassCard>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <span className="text-sm text-amber-700">{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.03]"
        >
          Next: Select Positions
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <style>{`
        .input { width: 100%; border: 1px solid #e2e8f0; background: #fff; color: #0f172a; border-radius: 0.6rem; padding: 0.55rem 0.75rem; font-size: 0.9rem; outline: none; transition: border-color .15s, box-shadow .15s; }
        .input::placeholder { color: #94a3b8; }
        .input:focus { border-color: #10b981; box-shadow: 0 0 0 1px #10b981; }
      `}</style>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
