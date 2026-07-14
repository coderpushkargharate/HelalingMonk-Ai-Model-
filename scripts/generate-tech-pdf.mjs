// Generates a technical white-paper PDF documenting HealingMonk's AI pose
// pipeline: the model used, how the 33 body points are detected & marked, the
// maths behind the measurements, the plumb-line algorithm, accuracy/limitations
// and the on-screen visual layers. All facts are pulled from the actual source
// (poseDetection.ts, poseSmoothing.ts, plumbLine.ts, clinicalKnowledge.ts).
//
//   node scripts/generate-tech-pdf.mjs
//
// Output: HealingMonk-AI-Technical-Report.pdf at the repo root.

import { jsPDF } from 'jspdf';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'HealingMonk-AI-Technical-Report.pdf');

// ---- Page + palette ----
const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const PAGE_W = doc.internal.pageSize.getWidth();
const PAGE_H = doc.internal.pageSize.getHeight();
const M = 48; // margin
const CONTENT_W = PAGE_W - M * 2;

const EMERALD = [16, 129, 96];
const DARK = [15, 23, 42];
const GRAY = [100, 116, 139];
const LIGHT = [241, 245, 249];
const AMBER = [180, 83, 9];

let y = M;

function setColor(c) { doc.setTextColor(c[0], c[1], c[2]); }
function setFill(c) { doc.setFillColor(c[0], c[1], c[2]); }
function setDraw(c) { doc.setDrawColor(c[0], c[1], c[2]); }

function ensure(space) {
  if (y + space > PAGE_H - M) {
    footer();
    doc.addPage();
    y = M;
  }
}

let pageNo = 1;
function footer() {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(GRAY);
  doc.text('HealingMonk — AI Posture & Movement Engine · Technical Reference', M, PAGE_H - 24);
  doc.text(`Page ${pageNo}`, PAGE_W - M, PAGE_H - 24, { align: 'right' });
  pageNo++;
}

function h1(text) {
  ensure(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(EMERALD);
  doc.text(text, M, y);
  y += 8;
  setDraw(EMERALD);
  doc.setLineWidth(1.5);
  doc.line(M, y, M + 46, y);
  y += 18;
}

function h2(text) {
  ensure(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  setColor(DARK);
  doc.text(text, M, y);
  y += 15;
}

function para(text, opts = {}) {
  const size = opts.size ?? 10;
  const color = opts.color ?? [51, 65, 85];
  const indent = opts.indent ?? 0;
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  setColor(color);
  const lines = doc.splitTextToSize(text, CONTENT_W - indent);
  for (const line of lines) {
    ensure(size + 4);
    doc.text(line, M + indent, y);
    y += size + 3.5;
  }
  y += 3;
}

function bullet(text) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, CONTENT_W - 16);
  ensure(14);
  setFill(EMERALD);
  doc.circle(M + 3, y - 3.2, 1.7, 'F');
  setColor([51, 65, 85]);
  lines.forEach((line, i) => {
    ensure(13.5);
    doc.text(line, M + 14, y);
    y += 13.5;
    if (i < lines.length - 1) { /* keep flowing */ }
  });
  y += 2;
}

function codeBlock(lines) {
  const lh = 12;
  const pad = 8;
  const boxH = lines.length * lh + pad * 2;
  ensure(boxH + 6);
  setFill(LIGHT);
  doc.roundedRect(M, y - 4, CONTENT_W, boxH, 4, 4, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.6);
  setColor(DARK);
  let cy = y + pad + 3;
  for (const ln of lines) {
    doc.text(ln, M + pad, cy);
    cy += lh;
  }
  y += boxH + 8;
}

