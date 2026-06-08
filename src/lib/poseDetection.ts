import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let poseLandmarker: PoseLandmarker | null = null;

export async function initializePoseLandmarker() {
  if (poseLandmarker) return poseLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  return poseLandmarker;
}

const LANDMARK_NAMES = [
  'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner',
  'right_eye', 'right_eye_outer', 'left_ear', 'right_ear', 'mouth_left',
  'mouth_right', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index',
  'right_index', 'left_thumb', 'right_thumb', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'left_heel',
  'right_heel', 'left_foot_index', 'right_foot_index'
];

export function getLandmarkName(index: number): string {
  return LANDMARK_NAMES[index] || `landmark_${index}`;
}

export function drawPoseSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[],
  videoWidth: number,
  videoHeight: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw connections (skeleton)
  const connections = [
    [11, 12], // shoulders
    [11, 13], // left shoulder-elbow
    [13, 15], // left elbow-wrist
    [12, 14], // right shoulder-elbow
    [14, 16], // right elbow-wrist
    [11, 23], // left shoulder-hip
    [12, 24], // right shoulder-hip
    [23, 24], // hips
    [23, 25], // left hip-knee
    [25, 27], // left knee-ankle
    [24, 26], // right hip-knee
    [26, 28], // right knee-ankle
    [5, 6], // eyes
    [5, 4], // left eye
    [2, 3], // left eye detail
    [7, 8], // ears
  ];

  // Draw skeleton lines
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;

  for (const [start, end] of connections) {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];

    if (startLandmark?.visibility > 0.5 && endLandmark?.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(startLandmark.x * videoWidth, startLandmark.y * videoHeight);
      ctx.lineTo(endLandmark.x * videoWidth, endLandmark.y * videoHeight);
      ctx.stroke();
    }
  }

  // Draw landmarks as circles
  ctx.fillStyle = '#00ff00';
  for (const landmark of landmarks) {
    if (landmark.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(landmark.x * videoWidth, landmark.y * videoHeight, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResult {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
}

// MediaPipe's VIDEO mode requires strictly increasing timestamps. Date.now()
// can repeat or go backwards across concurrent callers (e.g. React StrictMode
// double-mounting the capture loop), which makes detectForVideo throw and
// silently kills landmark detection. A monotonic counter avoids that.
let lastTimestamp = 0;

export async function detectPose(videoElement: HTMLVideoElement): Promise<PoseResult | null> {
  if (!poseLandmarker) return null;

  try {
    lastTimestamp = Math.max(lastTimestamp + 1, performance.now());
    const result = poseLandmarker.detectForVideo(videoElement, lastTimestamp);
    if (result.landmarks && result.landmarks.length > 0) {
      return {
        landmarks: result.landmarks[0],
        worldLandmarks: result.worldLandmarks?.[0] || [],
      };
    }
  } catch (error) {
    console.error('Pose detection error:', error);
  }

  return null;
}

export function calculateDistance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2) +
    Math.pow(p2.z - p1.z, 2)
  );
}

export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magnitudeBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magnitudeBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

export function calculateAngle2D(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  const dotProduct = ba.x * bc.x + ba.y * bc.y;
  const magnitudeBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magnitudeBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);

  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}
