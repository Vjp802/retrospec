import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TimePoint } from '../types';

interface SentimentChartProps {
  data: TimePoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-xl text-sm text-slate-200">
        <p className="font-semibold text-white mb-1">{label}</p>
        <p className="text-blue-400">Score: {payload[0].value}/100</p>
        <p className="text-xs text-slate-400 mt-2 max-w-[200px]">
          {payload[0].payload.summary}
        </p>
      </div>
    );
  }
  return null;
};

export const SentimentChart: React.FC<SentimentChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[300px] bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <h3 className="text-lg font-medium text-slate-200 mb-4">Sentiment Over Time</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="label" 
            stroke="#94a3b8" 
            tick={{fontSize: 12}} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            tick={{fontSize: 12}} 
            domain={[0, 100]} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorScore)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};