import { useEffect, useRef, useState } from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import ClinicalReport from '../ClinicalReport';
import { PatientInfo, AssessmentCapture } from '../../lib/clinicalKnowledge';
import { Patient, createReport, updateReportNotes } from '../../lib/auth';
import { buildReportPayload } from '../../lib/reportBuilder';

interface Props {
  patient: Patient;
  captures: AssessmentCapture[];
  onDone: () => void;
}

// Maps a DB patient onto the PatientInfo shape ClinicalReport renders.
function toPatientInfo(p: Patient): PatientInfo {
  return {
    name: p.name,
    age: p.age != null ? String(p.age) : '',
    gender: p.gender,
    phone: p.mobile,
    email: p.email,
    height: p.height != null ? String(p.height) : '',
    weight: p.weight != null ? String(p.weight) : '',
    painAreas: p.painAreas,
    complaint: p.complaint,
  };
}

export default function DoctorReportView({ patient, captures, onDone }: Props) {
  const [reportId, setReportId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [notes, setNotes] = useState('');
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const created = useRef(false);

  // Persist the report once when the view mounts.
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    (async () => {
      try {
        const payload = buildReportPayload(patient.id, captures, patient.painAreas);
        const { report } = await createReport(payload);
        setReportId(report.id);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save report to the patient record');
      }
    })();
  }, [patient, captures]);

  const handleSaveNotes = async () => {
    if (!reportId) return;
    setNotesStatus('saving');
    try {
      await updateReportNotes(reportId, notes);
      setNotesStatus('saved');
      setTimeout(() => setNotesStatus('idle'), 2000);
    } catch {
      setNotesStatus('idle');
      setSaveError('Could not save notes');
    }
  };

  const notesSection = (
    <section className="mt-8 border-t border-gray-200 pt-5 print:hidden">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Doctor Notes</h2>
        {reportId ? (
          <span className="text-xs text-green-600 inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Report saved to {patient.patientId}
          </span>
        ) : saveError ? (
          <span className="text-xs text-red-600 inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {saveError}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Saving report…</span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add clinical notes, observations, and prescribed plan for this patient…"
        className="w-full min-h-[100px] border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSaveNotes}
          disabled={!reportId || notesStatus === 'saving'}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {notesStatus === 'saving' ? (
            'Saving…'
          ) : notesStatus === 'saved' ? (
            <>
              <Check className="w-4 h-4" /> Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save notes
            </>
          )}
        </button>
      </div>
    </section>
  );

  return (
    <ClinicalReport
      patient={toPatientInfo(patient)}
      captures={captures}
      onRestart={onDone}
      restartLabel="Done"
      notesSection={notesSection}
    />
  );
}
