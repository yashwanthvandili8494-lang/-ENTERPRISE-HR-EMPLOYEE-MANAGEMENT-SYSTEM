import React, { useEffect, useState } from 'react';
import { Clock, Radio, Timer, CheckCircle, Calendar } from 'lucide-react';
import { formatTime, formatDate, formatDurationMs, getLiveTimezone } from '../../utils/formatters';

export default function LiveClock({
  timezone,
  checkedInAt = null,
  checkedOutAt = null,
  variant = 'card',
  className = '',
}) {
  const [now, setNow] = useState(new Date());
  const activeTz = getLiveTimezone(timezone);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = checkedInAt && !checkedOutAt
    ? Math.max(0, now.getTime() - new Date(checkedInAt).getTime())
    : 0;

  const isClockedIn = Boolean(checkedInAt && !checkedOutAt);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 text-white shadow-sm border border-slate-700/60 text-xs ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-mono font-semibold tracking-wider">
          {formatTime(now, activeTz, true)}
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
          {activeTz.split('/').pop().replace('_', ' ')}
        </span>
        {isClockedIn && (
          <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-semibold border border-emerald-500/30">
            <Timer className="w-3 h-3 text-emerald-400 animate-pulse" />
            {formatDurationMs(elapsedMs)}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 text-white shadow-inner ${className}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Clock className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono tracking-wider text-white">
                {formatTime(now, activeTz, true)}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                LIVE • {activeTz}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3 h-3" />
              {formatDate(now, activeTz)}
            </p>
          </div>
        </div>

        {isClockedIn && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Timer className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Shift Elapsed</p>
              <p className="font-mono text-xs font-bold text-emerald-200">{formatDurationMs(elapsedMs)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default 'card' variant
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 shadow-md ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5" /> Live System Clock
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
          {activeTz}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-white">
            {formatTime(now, activeTz, true)}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            {formatDate(now, activeTz)}
          </div>
        </div>

        {isClockedIn ? (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200">
            <Timer className="w-5 h-5 text-emerald-400 animate-pulse flex-shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Shift Elapsed (Live)</p>
              <p className="font-mono text-base font-extrabold text-white">{formatDurationMs(elapsedMs)}</p>
            </div>
          </div>
        ) : checkedOutAt ? (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium">Shift completed for today</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">
            Ready to record check-in
          </div>
        )}
      </div>
    </div>
  );
}
