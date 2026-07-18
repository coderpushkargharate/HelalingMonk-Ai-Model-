import { useState, useEffect } from 'react';
import { PAIN_AREAS, PainArea } from '@/lib/painAssessment';
import { speak, isSpeakingSupported } from '@/services/voice.service';
import { Volume2, AlertCircle } from 'lucide-react';

interface Props {
  onContinue: (selectedAreas: string[]) => void;
  onSkip: () => void;
  language?: 'en' | 'hi';
}

export default function PainAssessment({ onContinue, onSkip, language = 'hi' }: Props) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const introduceAssessment = async () => {
      if (isSpeakingSupported()) {
        setIsSpeaking(true);
        const message = language === 'hi'
          ? 'आपका प्रारंभिक मुद्रा मूल्यांकन पूरा हो गया है। अब, आइए किसी भी दर्द या असुविधा वाले क्षेत्रों की पहचान करें। कृपया अपने शरीर के उन क्षेत्रों पर क्लिक करें जहां आप दर्द महसूस करते हैं।'
          : 'Your initial posture assessment is complete. Now, let\'s identify any areas where you experience pain or discomfort. Please click on the areas of your body where you feel pain.';

        await speak({
          text: message,
          lang: language,
        });
        setIsSpeaking(false);
      }
    };

    introduceAssessment();
  }, [language]);

  const handleAreaToggle = async (area: PainArea) => {
    const newSelected = selectedAreas.includes(area.id)
      ? selectedAreas.filter((id) => id !== area.id)
      : [...selectedAreas, area.id];

    setSelectedAreas(newSelected);

    if (isSpeakingSupported()) {
      const isNowSelected = newSelected.includes(area.id);
      const areaName = language === 'hi' ? area.nameHi : area.name;
      const message = isNowSelected
        ? `${areaName} दर्द चयनित।`
        : `${areaName} दर्द हटाया गया।`;

      await speak({
        text: language === 'hi'
          ? (isNowSelected ? `${areaName} दर्द चयनित।` : `${areaName} दर्द हटाया गया।`)
          : `${area.name} pain ${isNowSelected ? 'selected' : 'deselected'}.`,
        lang: language,
      });
    }
  };

  const handleContinue = async () => {
    if (selectedAreas.length > 0) {
      if (isSpeakingSupported()) {
        setIsSpeaking(true);
        const areas = selectedAreas.map((id) => {
          const area = PAIN_AREAS.find((a) => a.id === id);
          return language === 'hi' ? area?.nameHi : area?.name;
        }).join(' और ');

        const message = language === 'hi'
          ? `बहुत अच्छा। हम अब आपके ${areas} का विस्तार से मूल्यांकन करेंगे।`
          : `Excellent. We will now assess your ${areas} in detail.`;

        await speak({
          text: message,
          lang: language,
        });
        setIsSpeaking(false);
      }
      onContinue(selectedAreas);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pain & Discomfort Assessment</h1>
          <p className="text-gray-600">Select any areas where you experience pain or discomfort</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-auto max-h-96 mx-auto"
                style={{ maxWidth: '300px' }}
              >
                {/* Simple body outline */}
                <circle cx="50" cy="12" r="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
                <rect x="42" y="22" width="16" height="20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
                <rect x="30" y="22" width="8" height="28" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
                <rect x="62" y="22" width="8" height="28" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
                <rect x="40" y="44" width="8" height="32" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
                <rect x="52" y="44" width="8" height="32" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />

                {/* Interactive pain areas */}
                {PAIN_AREAS.map((area) => (
                  <g key={area.id}>
                    <circle
                      cx={area.x}
                      cy={area.y}
                      r={area.radius}
                      fill={selectedAreas.includes(area.id) ? '#dc2626' : '#f3f4f6'}
                      stroke={selectedAreas.includes(area.id) ? '#991b1b' : '#9ca3af'}
                      strokeWidth="1"
                      className="cursor-pointer hover:fill-red-100 transition-colors"
                      onClick={() => handleAreaToggle(area)}
                    />
                    <text
                      x={area.x}
                      y={area.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill={selectedAreas.includes(area.id) ? 'white' : '#6b7280'}
                      className="pointer-events-none"
                    >
                      {area.icon}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div>
            <div className="space-y-2">
              <h2 className="font-semibold text-gray-900 mb-4">Selected Areas</h2>
              {selectedAreas.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Click on body areas to select them
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedAreas.map((areaId) => {
                    const area = PAIN_AREAS.find((a) => a.id === areaId);
                    return (
                      <div
                        key={areaId}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-100"
                        onClick={() => handleAreaToggle(area!)}
                      >
                        <p className="font-medium text-red-900">{area?.label}</p>
                        <p className="text-xs text-red-700">
                          {area?.positions.length} positions to analyze
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedAreas.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-700">
                  You have selected {selectedAreas.length} area(s). We will guide you through specific positions for detailed analysis.
                </p>
              </div>
            )}
          </div>
        </div>

        {isSpeaking && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-green-600 animate-pulse" />
            <span className="text-green-700 text-sm">AI is speaking...</span>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleContinue}
            disabled={selectedAreas.length === 0 || isSpeaking}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Continue with Selected Areas
          </button>
          <button
            onClick={onSkip}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Skip Pain Assessment
          </button>
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 mb-1">Note:</p>
            <p className="text-amber-800">
              Select multiple areas if you experience pain in more than one location. We will perform a detailed analysis of each area.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
