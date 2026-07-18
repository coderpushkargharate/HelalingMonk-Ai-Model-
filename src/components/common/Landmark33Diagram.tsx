/**
 * Reference diagram of all 33 MediaPipe Pose landmarks shown on the
 * "Select Positions" page, so the doctor can see every point the 3D pose
 * model tracks. Each point is numbered with its MediaPipe index.
 */

import { getLandmarkName } from '@/lib/poseDetection';

// Approximate front-view layout (person facing the viewer) for each of the
// 33 MediaPipe landmark indices, in the 120 × 170 viewBox below.
const POINTS: [number, number][] = [
  [60, 22],  // 0 nose
  [63, 18],  // 1 left_eye_inner
  [66, 18],  // 2 left_eye
  [69, 18],  // 3 left_eye_outer
  [57, 18],  // 4 right_eye_inner
  [54, 18],  // 5 right_eye
  [51, 18],  // 6 right_eye_outer
  [73, 21],  // 7 left_ear
  [47, 21],  // 8 right_ear
  [63, 27],  // 9 mouth_left
  [57, 27],  // 10 mouth_right
  [78, 44],  // 11 left_shoulder
  [42, 44],  // 12 right_shoulder
  [85, 66],  // 13 left_elbow
  [35, 66],  // 14 right_elbow
  [89, 87],  // 15 left_wrist
  [31, 87],  // 16 right_wrist
  [91, 95],  // 17 left_pinky
  [29, 95],  // 18 right_pinky
  [87, 96],  // 19 left_index
  [33, 96],  // 20 right_index
  [84, 92],  // 21 left_thumb
  [36, 92],  // 22 right_thumb
  [70, 92],  // 23 left_hip
  [50, 92],  // 24 right_hip
  [72, 125], // 25 left_knee
  [48, 125], // 26 right_knee
  [74, 152], // 27 left_ankle
  [46, 152], // 28 right_ankle
  [72, 159], // 29 left_heel
  [48, 159], // 30 right_heel
  [81, 158], // 31 left_foot_index
  [39, 158], // 32 right_foot_index
];

// Skeleton connections between landmark indices.
const CONNECTIONS: [number, number][] = [
  [0, 7], [0, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31],
  [24, 26], [26, 28], [28, 30], [28, 32],
];

interface Props {
  className?: string;
}

export default function Landmark33Diagram({ className }: Props) {
  return (
    <svg viewBox="0 0 120 170" className={className} role="img" aria-label="33 MediaPipe pose landmarks">
      <rect x="0" y="0" width="120" height="170" rx="8" fill="#f8fafc" />

      {/* Skeleton lines */}
      <g stroke="#cbd5e1" strokeWidth={1.4} strokeLinecap="round">
        {CONNECTIONS.map(([a, b], i) => (
          <line key={i} x1={POINTS[a][0]} y1={POINTS[a][1]} x2={POINTS[b][0]} y2={POINTS[b][1]} />
        ))}
      </g>

      {/* Numbered landmark dots */}
      {POINTS.map(([x, y], i) => (
        <g key={i}>
          <title>{`${i} · ${getLandmarkName(i)}`}</title>
          <circle cx={x} cy={y} r={3.4} fill="#0ea5e9" stroke="#fff" strokeWidth={1} />
          <text x={x} y={y - 5} textAnchor="middle" fontSize={3.6} fill="#0f172a" fontWeight="bold">
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}