// Simple 2-column key/value table.
function kvTable(rows) {
  const rh = 17;
  const col1 = 150;
  ensure(rows.length * rh + 6);
  rows.forEach((r, i) => {
    if (i % 2 === 0) {
      setFill(LIGHT);
      doc.rect(M, y - 12, CONTENT_W, rh, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    setColor(DARK);
    doc.text(r[0], M + 6, y);
    doc.setFont('helvetica', 'normal');
    setColor([51, 65, 85]);
    const vlines = doc.splitTextToSize(r[1], CONTENT_W - col1 - 12);
    doc.text(vlines, M + col1, y);
    y += Math.max(rh, vlines.length * 11 + 6);
  });
  y += 8;
}

// ---- Parse the clinical library straight from source ----
// Each assessment is an object literal with predictable string fields. We slice
// the file into per-id blocks and pull the first match of each field (the
// assessment's own `name:` precedes the exercises' `name:`, so "first" is safe).
function loadAssessments() {
  const src = readFileSync(join(__dirname, '..', 'src', 'lib', 'clinicalKnowledge.ts'), 'utf8');
  const blocks = src.split(/\bid:\s*'/).slice(1);
  const first = (block, key) => {
    const m = block.match(new RegExp(`${key}:\\s*'([^']*)'`));
    return m ? m[1] : '';
  };
  const out = [];
  for (const raw of blocks) {
    const id = raw.match(/^([a-z0-9_]+)'/)?.[1] ?? '';
    const name = first(raw, 'name');
    const region = first(raw, 'bodyRegion');
    const measurement = first(raw, 'measurementName');
    const unit = first(raw, 'unit');
    const feas = first(raw, 'aiFeasibility');
    // Only real assessment blocks carry a measurementName + aiFeasibility.
    if (!name || !feas) continue;
    out.push({ id, name, region, measurement, unit, feas });
  }
  return out;
}

// Paginated table for the assessment appendix.
function assessmentTable(rows) {
  const cols = [
    { w: 22, key: 'n', head: '#' },
    { w: 150, key: 'name', head: 'Assessment' },
    { w: 86, key: 'region', head: 'Region' },
    { w: 150, key: 'meas', head: 'Measurement' },
    { w: CONTENT_W - 22 - 150 - 86 - 150, key: 'feas', head: 'Feasibility' },
  ];
  const rh = 20;

  const header = () => {
    setFill(EMERALD);
    doc.rect(M, y - 12, CONTENT_W, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(255, 255, 255);
    let cx = M + 5;
    for (const c of cols) { doc.text(c.head, cx, y); cx += c.w; }
    y += 14;
  };

  header();
  rows.forEach((r, i) => {
    if (y + rh > PAGE_H - M) { footer(); doc.addPage(); y = M; header(); }
    if (i % 2 === 0) { setFill(LIGHT); doc.rect(M, y - 12, CONTENT_W, rh, 'F'); }
    let cx = M + 5;
    doc.setFontSize(8.4);
    const cells = {
      n: String(i + 1),
      name: r.name,
      region: r.region || '—',
      meas: r.measurement + (r.unit ? ` (${r.unit})` : ''),
      feas: r.feas,
    };
    let maxLines = 1;
    for (const c of cols) {
      const isFeas = c.key === 'feas';
      doc.setFont('helvetica', c.key === 'name' ? 'bold' : 'normal');
      if (isFeas) {
        const fc = r.feas === 'High' ? EMERALD : r.feas === 'Partial' ? AMBER : [124, 58, 237];
        setColor(fc);
      } else {
        setColor([51, 65, 85]);
      }
      const lines = doc.splitTextToSize(cells[c.key], c.w - 6);
      maxLines = Math.max(maxLines, lines.length);
      doc.text(lines, cx, y);
      cx += c.w;
    }
    y += Math.max(rh, maxLines * 10 + 8);
  });
  y += 6;
}

// ---- The 33 points: index → name → body part → clinical use ----
// Names are exactly MediaPipe's (see LANDMARK_NAMES in poseDetection.ts); the
// "marked on / used for" column reflects how each point is used in this app.
// [index, name, body part (Eng), Hindi (romanized), marked on / used for]
const LANDMARKS = [
  [0, 'nose', 'Head', 'Naak', 'Head centre — forward-head check & side-view facing direction'],
  [1, 'left_eye_inner', 'Head', 'Baayi aankh (andar)', 'Eye landmark — helps estimate vertex (top of head)'],
  [2, 'left_eye', 'Head', 'Baayi aankh', 'Left eye — head tilt & vertex estimate'],
  [3, 'left_eye_outer', 'Head', 'Baayi aankh (bahar)', 'Outer eye corner'],
  [4, 'right_eye_inner', 'Head', 'Daayi aankh (andar)', 'Eye landmark'],
  [5, 'right_eye', 'Head', 'Daayi aankh', 'Right eye — head tilt & vertex estimate'],
  [6, 'right_eye_outer', 'Head', 'Daayi aankh (bahar)', 'Outer eye corner'],
  [7, 'left_ear', 'Head', 'Bayan kaan', 'Left ear (EAM) — craniovertebral angle & side plumb ear point'],
  [8, 'right_ear', 'Head', 'Dayan kaan', 'Right ear (EAM) — craniovertebral angle & side plumb'],
  [9, 'mouth_left', 'Head', 'Munh (bayan)', 'Mouth corner — used to estimate the chin point'],
  [10, 'mouth_right', 'Head', 'Munh (dayan)', 'Mouth corner — used to estimate the chin point'],
  [11, 'left_shoulder', 'Shoulder / torso', 'Bayan kandha', 'Acromion — shoulder level, plumb line, arm-ROM origin'],
  [12, 'right_shoulder', 'Shoulder / torso', 'Dayan kandha', 'Acromion — shoulder level, plumb line, arm-ROM origin'],
  [13, 'left_elbow', 'Arm', 'Baayi kohni', 'Elbow — elbow flexion & shoulder ROM vertex'],
  [14, 'right_elbow', 'Arm', 'Daayi kohni', 'Elbow — elbow flexion & shoulder ROM vertex'],
  [15, 'left_wrist', 'Arm', 'Baayi kalaai', 'Wrist — upper-limb ROM endpoint'],
  [16, 'right_wrist', 'Arm', 'Daayi kalaai', 'Wrist — upper-limb ROM endpoint'],
  [17, 'left_pinky', 'Hand', 'Baayi choti ungli', 'Little-finger knuckle'],
  [18, 'right_pinky', 'Hand', 'Daayi choti ungli', 'Little-finger knuckle'],
  [19, 'left_index', 'Hand', 'Baayi tarjani', 'Index finger — reach / hand endpoint'],
  [20, 'right_index', 'Hand', 'Daayi tarjani', 'Index finger — reach / hand endpoint'],
  [21, 'left_thumb', 'Hand', 'Bayan angutha', 'Thumb'],
  [22, 'right_thumb', 'Hand', 'Dayan angutha', 'Thumb'],
  [23, 'left_hip', 'Pelvis', 'Bayan koolha', 'Hip / ASIS — pelvic tilt, trunk & hip ROM, plumb line'],
  [24, 'right_hip', 'Pelvis', 'Dayan koolha', 'Hip / ASIS — pelvic tilt, trunk & hip ROM, plumb line'],
  [25, 'left_knee', 'Leg', 'Bayan ghutna', 'Knee — knee alignment/flexion, squat depth, plumb line'],
  [26, 'right_knee', 'Leg', 'Dayan ghutna', 'Knee — knee alignment/flexion, squat depth, plumb line'],
  [27, 'left_ankle', 'Leg', 'Bayan takhna', 'Ankle (lateral malleolus) — plumb base & dorsiflexion'],
  [28, 'right_ankle', 'Leg', 'Dayan takhna', 'Ankle (lateral malleolus) — plumb base & dorsiflexion'],
  [29, 'left_heel', 'Foot', 'Baayi edi', 'Heel — foot alignment & ankle ROM'],
  [30, 'right_heel', 'Foot', 'Daayi edi', 'Heel — foot alignment & ankle ROM'],
  [31, 'left_foot_index', 'Foot', 'Bayan pair ka angutha', 'Toe — foot direction & dorsiflexion'],
  [32, 'right_foot_index', 'Foot', 'Dayan pair ka angutha', 'Toe — foot direction & dorsiflexion'],
];

// Full-width reference table for the 33 landmarks (paginates, header repeats).
function landmarkTable() {
  const cols = [
    { w: 20, head: '#' },
    { w: 82, head: 'Point name' },
    { w: 66, head: 'Body part' },
    { w: 96, head: 'Hindi (naam)' },
    { w: CONTENT_W - 20 - 82 - 66 - 96, head: 'Marked on / used for' },
  ];
  const rh = 18;
  const header = () => {
    setFill(EMERALD);
    doc.rect(M, y - 12, CONTENT_W, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(255, 255, 255);
    let cx = M + 5;
    for (const c of cols) { doc.text(c.head, cx, y); cx += c.w; }
    y += 14;
  };
  header();
  LANDMARKS.forEach((r, i) => {
    if (y + rh > PAGE_H - M) { footer(); doc.addPage(); y = M; header(); }
    if (i % 2 === 0) { setFill(LIGHT); doc.rect(M, y - 12, CONTENT_W, rh, 'F'); }
    const cells = [String(r[0]), r[1], r[2], r[3], r[4]];
    let cx = M + 5;
    doc.setFontSize(8.1);
    let maxLines = 1;
    cells.forEach((val, ci) => {
      doc.setFont('helvetica', ci === 1 || ci === 3 ? 'bold' : 'normal');
      setColor(ci === 0 ? EMERALD : ci === 3 ? [124, 58, 237] : [51, 65, 85]);
      const lines = doc.splitTextToSize(val, cols[ci].w - 6);
      maxLines = Math.max(maxLines, lines.length);
      doc.text(lines, cx, y);
      cx += cols[ci].w;
    });
    y += Math.max(rh, maxLines * 9.5 + 7);
  });
  y += 6;
}

// ---- 33-landmark body diagram (drawn as vectors) ----
// Approximate front-view layout in a normalized 0..1 box; indices match
// MediaPipe Pose. Left_* placed on the drawing's left, right_* on the right.
const LM = {
  0: [0.50, 0.095], 1: [0.485, 0.083], 2: [0.475, 0.083], 3: [0.465, 0.083],
  4: [0.515, 0.083], 5: [0.525, 0.083], 6: [0.535, 0.083],
  7: [0.445, 0.098], 8: [0.555, 0.098], 9: [0.487, 0.115], 10: [0.513, 0.115],
  11: [0.42, 0.21], 12: [0.58, 0.21], 13: [0.375, 0.34], 14: [0.625, 0.34],
  15: [0.345, 0.46], 16: [0.655, 0.46], 17: [0.33, 0.50], 18: [0.67, 0.50],
  19: [0.345, 0.505], 20: [0.655, 0.505], 21: [0.365, 0.485], 22: [0.635, 0.485],
  23: [0.45, 0.49], 24: [0.55, 0.49], 25: [0.44, 0.67], 26: [0.56, 0.67],
  27: [0.44, 0.85], 28: [0.56, 0.85], 29: [0.43, 0.885], 30: [0.57, 0.885],
  31: [0.47, 0.895], 32: [0.53, 0.895],
};
const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24],
  [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31],
  [28, 30], [30, 32], [15, 21], [16, 22], [7, 11], [8, 12], [7, 0], [8, 0],
];

function bodyDiagram() {
  const boxW = 300;
  const boxH = 360;
  ensure(boxH + 14);
  const x0 = M + 6;
  const y0 = y;
  const px = (nx) => x0 + nx * boxW;
  const py = (ny) => y0 + ny * boxH;

  // frame
  setFill([248, 250, 252]);
  doc.roundedRect(x0 - 6, y0 - 6, boxW + 12, boxH + 12, 6, 6, 'F');

  // skeleton connections
  setDraw(EMERALD);
  doc.setLineWidth(2);
  for (const [a, b] of CONNECTIONS) {
    doc.line(px(LM[a][0]), py(LM[a][1]), px(LM[b][0]), py(LM[b][1]));
  }
  // plumb reference (dashed vertical through centre)
  setDraw([148, 163, 184]);
  doc.setLineWidth(1);
  doc.setLineDashPattern([4, 3], 0);
  doc.line(px(0.5), py(0.03), px(0.5), py(0.9));
  doc.setLineDashPattern([], 0);

  // landmark dots + index numbers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  for (let i = 0; i <= 32; i++) {
    const [nx, ny] = LM[i];
    setFill(DARK);
    doc.circle(px(nx), py(ny), 2.9, 'F');
    // white halo behind the number so it stays legible over skeleton lines
    doc.setTextColor(255, 255, 255);
    doc.text(String(i), px(nx) + 3.6, py(ny) - 2.4);
    setColor(EMERALD);
    doc.text(String(i), px(nx) + 3.2, py(ny) - 2.6);
  }

  // side legend
  const lx = x0 + boxW + 22;
  let ly = y0 + 6;
  const legend = [
    ['0-10', 'Face / head'],
    ['11-22', 'Shoulders, arms, hands'],
    ['23-28', 'Hips, knees, ankles'],
    ['29-32', 'Heels & toes'],
    ['- - -', 'Plumb reference line'],
  ];
  doc.setFontSize(8.5);
  for (const [k, v] of legend) {
    doc.setFont('helvetica', 'bold');
    setColor(EMERALD);
    doc.text(k, lx, ly);
    doc.setFont('helvetica', 'normal');
    setColor([51, 65, 85]);
    doc.text(v, lx + 42, ly);
    ly += 16;
  }
  doc.setFontSize(7.5);
  setColor(GRAY);
  const cap = doc.splitTextToSize(
    'Each of the 33 points carries x, y, z (depth) and a 0-1 visibility score. Points below 0.5 visibility are ignored so a hidden limb never corrupts a measurement.',
    PAGE_W - M - lx
  );
  doc.text(cap, lx, ly + 6);

  y = y0 + boxH + 16;
}

// ======================================================================
// COVER
// ======================================================================
setFill(EMERALD);
doc.rect(0, 0, PAGE_W, 150, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(255, 255, 255);
doc.text('HealingMonk', M, 66);
doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.text('AI Posture & Movement Assessment Engine', M, 84);

y = 200;
doc.setFont('helvetica', 'bold');
doc.setFontSize(26);
setColor(DARK);
doc.text('AI Technical Reference', M, y);
y += 30;
doc.setFontSize(13);
setColor(GRAY);
doc.text('How the AI works · body-point detection · measurement maths ·', M, y);
y += 18;
doc.text('accuracy & the on-screen visual layers', M, y);
y += 40;

setFill(LIGHT);
doc.roundedRect(M, y, CONTENT_W, 92, 6, 6, 'F');
doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
setColor([51, 65, 85]);
doc.text(
  doc.splitTextToSize(
    'This document explains the computer-vision pipeline behind the HealingMonk assessment: the neural pose model used, how the 33 body landmarks are located and marked on the patient, how joint angles and the clinical plumb line are computed, what the accuracy limits are, and what every line and colour on the live overlay means. It is intended for clinicians, reviewers and engineers.',
    CONTENT_W - 24
  ),
  M + 12,
  y + 22
);
y += 112;
doc.setFontSize(8.5);
setColor(GRAY);
doc.text(`Generated ${new Date().toISOString().slice(0, 10)} · derived from the live source code`, M, y);

footer();
doc.addPage();
y = M;

// ======================================================================
// 1 · SYSTEM AT A GLANCE
// ======================================================================
h1('1 · The AI at a glance');
para(
  'HealingMonk turns an ordinary camera into a clinical-style movement lab. Every measurement runs entirely on the patient\'s device (in the browser) — no video is uploaded. The engine detects the body, tracks 33 points in 3D in real time, and converts their geometry into clinical measurements (angles, tilts, range-of-motion and a plumb-line alignment score).'
);
kvTable([
  ['Model', 'Google MediaPipe Pose Landmarker — "full" variant (float16)'],
  ['Runtime', '@mediapipe/tasks-vision 0.10.35 (WebAssembly + WebGL)'],
  ['Landmarks', '33 full-body points, each with x, y, z (depth) and visibility'],
  ['Where it runs', 'Client-side in the browser — camera frames never leave the device'],
  ['Acceleration', 'GPU delegate when available, automatic CPU fallback'],
  ['Mode', 'VIDEO / real-time, single person (numPoses = 1)'],
  ['Detection thresholds', 'pose-detection, presence & tracking confidence all ≥ 0.60'],
  ['Smoothing', 'One-Euro adaptive filter on every point (x, y, z)'],
  ['Clinical library', '34 assessments across posture, upper limb, trunk, lower limb, seated & lying'],
]);
para(
  'Important: the automatic numbers are camera-based estimates, not a medical diagnosis. The treating doctor reviews every finding and can override the score — that clinical judgement is the record.',
  { color: AMBER, bold: true }
);

// ======================================================================
// 2 · BODY-POINT DETECTION
// ======================================================================
h1('2 · How the body points are detected & marked');
para(
  'The pose model is a two-stage convolutional neural network. A detector first finds the person in the frame; a landmark network then regresses the pixel location of 33 predefined anatomical points, plus a depth value (z) and a visibility confidence (0-1) for each. HealingMonk uses the "full" model, which tracks limbs and depth markedly better than the "lite" model while still running in real time.'
);
h2('The 33 landmarks');
bodyDiagram();
para(
  'Every point is returned in normalized coordinates (0-1 across the frame), so the maths is resolution-independent. On the live view each point is drawn as a green dot and the joints are joined into a skeleton; the same overlay is "baked into" the captured photo so the doctor sees exactly what the model measured.'
);
h2('All 33 points — where each is marked & what it measures');
para(
  'The complete list below maps every landmark index to its name, the body part it is marked on, and how HealingMonk uses it. Use this as the quick reference when explaining the system.',
  { size: 9.5 }
);
landmarkTable();
para(
  'Visibility gate: any point whose visibility drops below 0.5 is treated as "not seen" and excluded, so a briefly hidden hand or foot can never pull a measurement to a wrong value. A live detection-quality indicator (visible points / 33) tells the patient when to reposition.'
);

// ======================================================================
// 3 · STEADYING THE SIGNAL
// ======================================================================
h1('3 · Steadying the signal (why the points don\'t shimmer)');
para(
  'Raw neural landmarks jitter by a pixel or two every frame even when the subject is perfectly still, which would make the skeleton shimmer and the angles flicker by ±1-2°. HealingMonk filters every landmark axis with a One-Euro adaptive filter (Casiez et al., CHI 2012):'
);
bullet('When the point is slow / still, it smooths hard — removing all jitter so the deviation line sits rock-steady.');
bullet('When the point moves fast, it barely smooths — so there is no visible lag when the patient actually moves.');
para('Tuned constants (per source): baseline cutoff 0.9 Hz, speed coefficient β = 0.008, derivative cutoff 1.0 Hz. Each of x, y and z is filtered independently; the filter resets when the body leaves the frame so a re-acquired pose never snaps.');

// ======================================================================
// 4 · MEASUREMENT MATHS
// ======================================================================
h1('4 · How the measurements are computed');
h2('Joint angles');
para('Any joint angle is the angle at point B in the triangle A-B-C (e.g. shoulder-elbow-wrist), computed from the 3D vectors:');
codeBlock([
  'angle = arccos( (BA · BC) / (|BA| × |BC|) ) × 180/π',
  '   BA = A − B      BC = C − B',
  '   ·  = dot product      |v| = vector length',
  'Result clamped to a valid 0-180° range.',
]);
para('A 2D variant (ignoring z) is used where the clinically correct plane is the image plane — e.g. shoulder level or head tilt. Craniovertebral angle, shoulder flexion/abduction, knee flexion, pelvic tilt and trunk ROM are all derived this way and update live as the patient moves.');

h2('Clinical plumb line');
para(
  'A plumb line is the vertical reference a physiotherapist drops through the body to screen standing posture. HealingMonk reconstructs it per view (front / side / back) and reports how far each anatomical checkpoint sits off that line, as a percentage of body height — so the score is scale-free.'
);
bullet('Front: central midline through vertex → nose → chin → sternum → umbilicus → pubis → knee & ankle midpoints, plus left/right symmetry (shoulders, clavicle, ASIS, knees, feet).');
bullet('Side: ear (EAM) → shoulder (acromion) → hip (greater trochanter) → knee → ankle (lateral malleolus).');
bullet('Back: occiput → cervical/thoracolumbar spine → gluteal cleft → knee & ankle midpoints.');
para(
  'MediaPipe only returns 33 surface points, so several true clinical landmarks (vertex, sternum, umbilicus, occiput, greater trochanter) are estimated geometrically from the points that exist. Tolerances: central/sagittal checkpoints within ±4% (front/back) or ±5% (side) of body height; left/right pairs level within 3°.'
);
h2('Severity rating');
para('The plumb score (mean absolute checkpoint offset) is graded into the same four-band scale used across the report:');
codeBlock([
  'score ≤ 2%   → Normal   (green)',
  'score ≤ 4%   → Mild     (yellow)',
  'score ≤ 7%   → Moderate (orange)',
  'score > 7%   → Severe   (red)',
]);

h2('Overall posture health score (report)');
para('The headline 0-100 score on the report is a weighted deviation from ideal across all captured findings:');
codeBlock([
  'penalty(finding) = 0 normal · 1 mild · 2 moderate · 3 severe',
  'score = 100 − (Σ penalty / (3 × findings)) × 100',
  'clamped to 0-100 and rounded.',
]);

// ======================================================================
// 5 · ACCURACY
// ======================================================================
h1('5 · Accuracy, feasibility & limitations');
para(
  'Across the 34-assessment library each posture is tagged with an AI-feasibility rating that reflects how reliably a single camera can measure it: most posture, upper-limb and trunk screens are rated High; a few depth- or rotation-sensitive measures (e.g. anterior pelvic tilt, spinal rotation) are rated Partial or Medium and are flagged for extra doctor scrutiny.'
);
kvTable([
  ['High feasibility', 'Movement is clearly visible in the camera plane — reliable estimate (majority of the library).'],
  ['Medium', 'Usable, but sensitive to camera angle or subtle motion — verify against exam.'],
  ['Partial', 'Depth / rotation limited by a single 2D camera — treat as a screening indicator only.'],
]);
h2('What affects accuracy in practice');
bullet('Lighting — natural or bright even light is best; low light or backlighting reduces landmark confidence.');
bullet('Framing & distance — the full body (or the relevant segment) must be in frame; a live quality bar guides repositioning.');
bullet('Clothing — contrasting, non-baggy clothing gives the cleanest landmarks.');
bullet('Depth ambiguity — a single camera estimates z (depth), so purely front-back movements are the hardest and are rated Partial.');
para(
  'Performance envelope: roughly 50-90 ms per frame end-to-end (detection + angles + rendering), with GPU acceleration when the device allows. Because everything is an estimate, the report carries an explicit AI disclaimer and the doctor\'s clinical score overrides the automatic value on every finding.',
);

// ======================================================================
// 6 · VISUAL LAYERS
// ======================================================================
h1('6 · The on-screen visuals (3D points, skeleton & animation)');
para('Several layers are drawn live over the camera feed and preserved in the report so the assessment is fully transparent:');
bullet('3D landmark dots — all visible points from the 33-point model, positioned using the model\'s x, y and z (depth) output.');
bullet('Skeleton overlay — green lines joining the points (shoulders → elbows → wrists, hips → knees → ankles, etc.) so the tracked body is obvious at a glance.');
bullet('Moving body axis — the patient\'s actual head→foot centre line, drawn green where it sits on the plumb and red where it drifts off, giving a live "correct / off" read.');
bullet('Fixed plumb reference — a dashed vertical in the severity colour, with each anatomical checkpoint labelled by its deviation (e.g. "Ear 6% ant").');
bullet('Symmetry bars (front view) — dashed left↔right connectors showing shoulder / hip level and which side is high.');
bullet('Muscle-map illustration — for each posture the report shows an anatomical figure (anterior or posterior) with the targeted muscle groups highlighted, so the patient sees which area the assessment relates to.');
para(
  'Together these turn a raw camera frame into a readable clinical picture: the patient photo with the AI points baked in, next to the ideal reference — exactly what the doctor scores against.'
);

// ======================================================================
// 7 · APPENDIX — full assessment library
// ======================================================================
footer();
doc.addPage();
y = M;
h1('Appendix · The full assessment library');
const assessments = loadAssessments();
para(
  `Every posture, range-of-motion and movement screen the engine can run, with the single-camera measurement it produces and its AI-feasibility rating. Feasibility colour: green = High, purple = Medium, amber = Partial. (${assessments.length} assessments.)`
);
assessmentTable(assessments);

footer();

// ---- write file ----
const buf = Buffer.from(doc.output('arraybuffer'));
writeFileSync(OUT, buf);
console.log('Wrote', OUT, `(${(buf.length / 1024).toFixed(0)} KB)`);
