/**
 * Dummy stick-figure illustrations for each clinical pose, shown on the
 * "Select Positions" page so the doctor can see which pose each card captures.
 * The relevant body region for that assessment is highlighted.
 */

const HL = '#0ea5e9'; // highlighted (relevant) region
const BASE = '#cbd5e1'; // rest of the body
const SKIN = '#f1f5f9';

interface Props {
  pose: string;
  className?: string;
}

export default function PoseIllustration({ pose, className }: Props) {
  return (
    <svg viewBox="0 0 100 140" className={className} role="img" aria-label={pose}>
      <rect x="0" y="0" width="100" height="140" rx="8" fill="#f8fafc" />
      {renderFigure(pose)}
    </svg>
  );
}

function renderFigure(pose: string) {
  switch (pose) {
    case 'forward_head':
      return <SideFigure forwardHead highlight={['head', 'neck']} markers={[[60, 22], [48, 43]]} />;
    case 'shoulder_flexion_rom':
      return <SideFigure armRaised highlight={['arm']} markers={[[48, 43], [62, 14]]} />;
    case 'shoulder_level':
      return <FrontFigure highlight={['shoulders']} markers={[[34, 43], [66, 43]]} />;
    case 'pelvic_level':
      return <FrontFigure highlight={['hips']} markers={[[40, 80], [60, 80]]} />;
    case 'lateral_spine':
      return <FrontFigure highlight={['spine']} lean={6} />;
    case 'head_tilt':
      return <FrontFigure highlight={['head', 'neck']} headTilt={14} />;
    case 'knee_alignment':
      return <FrontFigure highlight={['legs']} markers={[[39, 101], [61, 101]]} />;
    case 'full_body':
    default:
      return <FrontFigure highlight={['shoulders', 'spine', 'hips', 'legs', 'head']} />;
  }
}

interface FrontProps {
  highlight?: string[];
  headTilt?: number;
  lean?: number;
  markers?: [number, number][];
}

function FrontFigure({ highlight = [], headTilt = 0, lean = 0, markers = [] }: FrontProps) {
  const on = (r: string) => (highlight.includes(r) ? HL : BASE);
  const w = (r: string) => (highlight.includes(r) ? 4 : 2.5);
  return (
    <g fill="none" strokeLinecap="round">
      <g transform={`rotate(${headTilt} 50 30)`}>
        <circle cx={50} cy={20} r={10} fill={SKIN} stroke={on('head')} strokeWidth={w('head')} />
        <line x1={50} y1={30} x2={50} y2={40} stroke={on('neck')} strokeWidth={w('neck')} />
      </g>
      <line x1={34} y1={43} x2={66} y2={43} stroke={on('shoulders')} strokeWidth={w('shoulders')} />
      <line x1={50} y1={43} x2={50 + lean} y2={80} stroke={on('spine')} strokeWidth={w('spine')} />
      <line x1={34} y1={43} x2={28} y2={73} stroke={on('arms')} strokeWidth={w('arms')} />
      <line x1={66} y1={43} x2={72} y2={73} stroke={on('arms')} strokeWidth={w('arms')} />
      <line x1={40} y1={80} x2={60} y2={80} stroke={on('hips')} strokeWidth={w('hips')} />
      <line x1={42} y1={80} x2={38} y2={122} stroke={on('legs')} strokeWidth={w('legs')} />
      <line x1={58} y1={80} x2={62} y2={122} stroke={on('legs')} strokeWidth={w('legs')} />
      <Markers points={markers} />
    </g>
  );
}

interface SideProps {
  forwardHead?: boolean;
  armRaised?: boolean;
  highlight?: string[];
  markers?: [number, number][];
}

function SideFigure({ forwardHead = false, armRaised = false, highlight = [], markers = [] }: SideProps) {
  const on = (r: string) => (highlight.includes(r) ? HL : BASE);
  const w = (r: string) => (highlight.includes(r) ? 4 : 2.5);
  const headCx = forwardHead ? 60 : 50;
  return (
    <g fill="none" strokeLinecap="round">
      <circle cx={headCx} cy={20} r={10} fill={SKIN} stroke={on('head')} strokeWidth={w('head')} />
      <line x1={headCx} y1={30} x2={48} y2={43} stroke={on('neck')} strokeWidth={w('neck')} />
      <line x1={48} y1={43} x2={48} y2={80} stroke={on('spine')} strokeWidth={w('spine')} />
      {armRaised ? (
        <line x1={48} y1={43} x2={62} y2={14} stroke={on('arm')} strokeWidth={w('arm')} />
      ) : (
        <line x1={48} y1={43} x2={52} y2={73} stroke={on('arm')} strokeWidth={w('arm')} />
      )}
      <line x1={48} y1={80} x2={50} y2={122} stroke={on('legs')} strokeWidth={w('legs')} />
      <Markers points={markers} />
    </g>
  );
}

function Markers({ points }: { points: [number, number][] }) {
  return (
    <>
      {points.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.8} fill={HL} stroke="#fff" strokeWidth={1.2} />
      ))}
    </>
  );
}
