import { Activity, CheckCircle2, Zap } from 'lucide-react';

interface Props {
  onStart: () => void;
  user: any;
  onLogout: () => void;
}

export default function Landing({ onStart, user, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex flex-col justify-between">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">HealingMonk</h1>
          <p className="text-lg text-gray-600">AI-Powered Movement Assessment</p>
        </div>

        <div className="max-w-md w-full mb-8">
          <p className="text-center text-gray-700 mb-6">Get your personalized posture and movement score in minutes. Discover targeted programs to improve your alignment and stability.</p>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">AI-Powered Analysis</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">Instant Results</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">Personalized Programs</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">100% Safe & Secure</p>
            </div>
          </div>

          <button
            onClick={onStart}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <Zap className="w-5 h-5" />
            Start Assessment
          </button>

          {user && (
            <button
              onClick={onLogout}
              className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-6 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500 text-center">
          {user ? `Signed in as ${user.email}` : 'Sign in to save your assessments'}
        </p>
      </div>
    </div>
  );
}
