import { Landmark } from '@/lib/poseDetection';
import type { Severity } from '@/lib/clinicalKnowledge';

/**
 * Clinical "Plumb Line" posture assessment.
 *
 * A plumb line is the vertical reference physiotherapists drop through the body
 * to screen standing posture. The anatomical landmarks it should pass through
 * differ by view:
 *
 *  • FRONT  — vertex → nose → chin → sternum → umbilicus → pubic symphysis →
 *             midpoint of knees → midpoint of ankles (a central/midline axis),
 *             plus left/right SYMMETRY checks (shoulders, clavicle, ASIS,
 *             knees, feet).
 *  • BACK   — external occipital protuberance → spinous processes →
 *             gluteal cleft → midpoint of knees → midpoint of ankles.
 *  • SIDE   — the line falls slightly anterior to the lateral malleolus and
 *             should pass through ear (EAM) → acromion → greater trochanter →
 *             slightly anterior to the knee axis.
 *
 * MediaPipe Pose only gives 33 surface landmarks, so several clinical points
 * (vertex, sternum, umbilicus, occiput, greater trochanter, …) are *estimated*
 * from the landmarks that exist. Each reference point's horizontal deviation
 * from the line is reported as a percentage of body height, so the result is
 * scale-free and can be drawn on the live overlay and the report snapshot.
 */

export type PlumbView = 'front' | 'side' | 'back';

// A landmark the plumb line is meant to pass through (a central/midline point
// in front/back views, or a sagittal checkpoint in the side view).
export interface PlumbPoint {
  name: string;
  /** Normalized coordinates (0..1). */
  x: number;
  y: number;
  /**
   * Signed horizontal offset from the plumb line, as a % of body height.
   * Front/back: + = toward the subject's right side of frame.
   * Side: + = anterior (forward, toward the face).
   */
  offsetPct: number;
  onLine: boolean;
}

// A left/right pair checked for level symmetry (front-view screen).
export interface SymmetryPair {
  name: string;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  /** Tilt of the left→right line off the horizontal, degrees. */
  tiltDeg: number;
  level: boolean;
  /** Which side sits higher in the frame ('even' when level). */
  higher: 'left' | 'right' | 'even';
}

export interface ClinicalPlumbLine {
  view: PlumbView;
  /** Normalized x of the vertical reference line. */
  lineX: number;
  /** Normalized y range the drawn line spans. */
  topY: number;
  bottomY: number;
  /** Side view only: +1 if the subject faces +x, -1 if they face -x. */
  facingSign: number;
  /** Anatomical points the line should pass through, head→foot. */
  points: PlumbPoint[];
  /** Left/right level checks (front view; empty otherwise). */
  symmetry: SymmetryPair[];
  /** Mean absolute offset of the checkpoints, % of body height. */
  score: number;
  rating: Severity;
  /** True when every checkpoint is on the line and every pair is level. */
  aligned: boolean;
}

// Tolerances.
const CENTRAL_TOL_PCT = 4; // central/sagittal point within ±4% of body height
const SIDE_TOL_PCT = 5; // side view runs a touch looser (depth ambiguity)
const SYMMETRY_TOL_DEG = 3; // left/right pair level within 3°

// MediaPipe Pose landmark indices.
const NOSE = 0;
const L_EYE = 2;
const R_EYE = 5;
const L_EAR = 7;
const R_EAR = 8;
const L_MOUTH = 9;
const R_MOUTH = 10;
const L_SHO = 11;
const R_SHO = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANK = 27;
const R_ANK = 28;
const L_FOOT = 31;
const R_FOOT = 32;

// Treat undefined visibility as visible so estimated points always anchor.
const v = (l?: Landmark) => l?.visibility ?? 1;
const round1 = (n: number) => Math.round(n * 10) / 10;

interface Pt {
  x: number;
  y: number;
}

/** Tilt of the line between two points off the horizontal, in degrees. */
function tiltDeg(a: Pt, b: Pt, aspectRatio: number): number {
  const dx = Math.abs(b.x - a.x) * aspectRatio || 1e-6;
  const dy = Math.abs(b.y - a.y);
  return round1(Math.abs((Math.atan2(dy, dx) * 180) / Math.PI));
}

