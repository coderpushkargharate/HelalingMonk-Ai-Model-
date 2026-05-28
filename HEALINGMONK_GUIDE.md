# HealingMonk - AI Movement Assessment MVP

## Overview

HealingMonk is a fully functional AI-powered posture and movement assessment web application built with React, MediaPipe, and Supabase. It uses computer vision to analyze your posture in real-time and provide detailed feedback with actionable recommendations.

## Key Features

### 1. AI-Powered Pose Detection
- **MediaPipe Integration**: Uses Google's MediaPipe Pose Landmarker for real-time pose detection
- **33 Body Landmarks**: Detects all major joints including:
  - Head, eyes, ears, shoulders
  - Elbows, wrists, hips
  - Knees, ankles
- **Real-time Skeleton Visualization**: Green skeleton overlay shows detected joints during capture

### 2. Comprehensive Posture Analysis
The AI model detects and analyzes:

#### Posture Issues Detected:
- **Forward Head Posture** (High Severity)
  - Detection: Measures nose position relative to shoulder midpoint
  - Formula: If head distance > 25% of shoulder width = forward head detected
  - Recommendation: Chin tucks, neck strengthening exercises

- **Rounded Shoulders** (Medium Severity)
  - Detection: Analyzes shoulder-elbow angle
  - Formula: If angle < 100° = rounded shoulders
  - Recommendation: Shoulder blade squeezes, chest opening

- **Shoulder Imbalance** (Medium Severity)
  - Detection: Vertical height difference between shoulders
  - Formula: If height difference > 8% = imbalance detected
  - Recommendation: Lateral stretches, targeted strengthening

- **Hip Tilt** (Medium Severity)
  - Detection: Measures hip level alignment
  - Formula: If vertical difference > 10% = hip tilt
  - Recommendation: Core stability, glute activation

- **Knee Misalignment** (Medium Severity)
  - Detection: Checks if knees track over ankles
  - Formula: If horizontal deviation > 5% = misalignment
  - Recommendation: Squat form practice

### 3. Multi-Dimensional Scoring System

**Overall Score**: Average of three component scores (0-100)

- **Posture Score (0-100)**
  - Based on detected postural issues and their severity
  - High severity issue: -25 points
  - Medium severity issue: -12 points
  - Low severity issue: -5 points

- **Mobility Score (0-100)**
  - Calculated from elbow and hip joint angles
  - Formula: (avgJointAngle / 180°) × 100
  - Measures range of motion quality

- **Stability Score (0-100)**
  - Calculated from balance metrics
  - Formula: Average of (hip balance + shoulder balance + ankle balance)
  - Measures symmetry and weight distribution

### 4. Frame-Based Analysis
- **Continuous Processing**: Captures frames at ~10 FPS during 5-second assessment
- **Multi-Frame Consensus**: Issues detected in ≥30% of frames are included in results
- **Quality Confidence**: Displays detection confidence (% of visible landmarks)

### 5. Assessment Workflow

1. **Landing** → Select "Start Assessment"
2. **Auth** → Sign up or log in (optional)
3. **Camera Setup** → Grant camera permissions
4. **Instructions** → Read guidelines, understand what's being analyzed
5. **Capture** → Stand naturally, AI analyzes in real-time
   - You see green skeleton overlay
   - 5-second capture window
   - Live quality feedback
6. **Results** → View instant scores and key findings
7. **Report** → Download detailed analysis with recommendations

## Technical Architecture

### Frontend Components
```
src/
├── App.tsx                 # Main app router
├── screens/
│   ├── Landing.tsx         # Welcome screen
│   ├── AuthScreen.tsx      # Login/signup
│   ├── CameraSetup.tsx     # Permission handling
│   ├── Instructions.tsx    # Pre-assessment guide
│   ├── Capture.tsx         # Real-time capture with visualization
│   ├── Results.tsx         # Score summary
│   └── Report.tsx          # Detailed report
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── poseDetection.ts    # MediaPipe integration
│   └── poseAnalyzer.ts     # Analysis logic
```

### AI Model Details

