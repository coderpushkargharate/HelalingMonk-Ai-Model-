# HealingMonk AI Model Reference

## Model Specifications

| Property | Value |
|----------|-------|
| **Model** | MediaPipe Pose Landmarker Lite |
| **Landmarks Detected** | 33 (full body) |
| **Processing** | Client-side (browser) |
| **Latency** | ~50-100ms per frame |
| **Frame Rate** | 10 FPS during assessment |
| **Visibility Threshold** | 0.5 (0-1 confidence scale) |
| **Video Size** | 1280×720 (adaptive) |
| **Model Size** | ~6MB |

## 33 Detected Body Landmarks

```
0-10:   Face/Head (nose, eyes, ears, mouth)
11-22:  Torso & Arms (shoulders, elbows, wrists, fingers)
23-28:  Lower Body (hips, knees, ankles)
29-32:  Feet (heels, toe indices)
```

## Analysis Algorithms

### 1. Forward Head Detection
```
Algorithm: Compare nose position to shoulder midpoint
Input: Nose landmark, left shoulder, right shoulder
Output: Boolean (true if forward head detected)

Steps:
1. Calculate shoulder midpoint = (L_shoulder + R_shoulder) / 2
2. Calculate distance = √((nose.x - mid.x)² + (nose.y - mid.y)²)
3. Calculate shoulder width = distance(L_shoulder, R_shoulder)
4. If distance / shoulder_width > 0.25 → FORWARD_HEAD_DETECTED
```

### 2. Rounded Shoulders Detection
```
Algorithm: Analyze shoulder-elbow-wrist angle
Input: Left/right wrist, elbow, shoulder landmarks
Output: Boolean (true if shoulders rounded)

Steps:
1. Calculate left angle = angle(L_wrist, L_elbow, L_shoulder)
2. Calculate right angle = angle(R_wrist, R_elbow, R_shoulder)
3. Calculate average = (left_angle + right_angle) / 2
4. If average < 100° → ROUNDED_SHOULDERS_DETECTED
```

### 3. Shoulder Imbalance Detection
```
Algorithm: Compare vertical shoulder heights
Input: Left shoulder y, Right shoulder y
Output: Boolean & side (true if imbalanced + lower side)

Steps:
1. Calculate height_diff = |L_shoulder.y - R_shoulder.y|
2. If height_diff > 0.08 (8% of frame) → IMBALANCE_DETECTED
3. Determine lower side by comparing y values
```

### 4. Joint Angle Calculation
```
Algorithm: 3D angle between three landmarks
Formula: arccos((BA · BC) / (|BA| × |BC|)) × (180/π)

Where:
- BA = point_A - point_B
- BC = point_C - point_B
- · = dot product
- |BA| = magnitude of BA

Returns: Angle in degrees (0-180)
```

### 5. Scoring Functions

#### Posture Score Calculation
```
score = 100
for each detected issue:
  if severity == "high":
    score -= 25
  elif severity == "medium":
    score -= 12
  else:  # "low"
    score -= 5

final_score = max(0, min(100, score))
```

#### Mobility Score Calculation
```
score = (avg_joint_angle / 180°) × 100
Where avg_joint_angle = (L_elbow_angle + R_elbow_angle + hip_angle) / 3

Range: 0-100
```

#### Stability Score Calculation
```
hip_balance = 100 - |L_hip.y - R_hip.y| × 500
shoulder_balance = 100 - |L_shoulder.y - R_shoulder.y| × 500
ankle_balance = 100 - |L_ankle.x - R_ankle.x| × 500

stability_score = max(0, (hip_balance + shoulder_balance + ankle_balance) / 3)
```

#### Overall Score
```
overall_score = round((posture_score + mobility_score + stability_score) / 3)
```

## Detection Thresholds

| Issue | Threshold | Unit |
|-------|-----------|------|
| Forward Head | >0.25 | ratio to shoulder width |
| Rounded Shoulders | <100° | joint angle |
| Shoulder Imbalance | >0.08 | % of frame height |
| Hip Tilt | >0.10 | % of frame height |
| Knee Misalignment | >0.05 | % of frame width |
| Shallow Squat | >100° | knee angle (when squatting) |
| Forward Lean (squat) | <70° | spine angle |
| Knee Valgus | >0.1 | inward deviation |
| Issue Consensus | ≥30% | % of frames where issue detected |

