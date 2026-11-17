import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="card p-5 flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`p-2.5 rounded-xl shrink-0 ${tones[tone] || tones.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
