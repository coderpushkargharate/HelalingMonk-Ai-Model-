import { ArrowLeft, Download, Share2 } from 'lucide-react';

interface Props {
  assessment: any;
  onRestart: () => void;
}

export default function Report({ assessment, onRestart }: Props) {
  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const handleDownload = () => {
    const content = `HealingMonk Assessment Report
Generated: ${new Date().toLocaleDateString()}

OVERALL SCORE: ${assessment.overallScore}/100 - ${getScoreStatus(assessment.overallScore)}

SCORE BREAKDOWN:
- Posture: ${assessment.postureScore}/100
- Mobility: ${assessment.mobilityScore}/100
- Stability: ${assessment.stabilityScore}/100

KEY FINDINGS:
${assessment.findings.map((f: any) => `- ${f.description}\n  ${f.recommendation}`).join('\n')}

RECOMMENDED PROGRAMS:
${assessment.programs.map((p: any) => `- ${p.name} (${p.durationWeeks} weeks)`).join('\n')}

WHAT THIS MEANS:
${getReportExplanation(assessment.overallScore)}`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'healingmonk_report.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-lg p-8 shadow-sm mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Detailed Assessment Report</h1>
          <p className="text-gray-600">Generated {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Score</h2>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center">
              <div className="relative">
                <svg className="transform -rotate-90 w-32 h-32" viewBox="0 0 100 100">
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
                  <span className="text-4xl font-bold text-green-600">{assessment.overallScore}</span>
                  <span className="text-sm text-gray-500">/100</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-lg text-gray-700 mb-6">
            <span className="font-semibold">{getScoreStatus(assessment.overallScore)}</span>
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Posture Score</p>
              <p className="text-3xl font-bold text-blue-600">{assessment.postureScore}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Mobility Score</p>
              <p className="text-3xl font-bold text-blue-600">{assessment.mobilityScore}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Stability Score</p>
              <p className="text-3xl font-bold text-blue-600">{assessment.stabilityScore}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-sm mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What This Means</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            {getReportExplanation(assessment.overallScore)}
          </p>
        </div>

        {assessment.findings.length > 0 && (
          <div className="bg-white rounded-lg p-8 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Key Findings</h2>
            <div className="space-y-4">
              {assessment.findings.map((finding: any, idx: number) => (
                <div key={idx} className="border-l-4 border-amber-400 pl-4 py-2">
                  <p className="font-semibold text-gray-900">{finding.description}</p>
                  <p className="text-sm text-gray-600 mt-2">{finding.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {assessment.programs.length > 0 && (
          <div className="bg-white rounded-lg p-8 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recommended Programs</h2>
            <div className="space-y-4">
              {assessment.programs.map((program: any) => (
                <div key={program.id} className="border border-gray-200 rounded-lg p-4">
                  {program.imageUrl && (
                    <img src={program.imageUrl} alt={program.name} className="w-full h-48 rounded object-cover mb-3" />
                  )}
                  <h3 className="font-semibold text-gray-900">{program.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{program.durationWeeks} weeks</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Report
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

function getReportExplanation(score: number): string {
  if (score >= 80) {
    return 'Excellent work! Your posture and movement patterns are strong. Continue maintaining these healthy habits and consider our movement programs to build advanced mobility and stability.';
  } else if (score >= 60) {
    return 'Good foundation! Your posture is generally sound with some areas for improvement. Our recommended programs can help address specific issues and enhance your overall alignment and stability.';
  } else if (score >= 40) {
    return 'There are several areas to address. Don\'t worry - this is completely normal and achievable. Our specialized programs are designed to help correct these patterns and build better posture and movement.';
  } else {
    return 'Significant improvements needed. This assessment has identified key areas where correcting your posture and movement patterns can make a real difference in how you feel. Our programs are specifically designed to help.';
  }
}