#### MediaPipe Pose Landmarker
- **Model Type**: Lite (efficient for real-time on mobile)
- **Input**: Video frames from webcam
- **Output**: 33 3D landmarks with visibility confidence (0-1)
- **Processing**: Runs in browser (no server required for detection)

#### Analysis Pipeline
```
Raw Landmarks → Visibility Filter → KeyPoint Extraction → 
Angle Calculations → Severity Assessment → Issue Aggregation → 
Score Calculation
```

### Database Schema (Supabase)

```sql
assessments
├── id (UUID, primary key)
├── user_id (FK to auth.users)
├── overall_score (0-100)
├── posture_score (0-100)
├── mobility_score (0-100)
├── stability_score (0-100)
├── assessment_type (enum: posture/squat/combined)
├── created_at (timestamp)
└── updated_at (timestamp)

assessment_findings
├── id (UUID, primary key)
├── assessment_id (FK)
├── finding_type (string)
├── severity (enum: low/medium/high)
├── description (text)
├── recommendation (text)
└── created_at (timestamp)

programs
├── id (UUID, primary key)
├── name (text)
├── description (text)
├── duration_weeks (int)
├── image_url (text)
└── created_at (timestamp)

assessment_programs
├── id (UUID, primary key)
├── assessment_id (FK)
├── program_id (FK)
├── reason (text)
└── created_at (timestamp)
```

## Performance Optimizations

1. **Lightweight Model**: Uses MediaPipe Lite (~6MB)
2. **Frame Sampling**: Processes every 10th frame during capture
3. **Efficient Calculations**: Uses 2D angle calculations for most metrics
4. **Canvas Rendering**: Optimized skeleton drawing
5. **Lazy Loading**: MediaPipe loads only when needed

## Accuracy Considerations

### Strengths
- ✓ Real-time detection on standard webcams
- ✓ Works across device types (mobile, desktop)
- ✓ Robust multi-person rejection (single pose focus)
- ✓ High visibility for major landmarks

### Limitations
- ⚠ Requires visible body (no occlusion)
- ⚠ 2D analysis (z-axis is estimated)
- ⚠ Clothing can affect detection
- ⚠ Lighting quality impacts accuracy

## How to Run

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Calibration & Thresholds

All detection thresholds can be adjusted in `src/lib/poseAnalyzer.ts`:

```typescript
// Forward head detection threshold (currently 25% of shoulder width)
if (shoulderWidth > 0 && distance / shoulderWidth > 0.25) { ... }

// Rounded shoulders threshold (currently 100° angle)
if (avgAngle < 100) { ... }

// Shoulder imbalance threshold (currently 8% height difference)
if (heightDiff > 0.08) { ... }
```

## Future Enhancements

1. Multi-movement assessments (squat, lunge, deadlift form)
2. Movement tracking (compare before/after)
3. AI-generated exercise videos based on results
4. Integration with fitness trackers
5. Progress analytics and trend reporting
6. Offline mode support

## Troubleshooting

### "No pose detected"
- Ensure good lighting
- Stand closer to camera
- Wear contrasting clothing

### Low confidence scores
- Move closer to camera
- Improve lighting conditions
- Ensure full body is visible

### Slow performance
- Close other browser tabs
- Check internet connection
- Use newer browser for better performance

## API Endpoints

### Assessment Data
- `POST /assessments` - Create new assessment
- `GET /assessments/{id}` - Retrieve assessment
- `GET /assessments` - List user assessments

### Findings
- `POST /assessment_findings` - Add finding
- `GET /assessment_findings/{assessment_id}` - Get findings

### Programs
- `GET /programs` - Get recommended programs
- `POST /assessment_programs` - Link program to assessment

## Data Privacy

- All pose detection happens **locally in browser** (no server transmission)
- Assessment data encrypted in Supabase
- User data protected by Row Level Security (RLS) policies
- No video/image storage - only landmark data saved

## Support & Feedback

For issues or improvements, please check the troubleshooting section or review the analysis thresholds.

---

**Version**: 1.0.0  
**Last Updated**: May 2026  
**Status**: Production Ready
