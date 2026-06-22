/**
 * Anatomical muscle-map illustration for each clinical pose, shown on the
 * "Select Positions" page. Uses react-body-highlighter (the same gray muscle
 * model as the reference chart) and highlights, in purple, the muscle groups
 * each assessment targets — anterior (front) or posterior (back) as relevant.
 */
import Model from 'react-body-highlighter';
import type { IExerciseData, Muscle } from 'react-body-highlighter';

// Match the reference chart: light grey body, purple highlight.
const BODY_COLOR = '#c9ccdb';
const HIGHLIGHT = ['#6d5ce7'];

interface PoseMap {
  type: 'anterior' | 'posterior';
  muscles: Muscle[];
}

// Map every assessment to the view + muscles it primarily involves.
const POSES: Record<string, PoseMap> = {
  // Full body — broad highlight
  full_body: {
    type: 'anterior',
    muscles: ['chest', 'abs', 'obliques', 'quadriceps', 'biceps', 'front-deltoids', 'forearm'],
  },
  full_body_back: {
    type: 'posterior',
    muscles: ['trapezius', 'upper-back', 'lower-back', 'gluteal', 'hamstring', 'calves', 'triceps', 'back-deltoids'],
  },
  full_body_left: {
    type: 'anterior',
    muscles: ['chest', 'abs', 'quadriceps', 'front-deltoids', 'calves'],
  },
  full_body_right: {
    type: 'anterior',
    muscles: ['chest', 'abs', 'quadriceps', 'front-deltoids', 'calves'],
  },

  // Posture
  forward_head: { type: 'posterior', muscles: ['neck', 'trapezius'] },
  shoulder_level: { type: 'anterior', muscles: ['front-deltoids', 'trapezius'] },
  pelvic_level: { type: 'posterior', muscles: ['gluteal', 'lower-back'] },
  lateral_spine: { type: 'posterior', muscles: ['lower-back', 'upper-back'] },
  head_tilt: { type: 'anterior', muscles: ['neck'] },
  knee_alignment: { type: 'anterior', muscles: ['quadriceps', 'knees'] },
  thoracic_kyphosis: { type: 'posterior', muscles: ['upper-back', 'trapezius'] },
  anterior_pelvic_tilt: { type: 'anterior', muscles: ['abs', 'quadriceps'] },
  scoliosis_adams: { type: 'posterior', muscles: ['lower-back', 'upper-back'] },

  // Upper limb
  shoulder_flexion_rom: { type: 'anterior', muscles: ['front-deltoids', 'chest'] },
  shoulder_abduction_rom: { type: 'anterior', muscles: ['front-deltoids'] },
  shoulder_extension_rom: { type: 'posterior', muscles: ['back-deltoids', 'upper-back'] },
  elbow_flexion_rom: { type: 'anterior', muscles: ['biceps', 'forearm'] },
  cervical_flexion: { type: 'anterior', muscles: ['neck'] },
  cervical_extension: { type: 'posterior', muscles: ['neck', 'trapezius'] },

  // Trunk
  trunk_forward_flexion: { type: 'posterior', muscles: ['lower-back', 'hamstring'] },
  trunk_lateral_flexion: { type: 'anterior', muscles: ['obliques'] },
  trunk_extension: { type: 'posterior', muscles: ['lower-back'] },

  // Lower limb
  squat_depth: { type: 'anterior', muscles: ['quadriceps', 'calves'] },
  hip_abduction: { type: 'anterior', muscles: ['abductors', 'quadriceps'] },
  hip_flexion_rom: { type: 'anterior', muscles: ['quadriceps', 'abs'] },
  knee_flexion_active: { type: 'posterior', muscles: ['hamstring', 'calves'] },
  lunge_depth: { type: 'anterior', muscles: ['quadriceps'] },
  ankle_dorsiflexion: { type: 'posterior', muscles: ['calves'] },
  single_leg_balance: { type: 'posterior', muscles: ['gluteal'] },
  overhead_squat: { type: 'anterior', muscles: ['quadriceps', 'front-deltoids'] },
};

interface Props {
  pose: string;
  className?: string;
}

export default function PoseIllustration({ pose, className }: Props) {
  const cfg = POSES[pose] ?? POSES.full_body;
  const data: IExerciseData[] = [{ name: pose, muscles: cfg.muscles }];

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '6px' }}
    >
      <Model
        data={data}
        type={cfg.type}
        bodyColor={BODY_COLOR}
        highlightedColors={HIGHLIGHT}
        style={{ height: '100%', display: 'flex', justifyContent: 'center' }}
        svgStyle={{ height: '100%', width: 'auto' }}
      />
    </div>
  );
}
