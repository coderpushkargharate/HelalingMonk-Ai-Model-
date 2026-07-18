import { useState } from 'react';
import { CapturedImage, PAIN_AREAS } from '@/lib/painAssessment';
import { Download, AlertCircle, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import BodyDiagram from '@/components/common/BodyDiagram';

interface Props {
  assessment: any;
  capturedImages: CapturedImage[];
  selectedAreas: string[];
  onRestart: () => void;
}

export default function EnhancedReport({ assessment, capturedImages, selectedAreas, onRestart }: Props) {
  const [expandedArea, setExpandedArea] = useState<string | null>(selectedAreas[0]);

  const getAreaImages = (areaId: string) => {
    return capturedImages.filter((img) => {
      const area = PAIN_AREAS.find((a) => a.id === areaId);
      return area && img.metadata.areaName === area.name;
    });
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDownloadReport = () => {
    const reportContent = `
HealingMonk - Detailed Assessment Report
Generated: ${new Date().toLocaleDateString()}

OVERALL ASSESSMENT
==================
Overall Score: ${assessment.overallScore}/100 - ${getScoreStatus(assessment.overallScore)}

Score Breakdown:
- Posture Score: ${assessment.postureScore}/100
- Mobility Score: ${assessment.mobilityScore}/100
- Stability Score: ${assessment.stabilityScore}/100

ANALYZED AREAS
===============
${selectedAreas.map((areaId) => {
  const area = PAIN_AREAS.find((a) => a.id === areaId);
  const images = getAreaImages(areaId);
  return `
${area?.name}
- Positions Analyzed: ${images.length}
- Images Captured: ${images.length}
`;
}).join('')}

KEY FINDINGS
============
${assessment.findings.map((f: any) => `- ${f.description}: ${f.recommendation}`).join('\n')}

RECOMMENDATIONS
================
${assessment.programs?.map((p: any) => `- ${p.name} (${p.durationWeeks} weeks)`).join('\n')}

NEXT STEPS
==========
1. Review the detailed analysis above
2. Follow the recommended programs
3. Monitor your progress over time
4. Perform follow-up assessments weekly

Report Generated: ${new Date().toLocaleString()}
`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent));
    element.setAttribute('download', 'healingmonk_detailed_report.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Comprehensive Assessment Report</h1>
          <p className="text-gray-600">{capturedImages.length} positions analyzed • {selectedAreas.length} areas assessed</p>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-lg p-8 shadow-sm mb-8 border-2 border-green-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center justify-center">
              <div className="relative">
                <svg className="transform -rotate-90 w-48 h-48" viewBox="0 0 100 100">
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
                  <span className="text-5xl font-bold text-green-600">{assessment.overallScore}</span>
                  <span className="text-gray-500">/100</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {getScoreStatus(assessment.overallScore)}
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Posture</span>
                    <span className={`text-sm font-bold ${getScoreColor(assessment.postureScore)}`}>
                      {assessment.postureScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${assessment.postureScore}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Mobility</span>
                    <span className={`text-sm font-bold ${getScoreColor(assessment.mobilityScore)}`}>
                      {assessment.mobilityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-full rounded-full"
                      style={{ width: `${assessment.mobilityScore}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Stability</span>
                    <span className={`text-sm font-bold ${getScoreColor(assessment.stabilityScore)}`}>
                      {assessment.stabilityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-full rounded-full"
                      style={{ width: `${assessment.stabilityScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Body Posture Diagram */}
        {assessment.postureAnalysis && (
          <div className="mb-8">
            <BodyDiagram
              points={assessment.postureAnalysis.points}
              correctPercentage={assessment.postureAnalysis.correctPercentage}
              issues={assessment.postureAnalysis.issues}
            />
          </div>
        )}

        {/* Captured Images by Area */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Analysis Details</h2>

          {selectedAreas.map((areaId) => {
            const area = PAIN_AREAS.find((a) => a.id === areaId);
            const areaImages = getAreaImages(areaId);
            const isExpanded = expandedArea === areaId;

            return (
              <div
                key={areaId}
                className="bg-white rounded-lg shadow-sm overflow-hidden border-2 border-gray-100 hover:border-green-200 transition-colors"
              >
                <button
                  onClick={() => setExpandedArea(isExpanded ? null : areaId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{area?.name}</h3>
                      <p className="text-sm text-gray-500">{areaImages.length} positions captured</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-6">
                    {areaImages.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {areaImages.map((img, idx) => (
                          <div key={img.id} className="rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-colors">
                            <img
                              src={img.imageData}
                              alt={`${img.metadata.positionName} - ${idx + 1}`}
                              className="w-full h-48 object-cover"
                            />
                            <div className="bg-gray-50 p-3">
                              <p className="text-sm font-medium text-gray-900">
                                {img.metadata.positionName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(img.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No images captured for this area</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Key Findings */}
        {assessment.findings && assessment.findings.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8 border-2 border-amber-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Key Findings</h2>
            <div className="space-y-3">
              {assessment.findings.map((finding: any, idx: number) => (
                <div key={idx} className="border-l-4 border-amber-400 pl-4 py-2">
                  <p className="font-semibold text-gray-900">{finding.description}</p>
                  <p className="text-sm text-gray-600 mt-1">{finding.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {assessment.programs && assessment.programs.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8 border-2 border-green-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recommended Programs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessment.programs.map((program: any) => (
                <div key={program.id} className="border-2 border-green-200 rounded-lg p-4 hover:border-green-400 transition-colors">
                  {program.imageUrl && (
                    <img src={program.imageUrl} alt={program.name} className="w-full h-32 rounded object-cover mb-3" />
                  )}
                  <h3 className="font-semibold text-gray-900">{program.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{program.durationWeeks} weeks</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleDownloadReport}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Report
          </button>
          <button
            onClick={onRestart}
            className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            New Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
