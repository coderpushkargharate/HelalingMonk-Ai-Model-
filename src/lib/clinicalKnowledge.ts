import { Landmark, calculateAngle2D } from './poseDetection';

/**
 * HealingMonk AI Clinical Knowledge Base.
 *
 * Each entry follows the "One Form = One Posture / Dysfunction / Movement"
 * template: basic info, setup, landmarks, a clinical measurement with
 * normal / mild / moderate / severe ranges, pain association and exercises.
 *
 * The `measure()` function turns live MediaPipe landmarks into a numeric
 * value + severity so the doctor sees the result update as the body moves,
 * and so the report can be generated automatically.
 */

export type Severity = 'normal' | 'mild' | 'moderate' | 'severe';
export type View = 'front' | 'side' | 'back';

export interface MeasureResult {
  /** Numeric measurement, or null when the required landmarks aren't visible. */
  value: number | null;
  severity: Severity | null;
  /** Landmark indices this assessment highlights on the skeleton. */
  points: number[];
  /** Human readable value, e.g. "47°". */
  detail: string;
}

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  frequency: string;
}

export interface ClinicalAssessment {
  id: string;
  name: string;
  nameHi: string;
  bodyRegion: string;
  category: string;
  view: View;
  patientPosition: string;
  /** What the therapist asks the patient to do. */
  instruction: string;
  instructionHi: string;
  complaints: string[];
  landmarkNames: string[];
  measurementName: string;
  unit: string;
  /** Display strings for the report's range table. */
  ranges: { normal: string; mild: string; moderate: string; severe: string };
  painArea: string;
  painCorrelation: 'Strong' | 'Moderate' | 'Weak' | 'Observation Only';
  exercises: Exercise[];
  aiFeasibility: 'High' | 'Medium' | 'Low' | 'Partial';
  source: string;
  /** Pre-selected on the position-select page (e.g. the default full-body shot). */
  defaultSelected?: boolean;
  measure: (lm: Landmark[]) => MeasureResult;
}

export interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  height: string; // cm
  weight: string; // kg
  painAreas: string[];
  complaint: string;
}

/** Aggregate deviation of the ear→shoulder→hip→knee chain from the ideal plumb line. */
export interface CapturedPostureDeviation {
  /** Mean absolute angle off the ideal vertical line, degrees. */
  score: number;
  rating: Severity;
  joints: { name: string; angle: number; aligned: boolean }[];
}

export interface AssessmentCapture {
  assessmentId: string;
  value: number | null;
  severity: Severity | null;
  imageData: string; // base64 snapshot WITH the pose-points overlay
  rawImageData?: string; // base64 snapshot of the original frame (no overlay)
  /** Posture-chain deviation from ideal at capture time (side/full-body views). */
  postureDeviation?: CapturedPostureDeviation;
  timestamp: number;
}

// ---------- geometry helpers ----------

const vis = (lm: Landmark[], i: number): boolean => (lm[i]?.visibility ?? 0) > 0.4;

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Angle (0..90°) of the line a→b measured from the horizontal. */
function tiltFromHorizontal(lm: Landmark[], a: number, b: number): number {
  const dy = Math.abs(lm[b].y - lm[a].y);
  const dx = Math.abs(lm[b].x - lm[a].x) || 1e-6;
  return Math.abs(deg(Math.atan2(dy, dx)));
}

/** Angle (0..90°) of the line a→b measured from the vertical. */
function tiltFromVertical(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay) || 1e-6;
  return Math.abs(deg(Math.atan2(dx, dy)));
}

const notVisible = (points: number[]): MeasureResult => ({
  value: null,
  severity: null,
  points,
  detail: 'Not visible',
});

/** Pick the more confidently detected of two symmetric landmark indices. */
function betterSide(lm: Landmark[], left: number, right: number): 'left' | 'right' {
  return (lm[right]?.visibility ?? 0) >= (lm[left]?.visibility ?? 0) ? 'right' : 'left';
}

// MediaPipe Pose landmark indices used below.
const L_EAR = 7;
const R_EAR = 8;
const L_SHO = 11;
const R_SHO = 12;
const L_ELB = 13;
const R_ELB = 14;
const L_WRI = 15;
const R_WRI = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANK = 27;
const R_ANK = 28;

/** Front/back full-body alignment: worst of shoulder & hip horizontal tilt. */
function fullBodyFrontMeasure(lm: Landmark[]): MeasureResult {
  const haveSh = vis(lm, L_SHO) && vis(lm, R_SHO);
  const haveHip = vis(lm, L_HIP) && vis(lm, R_HIP);
  if (!haveSh && !haveHip) return notVisible([L_SHO, R_SHO, L_HIP, R_HIP]);
  const sh = haveSh ? tiltFromHorizontal(lm, L_SHO, R_SHO) : 0;
  const hip = haveHip ? tiltFromHorizontal(lm, L_HIP, R_HIP) : 0;
  const dev = Math.round(Math.max(sh, hip));
  const severity: Severity = dev <= 3 ? 'normal' : dev <= 6 ? 'mild' : dev <= 10 ? 'moderate' : 'severe';
  return { value: dev, severity, points: [L_SHO, R_SHO, L_HIP, R_HIP], detail: `${dev}°` };
}

/** Side full-body alignment: how far the trunk (shoulder→hip) leans from vertical. */
function fullBodySideMeasure(lm: Landmark[]): MeasureResult {
  const haveSh = vis(lm, L_SHO) || vis(lm, R_SHO);
  const haveHip = vis(lm, L_HIP) || vis(lm, R_HIP);
  if (!haveSh || !haveHip) return notVisible([L_SHO, R_SHO, L_HIP, R_HIP]);
  const side = betterSide(lm, L_SHO, R_SHO);
  const sho = side === 'right' ? R_SHO : L_SHO;
  const hip = side === 'right' ? R_HIP : L_HIP;
  const dev = Math.round(tiltFromVertical(lm[sho].x, lm[sho].y, lm[hip].x, lm[hip].y));
  const severity: Severity = dev <= 3 ? 'normal' : dev <= 6 ? 'mild' : dev <= 10 ? 'moderate' : 'severe';
  return { value: dev, severity, points: [sho, hip], detail: `${dev}°` };
}

