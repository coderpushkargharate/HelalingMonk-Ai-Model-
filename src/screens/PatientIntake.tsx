import { useState } from 'react';
import { PatientInfo } from '../lib/clinicalKnowledge';
import { User, ClipboardList, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="bg-green-600 text-white p-3 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Assessment</h1>
            <p className="text-gray-600">Step 1 of 2 · Patient Details</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Patient Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Pain Area(s)</p>
            <div className="flex flex-wrap gap-2">
              {PAIN_OPTIONS.map((area) => {
                const active = patient.painAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => togglePain(area)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-red-300'
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <Field label="Chief Complaint / Notes">
              <textarea
                className="input min-h-[70px]"
                value={patient.complaint}
                onChange={(e) => set('complaint', e.target.value)}
                placeholder="e.g. Neck pain and stiffness for 3 weeks, worse in the morning."
              />
            </Field>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-center">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 text-sm">{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={handleNext} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors">
            Next: Select Positions →
          </button>
        </div>
      </div>

      <style>{`
        .input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.9rem; outline: none; }
        .input:focus { border-color: #16a34a; box-shadow: 0 0 0 1px #16a34a; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
