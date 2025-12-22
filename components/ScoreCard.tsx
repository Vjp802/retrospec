import React from 'react';
import { Users, Activity } from 'lucide-react';

interface ScoreCardProps {
  score: number;
  verdict: string;
  reviewCount: number;
  confidenceScore: number;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ score, verdict, reviewCount, confidenceScore }) => {
  const getVerdictColor = (v: string) => {
    const lower = v.toLowerCase();
    if (lower.includes('buy')) return 'text-green-400 border-green-400/30 bg-green-400/10';
    if (lower.includes('avoid') || lower.includes('skip')) return 'text-red-400 border-red-400/30 bg-red-400/10';
    return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceColor = (s: number) => {
    if (s >= 80) return 'bg-blue-500';
    if (s >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Score Circle */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">Aggregate Score</div>
        <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="text-slate-500 text-sm mt-1">out of 100</div>
        
        {/* Background Decorative Gradient */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none`}></div>
      </div>

      {/* Review Count Badge */}
      <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 flex items-center justify-center gap-2 text-slate-300">
        <Users className="w-4 h-4 text-blue-400" />
        <span className="text-sm">Analyzed <strong className="text-white">{reviewCount.toLocaleString()}</strong> distinct reviews</span>
      </div>

      {/* Verdict Badge */}
      <div className={`rounded-xl p-6 border flex flex-col items-center justify-center ${getVerdictColor(verdict)}`}>
        <div className="text-xs uppercase tracking-wider font-semibold opacity-80 mb-1">Verdict</div>
        <div className="text-3xl font-bold">{verdict}</div>
      </div>

       {/* Confidence Meter */}
       <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <Activity className="w-4 h-4" /> AI Confidence
          </div>
          <span className="text-white font-bold">{confidenceScore}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${getConfidenceColor(confidenceScore)}`} 
            style={{ width: `${confidenceScore}%` }}
          ></div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Based on data volume & recency
        </p>
      </div>
    </div>
  );
};