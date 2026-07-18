import { useState } from 'react';
import { CheckCircle2, CalendarCheck, AlertCircle } from 'lucide-react';
import { bookPublic } from '@/services/api';

const PAIN_OPTIONS = ['Neck', 'Shoulder', 'Upper Back', 'Lower Back', 'Hip', 'Knee', 'Ankle'];

// Public booking form for the home page. A visitor submits their details and a
// preferred time; the backend creates a patient + pending appointment that
// reception confirms. No login required.
export default function BookingForm() {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    complaint: '',
    date: '',
    time: '10:00',
  });
  const [painAreas, setPainAreas] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const togglePain = (a: string) =>
    setPainAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!form.mobile.trim() && !form.email.trim())
      return setError('Please enter a mobile number or email so we can reach you.');

    let preferredAt: string | undefined;
    if (form.date) {
      const d = new Date(`${form.date}T${form.time || '10:00'}:00`);
      if (!Number.isNaN(d.getTime())) preferredAt = d.toISOString();
    }

    setStatus('saving');
    try {
      await bookPublic({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        complaint: form.complaint.trim(),
        painAreas,
        preferredAt,
      });
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
    }
  };

  if (status === 'done') {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Booking received!</h3>
        <p className="mt-2 text-gray-600">
          Thanks {form.name.split(' ')[0]} — our reception team will call you shortly to confirm
          your appointment.
        </p>
        <button
          onClick={() => {
            setForm({ name: '', mobile: '', email: '', complaint: '', date: '', time: '10:00' });
            setPainAreas([]);
            setStatus('idle');
          }}
          className="mt-6 text-green-600 hover:text-green-700 font-medium text-sm"
        >
          Book another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-green-600" /> Book your appointment
      </h3>
      <p className="text-sm text-gray-500 mt-1 mb-5">
        Fill this in and our reception team confirms your slot.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Full name *" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <input className={input} placeholder="Mobile number" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <input className={input} placeholder="What's troubling you?" value={form.complaint} onChange={(e) => set('complaint', e.target.value)} />
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Pain area(s)</p>
        <div className="flex flex-wrap gap-2">
          {PAIN_OPTIONS.map((a) => {
            const active = painAreas.includes(a);
            return (
              <button
                type="button"
                key={a}
                onClick={() => togglePain(a)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  active
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                }`}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred date</label>
          <input className={input} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred time</label>
          <input className={input} type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-center">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800 text-sm">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'saving'}
        className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
      >
        {status === 'saving' ? 'Submitting…' : 'Request appointment'}
      </button>
    </form>
  );
}

const input =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none';
