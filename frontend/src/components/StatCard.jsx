import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, color = 'blue', trend, subtitle }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   val: 'text-primary' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    val: 'text-red-600' },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  val: 'text-green-700' },
    orange: { bg: 'bg-amber-50',  text: 'text-amber-600',  val: 'text-amber-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', val: 'text-purple-700' },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   val: 'text-teal-700' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="card p-5 cursor-default group">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            <TrendingUp className="w-3 h-3" />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-bold ${c.val} transition-transform duration-200 group-hover:scale-105 origin-left`}>
          {value}
        </p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
