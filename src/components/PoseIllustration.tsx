/**
 * Anatomical pose illustrations for the "Select Positions" page.
 *
 * Each card shows a muscular figure (front / back / side) posed for that
 * assessment, with the muscle groups the test targets highlighted in red and a
 * faint skeleton drawn over the muscles. Everything is hand-built SVG — no
 * external image assets — so the cards stay crisp at any size and load instantly.
 */

// Muscle fills.
const MUSCLE = '#c97b63'; // resting muscle
const MUSCLE_HI = '#e23b2e'; // targeted / active muscle
const MUSCLE_DK = '#a85a47'; // shaded / deeper muscle
const SKIN = '#f0c8a4'; // head & hands
const BONE = '#f4f7fb'; // skeleton overlay
const OUTLINE = '#7c4a3a';

interface Props {
  pose: string;
  className?: string;
}

type View = 'front' | 'back' | 'side';

interface PoseConfig {
  view: View;
  flip?: boolean;
  highlight: string[];
  // Limb/trunk modifiers (degrees). 0 = neutral standing.
  armL?: number;
  armR?: number;
  legL?: number;
  legR?: number;
  kneeBend?: number; // side view squat
  trunk?: number; // lean / side-bend (front) — signed
  trunkBend?: number; // forward fold (side)
  head?: number; // head rotation
  headFwd?: boolean; // side view forward-head
}

const POSES: Record<string, PoseConfig> = {
  full_body: { view: 'front', highlight: ['all'] },
  full_body_back: { view: 'back', highlight: ['all'] },
  full_body_left: { view: 'side', highlight: ['all'] },
  full_body_right: { view: 'side', flip: true, highlight: ['all'] },
  forward_head: { view: 'side', highlight: ['neck', 'trap'], headFwd: true },
  shoulder_level: { view: 'front', highlight: ['deltoid', 'trap'] },
  pelvic_level: { view: 'front', highlight: ['oblique', 'glute'] },
  lateral_spine: { view: 'front', highlight: ['erector', 'oblique'], trunk: 7 },
  head_tilt: { view: 'front', highlight: ['neck'], head: 14 },
  knee_alignment: { view: 'front', highlight: ['quad'] },
  shoulder_flexion_rom: { view: 'side', highlight: ['deltoid', 'chest'], armR: -150 },
  thoracic_kyphosis: { view: 'side', highlight: ['trap', 'erector'], headFwd: true },
  anterior_pelvic_tilt: { view: 'side', highlight: ['glute', 'abs', 'quad'] },
  scoliosis_adams: { view: 'back', highlight: ['erector', 'lat'], trunkBend: 55 },
  squat_depth: { view: 'side', highlight: ['quad', 'glute', 'calf'], kneeBend: 80 },
  hip_abduction: { view: 'front', highlight: ['glute', 'quad'], legR: -32 },
  shoulder_abduction_rom: { view: 'front', highlight: ['deltoid'], armR: -105 },
  elbow_flexion_rom: { view: 'side', highlight: ['biceps', 'forearm'], armR: -20 },
  trunk_forward_flexion: { view: 'side', highlight: ['erector', 'hamstring'], trunkBend: 70 },
  trunk_lateral_flexion: { view: 'front', highlight: ['oblique'], trunk: 24 },
};

