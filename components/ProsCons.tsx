import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ProsConsProps {
  pros: string[];
  cons: string[];
}

export const ProsCons: React.FC<ProsConsProps> = ({ pros, cons }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <h4 className="text-green-400 font-medium mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> The Good
        </h4>
        <ul className="space-y-3">
          {pros.map((pro, idx) => (
            <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></span>
              {pro}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <h4 className="text-red-400 font-medium mb-4 flex items-center gap-2">
          <XCircle className="w-5 h-5" /> The Bad
        </h4>
        <ul className="space-y-3">
          {cons.map((con, idx) => (
            <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
              {con}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};