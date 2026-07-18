import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface Props {
  assessment: any;
  onViewReport: () => void;
  onRestart: () => void;
}

export default function Results({ assessment, onViewReport, onRestart }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const scoreBreakdown = [
    { label: 'Posture', value: assessment.postureScore },
    { label: 'Mobility', value: assessment.mobilityScore },
    { label: 'Stability', value: assessment.stabilityScore },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
          <p className="text-gray-600">Here's your detailed movement analysis.</p>
        </div>

        <div className={`${getScoreBgColor(assessment.overallScore)} rounded-2xl p-8 mb-8 border-2 border-transparent`}>
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="transform -rotate-90 w-24 h-24" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={assessment.overallScore >= 80 ? '#16a34a' : assessment.overallScore >= 60 ? '#eab308' : '#dc2626'}
                  strokeWidth="8"
                  strokeDasharray={`${(assessment.overallScore / 100) * 282.6} 282.6`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(assessment.overallScore)}`}>
                  {assessment.overallScore}
                </span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <p className={`text-2xl font-semibold ${getScoreColor(assessment.overallScore)}`}>
              {getScoreStatus(assessment.overallScore)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Score Breakdown</h2>
          <div className="space-y-3">
            {scoreBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className={`text-lg font-bold ${getScoreColor(item.value)}`}>{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      item.value >= 80 ? 'bg-green-600' : item.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {assessment.findings.length > 0 && (
          <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Key Findings
            </h2>
            <div className="space-y-3">
              {assessment.findings.map((finding: any, idx: number) => (
                <div key={idx} className="pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {finding.severity === 'high' && <div className="w-2 h-2 rounded-full bg-red-600 mt-2" />}
                      {finding.severity === 'medium' && <div className="w-2 h-2 rounded-full bg-yellow-600 mt-2" />}
                      {finding.severity === 'low' && <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{finding.description}</p>
                      <p className="text-sm text-gray-600 mt-1">{finding.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assessment.programs.length > 0 && (
          <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Recommended For You
            </h2>
            <div className="space-y-3">
              {assessment.programs.map((program: any) => (
                <div key={program.id} className="flex gap-4 pb-3 border-b border-gray-100 last:border-0">
                  {program.imageUrl && (
                    <img src={program.imageUrl} alt={program.name} className="w-16 h-16 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{program.name}</p>
                    <p className="text-sm text-gray-600">{program.durationWeeks} weeks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onViewReport}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            View Full Report
          </button>
          <button
            onClick={onRestart}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            New Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