function ratingFor(score: number): Severity {
  return score <= 2 ? 'normal' : score <= 4 ? 'mild' : score <= 7 ? 'moderate' : 'severe';
}

/**
 * Build the clinical plumb line for the requested view. Returns null when the
 * essential landmarks (ankle + shoulder/torso) are not visible.
 */
export function computeClinicalPlumbLine(
  lm: Landmark[],
  view: PlumbView,
  aspectRatio = 16 / 9
): ClinicalPlumbLine | null {
  if (lm.length < 33) return null;

  const ok = (i: number) => v(lm[i]) > 0.3;

  // Body-height proxy: top of head (eyes/ears/nose) → lowest visible ankle.
  const headYs = [NOSE, L_EYE, R_EYE, L_EAR, R_EAR].filter(ok).map((i) => lm[i].y);
  const ankleYs = [L_ANK, R_ANK].filter(ok).map((i) => lm[i].y);
  const topRef = headYs.length ? Math.min(...headYs) : 0;
  const botRef = ankleYs.length ? Math.max(...ankleYs) : 1;
  const bodyScale = Math.abs(botRef - topRef) || 1;

  return view === 'side'
    ? sidePlumb(lm, aspectRatio, bodyScale)
    : frontBackPlumb(lm, view, aspectRatio, bodyScale);
}

/** Midpoint of two landmarks, falling back to whichever single one is visible. */
function midpoint(lm: Landmark[], a: number, b: number): Pt | null {
  const okA = v(lm[a]) > 0.3;
  const okB = v(lm[b]) > 0.3;
  if (okA && okB) return { x: (lm[a].x + lm[b].x) / 2, y: (lm[a].y + lm[b].y) / 2 };
  if (okA) return { x: lm[a].x, y: lm[a].y };
  if (okB) return { x: lm[b].x, y: lm[b].y };
  return null;
}

// ---- Front / Back: central midline axis through the ankle midpoint ----

