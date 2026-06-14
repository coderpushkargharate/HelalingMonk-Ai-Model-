import { useState } from 'react';
import { Activity, Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface Props {
  /** Return to the public home page. */
  onBack: () => void;
}

// JWT login / self-signup against the Express API. Staff accounts
// (doctor / reception / admin) are created by an admin, so they only sign in.
// Patients may self-register here. On success, <AppRoot> routes by role.
export default function Login({ onBack }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      // No navigation needed — AppRoot re-renders to the role's app on auth.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex flex-col">
      <div className="px-4 py-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'signup' ? 'Create your account' : 'Sign in to HealingMonk'}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {mode === 'signup'
                ? 'Patients can sign up to view reports & book sessions.'
                : 'Patients, doctors, reception & admin sign in here.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <Field
                icon={<UserIcon className="w-5 h-5 text-gray-400" />}
                label="Full name"
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Your name"
                  required
                />
              </Field>
            )}

            <Field icon={<Mail className="w-5 h-5 text-gray-400" />} label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field icon={<Lock className="w-5 h-5 text-gray-400" />} label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </Field>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError('');
              }}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : "New patient? Create an account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent';

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </div>
    </div>
  );
}
