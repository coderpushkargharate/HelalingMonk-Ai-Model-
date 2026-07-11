import { Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, Lock, Stethoscope, ArrowRight, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/site/PageHeader';

const VALUES = [
  {
    icon: <HeartPulse className="h-6 w-6" />,
    title: 'Access to movement screening',
    desc: 'Objective posture and mobility screening should not require expensive equipment or a clinic visit — a camera is enough to start the conversation.',
  },
  {
    icon: <Stethoscope className="h-6 w-6" />,
    title: 'Grounded in clinical practice',
    desc: 'Each assessment maps to an established measurement — craniovertebral angle, plumb-line alignment, ROM norms — drawn from physiotherapy references and clinical experience.',
  },
  {
    icon: <Lock className="h-6 w-6" />,
    title: 'Private by design',
    desc: 'The pose model runs on-device. Your video is analyzed in the browser and never uploaded — your body stays yours.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Honest about limits',
    desc: 'AI camera estimates are a screening aid, not a diagnosis. We surface confidence and always defer final judgement to a treating clinician.',
  },
];

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="About HealingMonk"
        title={
          <>
            Making movement assessment{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              simple and accessible
            </span>
          </>
        }
        subtitle="HealingMonk turns any camera into a clinical-style movement lab — helping people understand their posture and mobility, and helping clinicians screen faster."
      />

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                {v.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <ShieldAlert className="h-6 w-6 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">Not a medical device</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              All angles, scores and severities are produced automatically by camera-based AI pose estimation. They are
              approximate estimates, may not be accurate, and are <b>not medically verified</b>. This tool is for
              screening and education only and must not be treated as a clinical diagnosis. Always consult a qualified
              clinician for medical advice.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-8 py-12 text-center shadow-sm">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to see how you move?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Run a free assessment in your browser — no download, no sign-up, nothing leaves your device.
          </p>
          <Link
            to="/assessment"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.03]"
          >
            Start Free Assessment
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
