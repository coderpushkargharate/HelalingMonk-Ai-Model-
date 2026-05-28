import React from 'react';
import { PosturePoint } from '../lib/postureVisualizer';

interface BodyDiagramProps {
  points: PosturePoint[];
  correctPercentage: number;
  issues: string[];
}

export default function BodyDiagram({ points, correctPercentage, issues }: BodyDiagramProps) {
  const getPointColor = (status: string) => {
    if (status === 'correct') return '#00ff00'; // Green
    if (status === 'incorrect') return '#ff0000'; // Red
    return '#ffff00'; // Yellow for unknown
  };

  return (
    <div className="bg-white rounded-lg p-8 shadow-sm border-2 border-blue-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Full-Body Posture Analysis</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Body Diagram SVG */}
        <div className="flex justify-center">
          <svg viewBox="0 0 200 400" width="300" height="600" className="bg-gray-100 rounded-lg">
            {/* Simple body outline */}
            <circle cx="100" cy="40" r="20" fill="none" stroke="#333" strokeWidth="2" />

            {/* Head indicator */}
            {renderBodyPoint(points, 0, 100, 40, 'Head')}

            {/* Neck line */}
            <line x1="100" y1="60" x2="100" y2="80" stroke="#999" strokeWidth="2" />

            {/* Shoulders */}
            <line x1="60" y1="80" x2="140" y2="80" stroke="#999" strokeWidth="2" />
            {renderBodyPoint(points, 11, 60, 80, 'L.Shoulder')}
            {renderBodyPoint(points, 12, 140, 80, 'R.Shoulder')}

            {/* Arms */}
            <line x1="60" y1="80" x2="40" y2="160" stroke="#999" strokeWidth="2" />
            <line x1="140" y1="80" x2="160" y2="160" stroke="#999" strokeWidth="2" />
            {renderBodyPoint(points, 13, 50, 120, 'L.Elbow')}
            {renderBodyPoint(points, 14, 150, 120, 'R.Elbow')}

            {/* Torso */}
            <line x1="100" y1="80" x2="100" y2="180" stroke="#999" strokeWidth="3" />

            {/* Spine indicator */}
            <line x1="100" y1="80" x2="100" y2="180" stroke="#666" strokeWidth="1" strokeDasharray="4" />

            {/* Hips */}
            <line x1="80" y1="180" x2="120" y2="180" stroke="#999" strokeWidth="2" />
            {renderBodyPoint(points, 23, 80, 180, 'L.Hip')}
            {renderBodyPoint(points, 24, 120, 180, 'R.Hip')}

            {/* Legs */}
            <line x1="80" y1="180" x2="70" y2="300" stroke="#999" strokeWidth="2" />
            <line x1="120" y1="180" x2="130" y2="300" stroke="#999" strokeWidth="2" />
            {renderBodyPoint(points, 25, 75, 240, 'L.Knee')}
            {renderBodyPoint(points, 26, 125, 240, 'R.Knee')}

            {/* Feet */}
            <line x1="70" y1="300" x2="60" y2="340" stroke="#999" strokeWidth="2" />
            <line x1="130" y1="300" x2="140" y2="340" stroke="#999" strokeWidth="2" />
            {renderBodyPoint(points, 27, 65, 320, 'L.Ankle')}
            {renderBodyPoint(points, 28, 135, 320, 'R.Ankle')}
          </svg>
        </div>

        {/* Analysis Details */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: '#00ff00' }}
              ></div>
              <span className="font-medium text-green-900">Correct Posture</span>
            </div>
            <p className="text-sm text-green-800">Body alignment is correct</p>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: '#ff0000' }}
              ></div>
              <span className="font-medium text-red-900">Needs Correction</span>
            </div>
            <p className="text-sm text-red-800">Body alignment needs adjustment</p>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: '#ffff00', border: '2px solid #999' }}
              ></div>
              <span className="font-medium text-yellow-900">Unable to Detect</span>
            </div>
            <p className="text-sm text-yellow-800">Not enough data to assess</p>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Overall Correctness</p>
              <p className="text-4xl font-bold text-blue-600">{correctPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length > 0 && (
        <div className="mt-8 pt-8 border-t-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Areas Needing Attention</h3>
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-800 font-medium">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderBodyPoint(
  points: PosturePoint[],
  landmarkIndex: number,
  x: number,
  y: number,
  label: string
) {
  const point = points.find((p) => p.landmarkIndex === landmarkIndex);
  const color = point ? getPointColor(point.status) : '#cccccc';

  return (
    <g key={label}>
      <circle cx={x} cy={y} r="8" fill={color} stroke="#000" strokeWidth="2" />
      <text
        x={x + 15}
        y={y}
        fontSize="10"
        fill="#000"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
}

function getPointColor(status: string) {
  if (status === 'correct') return '#00ff00';
  if (status === 'incorrect') return '#ff0000';
  return '#ffff00';
}
