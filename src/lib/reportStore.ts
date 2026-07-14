// Client-side persistence for generated assessment reports.
//
// The public (guest) assessment flow has no login and no server record, so a
// generated report would normally vanish on refresh. To let a report live at
// its own URL and be reopened later, we persist the whole report — patient,
// captures (with baked-in pose images), extra shots and the doctor's edits —
// into localStorage keyed by a unique id. Same-device only, by design.

import type { PatientInfo, AssessmentCapture, ExtraShot } from './clinicalKnowledge';

/** A doctor's per-posture clinical input, persisted with the report. */
export interface DoctorFindingData {
  score: number | null;
  remarks: string;
  exercises: string;
}

export interface StoredReport {
  id: string;
  patient: PatientInfo;
  captures: AssessmentCapture[];
  extraShots: ExtraShot[];
  createdAt: string;
  /** Overall doctor notes shown at the end of the report. */
  doctorNotes: string;
  /** Overall doctor key points (bulleted). */
  doctorPoints: string[];
  /** Per-assessment doctor score / remarks / exercises, keyed by assessmentId. */
  findingData: Record<string, DoctorFindingData>;
}

const PREFIX = 'hm_report_';

/** Short, URL-safe id — enough entropy for a single browser's history. */
function genId(): string {
  return 'rep_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

/**
 * Persist a report, returning its id. Falls back to dropping the heavier raw
 * (non-overlay) frames if localStorage runs out of quota, so the visible report
 * (which uses the overlay images) still survives.
 */
export function createStoredReport(input: {
  patient: PatientInfo;
  captures: AssessmentCapture[];
  extraShots: ExtraShot[];
}): string {
  const id = genId();
  persist({
    id,
    patient: input.patient,
    captures: input.captures,
    extraShots: input.extraShots,
    createdAt: new Date().toISOString(),
    doctorNotes: '',
    doctorPoints: [],
    findingData: {},
  });
  return id;
}

function persist(report: StoredReport): void {
  const key = PREFIX + report.id;
  try {
    localStorage.setItem(key, JSON.stringify(report));
    return;
  } catch {
    // Quota exceeded — drop the original (no-overlay) frames and retry once.
    // The report renders from the overlay `imageData`, so it stays intact.
    const slim: StoredReport = {
      ...report,
      captures: report.captures.map((c) => ({ ...c, rawImageData: undefined })),
      extraShots: report.extraShots.map((s) => ({ ...s, rawImageData: undefined })),
    };
    try {
      localStorage.setItem(key, JSON.stringify(slim));
    } catch {
      console.warn('Could not persist report — browser storage is full.');
    }
  }
}

export function getStoredReport(id: string): StoredReport | null {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as StoredReport) : null;
  } catch {
    return null;
  }
}

/** Merge a partial update into an existing report (e.g. doctor edits). */
export function updateStoredReport(id: string, patch: Partial<StoredReport>): void {
  const existing = getStoredReport(id);
  if (!existing) return;
  persist({ ...existing, ...patch });
}
