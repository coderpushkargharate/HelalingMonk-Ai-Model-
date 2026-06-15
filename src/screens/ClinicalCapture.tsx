import { useEffect, useRef, useState } from 'react';
import { initializePoseLandmarker, detectPose, Landmark } from '../lib/poseDetection';
import {
  ClinicalAssessment,
  AssessmentCapture,
  MeasureResult,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
} from '../lib/clinicalKnowledge';
import { Camera, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';

interface Props {
  assessments: ClinicalAssessment[];
  onComplete: (captures: AssessmentCapture[]) => void;
  onBack: () => void;
}

// Skeleton connections (MediaPipe Pose indices) — full body.
const CONNECTIONS: [number, number][] = [
  // Torso + head
  [11, 12], [11, 23], [12, 24], [23, 24], [7, 8], [0, 11], [0, 12],
  // Arms
  [11, 13], [13, 15], [12, 14], [14, 16],
  // Hands
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
  // Legs
  [23, 25], [25, 27], [24, 26], [26, 28],
  // Feet
  [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32],
];

// Key posture joints labelled with their angle off the ideal line. For each,
// the more-visible side is used and `tol` is the green/red threshold (degrees).
const LABEL_JOINTS: { name: string; left: number; right: number; tol: number }[] = [
  { name: 'Ear', left: 7, right: 8, tol: 6 },
  { name: 'Shoulder', left: 11, right: 12, tol: 6 },
  { name: 'Hip', left: 23, right: 24, tol: 5 },
  { name: 'Knee', left: 25, right: 26, tol: 5 },
];

// X (in pixels) of the vertical "ideal" alignment line — a plumb dropped from
// the ankle midpoint (the clinical posture reference), falling back to hips or
// shoulders if the feet aren't visible.
function idealLineX(lm: Landmark[], w: number): number | null {
  const mid = (a: number, b: number): number | null => {
    const la = lm[a];
    const lb = lm[b];
    if (la && lb && (la.visibility ?? 1) > 0.3 && (lb.visibility ?? 1) > 0.3) {
      return ((la.x + lb.x) / 2) * w;
    }
    return null;
  };
  return mid(27, 28) ?? mid(23, 24) ?? mid(11, 12);
}

export default function ClinicalCapture({ assessments, onComplete, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const latestLandmarks = useRef<Landmark[] | null>(null);

  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading pose model...');
  const [live, setLive] = useState<MeasureResult | null>(null);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [flash, setFlash] = useState(false);
  const [captures, setCaptures] = useState<Record<string, AssessmentCapture>>({});

  const current = assessments[index];
  // Keep a ref of the active assessment so the animation loop always measures
  // the one currently on screen without restarting the loop each time.
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    let stream: MediaStream | null = null;
    const setup = async () => {
      try {
        await initializePoseLandmarker();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          const begin = async () => {
            try {
              await video.play();
            } catch {
              /* autoplay may already be running */
            }
            setReady(true);
            setStatus('Tracking...');
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            loop();
          };
          // Start as soon as we have data; also handle the case where the event
          // already fired before this listener was attached.
          video.addEventListener('loadeddata', begin, { once: true });
          if (video.readyState >= video.HAVE_CURRENT_DATA) begin();
        }
      } catch (err) {
        setStatus('Camera setup failed. Please allow camera access.');
        console.error(err);
      }
    };
    setup();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const loop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    try {
      if (video && canvas && video.videoWidth > 0 && video.readyState >= video.HAVE_CURRENT_DATA) {
        const result = await detectPose(video);
        if (result?.landmarks && result.landmarks.length > 0) {
          latestLandmarks.current = result.landmarks;
          setBodyDetected(true);
          const measure = currentRef.current.measure(result.landmarks);
          setLive(measure);
          drawScene(canvas, video, result.landmarks, measure);
        } else {
          latestLandmarks.current = null;
          setBodyDetected(false);
          clearCanvas(canvas, video);
          setLive(null);
        }
      }
    } catch (err) {
      // Never let a single bad frame kill the render loop.
      console.error('pose loop frame error', err);
    } finally {
      animationRef.current = requestAnimationFrame(loop);
    }
  };

  const clearCanvas = (canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  /** Draw the live skeleton; the active assessment's landmarks are highlighted
   * with the severity colour and the measured value is labelled. */
  const drawScene = (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    lm: Landmark[],
    measure: MeasureResult
  ) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // Vertical "ideal" alignment line — a thin solid red plumb, drawn first so
    // the skeleton and dots sit on top. Baked into the captured snapshot, so it
    // appears on the report image.
    const refX = idealLineX(lm, w);
    if (refX !== null) {
      ctx.save();
      ctx.strokeStyle = '#ff2d2d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(refX, 0);
      ctx.lineTo(refX, h);
      ctx.stroke();

      // "IDEAL" tag at the top of the line.
      ctx.font = 'bold 18px Arial';
      ctx.textBaseline = 'top';
      const tag = 'IDEAL LINE';
      const tw = ctx.measureText(tag).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(refX - tw / 2 - 6, 10, tw + 12, 26);
      ctx.fillStyle = '#ff5252';
      ctx.fillText(tag, refX - tw / 2, 14);
      ctx.restore();
    }

    const active = new Set(measure.points);
    const sevColor = measure.severity ? SEVERITY_COLOR[measure.severity] : '#9ca3af';
    // Treat undefined visibility as visible so dots always render.
    const seen = (i: number) => (lm[i]?.visibility ?? 1) > 0.3;

    // Skeleton lines.
    for (const [a, b] of CONNECTIONS) {
      const la = lm[a];
      const lb = lm[b];
      if (!(seen(a) && seen(b) && la && lb)) continue;
      const highlight = active.has(a) && active.has(b);
      ctx.strokeStyle = highlight ? sevColor : 'rgba(56,189,248,0.9)'; // cyan skeleton
      ctx.lineWidth = highlight ? 6 : 4;
      ctx.beginPath();
      ctx.moveTo(la.x * w, la.y * h);
      ctx.lineTo(lb.x * w, lb.y * h);
      ctx.stroke();
    }

    // Landmark dots — every detected point gets a clear, visible dot.
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i];
      if (!p || !seen(i)) continue;
      const isActive = active.has(i);
      const x = p.x * w;
      const y = p.y * h;
      // White halo so dots stand out against any clothing/background.
      ctx.beginPath();
      ctx.arc(x, y, (isActive ? 11 : 7) + 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      // Coloured core: severity colour for the active region, cyan otherwise.
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 11 : 7, 0, 2 * Math.PI);
      ctx.fillStyle = isActive ? sevColor : '#06b6d4';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }

    // Per-joint deviation labels: each key joint's angle off the ideal line.
    if (refX !== null) {
      // Plumb pivot = ankle midpoint y (falls back to hips, then frame bottom).
      const baseY = (() => {
        const a = lm[27];
        const b = lm[28];
        if (a && b && (a.visibility ?? 1) > 0.3 && (b.visibility ?? 1) > 0.3) {
          return ((a.y + b.y) / 2) * h;
        }
        const ha = lm[23];
        const hb = lm[24];
        if (ha && hb) return ((ha.y + hb.y) / 2) * h;
        return h;
      })();

      const better = (l: number, r: number) =>
        (lm[r]?.visibility ?? 0) > (lm[l]?.visibility ?? 0) ? r : l;

      ctx.font = 'bold 16px Arial';
      ctx.textBaseline = 'middle';
      for (const j of LABEL_JOINTS) {
        const idx = better(j.left, j.right);
        const p = lm[idx];
        if (!p || (p.visibility ?? 1) <= 0.3) continue;

        const jx = p.x * w;
        const jy = p.y * h;
        const angle = Math.abs((Math.atan2(jx - refX, baseY - jy) * 180) / Math.PI);
        const label = `${j.name} ${angle.toFixed(0)}°`;

        // Place the label on the side the joint sits, away from the line.
        const dir = jx >= refX ? 1 : -1;
        const tw = ctx.measureText(label).width;
        const lx = dir > 0 ? jx + 12 : jx - 12 - tw;

        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fillRect(lx - 4, jy - 11, tw + 8, 22);
        ctx.fillStyle = angle <= j.tol ? '#22c55e' : '#ff5252';
        ctx.fillText(label, lx, jy);
      }
    }

    // Measurement label near the first active landmark.
    if (measure.value !== null && measure.points.length > 0) {
      const anchor = lm[measure.points[0]];
      if (anchor) {
        const label = `${currentRef.current.measurementName}: ${measure.detail}`;
        ctx.font = 'bold 26px Arial';
        ctx.textBaseline = 'top';
        const x = anchor.x * w + 14;
        const y = anchor.y * h - 10;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 6, y - 6, tw + 12, 36);
        ctx.fillStyle = sevColor;
        ctx.fillText(label, x, y);
      }
    }
  };

  const handleCapture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const lm = latestLandmarks.current;

    // Raw snapshot: the original camera frame only (no overlay) → report left side.
    const raw = document.createElement('canvas');
    raw.width = video.videoWidth;
    raw.height = video.videoHeight;
    const rctx = raw.getContext('2d');
    if (!rctx) return;
    rctx.drawImage(video, 0, 0, raw.width, raw.height);

    // Overlay snapshot: original frame + the live pose-points overlay → report right side.
    const out = document.createElement('canvas');
    out.width = video.videoWidth;
    out.height = video.videoHeight;
    const octx = out.getContext('2d');
    if (!octx) return;
    octx.drawImage(video, 0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0, out.width, out.height);

    const measure = lm
      ? current.measure(lm)
      : { value: null, severity: null, points: [], detail: 'N/A' };
    const capture: AssessmentCapture = {
      assessmentId: current.id,
      value: measure.value,
      severity: measure.severity,
      imageData: out.toDataURL('image/jpeg', 0.85),
      rawImageData: raw.toDataURL('image/jpeg', 0.85),
      timestamp: Date.now(),
    };
    setCaptures((prev) => ({ ...prev, [current.id]: capture }));

    // Shutter flash so the doctor sees the photo was taken instantly.
    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    // Auto-advance to the next un-captured assessment, if any.
    const nextUncaptured = assessments.findIndex(
      (a, i) => i > index && !captures[a.id]
    );
    if (nextUncaptured !== -1) setIndex(nextUncaptured);
  };

  const captured = captures[current?.id];
  const capturedCount = Object.keys(captures).length;
  const allDone = capturedCount === assessments.length;

  const finish = () => {
    const ordered = assessments
      .map((a) => captures[a.id])
      .filter((c): c is AssessmentCapture => Boolean(c));
    onComplete(ordered);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {/* Shutter flash on capture */}
      <div
        className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-40"
        style={{ opacity: flash ? 0.85 : 0 }}
      />

      {/* Body detection indicator */}
      <div className="absolute top-24 right-4 z-20">
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
            bodyDetected ? 'bg-green-600 text-white' : 'bg-black/60 text-gray-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${bodyDetected ? 'bg-white' : 'bg-gray-400 animate-pulse'}`} />
          {bodyDetected ? 'Body detected · points live' : 'Stand in frame...'}
        </span>
      </div>

      {/* Top bar: current assessment + instruction */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/85 to-transparent p-4 z-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onBack} className="text-white/80 text-sm flex items-center gap-1 hover:text-white">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-white/80 text-sm">
              {index + 1} / {assessments.length} · {capturedCount} captured
            </span>
          </div>
          <h2 className="text-white text-xl font-bold">{current?.name}</h2>
          <p className="text-gray-300 text-sm mt-0.5">{current?.instruction}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded capitalize">{current?.view} view</span>
            <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded">{current?.patientPosition}</span>
            <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded">{current?.landmarkNames.join(' · ')}</span>
          </div>
        </div>
      </div>

      {/* Live measurement readout */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-20 pointer-events-none">
        <div className="bg-black/55 backdrop-blur rounded-xl p-4 w-44">
          <p className="text-gray-300 text-xs">{current?.measurementName}</p>
          <p className="text-4xl font-bold text-white mt-1">
            {live?.value !== null && live?.value !== undefined ? live.detail : '--'}
          </p>
          {live?.severity ? (
            <span
              className="inline-block mt-2 text-xs font-semibold px-2 py-1 rounded text-white"
              style={{ backgroundColor: SEVERITY_COLOR[live.severity] }}
            >
              {SEVERITY_LABEL[live.severity]}
            </span>
          ) : (
            <span className="inline-block mt-2 text-xs text-gray-400">{status}</span>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 z-20">
        <div className="max-w-4xl mx-auto">
          {/* Thumbnails of captured assessments */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
            {assessments.map((a, i) => {
              const cap = captures[a.id];
              return (
                <button
                  key={a.id}
                  onClick={() => setIndex(i)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    i === index ? 'border-green-400' : 'border-transparent opacity-70'
                  }`}
                  style={{ width: 64, height: 48 }}
                  title={a.name}
                >
                  {cap ? (
                    <img src={cap.imageData} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 px-1 text-center">
                      {a.name.split(' ')[0]}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="bg-white/15 disabled:opacity-30 text-white p-3 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleCapture}
              disabled={!ready}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
            >
              {captured ? <RotateCcw className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              {captured ? 'Re-capture' : 'Capture'}
            </button>

            <button
              onClick={() => setIndex((i) => Math.min(assessments.length - 1, i + 1))}
              disabled={index === assessments.length - 1}
              className="bg-white/15 disabled:opacity-30 text-white p-3 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={finish}
            disabled={capturedCount === 0}
            className={`w-full mt-3 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
              allDone
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white/15 hover:bg-white/25 text-white disabled:opacity-40'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {allDone ? 'Generate Report' : `Generate Report (${capturedCount}/${assessments.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
