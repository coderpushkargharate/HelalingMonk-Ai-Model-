import { useEffect, useRef, useState } from 'react';
import { openCamera } from '../lib/camera';
import { initializePoseLandmarker, detectPose, Landmark } from '../lib/poseDetection';
import { computePostureChain, PostureChain } from '../lib/postureVisualizer';
import { computeClinicalPlumbLine, drawClinicalPlumbLine, ClinicalPlumbLine } from '../lib/plumbLine';
import {
  ClinicalAssessment,
  AssessmentCapture,
  ExtraShot,
  MeasureResult,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
} from '../lib/clinicalKnowledge';
import { Camera, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, SwitchCamera, Plus, X, Images } from 'lucide-react';

interface Props {
  assessments: ClinicalAssessment[];
  onComplete: (captures: AssessmentCapture[], extraShots: ExtraShot[]) => void;
  onBack: () => void;
}

// Skeleton connections (MediaPipe Pose indices) — clinically relevant joints
// only. The finger fans and face-mesh links MediaPipe also returns are left out
// so the overlay stays clean and the doctor sees just the assessment skeleton.
const CONNECTIONS: [number, number][] = [
  // Torso + head
  [11, 12], [11, 23], [12, 24], [23, 24], [7, 8], [0, 11], [0, 12],
  // Arms
  [11, 13], [13, 15], [12, 14], [14, 16],
  // Legs
  [23, 25], [25, 27], [24, 26], [26, 28],
  // Feet (ankle → heel → toe, needed for side-view posture)
  [27, 29], [29, 31], [28, 30], [30, 32],
];

// Only these landmarks get a dot. MediaPipe returns 33 points including eyes,
// mouth and individual fingers; those add visual noise with no clinical value,
// so they are hidden — the tracker still follows the whole body, we just draw
// the joints that matter for posture/ROM measurement.
const CLINICAL_POINTS = new Set<number>([
  0, 7, 8, // nose, ears (head reference)
  11, 12, 13, 14, 15, 16, // shoulders, elbows, wrists
  23, 24, 25, 26, 27, 28, // hips, knees, ankles
  29, 30, 31, 32, // heels, foot index
]);

