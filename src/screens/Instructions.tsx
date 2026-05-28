import { CheckCircle2, AlertCircle, Eye } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export default function Instructions({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Posture Assessment</h1>
        <p className="text-gray-600 mb-8">Real-time AI-powered movement analysis</p>

        <div className="space-y-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-green-100">
            <div className="flex gap-4">
              <div className="text-2xl font-bold text-green-600 flex-shrink-0">1</div>
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Position Yourself</h2>
                <p className="text-gray-600 text-sm mb-3">
                  Stand so your entire body is visible from head to feet. Keep yourself centered in the frame.
                </p>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Full body in frame
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-green-100">
            <div className="flex gap-4">
              <div className="text-2xl font-bold text-green-600 flex-shrink-0">2</div>
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Stand in Natural Posture</h2>
                <p className="text-gray-600 text-sm mb-3">
                  Keep your arms relaxed at your sides. Feet shoulder-width apart. Look straight at camera.
                </p>
                <div className="space-y-1 text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Shoulders relaxed
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Arms at sides
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-green-100">
            <div className="flex gap-4">
              <div className="text-2xl font-bold text-green-600 flex-shrink-0">3</div>
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">5-Second Analysis</h2>
                <p className="text-gray-600 text-sm mb-3">
                  We'll capture and analyze your pose in real-time. You'll see a green skeleton overlay showing detected joints.
                </p>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Eye className="w-4 h-4" />
                  Real-time pose tracking
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-2">What we analyze:</p>
              <ul className="text-blue-800 space-y-1 text-xs">
                <li>✓ Forward head posture</li>
                <li>✓ Rounded shoulders</li>
                <li>✓ Shoulder imbalance</li>
                <li>✓ Hip and knee alignment</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 mb-2">Best results:</p>
              <ul className="text-amber-800 space-y-1 text-xs">
                <li>• Wear fitted or light-colored clothing</li>
                <li>• Bright natural lighting works best</li>
                <li>• Stand 6-8 feet from camera</li>
                <li>• Keep phone steady and level</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Start Capture
        </button>
      </div>
    </div>
  );
}
