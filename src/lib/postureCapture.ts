import { Landmark, calculateAngle2D } from './poseDetection';
import { PosturePoint, analyzePostureVisually } from './postureVisualizer';

// Landmark indices we care about (MediaPipe Pose)
const L = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
};

export interface JointAngle {
  name: string;
  degrees: number;
  status: 'good' | 'bad';
  landmarkIndex: number; // vertex joint where the label is drawn
}

export interface CaptureAnalysis {
  points: PosturePoint[];
  angles: JointAngle[];
  correctPercentage: number;
  goodCount: number;
  badCount: number;
  issues: string[];
}

function visible(landmarks: Landmark[], i: number): boolean {
  return (landmarks[i]?.visibility ?? 0) > 0.5;
}

/**
 * Analyze a single captured frame: which body points are aligned (green) vs
 * out of alignment (red), plus key joint angles in degrees.
 */
export function analyzeCapture(landmarks: Landmark[]): CaptureAnalysis {
  const visual = analyzePostureVisually(landmarks);
  const angles: JointAngle[] = [];

  // vertex = the joint, a/c = the two neighbouring landmarks forming the angle.
  // goodMin/goodMax define the "healthy" range for a relaxed standing posture.
  const addAngle = (
    name: string,
    vertex: number,
    a: number,
    c: number,
    goodMin: number,
    goodMax: number
  ) => {
    if (!visible(landmarks, vertex) || !visible(landmarks, a) || !visible(landmarks, c)) {
      return;
    }
    const degrees = Math.round(calculateAngle2D(landmarks[a], landmarks[vertex], landmarks[c]));
    const status: 'good' | 'bad' = degrees >= goodMin && degrees <= goodMax ? 'good' : 'bad';
    angles.push({ name, degrees, status, landmarkIndex: vertex });
  };

  // Knees should be near-straight when standing (~180°).
  addAngle('Left Knee', L.lKnee, L.lHip, L.lAnkle, 160, 181);
  addAngle('Right Knee', L.rKnee, L.rHip, L.rAnkle, 160, 181);
  // Hips: torso roughly in line with thigh when upright.
  addAngle('Left Hip', L.lHip, L.lShoulder, L.lKnee, 155, 181);
  addAngle('Right Hip', L.rHip, L.rShoulder, L.rKnee, 155, 181);
  // Elbows: arms relaxed at the sides are fairly straight.
  addAngle('Left Elbow', L.lElbow, L.lShoulder, L.lWrist, 140, 181);
  addAngle('Right Elbow', L.rElbow, L.rShoulder, L.rWrist, 140, 181);

  const goodCount = visual.points.filter((p) => p.status === 'correct').length;
  const badCount = visual.points.filter((p) => p.status === 'incorrect').length;

  return {
    points: visual.points,
    angles,
    correctPercentage: visual.correctPercentage,
    goodCount,
    badCount,
    issues: visual.issues,
  };
}

// Skeleton connections drawn between landmarks.
const CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

const GREEN = '#22c55e';
const RED = '#ef4444';
const YELLOW = '#eab308';

function pointColor(status: string): string {
  if (status === 'correct') return GREEN;
  if (status === 'incorrect') return RED;
  return YELLOW;
}

/**
 * Draw the colour-coded skeleton, body points and angle labels onto a canvas
 * context. `toCanvas` maps a normalized landmark (0..1) to pixel coordinates,
 * which lets the caller account for zoom/crop. `scale` sizes lines and text.
 */
export function drawAnnotatedPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  analysis: CaptureAnalysis,
  toCanvas: (lx: number, ly: number) => { x: number; y: number },
  scale = 1
) {
  const statusOf = (idx: number) =>
    analysis.points.find((p) => p.landmarkIndex === idx)?.status ?? 'unknown';

  // Connections
  ctx.lineWidth = 3 * scale;
  for (const [s, e] of CONNECTIONS) {
    const ls = landmarks[s];
    const le = landmarks[e];
    if (!(ls?.visibility && ls.visibility > 0.5 && le?.visibility && le.visibility > 0.5)) continue;

    const ss = statusOf(s);
    const es = statusOf(e);
    if (ss === 'incorrect' || es === 'incorrect') ctx.strokeStyle = RED;
    else if (ss === 'correct' && es === 'correct') ctx.strokeStyle = GREEN;
    else ctx.strokeStyle = YELLOW;

    const p1 = toCanvas(ls.x, ls.y);
    const p2 = toCanvas(le.x, le.y);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Body points (red = bad, green = good, yellow = undetected)
  for (const point of analysis.points) {
    const lm = landmarks[point.landmarkIndex];
    if (!lm || (lm.visibility ?? 0) < 0.5) continue;
    const { x, y } = toCanvas(lm.x, lm.y);
    ctx.fillStyle = pointColor(point.status);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(x, y, 7 * scale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  // Angle labels in degrees
  ctx.font = `bold ${Math.round(16 * scale)}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const a of analysis.angles) {
    const lm = landmarks[a.landmarkIndex];
    if (!lm || (lm.visibility ?? 0) < 0.5) continue;
    const { x, y } = toCanvas(lm.x, lm.y);
    const label = `${a.degrees}°`;
    ctx.lineWidth = 4 * scale;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = a.status === 'good' ? GREEN : RED;
    ctx.strokeText(label, x + 10 * scale, y);
    ctx.fillText(label, x + 10 * scale, y);
  }
}

/**
 * Build a landmark->canvas transform for a centre-cropped digital zoom.
 * The canvas is assumed to be the same pixel size as the source video.
 */
export function makeZoomTransform(videoWidth: number, videoHeight: number, zoom: number) {
  const cropX = (videoWidth - videoWidth / zoom) / 2;
  const cropY = (videoHeight - videoHeight / zoom) / 2;
  return (lx: number, ly: number) => ({
    x: (lx * videoWidth - cropX) * zoom,
    y: (ly * videoHeight - cropY) * zoom,
  });
}

/** Draw the centre-cropped (zoomed) video frame to fill the canvas. */
export function drawZoomedVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  zoom: number
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropW = vw / zoom;
  const cropH = vh / zoom;
  const cropX = (vw - cropW) / 2;
  const cropY = (vh - cropH) / 2;
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, vw, vh);
}