export const CLINICAL_ASSESSMENTS: ClinicalAssessment[] = [
  {
    id: 'full_body',
    name: 'Full Body — Center (Front)',
    nameHi: 'पूर्ण शरीर — सामने',
    bodyRegion: 'Full Body',
    category: 'Posture Assessment',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Stand facing the camera, full body in frame, arms relaxed. Stand naturally.',
    instructionHi: 'कैमरे की ओर मुंह करके पूरे शरीर के साथ खड़े हों, हाथ ढीले रखें। स्वाभाविक रूप से खड़े रहें।',
    complaints: ['General posture concern', 'Body imbalance', 'Poor posture'],
    landmarkNames: ['Shoulders', 'Hips', 'Knees', 'Full skeleton'],
    measurementName: 'Overall Alignment',
    unit: '°',
    ranges: { normal: '0–3°', mild: '3–6°', moderate: '6–10°', severe: '> 10°' },
    painArea: 'Full Body',
    painCorrelation: 'Observation Only',
    exercises: [
      { name: 'Postural Awareness Drill', sets: '2', reps: '10', frequency: 'Daily' },
      { name: 'Wall Posture Hold', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Core Activation', sets: '3', reps: '12', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    defaultSelected: true,
    measure: fullBodyFrontMeasure,
  },
  {
    id: 'full_body_back',
    name: 'Full Body — Back',
    nameHi: 'पूर्ण शरीर — पीछे',
    bodyRegion: 'Full Body',
    category: 'Posture Assessment',
    view: 'back',
    patientPosition: 'Standing',
    instruction: 'Stand with your back to the camera, full body in frame, arms relaxed.',
    instructionHi: 'कैमरे की ओर पीठ करके पूरे शरीर के साथ खड़े हों, हाथ ढीले रखें।',
    complaints: ['General posture concern', 'Body imbalance', 'Spinal asymmetry'],
    landmarkNames: ['Shoulders', 'Hips', 'Knees', 'Full skeleton'],
    measurementName: 'Overall Alignment',
    unit: '°',
    ranges: { normal: '0–3°', mild: '3–6°', moderate: '6–10°', severe: '> 10°' },
    painArea: 'Full Body',
    painCorrelation: 'Observation Only',
    exercises: [
      { name: 'Postural Awareness Drill', sets: '2', reps: '10', frequency: 'Daily' },
      { name: 'Wall Posture Hold', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Core Activation', sets: '3', reps: '12', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    defaultSelected: true,
    measure: fullBodyFrontMeasure,
  },
  {
    id: 'full_body_left',
    name: 'Full Body — Left Side',
    nameHi: 'पूर्ण शरीर — बाईं ओर',
    bodyRegion: 'Full Body',
    category: 'Posture Assessment',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand with your LEFT side to the camera, full body in frame, look straight ahead.',
    instructionHi: 'कैमरे की ओर अपनी बाईं ओर करके खड़े हों, पूरा शरीर फ्रेम में रखें, सीधे आगे देखें।',
    complaints: ['General posture concern', 'Forward lean', 'Slouching'],
    landmarkNames: ['Shoulder', 'Hip', 'Vertical reference'],
    measurementName: 'Trunk Vertical Lean',
    unit: '°',
    ranges: { normal: '0–3°', mild: '3–6°', moderate: '6–10°', severe: '> 10°' },
    painArea: 'Full Body',
    painCorrelation: 'Observation Only',
    exercises: [
      { name: 'Postural Awareness Drill', sets: '2', reps: '10', frequency: 'Daily' },
      { name: 'Wall Posture Hold', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Core Activation', sets: '3', reps: '12', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    defaultSelected: true,
    measure: fullBodySideMeasure,
  },
  {
    id: 'full_body_right',
    name: 'Full Body — Right Side',
    nameHi: 'पूर्ण शरीर — दाईं ओर',
    bodyRegion: 'Full Body',
    category: 'Posture Assessment',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand with your RIGHT side to the camera, full body in frame, look straight ahead.',
    instructionHi: 'कैमरे की ओर अपनी दाईं ओर करके खड़े हों, पूरा शरीर फ्रेम में रखें, सीधे आगे देखें।',
    complaints: ['General posture concern', 'Forward lean', 'Slouching'],
    landmarkNames: ['Shoulder', 'Hip', 'Vertical reference'],
    measurementName: 'Trunk Vertical Lean',
    unit: '°',
    ranges: { normal: '0–3°', mild: '3–6°', moderate: '6–10°', severe: '> 10°' },
    painArea: 'Full Body',
    painCorrelation: 'Observation Only',
    exercises: [
      { name: 'Postural Awareness Drill', sets: '2', reps: '10', frequency: 'Daily' },
      { name: 'Wall Posture Hold', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Core Activation', sets: '3', reps: '12', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    defaultSelected: true,
    measure: fullBodySideMeasure,
  },
  {
    id: 'forward_head',
    name: 'Forward Head Posture',
    nameHi: 'आगे की ओर झुका सिर',
    bodyRegion: 'Cervical',
    category: 'Posture Assessment',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand sideways to the camera and look straight ahead naturally. Do not correct your posture.',
    instructionHi: 'कैमरे की ओर बगल से खड़े हों और स्वाभाविक रूप से सीधे आगे देखें। मुद्रा को ठीक न करें।',
    complaints: ['Neck pain', 'Stiffness', 'Headache', 'Poor posture'],
    landmarkNames: ['Ear (Tragus)', 'Shoulder (Acromion)', 'Horizontal Reference'],
    measurementName: 'Craniovertebral Angle',
    unit: '°',
    ranges: { normal: '≥ 50°', mild: '45–50°', moderate: '40–45°', severe: '< 40°' },
    painArea: 'Neck',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Chin Tucks', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Pec Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Scapular Retractions', sets: '3', reps: '12', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Physiopedia',
    measure: (lm) => {
      const side = betterSide(lm, L_EAR, R_EAR);
      const ear = side === 'right' ? R_EAR : L_EAR;
      const sho = side === 'right' ? R_SHO : L_SHO;
      if (!vis(lm, ear) || !vis(lm, sho)) return notVisible([ear, sho]);
      // CVA: angle of the shoulder→ear line above the horizontal.
      const dx = Math.abs(lm[ear].x - lm[sho].x) || 1e-6;
      const dy = Math.abs(lm[sho].y - lm[ear].y);
      const cva = Math.round(deg(Math.atan2(dy, dx)));
      const severity: Severity = cva >= 50 ? 'normal' : cva >= 45 ? 'mild' : cva >= 40 ? 'moderate' : 'severe';
      return { value: cva, severity, points: [ear, sho], detail: `${cva}°` };
    },
  },
  {
    id: 'shoulder_level',
    name: 'Shoulder Level Symmetry',
    nameHi: 'कंधे की समतलता',
    bodyRegion: 'Shoulder',
    category: 'Posture Assessment',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Face the camera with arms relaxed at your sides. Stand naturally.',
    instructionHi: 'कैमरे की ओर मुंह करके खड़े हों, हाथ बगल में ढीले रखें। स्वाभाविक रूप से खड़े रहें।',
    complaints: ['Shoulder pain', 'Uneven shoulders', 'Upper back tension'],
    landmarkNames: ['Left Shoulder', 'Right Shoulder', 'Horizontal Reference'],
    measurementName: 'Shoulder Tilt Angle',
    unit: '°',
    ranges: { normal: '0–2°', mild: '2–4°', moderate: '4–7°', severe: '> 7°' },
    painArea: 'Shoulder',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Scapular Retractions', sets: '3', reps: '12', frequency: 'Daily' },
      { name: 'Upper Trap Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Wall Angels', sets: '3', reps: '10', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    measure: (lm) => {
      if (!vis(lm, L_SHO) || !vis(lm, R_SHO)) return notVisible([L_SHO, R_SHO]);
      const tilt = Math.round(tiltFromHorizontal(lm, L_SHO, R_SHO));
      const severity: Severity = tilt <= 2 ? 'normal' : tilt <= 4 ? 'mild' : tilt <= 7 ? 'moderate' : 'severe';
      return { value: tilt, severity, points: [L_SHO, R_SHO], detail: `${tilt}°` };
    },
  },
  {
    id: 'pelvic_level',
    name: 'Pelvic Level Symmetry',
    nameHi: 'श्रोणि की समतलता',
    bodyRegion: 'Hip',
    category: 'Posture Assessment',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Face the camera, feet shoulder-width apart, weight evenly distributed.',
    instructionHi: 'कैमरे की ओर मुंह करें, पैर कंधे जितने चौड़े, वजन दोनों पैरों पर समान रखें।',
    complaints: ['Lower back pain', 'Hip pain', 'Leg length difference'],
    landmarkNames: ['Left Hip', 'Right Hip', 'Horizontal Reference'],
    measurementName: 'Pelvic Tilt Angle',
    unit: '°',
    ranges: { normal: '0–2°', mild: '2–4°', moderate: '4–7°', severe: '> 7°' },
    painArea: 'Lower Back',
    painCorrelation: 'Strong',
    exercises: [
      { name: 'Glute Bridges', sets: '3', reps: '12', frequency: 'Daily' },
      { name: 'Hip Flexor Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Side Plank', sets: '3', reps: '20 sec hold', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Physiopedia',
    measure: (lm) => {
      if (!vis(lm, L_HIP) || !vis(lm, R_HIP)) return notVisible([L_HIP, R_HIP]);
      const tilt = Math.round(tiltFromHorizontal(lm, L_HIP, R_HIP));
      const severity: Severity = tilt <= 2 ? 'normal' : tilt <= 4 ? 'mild' : tilt <= 7 ? 'moderate' : 'severe';
      return { value: tilt, severity, points: [L_HIP, R_HIP], detail: `${tilt}°` };
    },
  },
  {
    id: 'lateral_spine',
    name: 'Lateral Spinal Alignment',
    nameHi: 'रीढ़ की पार्श्व संरेखण',
    bodyRegion: 'Thoracic',
    category: 'Posture Assessment',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Stand straight facing the camera. Full spine and hips must be visible.',
    instructionHi: 'कैमरे की ओर सीधे खड़े हों। पूरी रीढ़ और कूल्हे दिखने चाहिए।',
    complaints: ['Back pain', 'Postural asymmetry', 'Scoliosis screening'],
    landmarkNames: ['Shoulder Midpoint', 'Hip Midpoint', 'Vertical Reference'],
    measurementName: 'Trunk Lateral Deviation',
    unit: '°',
    ranges: { normal: '0–2°', mild: '2–5°', moderate: '5–8°', severe: '> 8°' },
    painArea: 'Upper Back',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Cat-Cow Stretch', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Side Bending Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Bird Dog', sets: '3', reps: '10 each side', frequency: 'Daily' },
    ],
    aiFeasibility: 'Partial',
    source: 'Clinical Experience',
    measure: (lm) => {
      if (!vis(lm, L_SHO) || !vis(lm, R_SHO) || !vis(lm, L_HIP) || !vis(lm, R_HIP)) {
        return notVisible([L_SHO, R_SHO, L_HIP, R_HIP]);
      }
      const shX = (lm[L_SHO].x + lm[R_SHO].x) / 2;
      const shY = (lm[L_SHO].y + lm[R_SHO].y) / 2;
      const hipX = (lm[L_HIP].x + lm[R_HIP].x) / 2;
      const hipY = (lm[L_HIP].y + lm[R_HIP].y) / 2;
      const dev = Math.round(tiltFromVertical(shX, shY, hipX, hipY));
      const severity: Severity = dev <= 2 ? 'normal' : dev <= 5 ? 'mild' : dev <= 8 ? 'moderate' : 'severe';
      return { value: dev, severity, points: [L_SHO, R_SHO, L_HIP, R_HIP], detail: `${dev}°` };
    },
  },
  {
    id: 'head_tilt',
    name: 'Lateral Head Tilt',
    nameHi: 'सिर का पार्श्व झुकाव',
    bodyRegion: 'Cervical',
    category: 'Posture Assessment',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Face the camera and look straight ahead. Keep your head in a natural position.',
    instructionHi: 'कैमरे की ओर मुंह करें और सीधे देखें। सिर को स्वाभाविक स्थिति में रखें।',
    complaints: ['Neck pain', 'Torticollis', 'One-sided stiffness'],
    landmarkNames: ['Left Ear', 'Right Ear', 'Horizontal Reference'],
    measurementName: 'Head Tilt Angle',
    unit: '°',
    ranges: { normal: '0–2°', mild: '2–4°', moderate: '4–7°', severe: '> 7°' },
    painArea: 'Neck',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Lateral Neck Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Chin Tucks', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Neck Isometrics', sets: '3', reps: '10', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    measure: (lm) => {
      if (!vis(lm, L_EAR) || !vis(lm, R_EAR)) return notVisible([L_EAR, R_EAR]);
      const tilt = Math.round(tiltFromHorizontal(lm, L_EAR, R_EAR));
      const severity: Severity = tilt <= 2 ? 'normal' : tilt <= 4 ? 'mild' : tilt <= 7 ? 'moderate' : 'severe';
      return { value: tilt, severity, points: [L_EAR, R_EAR], detail: `${tilt}°` };
    },
  },
  {
    id: 'knee_alignment',
    name: 'Knee Alignment (Valgus/Varus)',
    nameHi: 'घुटने का संरेखण',
    bodyRegion: 'Knee',
    category: 'Functional Movement',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Face the camera, feet hip-width apart. Stand tall with knees relaxed.',
    instructionHi: 'कैमरे की ओर मुंह करें, पैर कूल्हे जितने चौड़े। घुटनों को ढीला रखकर सीधे खड़े हों।',
    complaints: ['Knee pain', 'Knock knees', 'Bow legs', 'Difficulty squatting'],
    landmarkNames: ['Hip', 'Knee', 'Ankle'],
    measurementName: 'Knee Deviation Angle',
    unit: '°',
    ranges: { normal: '0–5°', mild: '5–10°', moderate: '10–20°', severe: '> 20°' },
    painArea: 'Knee',
    painCorrelation: 'Strong',
    exercises: [
      { name: 'Clamshells', sets: '3', reps: '15', frequency: 'Daily' },
      { name: 'Wall Squats', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Glute Bridges', sets: '3', reps: '12', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Physiopedia',
    measure: (lm) => {
      const evalLeg = (hip: number, knee: number, ankle: number): number | null => {
        if (!vis(lm, hip) || !vis(lm, knee) || !vis(lm, ankle)) return null;
        // 180° = perfectly straight leg; deviation is how far from straight.
        return Math.abs(180 - calculateAngle2D(lm[hip], lm[knee], lm[ankle]));
      };
      const left = evalLeg(L_HIP, L_KNEE, L_ANK);
      const right = evalLeg(R_HIP, R_KNEE, R_ANK);
      if (left === null && right === null) return notVisible([L_KNEE, R_KNEE]);
      const dev = Math.round(Math.max(left ?? 0, right ?? 0));
      const severity: Severity = dev <= 5 ? 'normal' : dev <= 10 ? 'mild' : dev <= 20 ? 'moderate' : 'severe';
      return { value: dev, severity, points: [L_KNEE, R_KNEE], detail: `${dev}°` };
    },
  },
  {
    id: 'shoulder_flexion_rom',
    name: 'Shoulder Flexion ROM (Overhead Reach)',
    nameHi: 'कंधे की गति सीमा',
    bodyRegion: 'Shoulder',
    category: 'Range of Motion',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand sideways and slowly raise your arm overhead as far as comfortable. Hold at the top.',
    instructionHi: 'बगल से खड़े हों और अपनी बांह को आराम से जितना ऊपर उठा सकें उठाएं। ऊपर रुकें।',
    complaints: ['Shoulder stiffness', 'Difficulty reaching overhead', 'Frozen shoulder'],
    landmarkNames: ['Hip', 'Shoulder', 'Wrist'],
    measurementName: 'Shoulder Flexion Angle',
    unit: '°',
    ranges: { normal: '≥ 160°', mild: '140–160°', moderate: '90–140°', severe: '< 90°' },
    painArea: 'Shoulder',
    painCorrelation: 'Strong',
    exercises: [
      { name: 'Pendulum Swings', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Wall Walks', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Shoulder Flexion Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'APTA Guideline',
    measure: (lm) => {
      const side = betterSide(lm, L_WRI, R_WRI);
      const hip = side === 'right' ? R_HIP : L_HIP;
      const sho = side === 'right' ? R_SHO : L_SHO;
      const wri = side === 'right' ? R_WRI : L_WRI;
      if (!vis(lm, hip) || !vis(lm, sho) || !vis(lm, wri)) return notVisible([sho, wri]);
      const angle = Math.round(calculateAngle2D(lm[hip], lm[sho], lm[wri]));
      const severity: Severity = angle >= 160 ? 'normal' : angle >= 140 ? 'mild' : angle >= 90 ? 'moderate' : 'severe';
      return { value: angle, severity, points: [sho, wri], detail: `${angle}°` };
    },
  },

  // ---------------- Spine & posture ----------------
  {
    id: 'thoracic_kyphosis',
    name: 'Thoracic Kyphosis (Upper-Back Rounding)',
    nameHi: 'वक्षीय कुब्जता (ऊपरी पीठ का झुकाव)',
    bodyRegion: 'Thoracic',
    category: 'Posture Assessment',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand sideways to the camera and relax. Do not straighten up — stand as you normally do.',
    instructionHi: 'कैमरे की ओर बगल से खड़े हों और आराम करें। सीधे होने की कोशिश न करें — जैसे आप सामान्यतः खड़े होते हैं वैसे रहें।',
    complaints: ['Rounded upper back', 'Hunchback', 'Upper back pain', 'Poor posture'],
    landmarkNames: ['Ear', 'Shoulder', 'Hip'],
    measurementName: 'Upper-Trunk Rounding',
    unit: '°',
    ranges: { normal: '0–8°', mild: '8–15°', moderate: '15–25°', severe: '> 25°' },
    painArea: 'Upper Back',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Thoracic Extension over Foam Roller', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Wall Angels', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Prone Cobra', sets: '3', reps: '10', frequency: 'Daily' },
    ],
    aiFeasibility: 'Partial',
    source: 'Physiopedia',
    measure: (lm) => {
      const side = betterSide(lm, L_EAR, R_EAR);
      const ear = side === 'right' ? R_EAR : L_EAR;
      const sho = side === 'right' ? R_SHO : L_SHO;
      const hip = side === 'right' ? R_HIP : L_HIP;
      if (!vis(lm, ear) || !vis(lm, sho) || !vis(lm, hip)) return notVisible([ear, sho, hip]);
      // Straight ear→shoulder→hip ≈ 180°; rounding bends the line forward.
      const dev = Math.round(Math.abs(180 - calculateAngle2D(lm[ear], lm[sho], lm[hip])));
      const severity: Severity = dev <= 8 ? 'normal' : dev <= 15 ? 'mild' : dev <= 25 ? 'moderate' : 'severe';
      return { value: dev, severity, points: [ear, sho, hip], detail: `${dev}°` };
    },
  },
  {
    id: 'anterior_pelvic_tilt',
    name: 'Anterior Pelvic Tilt',
    nameHi: 'श्रोणि का आगे झुकाव',
    bodyRegion: 'Pelvis',
    category: 'Posture Assessment',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand sideways to the camera, full body in frame, relaxed and natural.',
    instructionHi: 'कैमरे की ओर बगल से खड़े हों, पूरा शरीर फ्रेम में रखें, आराम से और स्वाभाविक रहें।',
    complaints: ['Lower back arch', 'Tight hip flexors', 'Lower back pain', 'Protruding belly'],
    landmarkNames: ['Shoulder', 'Hip', 'Knee'],
    measurementName: 'Trunk–Thigh Tilt',
    unit: '°',
    ranges: { normal: '0–5°', mild: '5–10°', moderate: '10–18°', severe: '> 18°' },
    painArea: 'Lower Back',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Hip Flexor Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Posterior Pelvic Tilts', sets: '3', reps: '12', frequency: 'Daily' },
      { name: 'Dead Bug', sets: '3', reps: '10 each side', frequency: 'Daily' },
    ],
    aiFeasibility: 'Partial',
    source: 'Clinical Experience',
    measure: (lm) => {
      const side = betterSide(lm, L_HIP, R_HIP);
      const sho = side === 'right' ? R_SHO : L_SHO;
      const hip = side === 'right' ? R_HIP : L_HIP;
      const knee = side === 'right' ? R_KNEE : L_KNEE;
      if (!vis(lm, sho) || !vis(lm, hip) || !vis(lm, knee)) return notVisible([sho, hip, knee]);
      // Neutral standing trunk and thigh are near-collinear (~180°); an
      // anterior tilt breaks that line at the hip.
      const dev = Math.round(Math.abs(180 - calculateAngle2D(lm[sho], lm[hip], lm[knee])));
      const severity: Severity = dev <= 5 ? 'normal' : dev <= 10 ? 'mild' : dev <= 18 ? 'moderate' : 'severe';
      return { value: dev, severity, points: [sho, hip, knee], detail: `${dev}°` };
    },
  },
  {
    id: 'scoliosis_adams',
    name: "Scoliosis Screen (Adam's Forward Bend)",
    nameHi: 'स्कोलियोसिस जांच (आगे झुकाव)',
    bodyRegion: 'Spine',
    category: 'Posture Assessment',
    view: 'back',
    patientPosition: 'Standing',
    instruction: 'Stand with your back to the camera and slowly bend forward, arms hanging down, until the back is horizontal.',
    instructionHi: 'कैमरे की ओर पीठ करके खड़े हों और धीरे-धीरे आगे झुकें, हाथ नीचे लटकाएं, जब तक पीठ क्षैतिज न हो जाए।',
    complaints: ['Curved spine', 'Uneven shoulders', 'Rib hump', 'Back asymmetry'],
    landmarkNames: ['Left Shoulder', 'Right Shoulder', 'Left Hip', 'Right Hip'],
    measurementName: 'Trunk Asymmetry',
    unit: '°',
    ranges: { normal: '0–3°', mild: '3–6°', moderate: '6–10°', severe: '> 10°' },
    painArea: 'Spine',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Side Plank (concave side)', sets: '3', reps: '20 sec hold', frequency: 'Daily' },
      { name: 'Cat-Cow Stretch', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Schroth Breathing', sets: '2', reps: '10', frequency: 'Daily' },
    ],
    aiFeasibility: 'Partial',
    source: 'Physiopedia',
    measure: (lm) => {
      if (!vis(lm, L_SHO) || !vis(lm, R_SHO) || !vis(lm, L_HIP) || !vis(lm, R_HIP)) {
        return notVisible([L_SHO, R_SHO, L_HIP, R_HIP]);
      }
      // In the forward-bend position, a curved spine shows as shoulder and hip
      // lines that are no longer level — the larger asymmetry is reported.
      const dev = Math.round(Math.max(tiltFromHorizontal(lm, L_SHO, R_SHO), tiltFromHorizontal(lm, L_HIP, R_HIP)));
      const severity: Severity = dev <= 3 ? 'normal' : dev <= 6 ? 'mild' : dev <= 10 ? 'moderate' : 'severe';
      return { value: dev, severity, points: [L_SHO, R_SHO, L_HIP, R_HIP], detail: `${dev}°` };
    },
  },

  // ---------------- Lower limb ----------------
  {
    id: 'squat_depth',
    name: 'Squat Depth (Knee Flexion)',
    nameHi: 'स्क्वाट गहराई (घुटना मोड़)',
    bodyRegion: 'Knee',
    category: 'Functional Movement',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand sideways to the camera and squat down as far as you comfortably can. Hold at the bottom.',
    instructionHi: 'कैमरे की ओर बगल से खड़े हों और जितना आराम से बैठ सकें उतना नीचे बैठें। नीचे रुकें।',
    complaints: ['Difficulty squatting', 'Knee stiffness', 'Limited knee bend'],
    landmarkNames: ['Hip', 'Knee', 'Ankle'],
    measurementName: 'Knee Flexion',
    unit: '°',
    ranges: { normal: '≥ 100°', mild: '70–100°', moderate: '40–70°', severe: '< 40°' },
    painArea: 'Knee',
    painCorrelation: 'Strong',
    exercises: [
      { name: 'Box Squats', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Heel-Elevated Squats', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Ankle Mobility Drill', sets: '3', reps: '12', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'APTA Guideline',
    measure: (lm) => {
      const side = betterSide(lm, L_KNEE, R_KNEE);
      const hip = side === 'right' ? R_HIP : L_HIP;
      const knee = side === 'right' ? R_KNEE : L_KNEE;
      const ank = side === 'right' ? R_ANK : L_ANK;
      if (!vis(lm, hip) || !vis(lm, knee) || !vis(lm, ank)) return notVisible([hip, knee, ank]);
      // Knee flexion = how far the joint is bent from a straight (180°) leg.
      const flex = Math.round(180 - calculateAngle2D(lm[hip], lm[knee], lm[ank]));
      const severity: Severity = flex >= 100 ? 'normal' : flex >= 70 ? 'mild' : flex >= 40 ? 'moderate' : 'severe';
      return { value: flex, severity, points: [hip, knee, ank], detail: `${flex}°` };
    },
  },
  {
    id: 'hip_abduction',
    name: 'Hip Abduction ROM (Side Leg Raise)',
    nameHi: 'कूल्हे का बाहरी मूवमेंट',
    bodyRegion: 'Hip',
    category: 'Range of Motion',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Face the camera and raise one leg out to the side as far as you can, keeping it straight.',
    instructionHi: 'कैमरे की ओर मुंह करें और एक पैर को सीधा रखते हुए जितना हो सके बगल की ओर उठाएं।',
    complaints: ['Hip stiffness', 'Weak hips', 'Difficulty spreading legs'],
    landmarkNames: ['Hip', 'Knee', 'Ankle'],
    measurementName: 'Hip Abduction Angle',
    unit: '°',
    ranges: { normal: '≥ 40°', mild: '25–40°', moderate: '10–25°', severe: '< 10°' },
    painArea: 'Hip',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Standing Hip Abduction', sets: '3', reps: '12 each side', frequency: 'Daily' },
      { name: 'Clamshells', sets: '3', reps: '15', frequency: 'Daily' },
      { name: 'Lateral Band Walks', sets: '3', reps: '10 steps', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'APTA Guideline',
    measure: (lm) => {
      // The raised leg deviates furthest from vertical — pick whichever is larger.
      const legTilt = (hip: number, ank: number): number | null =>
        vis(lm, hip) && vis(lm, ank) ? tiltFromVertical(lm[hip].x, lm[hip].y, lm[ank].x, lm[ank].y) : null;
      const left = legTilt(L_HIP, L_ANK);
      const right = legTilt(R_HIP, R_ANK);
      if (left === null && right === null) return notVisible([L_HIP, R_HIP]);
      const raisedRight = (right ?? 0) >= (left ?? 0);
      const angle = Math.round(Math.max(left ?? 0, right ?? 0));
      const points = raisedRight ? [R_HIP, R_KNEE, R_ANK] : [L_HIP, L_KNEE, L_ANK];
      const severity: Severity = angle >= 40 ? 'normal' : angle >= 25 ? 'mild' : angle >= 10 ? 'moderate' : 'severe';
      return { value: angle, severity, points, detail: `${angle}°` };
    },
  },

  // ---------------- Upper limb ----------------
  {
    id: 'shoulder_abduction_rom',
    name: 'Shoulder Abduction ROM (Side Arm Raise)',
    nameHi: 'कंधे का बाहरी मूवमेंट',
    bodyRegion: 'Shoulder',
    category: 'Range of Motion',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Face the camera and raise your arm out to the side, up toward overhead, as far as comfortable.',
    instructionHi: 'कैमरे की ओर मुंह करें और अपनी बांह को बगल से ऊपर सिर की ओर जितना आराम से हो सके उठाएं।',
    complaints: ['Shoulder stiffness', 'Difficulty lifting arm sideways', 'Frozen shoulder'],
    landmarkNames: ['Hip', 'Shoulder', 'Wrist'],
    measurementName: 'Shoulder Abduction Angle',
    unit: '°',
    ranges: { normal: '≥ 160°', mild: '140–160°', moderate: '90–140°', severe: '< 90°' },
    painArea: 'Shoulder',
    painCorrelation: 'Strong',
    exercises: [
      { name: 'Wall Slides', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Lateral Raises (light)', sets: '3', reps: '12', frequency: 'Daily' },
      { name: 'Abduction Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'APTA Guideline',
    measure: (lm) => {
      const side = betterSide(lm, L_WRI, R_WRI);
      const hip = side === 'right' ? R_HIP : L_HIP;
      const sho = side === 'right' ? R_SHO : L_SHO;
      const wri = side === 'right' ? R_WRI : L_WRI;
      if (!vis(lm, hip) || !vis(lm, sho) || !vis(lm, wri)) return notVisible([sho, wri]);
      const angle = Math.round(calculateAngle2D(lm[hip], lm[sho], lm[wri]));
      const severity: Severity = angle >= 160 ? 'normal' : angle >= 140 ? 'mild' : angle >= 90 ? 'moderate' : 'severe';
      return { value: angle, severity, points: [sho, wri], detail: `${angle}°` };
    },
  },
  {
    id: 'elbow_flexion_rom',
    name: 'Elbow Flexion ROM',
    nameHi: 'कोहनी मोड़ की सीमा',
    bodyRegion: 'Elbow',
    category: 'Range of Motion',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand sideways, keep your upper arm still, and bend your elbow to bring your hand to your shoulder.',
    instructionHi: 'बगल से खड़े हों, ऊपरी बांह स्थिर रखें, और कोहनी मोड़कर हाथ को कंधे तक लाएं।',
    complaints: ['Elbow stiffness', 'Difficulty bending arm', 'Post-injury limitation'],
    landmarkNames: ['Shoulder', 'Elbow', 'Wrist'],
    measurementName: 'Elbow Flexion',
    unit: '°',
    ranges: { normal: '≥ 130°', mild: '100–130°', moderate: '60–100°', severe: '< 60°' },
    painArea: 'Elbow',
    painCorrelation: 'Strong',
    exercises: [
      { name: 'Active Elbow Flexion', sets: '3', reps: '12', frequency: 'Daily' },
      { name: 'Biceps Curl (light)', sets: '3', reps: '12', frequency: 'Daily' },
      { name: 'Towel-Assisted Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'APTA Guideline',
    measure: (lm) => {
      const side = betterSide(lm, L_ELB, R_ELB);
      const sho = side === 'right' ? R_SHO : L_SHO;
      const elb = side === 'right' ? R_ELB : L_ELB;
      const wri = side === 'right' ? R_WRI : L_WRI;
      if (!vis(lm, sho) || !vis(lm, elb) || !vis(lm, wri)) return notVisible([sho, elb, wri]);
      const flex = Math.round(180 - calculateAngle2D(lm[sho], lm[elb], lm[wri]));
      const severity: Severity = flex >= 130 ? 'normal' : flex >= 100 ? 'mild' : flex >= 60 ? 'moderate' : 'severe';
      return { value: flex, severity, points: [sho, elb, wri], detail: `${flex}°` };
    },
  },

  // ---------------- Trunk mobility ----------------
  {
    id: 'trunk_forward_flexion',
    name: 'Trunk Forward Flexion (Toe Touch)',
    nameHi: 'धड़ का आगे झुकाव',
    bodyRegion: 'Spine',
    category: 'Range of Motion',
    view: 'side',
    patientPosition: 'Standing',
    instruction: 'Stand sideways to the camera, keep your knees straight, and bend forward to reach toward your toes.',
    instructionHi: 'कैमरे की ओर बगल से खड़े हों, घुटने सीधे रखें, और पैर की उंगलियों की ओर आगे झुकें।',
    complaints: ['Stiff lower back', 'Tight hamstrings', "Can't touch toes"],
    landmarkNames: ['Shoulder', 'Hip', 'Vertical Reference'],
    measurementName: 'Forward Bend Angle',
    unit: '°',
    ranges: { normal: '≥ 70°', mild: '45–70°', moderate: '20–45°', severe: '< 20°' },
    painArea: 'Lower Back',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Standing Hamstring Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
      { name: 'Cat-Cow Stretch', sets: '3', reps: '10', frequency: 'Daily' },
      { name: 'Seated Forward Fold', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    measure: (lm) => {
      const side = betterSide(lm, L_HIP, R_HIP);
      const sho = side === 'right' ? R_SHO : L_SHO;
      const hip = side === 'right' ? R_HIP : L_HIP;
      if (!vis(lm, sho) || !vis(lm, hip)) return notVisible([sho, hip]);
      // How far the trunk (shoulder→hip line) has folded away from vertical.
      const angle = Math.round(tiltFromVertical(lm[sho].x, lm[sho].y, lm[hip].x, lm[hip].y));
      const severity: Severity = angle >= 70 ? 'normal' : angle >= 45 ? 'mild' : angle >= 20 ? 'moderate' : 'severe';
      return { value: angle, severity, points: [sho, hip], detail: `${angle}°` };
    },
  },
  {
    id: 'trunk_lateral_flexion',
    name: 'Trunk Lateral Flexion (Side Bend)',
    nameHi: 'धड़ का बगल झुकाव',
    bodyRegion: 'Spine',
    category: 'Range of Motion',
    view: 'front',
    patientPosition: 'Standing',
    instruction: 'Face the camera and slide one hand down the side of your leg, bending your trunk sideways.',
    instructionHi: 'कैमरे की ओर मुंह करें और एक हाथ को पैर की बगल से नीचे सरकाएं, धड़ को बगल की ओर झुकाएं।',
    complaints: ['Stiff back', 'Reduced side bending', 'One-sided tightness'],
    landmarkNames: ['Shoulder Midpoint', 'Hip Midpoint', 'Vertical Reference'],
    measurementName: 'Side Bend Angle',
    unit: '°',
    ranges: { normal: '≥ 25°', mild: '15–25°', moderate: '5–15°', severe: '< 5°' },
    painArea: 'Lower Back',
    painCorrelation: 'Moderate',
    exercises: [
      { name: 'Standing Side Bend Stretch', sets: '3', reps: '30 sec hold each', frequency: 'Daily' },
      { name: 'Side Plank', sets: '3', reps: '20 sec hold', frequency: 'Daily' },
      { name: 'Quadratus Lumborum Stretch', sets: '3', reps: '30 sec hold', frequency: 'Daily' },
    ],
    aiFeasibility: 'High',
    source: 'Clinical Experience',
    measure: (lm) => {
      if (!vis(lm, L_SHO) || !vis(lm, R_SHO) || !vis(lm, L_HIP) || !vis(lm, R_HIP)) {
        return notVisible([L_SHO, R_SHO, L_HIP, R_HIP]);
      }
      const shX = (lm[L_SHO].x + lm[R_SHO].x) / 2;
      const shY = (lm[L_SHO].y + lm[R_SHO].y) / 2;
      const hipX = (lm[L_HIP].x + lm[R_HIP].x) / 2;
      const hipY = (lm[L_HIP].y + lm[R_HIP].y) / 2;
      const angle = Math.round(tiltFromVertical(shX, shY, hipX, hipY));
      const severity: Severity = angle >= 25 ? 'normal' : angle >= 15 ? 'mild' : angle >= 5 ? 'moderate' : 'severe';
      return { value: angle, severity, points: [L_SHO, R_SHO, L_HIP, R_HIP], detail: `${angle}°` };
    },
  },
];

export function getAssessment(id: string): ClinicalAssessment | undefined {
  return CLINICAL_ASSESSMENTS.find((a) => a.id === id);
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  normal: '#22c55e',
  mild: '#eab308',
  moderate: '#f97316',
  severe: '#ef4444',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  normal: 'Normal',
  mild: 'Mild Deviation',
  moderate: 'Moderate Deviation',
  severe: 'Severe Deviation',
};

/**
 * Per-assessment gauge configuration — drives the report's "Ideal vs Your value"
 * deviation bar. `stops` are the three severity boundaries in value units,
 * always ascending. `lowerIsBetter` flips the colour order: deviation metrics
 * (tilt, lean) are healthiest near 0, while CVA and ROM are healthiest when high.
 */
export interface GaugeConfig {
  min: number;
  max: number;
  /** The perfect target value (where the green "Ideal" marker sits). */
  ideal: number;
  /** Human-readable ideal target, e.g. "0°" or "≥ 50°". */
  idealLabel: string;
  /** Severity boundaries ascending: [a, b, c] → four zones. */
  stops: [number, number, number];
  /** true = smaller is healthier (deviation); false = larger is healthier (CVA, ROM). */
  lowerIsBetter: boolean;
}

export const ASSESSMENT_GAUGE: Record<string, GaugeConfig> = {
  full_body:            { min: 0, max: 15, ideal: 0, idealLabel: '0°', stops: [3, 6, 10], lowerIsBetter: true },
  full_body_back:       { min: 0, max: 15, ideal: 0, idealLabel: '0°', stops: [3, 6, 10], lowerIsBetter: true },
  full_body_left:       { min: 0, max: 15, ideal: 0, idealLabel: '0°', stops: [3, 6, 10], lowerIsBetter: true },
  full_body_right:      { min: 0, max: 15, ideal: 0, idealLabel: '0°', stops: [3, 6, 10], lowerIsBetter: true },
  forward_head:         { min: 30, max: 60, ideal: 55, idealLabel: '≥ 50°', stops: [40, 45, 50], lowerIsBetter: false },
  shoulder_level:       { min: 0, max: 12, ideal: 0, idealLabel: '0°', stops: [2, 4, 7], lowerIsBetter: true },
  pelvic_level:         { min: 0, max: 12, ideal: 0, idealLabel: '0°', stops: [2, 4, 7], lowerIsBetter: true },
  lateral_spine:        { min: 0, max: 12, ideal: 0, idealLabel: '0°', stops: [2, 5, 8], lowerIsBetter: true },
  head_tilt:            { min: 0, max: 12, ideal: 0, idealLabel: '0°', stops: [2, 4, 7], lowerIsBetter: true },
  knee_alignment:       { min: 0, max: 30, ideal: 0, idealLabel: '0°', stops: [5, 10, 20], lowerIsBetter: true },
  shoulder_flexion_rom: { min: 60, max: 180, ideal: 180, idealLabel: '≥ 160°', stops: [90, 140, 160], lowerIsBetter: false },
  thoracic_kyphosis:      { min: 0, max: 35, ideal: 0, idealLabel: '0°', stops: [8, 15, 25], lowerIsBetter: true },
  anterior_pelvic_tilt:   { min: 0, max: 30, ideal: 0, idealLabel: '0°', stops: [5, 10, 18], lowerIsBetter: true },
  scoliosis_adams:        { min: 0, max: 15, ideal: 0, idealLabel: '0°', stops: [3, 6, 10], lowerIsBetter: true },
  squat_depth:            { min: 0, max: 140, ideal: 120, idealLabel: '≥ 100°', stops: [40, 70, 100], lowerIsBetter: false },
  hip_abduction:          { min: 0, max: 60, ideal: 45, idealLabel: '≥ 40°', stops: [10, 25, 40], lowerIsBetter: false },
  shoulder_abduction_rom: { min: 60, max: 180, ideal: 180, idealLabel: '≥ 160°', stops: [90, 140, 160], lowerIsBetter: false },
  elbow_flexion_rom:      { min: 0, max: 150, ideal: 145, idealLabel: '≥ 130°', stops: [60, 100, 130], lowerIsBetter: false },
  trunk_forward_flexion:  { min: 0, max: 90, ideal: 80, idealLabel: '≥ 70°', stops: [20, 45, 70], lowerIsBetter: false },
  trunk_lateral_flexion:  { min: 0, max: 40, ideal: 30, idealLabel: '≥ 25°', stops: [5, 15, 25], lowerIsBetter: false },
};