export default function PoseIllustration({ pose, className }: Props) {
  const cfg = POSES[pose] ?? POSES.full_body;
  return (
    <svg viewBox="0 0 100 150" className={className} role="img" aria-label={`${pose} anatomy`}>
      <defs>
        <linearGradient id="poseBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="150" rx="8" fill="url(#poseBg)" />
      <g transform={cfg.flip ? 'translate(100 0) scale(-1 1)' : undefined}>
        {cfg.view === 'side' ? <SideFigure cfg={cfg} /> : <FrontBackFigure cfg={cfg} />}
      </g>
    </svg>
  );
}

/** Highlight helper: a muscle is hot if listed, or when the whole body is shown. */
function hotFn(highlight: string[]) {
  const set = new Set(highlight);
  return (k: string) => (set.has('all') || set.has(k) ? MUSCLE_HI : MUSCLE);
}

// ---------------------------------------------------------------------------
// Front / Back muscular figure
// ---------------------------------------------------------------------------

function FrontBackFigure({ cfg }: { cfg: PoseConfig }) {
  const back = cfg.view === 'back';
  const hot = hotFn(cfg.highlight);
  const trunk = cfg.trunk ?? 0;
  const HIPX = 50;
  const HIPY = 92;

  // Arm groups rotate about the shoulder; legs about the hip.
  const armL = cfg.armL ?? 0;
  const armR = cfg.armR ?? 0;
  const legL = cfg.legL ?? 0;
  const legR = cfg.legR ?? 0;

  return (
    <g stroke={OUTLINE} strokeWidth={0.6} strokeLinejoin="round">
      {/* Legs (behind the trunk so the pelvis overlaps cleanly) */}
      <Leg hipx={45} hipy={HIPY} rot={legL} back={back} hot={hot} />
      <Leg hipx={55} hipy={HIPY} rot={legR} back={back} hot={hot} />

      {/* Upper body rotates as a unit for trunk lean / side-bend */}
      <g transform={`rotate(${trunk} ${HIPX} ${HIPY})`}>
        {/* Head + neck */}
        <g transform={`rotate(${cfg.head ?? 0} 50 30)`}>
          <ellipse cx={50} cy={18} rx={8.5} ry={10.5} fill={SKIN} />
          <rect x={46} y={26} width={8} height={8} rx={3} fill={hot('neck')} />
        </g>

        {/* Trapezius (back) sits on top of the shoulders */}
        {back && (
          <path d="M38 50 Q50 40 62 50 L57 64 Q50 58 43 64 Z" fill={hot('trap')} />
        )}

        {/* Deltoids */}
        <ellipse cx={37} cy={50} rx={7} ry={8} fill={hot('deltoid')} />
        <ellipse cx={63} cy={50} rx={7} ry={8} fill={hot('deltoid')} />

        {/* Torso */}
        {back ? (
          <>
            {/* Lats */}
            <path d="M40 52 Q34 68 43 82 L50 80 L50 52 Z" fill={hot('lat')} />
            <path d="M60 52 Q66 68 57 82 L50 80 L50 52 Z" fill={hot('lat')} />
            {/* Erector spinae channel */}
            <rect x={47} y={52} width={6} height={34} rx={3} fill={hot('erector')} />
          </>
        ) : (
          <>
            {/* Pectorals */}
            <path d="M42 50 Q50 47 50 49 L50 62 Q44 64 41 58 Z" fill={hot('chest')} />
            <path d="M58 50 Q50 47 50 49 L50 62 Q56 64 59 58 Z" fill={hot('chest')} />
            {/* Obliques */}
            <path d="M42 60 Q40 76 46 88 L48 86 L46 62 Z" fill={hot('oblique')} />
            <path d="M58 60 Q60 76 54 88 L52 86 L54 62 Z" fill={hot('oblique')} />
            {/* Rectus abdominis */}
            <g fill={hot('abs')}>
              <rect x={46} y={62} width={8} height={26} rx={3} />
            </g>
            <g stroke={MUSCLE_DK} strokeWidth={0.5}>
              <line x1={50} y1={64} x2={50} y2={86} />
              <line x1={46.5} y1={70} x2={53.5} y2={70} />
              <line x1={46.5} y1={77} x2={53.5} y2={77} />
            </g>
          </>
        )}

        {/* Glutes (back, around the pelvis) */}
        {back && (
          <>
            <ellipse cx={45} cy={90} rx={6} ry={6} fill={hot('glute')} />
            <ellipse cx={55} cy={90} rx={6} ry={6} fill={hot('glute')} />
          </>
        )}

        {/* Arms */}
        <Arm side="L" shx={37} shy={50} rot={armL} back={back} hot={hot} />
        <Arm side="R" shx={63} shy={50} rot={armR} back={back} hot={hot} />

        {/* Skeleton overlay on the trunk */}
        <g stroke={BONE} strokeWidth={0.9} strokeOpacity={0.55} fill="none" strokeLinecap="round">
          <line x1={50} y1={34} x2={50} y2={88} /> {/* spine */}
          <line x1={38} y1={48} x2={62} y2={48} /> {/* clavicle / shoulder line */}
          <line x1={42} y1={88} x2={58} y2={88} /> {/* pelvis */}
          {!back && (
            <>
              <path d="M44 54 Q50 58 56 54" /> {/* rib */}
              <path d="M43 60 Q50 65 57 60" /> {/* rib */}
            </>
          )}
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Side muscular figure (articulated for forward-bend / squat / arm raise)
// ---------------------------------------------------------------------------

function SideFigure({ cfg }: { cfg: PoseConfig }) {
  const hot = hotFn(cfg.highlight);
  const HIPX = 50;
  const HIPY = 90;
  const bend = cfg.trunkBend ?? 0; // forward fold about the hip
  const knee = cfg.kneeBend ?? 0; // squat
  const headFwd = cfg.headFwd ? 8 : 0;

  return (
    <g stroke={OUTLINE} strokeWidth={0.6} strokeLinejoin="round">
      {/* Leg, articulated for squat (thigh + shin) */}
      <g>
        {/* Thigh */}
        <g transform={`rotate(${knee * 0.5} ${HIPX} ${HIPY})`}>
          <path
            d={`M${HIPX - 5} ${HIPY} Q${HIPX + 7} ${HIPY + 8} ${HIPX + 3} ${HIPY + 26} L${HIPX - 6} ${HIPY + 26} Q${HIPX - 8} ${HIPY + 10} ${HIPX - 5} ${HIPY} Z`}
            fill={hot('quad')}
          />
          {/* Hamstring shading behind the thigh */}
          <path d={`M${HIPX - 6} ${HIPY + 2} Q${HIPX - 9} ${HIPY + 14} ${HIPX - 6} ${HIPY + 26} L${HIPX - 4} ${HIPY + 26} L${HIPX - 4} ${HIPY + 2} Z`} fill={hot('hamstring')} />
          {/* Shin */}
          <g transform={`rotate(${-knee} ${HIPX - 1} ${HIPY + 26})`}>
            <path d={`M${HIPX - 5} ${HIPY + 26} L${HIPX + 2} ${HIPY + 26} Q${HIPX} ${HIPY + 42} ${HIPX - 2} ${HIPY + 48} L${HIPX - 6} ${HIPY + 48} Q${HIPX - 7} ${HIPY + 36} ${HIPX - 5} ${HIPY + 26} Z`} fill={hot('calf')} />
            <ellipse cx={HIPX - 7} cy={HIPY + 36} rx={2.5} ry={6} fill={hot('calf')} />
            {/* Foot */}
            <path d={`M${HIPX - 6} ${HIPY + 48} L${HIPX + 6} ${HIPY + 50} L${HIPX + 6} ${HIPY + 53} L${HIPX - 6} ${HIPY + 52} Z`} fill={SKIN} />
          </g>
        </g>
      </g>

      {/* Upper body folds forward about the hip */}
      <g transform={`rotate(${-bend} ${HIPX} ${HIPY})`}>
        {/* Glute */}
        <ellipse cx={HIPX - 6} cy={HIPY - 2} rx={6} ry={6.5} fill={hot('glute')} />

        {/* Trunk (chest front, erector back) */}
        <path d={`M${HIPX - 6} ${HIPY - 2} Q${HIPX - 9} ${HIPY - 24} ${HIPX - 4} ${HIPY - 40} L${HIPX + 6} ${HIPY - 40} Q${HIPX + 8} ${HIPY - 22} ${HIPX + 5} ${HIPY - 2} Z`} fill={hot('chest')} />
        {/* Abs strip (front edge) */}
        <path d={`M${HIPX + 5} ${HIPY - 4} Q${HIPX + 8} ${HIPY - 20} ${HIPX + 6} ${HIPY - 38} L${HIPX + 3} ${HIPY - 38} Q${HIPX + 4} ${HIPY - 20} ${HIPX + 2} ${HIPY - 4} Z`} fill={hot('abs')} />
        {/* Erector (back edge) */}
        <path d={`M${HIPX - 6} ${HIPY - 4} Q${HIPX - 9} ${HIPY - 22} ${HIPX - 4} ${HIPY - 40} L${HIPX - 2} ${HIPY - 40} Q${HIPX - 6} ${HIPY - 22} ${HIPX - 3} ${HIPY - 4} Z`} fill={hot('erector')} />
        {/* Trapezius / upper back */}
        <path d={`M${HIPX - 4} ${HIPY - 40} Q${HIPX - 7} ${HIPY - 46} ${HIPX} ${HIPY - 48} L${HIPX + 4} ${HIPY - 44} Z`} fill={hot('trap')} />

        {/* Deltoid */}
        <ellipse cx={HIPX} cy={HIPY - 40} rx={6.5} ry={7} fill={hot('deltoid')} />

        {/* Neck + head (forward-head shifts the head anteriorly) */}
        <rect x={HIPX - 2 + headFwd} y={HIPY - 50} width={6} height={8} rx={3} fill={hot('neck')} transform={`rotate(${headFwd} ${HIPX} ${HIPY - 46})`} />
        <ellipse cx={HIPX + 2 + headFwd} cy={HIPY - 58} rx={8} ry={10} fill={SKIN} />

        {/* Arm (rotates about the shoulder) */}
        <SideArm shx={HIPX} shy={HIPY - 40} rot={cfg.armR ?? 0} elbowBend={cfg.armR === -20 ? 110 : 0} hot={hot} />

        {/* Skeleton overlay */}
        <g stroke={BONE} strokeWidth={0.9} strokeOpacity={0.55} fill="none" strokeLinecap="round">
          <path d={`M${HIPX} ${HIPY - 2} Q${HIPX + 2} ${HIPY - 22} ${HIPX} ${HIPY - 46}`} /> {/* spine curve */}
          <line x1={HIPX - 5} y1={HIPY - 2} x2={HIPX + 5} y2={HIPY - 2} /> {/* pelvis */}
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Limb primitives
// ---------------------------------------------------------------------------

function Arm({
  side,
  shx,
  shy,
  rot,
  back,
  hot,
}: {
  side: 'L' | 'R';
  shx: number;
  shy: number;
  rot: number;
  back: boolean;
  hot: (k: string) => string;
}) {
  const dir = side === 'L' ? -1 : 1;
  const elbowY = shy + 22;
  const wristY = shy + 42;
  return (
    <g transform={`rotate(${rot} ${shx} ${shy})`}>
      {/* Upper arm (biceps front / triceps back) */}
      <ellipse cx={shx + dir * 1} cy={(shy + elbowY) / 2} rx={3.6} ry={11} fill={hot(back ? 'triceps' : 'biceps')} />
      {/* Forearm */}
      <ellipse cx={shx + dir * 2} cy={(elbowY + wristY) / 2} rx={3} ry={10} fill={hot('forearm')} />
      {/* Hand */}
      <ellipse cx={shx + dir * 2.5} cy={wristY + 4} rx={2.6} ry={3.5} fill={SKIN} />
      {/* Bone */}
      <line x1={shx} y1={shy} x2={shx + dir * 2.5} y2={wristY} stroke={BONE} strokeWidth={0.8} strokeOpacity={0.5} />
    </g>
  );
}

function SideArm({
  shx,
  shy,
  rot,
  elbowBend,
  hot,
}: {
  shx: number;
  shy: number;
  rot: number;
  elbowBend: number;
  hot: (k: string) => string;
}) {
  const elbowY = shy + 20;
  const wristY = shy + 38;
  return (
    <g transform={`rotate(${rot} ${shx} ${shy})`}>
      <ellipse cx={shx + 1} cy={(shy + elbowY) / 2} rx={3.6} ry={10} fill={hot('biceps')} />
      <g transform={`rotate(${elbowBend} ${shx + 2} ${elbowY})`}>
        <ellipse cx={shx + 2} cy={(elbowY + wristY) / 2} rx={3} ry={9} fill={hot('forearm')} />
        <ellipse cx={shx + 2.5} cy={wristY + 3} rx={2.6} ry={3.2} fill={SKIN} />
      </g>
      <line x1={shx} y1={shy} x2={shx + 2} y2={elbowY} stroke={BONE} strokeWidth={0.8} strokeOpacity={0.5} />
    </g>
  );
}

function Leg({
  hipx,
  hipy,
  rot,
  back,
  hot,
}: {
  hipx: number;
  hipy: number;
  rot: number;
  back: boolean;
  hot: (k: string) => string;
}) {
  const kneeY = hipy + 26;
  const ankleY = hipy + 48;
  return (
    <g transform={`rotate(${rot} ${hipx} ${hipy})`}>
      {/* Thigh */}
      <ellipse cx={hipx} cy={(hipy + kneeY) / 2} rx={5} ry={14} fill={hot(back ? 'hamstring' : 'quad')} />
      {/* Lower leg */}
      <ellipse cx={hipx} cy={(kneeY + ankleY) / 2} rx={4} ry={12} fill={hot(back ? 'calf' : 'shin')} />
      {back && <ellipse cx={hipx - 2.5} cy={kneeY + 7} rx={2.5} ry={6} fill={hot('calf')} />}
      {/* Foot */}
      <ellipse cx={hipx} cy={ankleY + 3} rx={3} ry={3} fill={SKIN} />
      {/* Bone */}
      <line x1={hipx} y1={hipy} x2={hipx} y2={ankleY} stroke={BONE} strokeWidth={0.9} strokeOpacity={0.5} />
    </g>
  );
}
