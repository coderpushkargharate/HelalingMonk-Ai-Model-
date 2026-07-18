import { Landmark } from '@/lib/poseDetection';
import type { ClinicalPlumbLine } from '@/lib/plumbLine';

/**
 * Live positioning coach for the camera screen. Looks at the tracked body and
 * the plumb line and tells the user, in plain language + a big on-screen arrow,
 * how to stand: come into frame, centre yourself, step back so the whole body
 * fits, or stand tall. This turns the raw skeleton into friendly guidance —
 * important because the person is usually too far from the screen to read text.
 */

export type GuidanceStatus =
  | 'no-body'
  | 'move-left'
  | 'move-right'
  | 'step-back'
  | 'come-closer'
  | 'align'
  | 'correct';

export interface Guidance {
  status: GuidanceStatus;
  en: string;
  hi: string;
  /** Big directional arrow to draw, if any. */
  arrow: 'left' | 'right' | null;
  /** true when the user is well-positioned and can hold still / capture. */
  ready: boolean;
}

// Key body points used to gauge framing: nose, shoulders, hips, knees, ankles.
const KEY = [0, 11, 12, 23, 24, 25, 26, 27, 28];
const vv = (l?: Landmark) => l?.visibility ?? 1;

export function computeGuidance(lm: Landmark[], plumb: ClinicalPlumbLine | null): Guidance {
  const pts = KEY.map((i) => lm[i]).filter((p) => p && vv(p) > 0.3);
  if (pts.length < 4) {
    return {
      status: 'no-body',
      en: 'Stand in front of the camera',
      hi: 'कैमरे के सामने खड़े हों',
      arrow: null,
      ready: false,
    };
  }

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bodyH = maxY - minY;
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const anklesVisible = vv(lm[27]) > 0.3 || vv(lm[28]) > 0.3;

  // Whole body must be in frame: head not clipped at the top, feet visible, and
  // the body not so large it overflows the edges.
  if (!anklesVisible || minY < 0.04 || bodyH > 0.92) {
    return {
      status: 'step-back',
      en: 'Step back — fit your whole body in the frame',
      hi: 'थोड़ा पीछे हटें — पूरा शरीर फ्रेम में लाएं',
      arrow: null,
      ready: false,
    };
  }
  if (bodyH < 0.5) {
    return {
      status: 'come-closer',
      en: 'Come a little closer',
      hi: 'थोड़ा पास आएं',
      arrow: null,
      ready: false,
    };
  }

  // Centre the body horizontally in the frame.
  if (centerX < 0.4) {
    return {
      status: 'move-right',
      en: 'Move to your right to centre yourself',
      hi: 'बीच में आने के लिए दाईं ओर आएं',
      arrow: 'right',
      ready: false,
    };
  }
  if (centerX > 0.6) {
    return {
      status: 'move-left',
      en: 'Move to your left to centre yourself',
      hi: 'बीच में आने के लिए बाईं ओर आएं',
      arrow: 'left',
      ready: false,
    };
  }

  // In frame and centred — nudge toward a clean, upright stance.
  if (plumb && !plumb.aligned) {
    return {
      status: 'align',
      en: 'Stand tall and straight',
      hi: 'सीधे तनकर खड़े हों',
      arrow: null,
      ready: false,
    };
  }

  return {
    status: 'correct',
    en: 'Perfect — hold still',
    hi: 'बिल्कुल सही — स्थिर रहें',
    arrow: null,
    ready: true,
  };
}

/**
 * Draw the big directional arrow onto a DEDICATED overlay canvas (kept separate
 * from the skeleton canvas so the guidance arrow never ends up baked into the
 * captured report photo). Sizes/clears the canvas to the video each call.
 */
export function drawGuidanceOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  g: Guidance | null
) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!g || !g.arrow) return;

  const dir = g.arrow === 'right' ? 1 : -1;
  const cy = h * 0.5;
  const midX = w * 0.5;
  const half = w * 0.13;
  const tail = midX - dir * half;
  const tip = midX + dir * half;
  const lw = Math.max(6, w * 0.014);
  const head = w * 0.035;

  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.fillStyle = '#f59e0b';
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 10;

  // Shaft
  ctx.beginPath();
  ctx.moveTo(tail, cy);
  ctx.lineTo(tip - dir * head, cy);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(tip, cy);
  ctx.lineTo(tip - dir * head, cy - head);
  ctx.lineTo(tip - dir * head, cy + head);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