function frontBackPlumb(
  lm: Landmark[],
  view: 'front' | 'back',
  aspectRatio: number,
  bodyScale: number
): ClinicalPlumbLine | null {
  const ankleMid = midpoint(lm, L_ANK, R_ANK) ?? midpoint(lm, L_HIP, R_HIP) ?? midpoint(lm, L_SHO, R_SHO);
  if (!ankleMid) return null;

  const shoulderMid = midpoint(lm, L_SHO, R_SHO);
  const hipMid = midpoint(lm, L_HIP, R_HIP);
  const eyeMid = midpoint(lm, L_EYE, R_EYE);
  const earMid = midpoint(lm, L_EAR, R_EAR);
  const mouthMid = midpoint(lm, L_MOUTH, R_MOUTH);
  const kneeMid = midpoint(lm, L_KNEE, R_KNEE);

  // The vertical reference must run down the BODY'S CENTRAL AXIS — head → shoulders
  // → hips → knees → ankles — not just hang off the ankles. Averaging the visible
  // midline points keeps the line dead-centre through the body (nose, shoulder,
  // legs) even if the feet drift or one landmark is briefly noisy, which is what a
  // clinical plumb screen needs. Each point's deviation from this centre is then
  // reported below.
  const noseMid = v(lm[NOSE]) > 0.3 ? { x: lm[NOSE].x, y: lm[NOSE].y } : null;
  const axisPoints = [noseMid ?? eyeMid, shoulderMid, hipMid, kneeMid, ankleMid].filter(
    (p): p is Pt => p != null
  );
  const lineX = axisPoints.reduce((sum, p) => sum + p.x, 0) / axisPoints.length;

  const points: PlumbPoint[] = [];
  const add = (name: string, p: Pt | null | undefined) => {
    if (!p) return;
    const offsetPct = round1((((p.x - lineX) * aspectRatio) / bodyScale) * 100);
    points.push({ name, x: p.x, y: p.y, offsetPct, onLine: Math.abs(offsetPct) <= CENTRAL_TOL_PCT });
  };

  if (view === 'front') {
    // Vertex: estimate top-of-head a little above the eyes.
    if (eyeMid) {
      const span = mouthMid ? Math.abs(mouthMid.y - eyeMid.y) : 0.05;
      add('Vertex', { x: eyeMid.x, y: Math.max(0, eyeMid.y - span * 1.4) });
    }
    add('Nose', v(lm[NOSE]) > 0.3 ? { x: lm[NOSE].x, y: lm[NOSE].y } : null);
    if (mouthMid) {
      const drop = eyeMid ? Math.abs(mouthMid.y - eyeMid.y) * 0.5 : 0.02;
      add('Chin', { x: mouthMid.x, y: mouthMid.y + drop });
    }
    add('Sternum', shoulderMid);
    if (shoulderMid && hipMid) {
      add('Umbilicus', {
        x: shoulderMid.x * 0.4 + hipMid.x * 0.6,
        y: shoulderMid.y + (hipMid.y - shoulderMid.y) * 0.65,
      });
    }
    add('Pubic symphysis', hipMid);
    add('Knees midpoint', kneeMid);
    add('Ankles midpoint', ankleMid);
  } else {
    // Back view: posterior midline.
    add('Occiput', earMid);
    add('Cervical spine', shoulderMid);
    if (shoulderMid && hipMid) {
      add('Thoracolumbar spine', {
        x: (shoulderMid.x + hipMid.x) / 2,
        y: (shoulderMid.y + hipMid.y) / 2,
      });
    }
    add('Gluteal cleft', hipMid);
    add('Knees midpoint', kneeMid);
    add('Ankles midpoint', ankleMid);
  }

  // Left/right symmetry pairs (most relevant in the front view).
  const symmetry: SymmetryPair[] = [];
  const addPair = (name: string, left: Pt | null, right: Pt | null) => {
    if (!left || !right) return;
    const tilt = tiltDeg(left, right, aspectRatio);
    const dy = left.y - right.y;
    const higher: SymmetryPair['higher'] =
      tilt <= SYMMETRY_TOL_DEG ? 'even' : dy < 0 ? 'left' : 'right';
    symmetry.push({
      name,
      leftX: left.x,
      leftY: left.y,
      rightX: right.x,
      rightY: right.y,
      tiltDeg: tilt,
      level: tilt <= SYMMETRY_TOL_DEG,
      higher,
    });
  };
  const at = (i: number): Pt | null => (v(lm[i]) > 0.3 ? { x: lm[i].x, y: lm[i].y } : null);
  // Clavicle ≈ shoulders nudged 25% toward the midline and slightly upward.
  const clav = (i: number): Pt | null => {
    const s = at(i);
    if (!s || !shoulderMid) return s;
    return { x: s.x + (shoulderMid.x - s.x) * 0.25, y: s.y - bodyScale * 0.02 };
  };

  addPair('Shoulders', at(L_SHO), at(R_SHO));
  addPair('Clavicle', clav(L_SHO), clav(R_SHO));
  addPair('ASIS', at(L_HIP), at(R_HIP));
  addPair('Knees', at(L_KNEE), at(R_KNEE));
  addPair('Feet', at(L_FOOT), at(R_FOOT));

  return finalize(view, lineX, points, symmetry, 1, ankleMid.y);
}

// ---- Side: sagittal line slightly anterior to the lateral malleolus ----

