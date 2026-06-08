import { useState } from 'react';
import { CLINICAL_ASSESSMENTS } from '../lib/clinicalKnowledge';
import PoseIllustration from '../components/PoseIllustration';
import { CheckCircle2, ChevronLeft, AlertCircle, Activity } from 'lucide-react';

interface Props {
  initial?: string[];
  onBack: () => void;
  onStart: (assessmentIds: string[]) => void;
}

export default function PositionSelect({ initial, onBack, onStart }: Props) {
  const defaults = CLINICAL_ASSESSMENTS.filter((a) => a.defaultSelected).map((a) => a.id);
  const [selected, setSelected] = useState<string[]>(initial?.length ? initial : defaults);
  const [error, setError] = useState('');

  const toggle = (id: string) => {
    setError('');
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const selectAll = () => setSelected(CLINICAL_ASSESSMENTS.map((a) => a.id));
  const clearAll = () => setSelected(defaults);

  const handleStart = () => {
    if (selected.length === 0) {
      setError('Please select at least one position to capture.');
      return;
    }
    // Keep the knowledge-base order so the full-body shot is captured first.
    const ordered = CLINICAL_ASSESSMENTS.filter((a) => selected.includes(a.id)).map((a) => a.id);
    onStart(ordered);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to patient details
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="bg-green-600 text-white p-3 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Select Positions (MediaPipe Pose)</h1>
            <p className="text-gray-600">Step 2 of 2 · Tap the poses you want to capture</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-800">
          MediaPipe Pose detects and tracks 33 body landmarks in real time. Pick the poses below — the doctor will
          manually capture each one, and live points will show whether the position is correct or incorrect.
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-600">{selected.length} selected</p>
          <div className="flex gap-2 text-sm">
            <button onClick={selectAll} className="text-green-600 hover:underline">Select all</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-gray-500 hover:underline">Reset</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-24">
          {CLINICAL_ASSESSMENTS.map((a) => {
            const active = selected.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className={`relative text-left rounded-xl border-2 overflow-hidden transition-all bg-white ${
                  active ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                {a.defaultSelected && (
                  <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold bg-green-600 text-white px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
                {active && (
                  <span className="absolute top-2 right-2 z-10 bg-green-600 text-white rounded-full p-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
                <PoseIllustration pose={a.id} className="w-full h-36 bg-slate-50" />
                <div className="p-3 border-t border-gray-100">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{a.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{a.nameHi}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{a.bodyRegion}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{a.view} view</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sticky action bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            {error ? (
              <span className="text-amber-700 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </span>
            ) : (
              <span className="text-sm text-gray-600">
                {selected.length} position{selected.length === 1 ? '' : 's'} · full-body captured first
              </span>
            )}
            <button onClick={handleStart} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow transition-colors">
              Start Assessment →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
