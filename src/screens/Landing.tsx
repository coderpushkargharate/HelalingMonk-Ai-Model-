import {
  Activity,
  ArrowRight,
  Camera,
  Gauge,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

interface Props {
  onStart: () => void;
  user: any;
  onLogout: () => void;
  onLogin?: () => void;
}

export default function Landing({ onStart, user, onLogout, onLogin }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6faf8] text-slate-900">
      {/* Ambient soft glows — light and airy. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-300/25 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-cyan-200/25 blur-[140px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/30">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">HealingMonk</span>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-slate-500 md:flex">
          <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
          <a href="#how" className="transition-colors hover:text-slate-900">How it works</a>
          <a href="#model" className="transition-colors hover:text-slate-900">The Model</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={onLogout}
              className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 sm:block"
            >
              Sign out
            </button>
          ) : (
            onLogin && (
              <button
                onClick={onLogin}
                className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 sm:block"
              >
                Sign in
              </button>
            )
          )}
          <button
            onClick={onStart}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            Start Assessment
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center pt-16 pb-12 text-center md:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Powered by MediaPipe Pose · 33-point body tracking
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Assess your posture &amp; movement{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              in minutes
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-slate-500 sm:text-lg">
            Stand in front of your camera and let our AI analyze your alignment,
            mobility, and stability — then get a personalized program to move
            and feel better.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={onStart}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.03]"
            >
              <Zap className="h-5 w-5" />
              Start Free Assessment
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <span className="text-sm text-slate-400">No download · Runs in your browser</span>
          </div>

          {/* Product mock card (hero visual) */}
          <div className="mt-16 w-full max-w-3xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <ScanLine className="h-4 w-4 text-emerald-500" />
                    Live posture analysis
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    Tracking 33 / 33 landmarks
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
                  <ScoreTile label="Posture" value={86} />
                  <ScoreTile label="Mobility" value={74} />
                  <ScoreTile label="Stability" value={91} />
                </div>

                <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-left">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Overall Score</p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-4xl font-bold text-transparent">
                      84
                    </span>
                    <span className="mb-1 text-sm text-slate-500">/ 100 · Good alignment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section id="features" className="grid gap-4 pb-12 md:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<ScanLine className="h-5 w-5" />}
            title="AI-Powered Analysis"
            desc="33-point pose detection scores your alignment frame by frame."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Instant Results"
            desc="Get posture, mobility, and stability scores in seconds."
          />
          <Feature
            icon={<Gauge className="h-5 w-5" />}
            title="Personalized Programs"
            desc="Targeted routines matched to your specific findings."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Private by Design"
            desc="Analysis runs on-device in your browser — nothing leaves you."
          />
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-slate-200 py-16">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            From camera to clarity in three steps
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step
              n="01"
              icon={<Camera className="h-5 w-5" />}
              title="Set up your camera"
              desc="Position yourself in frame — we guide you to the right distance and lighting."
            />
            <Step
              n="02"
              icon={<ScanLine className="h-5 w-5" />}
              title="Hold the pose"
              desc="The model tracks 33 body landmarks at 10 FPS and analyzes your alignment."
            />
            <Step
              n="03"
              icon={<Gauge className="h-5 w-5" />}
              title="Get your report"
              desc="See your scores, findings, and a personalized program to improve."
            />
          </div>
        </section>

        {/* The Model / social proof */}
        <section
          id="model"
          className="my-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-8 py-12 text-center shadow-sm"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-600">
            The HealingMonk Model
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Clinical-grade movement assessment, running entirely in the browser
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Stat value="33" label="Body landmarks tracked" />
            <Stat value="~60ms" label="Per-frame latency" />
            <Stat value="100%" label="On-device & private" />
          </div>
          <button
            onClick={onStart}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            Try it now
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-slate-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span>HealingMonk · AI Movement Assessment</span>
          </div>
          <p>{user ? `Signed in as ${user.email}` : '© ' + new Date().getFullYear() + ' HealingMonk'}</p>
        </div>
      </footer>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <span className="absolute right-5 top-5 font-mono text-sm text-slate-300">{n}</span>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
