import React from 'react';

interface StatCardProps {
  value: number;
  label: string;
  accent: 'orange' | 'blue' | 'green' | 'gold';
}

const accentMap = {
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  gold: 'bg-yellow-500'
};

export const StatCard: React.FC<StatCardProps> = ({ value, label, accent }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex items-center relative overflow-hidden transition-transform hover:-translate-y-1">
    <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${accentMap[accent]}`} />
    <div className="pl-3">
      <div className="text-3xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  </div>
);
