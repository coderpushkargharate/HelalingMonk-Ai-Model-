import { Landmark } from './poseDetection';

export interface PosturePoint {
  landmarkIndex: number;
  name: string;
  status: 'correct' | 'incorrect' | 'unknown';
  x: number;
  y: number;
  confidence: number;
}

export interface PostureAnalysis {
  points: PosturePoint[];
  overallCorrect: boolean;
  correctPercentage: number;
  issues: string[];
}

// Define correct posture thresholds for key landmarks
const POSTURE_THRESHOLDS = {
  // Head position (should be over shoulders)
  head: {
    landmarkIndex: 0, // nose
    idealRelativeTo: [11, 12], // shoulders
    maxHorizontalDeviation: 0.1, // 10% of shoulder width
  },
  // Shoulders (should be level)
  leftShoulder: {
    landmarkIndex: 11,
    level: true,
  },
  rightShoulder: {
    landmarkIndex: 12,
    level: true,
  },
  // Hips (should be level)
  leftHip: {
    landmarkIndex: 23,
    level: true,
  },
  rightHip: {
    landmarkIndex: 24,
    level: true,
  },
};

export function analyzePostureVisually(landmarks: Landmark[]): PostureAnalysis {
  const points: PosturePoint[] = [];
  const issues: string[] = [];

  // Check head position
  const headStatus = checkHeadPosition(landmarks);
  points.push({
    landmarkIndex: 0,
    name: 'Head',
    status: headStatus,
    x: landmarks[0].x,
    y: landmarks[0].y,
    confidence: landmarks[0].visibility || 0,
  });
  if (headStatus === 'incorrect') {
    issues.push('Head forward posture detected');
  }

  // Check shoulder level
  const shoulderStatus = checkShoulderLevel(landmarks);
  points.push({
    landmarkIndex: 11,
    name: 'Left Shoulder',
    status: shoulderStatus,
    x: landmarks[11].x,
    y: landmarks[11].y,
    confidence: landmarks[11].visibility || 0,
  });
  points.push({
    landmarkIndex: 12,
    name: 'Right Shoulder',
    status: shoulderStatus,
    x: landmarks[12].x,
    y: landmarks[12].y,
    confidence: landmarks[12].visibility || 0,
  });
  if (shoulderStatus === 'incorrect') {
    issues.push('Shoulders not level');
  }

  // Check hip level
  const hipStatus = checkHipLevel(landmarks);
  points.push({
    landmarkIndex: 23,
    name: 'Left Hip',
    status: hipStatus,
    x: landmarks[23].x,
    y: landmarks[23].y,
    confidence: landmarks[23].visibility || 0,
  });
  points.push({
    landmarkIndex: 24,
    name: 'Right Hip',
    status: hipStatus,
    x: landmarks[24].x,
    y: landmarks[24].y,
    confidence: landmarks[24].visibility || 0,
  });
  if (hipStatus === 'incorrect') {
    issues.push('Hips not level');
  }

  // Check spine alignment
  const spineStatus = checkSpineAlignment(landmarks);
  if (spineStatus === 'incorrect') {
    issues.push('Spine not aligned');
  }

  // Check knee alignment
  const leftKneeStatus = checkKneeAlignment(landmarks, 'left');
  const rightKneeStatus = checkKneeAlignment(landmarks, 'right');

  points.push({
    landmarkIndex: 25,
    name: 'Left Knee',
    status: leftKneeStatus,
    x: landmarks[25].x,
    y: landmarks[25].y,
    confidence: landmarks[25].visibility || 0,
  });
  points.push({
    landmarkIndex: 26,
    name: 'Right Knee',
    status: rightKneeStatus,
    x: landmarks[26].x,
    y: landmarks[26].y,
    confidence: landmarks[26].visibility || 0,
  });

  if (leftKneeStatus === 'incorrect' || rightKneeStatus === 'incorrect') {
    issues.push('Knee alignment incorrect');
  }

  // Check ankle alignment
  const leftAnkleStatus = checkAnkleAlignment(landmarks, 'left');
  const rightAnkleStatus = checkAnkleAlignment(landmarks, 'right');

  points.push({
    landmarkIndex: 27,
    name: 'Left Ankle',
    status: leftAnkleStatus,
    x: landmarks[27].x,
    y: landmarks[27].y,
    confidence: landmarks[27].visibility || 0,
  });
  points.push({
    landmarkIndex: 28,
    name: 'Right Ankle',
    status: rightAnkleStatus,
    x: landmarks[28].x,
    y: landmarks[28].y,
    confidence: landmarks[28].visibility || 0,
  });

  // Calculate overall correctness
  const correctCount = points.filter((p) => p.status === 'correct').length;
  const totalCount = points.filter((p) => p.confidence > 0.5).length;
  const correctPercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return {
    points,
    overallCorrect: issues.length === 0,
    correctPercentage,
    issues,
  };
}

function checkHeadPosition(landmarks: Landmark[]): 'correct' | 'incorrect' | 'unknown' {
  if (landmarks[0].visibility < 0.5) return 'unknown';

  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) return 'unknown';

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const deviation = Math.abs(nose.x - shoulderMidX);

  // Allow 10% deviation
  return deviation < 0.1 ? 'correct' : 'incorrect';
}