function sidePlumb(lm: Landmark[], aspectRatio: number, bodyScale: number): ClinicalPlumbLine | null {
  const scoreSide = (s: 'left' | 'right') =>
    (s === 'left' ? [L_EAR, L_SHO, L_HIP, L_KNEE, L_ANK] : [R_EAR, R_SHO, R_HIP, R_KNEE, R_ANK]).reduce(
      (sum, i) => sum + v(lm[i]),
      0
    );
  const side: 'left' | 'right' = scoreSide('left') >= scoreSide('right') ? 'left' : 'right';
  const idx =
    side === 'left'
      ? { ear: L_EAR, sho: L_SHO, hip: L_HIP, knee: L_KNEE, ank: L_ANK }
      : { ear: R_EAR, sho: R_SHO, hip: R_HIP, knee: R_KNEE, ank: R_ANK };

  // A side view needs at least a torso reference (shoulder or hip) to define the
  // line. The ankle is preferred as the base but is NOT required — in many side
  // poses the feet are out of frame or low-confidence, so we fall back down the
  // chain (ankle → knee → hip → shoulder). This is why the plumb line must never
  // silently disappear on left/right captures the way it used to.
  const shoOk = v(lm[idx.sho]) > 0.25;
  const hipOk = v(lm[idx.hip]) > 0.25;
  if (!shoOk && !hipOk) return null;

  // Lowest visible landmark on the chain becomes the plumb's base anchor.
  const baseIdx =
    v(lm[idx.ank]) > 0.25 ? idx.ank :
    v(lm[idx.knee]) > 0.25 ? idx.knee :
    hipOk ? idx.hip :
    idx.sho;
  const base = lm[baseIdx];
  const baseIsAnkle = baseIdx === idx.ank;

  // Facing direction from the nose relative to the base (fallback: shoulder/hip).
  const facingRef =
    v(lm[NOSE]) > 0.3 ? lm[NOSE].x : shoOk ? lm[idx.sho].x : lm[idx.hip].x;
  const facingSign = facingRef - base.x >= 0 ? 1 : -1;

  // When the ankle is the base, the classic lateral plumb hangs just anterior to
  // the lateral malleolus; for higher fallbacks the line runs straight down.
  const lineX = base.x + (baseIsAnkle ? facingSign * ((0.015 * bodyScale) / aspectRatio) : 0);

  const checkpoints: { name: string; i: number }[] = [
    { name: 'Ear (EAM)', i: idx.ear },
    { name: 'Shoulder (acromion)', i: idx.sho },
    { name: 'Hip (gr. trochanter)', i: idx.hip },
    { name: 'Knee', i: idx.knee },
    { name: 'Ankle (lat. malleolus)', i: idx.ank },
  ];

  const points: PlumbPoint[] = [];
  for (const c of checkpoints) {
    const p = lm[c.i];
    if (v(p) <= 0.25) continue;
    const isBase = c.i === baseIdx;
    // + = anterior (forward, toward the face).
    const offsetPct = round1((((p.x - lineX) * facingSign * aspectRatio) / bodyScale) * 100);
    points.push({
      name: c.name,
      x: p.x,
      y: p.y,
      offsetPct,
      onLine: isBase || Math.abs(offsetPct) <= SIDE_TOL_PCT,
    });
  }
  if (points.length === 0) return null;

  return finalize('side', lineX, points, [], facingSign, base.y);
}

function finalize(
  view: PlumbView,
  lineX: number,
  points: PlumbPoint[],
  symmetry: SymmetryPair[],
  facingSign: number,
  bottomY: number
): ClinicalPlumbLine {
  // Score from the checkpoints' mean absolute offset (the ankle base is ~0).
  const offsets = points.map((p) => Math.abs(p.offsetPct));
  const score = offsets.length ? round1(offsets.reduce((a, b) => a + b, 0) / offsets.length) : 0;
  const aligned = points.every((p) => p.onLine) && symmetry.every((s) => s.level);
  const topY = Math.min(...points.map((p) => p.y), bottomY) - 0.03;

  return {
    view,
    lineX,
    topY: Math.max(0, topY),
    bottomY,
    facingSign,
    points,
    symmetry,
    score,
    rating: ratingFor(score),
    aligned,
  };
}

const PLUMB_COLOR: Record<Severity, string> = {
  normal: '#22c55e',
  mild: '#eab308',
  moderate: '#f97316',
  severe: '#ef4444',
};

/**
 * Render the clinical plumb line onto a canvas context (pixel space already):
 * the vertical reference line, each anatomical checkpoint with its deviation,
 * and — in the front view — the left/right symmetry bars.
 */