export default function ClinicalCapture({ assessments, onComplete, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const latestLandmarks = useRef<Landmark[] | null>(null);
  // Latest plumb-line result for the frame on screen, so a capture stores the
  // exact alignment the doctor saw (and the live verdict can read it).
  const latestPlumb = useRef<ClinicalPlumbLine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  // Which camera is live: 'user' = front (selfie), 'environment' = back.
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [status, setStatus] = useState('Loading pose model...');
  const [live, setLive] = useState<MeasureResult | null>(null);
  const [livePosture, setLivePosture] = useState<PostureChain | null>(null);
  const [livePlumb, setLivePlumb] = useState<ClinicalPlumbLine | null>(null);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [flash, setFlash] = useState(false);
  const [captures, setCaptures] = useState<Record<string, AssessmentCapture>>({});
  // Extra free-angle photos (multiple per pose allowed) — appended, never
  // overwritten, so the doctor can document a posture from many angles.
  const [extraShots, setExtraShots] = useState<ExtraShot[]>([]);

  const current = assessments[index];
  // Keep a ref of the active assessment so the animation loop always measures
  // the one currently on screen without restarting the loop each time.
  const currentRef = useRef(current);
  currentRef.current = current;

  // (Re)open the camera with the requested lens, stopping any previous stream
  // first so switching front↔back never leaves a second camera running.
  const startStream = async (mode: 'user' | 'environment') => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const stream = await openCamera(mode);
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
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
  };

  // Toggle between the front (selfie) and rear camera.
  const flipCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setReady(false);
    setStatus('Switching camera...');
    try {
      await startStream(next);
    } catch (err) {
      setStatus('Could not switch camera.');
      console.error(err);
    }
  };

  useEffect(() => {
    const setup = async () => {
      // Open the camera FIRST so the live preview appears instantly, then load
      // the (multi-MB) pose model in parallel. The render loop safely returns no
      // landmarks until the model is ready, so tracking simply switches on the
      // moment the download finishes — the doctor never waits on a black screen.
      try {
        await startStream('user');
      } catch (err) {
        setStatus('Camera setup failed. Please allow camera access.');
        console.error(err);
        return;
      }
      try {
        setStatus('Loading pose model...');
        await initializePoseLandmarker();
        setStatus('Tracking...');
      } catch (err) {
        setStatus('Pose model failed to load. Check your connection.');
        console.error(err);
      }
    };
    setup();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const aspect = (video.videoWidth / video.videoHeight) || 16 / 9;
          const measure = currentRef.current.measure(result.landmarks);
          setLive(measure);
          const chain = computePostureChain(result.landmarks, aspect);
          setLivePosture(chain);
          const plumb = computeClinicalPlumbLine(result.landmarks, currentRef.current.view, aspect);
          latestPlumb.current = plumb;
          setLivePlumb(plumb);
          drawScene(canvas, video, result.landmarks, measure, plumb);
        } else {
          latestLandmarks.current = null;
          latestPlumb.current = null;
          setBodyDetected(false);
          clearCanvas(canvas, video);
          setLive(null);
          setLivePosture(null);
          setLivePlumb(null);
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
    measure: MeasureResult,
    plumb: ClinicalPlumbLine | null
  ) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

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

    // Landmark dots — only the clinically relevant joints, so the face-mesh and
    // finger points don't clutter the image the doctor reviews.
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i];
      if (!p || !seen(i) || !CLINICAL_POINTS.has(i)) continue;
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

    // Clinical plumb line: the vertical reference plus the anatomical
    // checkpoints it should pass through, and (front view) the left/right
    // symmetry bars. Drawn here so its labels sit on top of the skeleton.
    if (plumb) {
      drawClinicalPlumbLine(ctx, plumb, w, h);

      // Aggregate alignment summary, top-centre.
      const summary = plumb.aligned
        ? 'Plumb line: aligned'
        : `Plumb deviation: ${plumb.score.toFixed(1)}% · ${SEVERITY_LABEL[plumb.rating]}`;
      ctx.font = 'bold 18px Arial';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const sw = ctx.measureText(summary).width;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(w / 2 - sw / 2 - 8, 44, sw + 16, 28);
      ctx.fillStyle = SEVERITY_COLOR[plumb.rating];
      ctx.fillText(summary, w / 2 - sw / 2, 49);
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

  // Grab the current frame as { raw (no overlay), overlay (pose points baked in) }
  // JPEG data URLs. Returns null if the video/canvas aren't ready.
  const snapshot = (): { raw: string; overlay: string } | null => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return null;

    const raw = document.createElement('canvas');
    raw.width = video.videoWidth;
    raw.height = video.videoHeight;
    const rctx = raw.getContext('2d');
    if (!rctx) return null;
    rctx.drawImage(video, 0, 0, raw.width, raw.height);

    const out = document.createElement('canvas');
    out.width = video.videoWidth;
    out.height = video.videoHeight;
    const octx = out.getContext('2d');
    if (!octx) return null;
    octx.drawImage(video, 0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0, out.width, out.height);

    return { raw: raw.toDataURL('image/jpeg', 0.85), overlay: out.toDataURL('image/jpeg', 0.85) };
  };

  const flashShutter = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
  };

  // Capture an additional angle for the current pose. Appended to a gallery
  // (never overwrites the primary capture) so a posture can be documented from
  // as many angles as the doctor wants.
  const handleCaptureExtra = () => {
    const shot = snapshot();
    if (!shot) return;
    const count = extraShots.filter((s) => s.assessmentId === current.id).length + 1;
    setExtraShots((prev) => [
      ...prev,
      {
        id: `${current.id}-${Date.now()}`,
        assessmentId: current.id,
        label: `${current.name} · angle ${count}`,
        imageData: shot.overlay,
        rawImageData: shot.raw,
        timestamp: Date.now(),
      },
    ]);
    flashShutter();
  };

  const removeExtra = (id: string) => setExtraShots((prev) => prev.filter((s) => s.id !== id));

  const handleCapture = () => {
    const shot = snapshot();
    if (!shot) return;
    const lm = latestLandmarks.current;
    const video = videoRef.current!;

    const measure = lm
      ? current.measure(lm)
      : { value: null, severity: null, points: [], detail: 'N/A' };
    const aspect = (video.videoWidth / video.videoHeight) || 16 / 9;
    const chain = lm ? computePostureChain(lm, aspect) : null;
    // Plumb line for this exact frame — the alignment verdict shown in the report.
    const plumb = latestPlumb.current ?? (lm ? computeClinicalPlumbLine(lm, current.view, aspect) : null);
    const capture: AssessmentCapture = {
      assessmentId: current.id,
      value: measure.value,
      severity: measure.severity,
      imageData: shot.overlay,
      rawImageData: shot.raw,
      postureDeviation: chain
        ? {
            score: chain.score,
            rating: chain.rating,
            joints: chain.joints
              .filter((j) => !j.isBase)
              .map((j) => ({ name: j.name, angle: j.angle, aligned: j.aligned })),
          }
        : undefined,
      plumbLine: plumb
        ? {
            view: plumb.view,
            score: plumb.score,
            rating: plumb.rating,
            aligned: plumb.aligned,
            points: plumb.points.map((p) => ({ name: p.name, offsetPct: p.offsetPct, onLine: p.onLine })),
            symmetry: plumb.symmetry.map((s) => ({
              name: s.name,
              tiltDeg: s.tiltDeg,
              level: s.level,
              higher: s.higher,
            })),
          }
        : undefined,
      timestamp: Date.now(),
    };
    setCaptures((prev) => ({ ...prev, [current.id]: capture }));

    // Shutter flash so the doctor sees the photo was taken instantly.
    flashShutter();

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
    onComplete(ordered, extraShots);
  };

  const currentExtras = extraShots.filter((s) => s.assessmentId === current?.id);

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {/* Shutter flash on capture */}
      <div
        className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-40"
        style={{ opacity: flash ? 0.85 : 0 }}
      />

      {/* Position verdict — driven by the plumb line. Tells the doctor/patient at
          a glance whether the standing position is correct before capturing. */}
      {bodyDetected && livePlumb && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div
            className={`px-4 py-2 rounded-full flex items-center gap-2 shadow-lg text-sm font-bold ${
              livePlumb.aligned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {livePlumb.aligned ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {livePlumb.aligned
              ? 'Position correct · Sahi hai'
              : `Adjust position · ${livePlumb.score.toFixed(0)}% off`}
          </div>
        </div>
      )}

      {/* Body detection indicator */}
      <div className="absolute top-24 right-4 z-20 flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
            bodyDetected ? 'bg-green-600 text-white' : 'bg-black/60 text-gray-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${bodyDetected ? 'bg-white' : 'bg-gray-400 animate-pulse'}`} />
          {bodyDetected ? 'Body detected · points live' : 'Stand in frame...'}
        </span>
      </div>

      {/* Front/back camera toggle — floats in the clear right-middle area so it
          never sits under the top-bar text and stays easy to tap. */}
      <button
        onClick={flipCamera}
        title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
        className="absolute top-1/2 -translate-y-1/2 right-3 z-30 bg-black/70 hover:bg-black/90 active:scale-95 text-white text-sm font-semibold pl-3 pr-4 py-3 rounded-full flex items-center gap-2 shadow-lg"
      >
        <SwitchCamera className="w-5 h-5" />
        {facingMode === 'user' ? 'Front' : 'Back'}
      </button>

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

        {livePosture && (
          <div className="bg-black/55 backdrop-blur rounded-xl p-4 w-44 mt-3">
            <p className="text-gray-300 text-xs">Deviation from ideal</p>
            <p className="text-3xl font-bold text-white mt-1">{livePosture.score.toFixed(0)}°</p>
            <span
              className="inline-block mt-2 text-xs font-semibold px-2 py-1 rounded text-white"
              style={{ backgroundColor: SEVERITY_COLOR[livePosture.rating] }}
            >
              {SEVERITY_LABEL[livePosture.rating]}
            </span>
          </div>
        )}
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

          {/* Extra angle shots for THIS pose — a gallery the doctor can add to
              freely. Each is removable; all flow into the report. */}
          {currentExtras.length > 0 && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-white/70">
                <Images className="w-3.5 h-3.5" /> Extra angles ({currentExtras.length})
              </span>
              {currentExtras.map((s) => (
                <div key={s.id} className="relative flex-shrink-0" style={{ width: 56, height: 42 }}>
                  <img src={s.imageData} alt={s.label} className="w-full h-full object-cover rounded-md border border-white/20" />
                  <button
                    onClick={() => removeExtra(s.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow"
                    title="Remove this angle"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
              onClick={handleCaptureExtra}
              disabled={!ready}
              title="Capture another angle of this pose"
              className="bg-white/15 hover:bg-white/25 disabled:opacity-30 text-white px-4 py-4 rounded-xl flex items-center gap-1.5 text-sm font-semibold"
            >
              <Plus className="w-5 h-5" /> Angle
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