## Real-Time Data Processing Pipeline

```
1. VIDEO FRAME (1280×720)
   ↓
2. POSE DETECTION (MediaPipe)
   - Detects 33 landmarks
   - Each with (x, y, z, visibility)
   ↓
3. VISIBILITY FILTERING
   - Keep only landmarks with visibility > 0.5
   ↓
4. KEYPOINT EXTRACTION
   - Extract relevant landmarks for analysis
   ↓
5. ANGLE CALCULATIONS
   - Calculate joint angles
   - Calculate distances
   ↓
6. ISSUE DETECTION
   - Forward head, rounded shoulders, etc.
   - Assign severity
   ↓
7. SCORE CALCULATION
   - Posture: based on issues
   - Mobility: based on joint angles
   - Stability: based on symmetry
   ↓
8. FRAME AGGREGATION
   - Store all frame data
   ↓
9. CONSENSUS ANALYSIS (after 5 seconds)
   - Aggregate across all frames
   - Filter issues by >30% threshold
   ↓
10. FINAL REPORT
    - Overall score
    - Component scores
    - Detected issues
    - Recommendations
```

## Confidence Scoring

```
detection_confidence = (visible_landmarks / 33) × 100

- 0-33%: Poor detection
- 33-66%: Fair detection
- 66-99%: Good detection
- 99-100%: Excellent detection
```

## Performance Metrics

### Latency Breakdown (per frame)
- Pose Detection: ~30-50ms
- Angle Calculations: ~5-10ms
- Issue Detection: ~5-10ms
- Rendering: ~10-20ms
- **Total: ~50-90ms per frame**

### Browser Performance
- CPU Usage: 15-25% (during capture)
- Memory: 80-150MB
- GPU Acceleration: Enabled when available
- Mobile Performance: Optimized for mid-range devices

## Quality Indicators During Assessment

```
Detection Quality = visible_landmarks / 33

✓ Green (90-100%): Excellent pose tracking
✓ Green (80-89%): Good pose tracking
⚠ Yellow (60-79%): Fair pose tracking
✗ Red (<60%): Poor pose tracking - reposition
```

## Error Handling

### No Pose Detected
- User not visible in frame
- Insufficient lighting
- Occlusion (partial body hidden)

### Low Confidence
- Recommendation: Move closer
- Recommendation: Improve lighting
- Recommendation: Wear contrasting clothing

### Invalid Landmarks
- Automatically filtered (visibility < 0.5)
- Fallback to available landmarks
- Score adjusted based on confidence

## Customization Points

### Adjust Detection Sensitivity
Edit thresholds in `src/lib/poseAnalyzer.ts`:

```typescript
// More sensitive (detect more issues)
if (heightDiff > 0.05) { } // stricter

// Less sensitive (fewer false positives)
if (heightDiff > 0.12) { } // lenient
```

### Change Scoring Weights
```typescript
// Increase penalty for high severity
if (issue.severity === 'high') score -= 35; // was 25

// Adjust overall calculation
overall = (posture * 0.4 + mobility * 0.3 + stability * 0.3)
```

### Modify Issue Types
Add new detection functions in `poseAnalyzer.ts`:

```typescript
function detectNewIssue(keyPoints: KeyPoints): PostureIssue | null {
  // Your analysis logic
  return {
    type: 'new_issue_type',
    severity: 'medium',
    description: 'Issue description',
    recommendation: 'How to fix it'
  };
}
```

## Testing the Model

### Simulate Perfect Posture
- Stand with shoulders back
- Head centered over shoulders
- Level hips and knees
- Expected score: 85-95

### Simulate Poor Posture
- Hunch forward
- Drop one shoulder
- Shift weight to one side
- Expected score: 40-55

### Test Different Lighting
- Natural light: Best accuracy
- Artificial light: Good accuracy
- Low light: Reduced accuracy
- Backlighting: Poor accuracy

---

**For detailed usage, see HEALINGMONK_GUIDE.md**