export function drawClinicalPlumbLine(
  ctx: CanvasRenderingContext2D,
  plumb: ClinicalPlumbLine,
  w: number,
  h: number,
  // When false, only the visual guides (lines, dots, connectors, symmetry bars)
  // are drawn — no text labels. Used by the live capture view so the overlay on
  // the person's body stays clean ("only AI", no writing).
  showLabels = true
) {
  const lineX = plumb.lineX * w;
  const topY = plumb.topY * h;
  const bottomY = plumb.bottomY * h;
  const lineColor = PLUMB_COLOR[plumb.rating];

  ctx.save();

  // Moving BODY line (drawn FIRST so it sits BEHIND the fixed plumb reference):
  // the subject's actual central axis, connecting the anatomical checkpoints
  // head→foot. This line shifts and bends as the person moves, so the gap
  // between it and the fixed vertical plumb shows at a glance whether they are
  // standing on the centerline (green = sahi / aligned) or off it (red = galat).
  if (plumb.points.length >= 2) {
    // Order points top→bottom so the polyline reads head → foot.
    const axis = [...plumb.points].sort((a, b) => a.y - b.y);

    // Soft dark backing so the coloured body line stays readable over the video.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(axis[0].x * w, axis[0].y * h);
    for (let i = 1; i < axis.length; i++) ctx.lineTo(axis[i].x * w, axis[i].y * h);
    ctx.stroke();

    // Each segment is green where both ends sit on the plumb, red where the body
    // drifts off it — a live "sahi / galat" read of the posture.
    ctx.lineWidth = 3.5;
    for (let i = 1; i < axis.length; i++) {
      const a = axis[i - 1];
      const b = axis[i];
      ctx.strokeStyle = a.onLine && b.onLine ? '#22c55e' : '#ff4d4d';
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }

  // Vertical plumb reference — dashed, full height of the body, with a glow.
  ctx.setLineDash([10, 8]);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(lineX, Math.max(0, topY - 24));
  ctx.lineTo(lineX, bottomY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // View tag at the top of the line.
  if (showLabels) {
    const tag =
      plumb.view === 'front' ? 'PLUMB · FRONT' : plumb.view === 'back' ? 'PLUMB · BACK' : 'PLUMB · LATERAL';
    ctx.font = 'bold 15px Arial';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(lineX - tw / 2 - 6, Math.max(0, topY - 24), tw + 12, 22);
    ctx.fillStyle = lineColor;
    ctx.fillText(tag, lineX - tw / 2, Math.max(2, topY - 22));
  }

  // Anatomical checkpoints: connector from the line to the point + label.
  ctx.font = 'bold 13px Arial';
  ctx.textBaseline = 'middle';
  for (const p of plumb.points) {
    const px = p.x * w;
    const py = p.y * h;
    const color = p.onLine ? '#22c55e' : '#ff4d4d';

    // Connector showing the horizontal deviation from the line.
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineX, py);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Point marker.
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Label: name + signed deviation (or "on line").
    if (showLabels) {
      const dirWord =
        plumb.view === 'side'
          ? p.offsetPct >= 0
            ? 'ant'
            : 'post'
          : p.offsetPct >= 0
            ? 'R'
            : 'L';
      const label = p.onLine ? p.name : `${p.name} ${Math.abs(p.offsetPct)}% ${dirWord}`;
      const onRight = px >= lineX;
      const labelW = ctx.measureText(label).width;
      const lx = onRight ? px + 10 : px - 10 - labelW;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(lx - 4, py - 10, labelW + 8, 20);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(label, lx, py);
    }
  }

  // Front-view symmetry bars: left↔right level checks.
  for (const s of plumb.symmetry) {
    const lx = s.leftX * w;
    const ly = s.leftY * h;
    const rx = s.rightX * w;
    const ry = s.rightY * h;
    const color = s.level ? '#22c55e' : '#ff9800';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.setLineDash([]);

    if (showLabels) {
      const label = s.level ? `${s.name} level` : `${s.name} ${s.tiltDeg}° (${s.higher} high)`;
      ctx.font = 'bold 12px Arial';
      const labelW = ctx.measureText(label).width;
      const midX = (lx + rx) / 2 - labelW / 2;
      const midY = (ly + ry) / 2 - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(midX - 4, midY - 9, labelW + 8, 18);
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(label, midX, midY);
    }
  }

  ctx.restore();
}
