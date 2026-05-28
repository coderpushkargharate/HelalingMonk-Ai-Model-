import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  onReady: () => void;
}

export default function CameraSetup({ onReady }: Props) {
  const [cameraAccess, setCameraAccess] = useState<'pending' | 'granted' | 'denied'>('pending');

  useEffect(() => {
    requestCameraAccess();
  }, []);

  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });

      stream.getTracks().forEach((track) => track.stop());
      setCameraAccess('granted');
      setTimeout(() => onReady(), 1500);
    } catch (err) {
      setCameraAccess('denied');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="mb-6">
          {cameraAccess === 'pending' && (
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
              <Camera className="w-8 h-8 text-blue-600" />
            </div>
          )}
          {cameraAccess === 'granted' && (
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          )}
          {cameraAccess === 'denied' && (
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Camera Access</h1>

        {cameraAccess === 'pending' && (
          <>
            <p className="text-gray-600 mb-6">Requesting camera access...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-green-600 h-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </>
        )}

        {cameraAccess === 'granted' && (
          <>
            <p className="text-gray-600 mb-2">Camera access granted!</p>
            <p className="text-sm text-gray-500">Preparing assessment...</p>
          </>
        )}

        {cameraAccess === 'denied' && (
          <>
            <p className="text-gray-600 mb-4">
              Camera access is required to perform the assessment.
            </p>
            <button
              onClick={requestCameraAccess}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Request Camera Access
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Look for the camera permission prompt at the top of your screen.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