function checkShoulderLevel(landmarks: Landmark[]): 'correct' | 'incorrect' | 'unknown' {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) return 'unknown';

  const yDiff = Math.abs(leftShoulder.y - rightShoulder.y);

  // Allow 5% vertical difference
  return yDiff < 0.05 ? 'correct' : 'incorrect';
}

function checkHipLevel(landmarks: Landmark[]): 'correct' | 'incorrect' | 'unknown' {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (leftHip.visibility < 0.5 || rightHip.visibility < 0.5) return 'unknown';

  const yDiff = Math.abs(leftHip.y - rightHip.y);

  // Allow 5% vertical difference
  return yDiff < 0.05 ? 'correct' : 'incorrect';
}

function checkSpineAlignment(landmarks: Landmark[]): 'correct' | 'incorrect' | 'unknown' {
  const nose = landmarks[0];
  const shoulder = landmarks[11];
  const hip = landmarks[23];

  if (nose.visibility < 0.5 || shoulder.visibility < 0.5 || hip.visibility < 0.5) {
    return 'unknown';
  }

  // Calculate spine straightness by checking x-deviation
  const shoulderToHipX = hip.x - shoulder.x;
  const noseToShoulderX = shoulder.x - nose.x;

  // They should be roughly aligned (similar x deviation)
  const deviation = Math.abs(shoulderToHipX - noseToShoulderX);

  return deviation < 0.15 ? 'correct' : 'incorrect';
}

function checkKneeAlignment(landmarks: Landmark[], side: 'left' | 'right'): 'correct' | 'incorrect' | 'unknown' {
  const kneeIdx = side === 'left' ? 25 : 26;
  const ankleIdx = side === 'left' ? 27 : 28;
  const hipIdx = side === 'left' ? 23 : 24;

  const knee = landmarks[kneeIdx];
  const ankle = landmarks[ankleIdx];
  const hip = landmarks[hipIdx];

  if (knee.visibility < 0.5 || ankle.visibility < 0.5 || hip.visibility < 0.5) {
    return 'unknown';
  }

  // Knee should be roughly vertically aligned with ankle
  const xDiff = Math.abs(knee.x - ankle.x);

  return xDiff < 0.05 ? 'correct' : 'incorrect';
}

function checkAnkleAlignment(landmarks: Landmark[], side: 'left' | 'right'): 'correct' | 'incorrect' | 'unknown' {
  const ankleIdx = side === 'left' ? 27 : 28;
  const heelIdx = side === 'left' ? 29 : 30;

  const ankle = landmarks[ankleIdx];
  const heel = landmarks[heelIdx];

  if (ankle.visibility < 0.5 || heel.visibility < 0.5) {
    return 'unknown';
  }

  // Ankles should be relatively straight
  const xDiff = Math.abs(ankle.x - heel.x);

  return xDiff < 0.08 ? 'correct' : 'incorrect';
}

// Draw visualization with green/red indicators
export function drawPostureVisualization(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[],
  analysis: PostureAnalysis,
  videoWidth: number,
  videoHeight: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw skeleton connections with color coding
  const connections = [
    [11, 12], // shoulders
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

  // Draw connections
  ctx.lineWidth = 3;
  for (const [start, end] of connections) {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];

    if (startLandmark?.visibility > 0.5 && endLandmark?.visibility > 0.5) {
      const startPoint = analysis.points.find((p) => p.landmarkIndex === start);
      const endPoint = analysis.points.find((p) => p.landmarkIndex === end);

      // Use color based on status
      const startStatus = startPoint?.status || 'unknown';
      const endStatus = endPoint?.status || 'unknown';

      if (startStatus === 'correct' && endStatus === 'correct') {
        ctx.strokeStyle = '#00ff00'; // Green for correct
      } else if (startStatus === 'incorrect' || endStatus === 'incorrect') {
        ctx.strokeStyle = '#ff0000'; // Red for incorrect
      } else {
        ctx.strokeStyle = '#ffff00'; // Yellow for unknown
      }

      ctx.beginPath();
      ctx.moveTo(startLandmark.x * videoWidth, startLandmark.y * videoHeight);
      ctx.lineTo(endLandmark.x * videoWidth, endLandmark.y * videoHeight);
      ctx.stroke();
    }
  }

  // Draw landmarks with color coding
  for (const point of analysis.points) {
    const landmark = landmarks[point.landmarkIndex];
    if (!landmark || landmark.visibility < 0.5) continue;

    const x = landmark.x * videoWidth;
    const y = landmark.y * videoHeight;
    const radius = 8;

    // Set color based on status
    if (point.status === 'correct') {
      ctx.fillStyle = '#00ff00'; // Green
      ctx.strokeStyle = '#00aa00';
    } else if (point.status === 'incorrect') {
      ctx.fillStyle = '#ff0000'; // Red
      ctx.strokeStyle = '#aa0000';
    } else {
      ctx.fillStyle = '#ffff00'; // Yellow
      ctx.strokeStyle = '#aaaa00';
    }

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  // Draw status text at the bottom
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  const statusText = `Posture Correctness: ${analysis.correctPercentage}%`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeText(statusText, 20, videoHeight - 20);
  ctx.fillText(statusText, 20, videoHeight - 20);
}
