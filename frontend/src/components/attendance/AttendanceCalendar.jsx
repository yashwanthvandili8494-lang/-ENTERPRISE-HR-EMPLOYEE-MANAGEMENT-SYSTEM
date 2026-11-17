import React from 'react';
import Badge from '../common/Badge';

export default function AttendanceCalendar({ year, month, records = [] }) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay(); // 0 = Sun

  const recordByDate = new Map();
  records.forEach((r) => {
    if (!recordByDate.has(r.dateKey)) recordByDate.set(r.dateKey, []);
    recordByDate.get(r.dateKey).push(r);
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdays.map((wd) => (
          <div key={wd} className="text-center text-xs font-semibold uppercase text-slate-500 py-1">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-24 rounded-lg bg-slate-50/50" />;
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayRecords = recordByDate.get(key) || [];
          return (
            <div
              key={key}
              className="min-h-[92px] rounded-lg border border-slate-200 p-2 bg-white flex flex-col justify-between"
            >
              <span className="text-xs font-semibold text-slate-700">{day}</span>
              <div className="space-y-1 mt-1">
                {dayRecords.slice(0, 2).map((r) => (
                  <div key={r._id} className="truncate">
                    <Badge status={r.status} className="text-[10px] px-1.5 py-0">
                      {r.employee?.firstName ? `${r.employee.firstName}: ` : ''}
                      {r.status}
                    </Badge>
                  </div>
                ))}
                {dayRecords.length > 2 && (
                  <p className="text-[10px] text-slate-500 font-medium">+{dayRecords.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
