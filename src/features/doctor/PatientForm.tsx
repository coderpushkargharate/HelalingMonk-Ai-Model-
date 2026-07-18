import { useEffect, useState } from 'react';
import { ChevronLeft, UserPlus, AlertCircle } from 'lucide-react';
import { createPatient, listDoctors, AuthUser, Patient } from '@/services/api';

interface Props {
  onBack: () => void;
  onCreated: (patient: Patient) => void;
  /** Show a "Assign doctor" dropdown (reception flow). Doctors auto-assign themselves. */
  showAssignDoctor?: boolean;
}

const PAIN_OPTIONS = ['Neck', 'Shoulder', 'Upper Back', 'Lower Back', 'Hip', 'Knee', 'Ankle'];

// Reception-style intake: the data captured at the clinic entry (name, age,
// gender, mobile, pain type). Used by the doctor to register a new patient.
export default function PatientForm({ onBack, onCreated, showAssignDoctor = false }: Props) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    mobile: '',
    email: '',
    height: '',
    weight: '',
    complaint: '',
  });
  const [painAreas, setPainAreas] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<AuthUser[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load the doctor directory only when the assign dropdown is shown.
  useEffect(() => {
    if (!showAssignDoctor) return;
    listDoctors()
      .then((r) => setDoctors(r.users))
      .catch(() => setDoctors([]));
  }, [showAssignDoctor]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const togglePain = (area: string) =>
    setPainAreas((p) => (p.includes(area) ? p.filter((a) => a !== area) : [...p, area]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Patient name is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const { patient } = await createPatient({
        ...form,
        painAreas,
        ...(showAssignDoctor ? { assignedDoctor: doctorId || null } : {}),
      });
      onCreated(patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-600 text-white p-3 rounded-xl">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Register Patient</h2>
          <p className="text-gray-600 text-sm">A clinic Patient ID is generated automatically.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name *">
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age">
              <input className="input" type="number" value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="35" />
            </Field>
            <Field label="Gender">
              <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
          </div>
          <Field label="Mobile">
            <input className="input" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+91 ..." />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="patient@email.com" />
          </Field>
          <Field label="Height (cm)">
            <input className="input" type="number" value={form.height} onChange={(e) => set('height', e.target.value)} placeholder="170" />
          </Field>
          <Field label="Weight (kg)">
            <input className="input" type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="68" />
          </Field>
        </div>

        {showAssignDoctor && (
          <div className="mt-4">
            <Field label="Assign Doctor">
              <select className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">Unassigned</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Problem / Pain Area(s)</p>
          <div className="flex flex-wrap gap-2">
            {PAIN_OPTIONS.map((area) => {
              const active = painAreas.includes(area);
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
              value={form.complaint}
              onChange={(e) => set('complaint', e.target.value)}
              placeholder="e.g. Knee pain for 3 weeks, worse climbing stairs."
            />
          </Field>
        </div>

        {error && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-center">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 text-sm">{error}</span>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Register Patient'}
          </button>
        </div>
      </form>

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
