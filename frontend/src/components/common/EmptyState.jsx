import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No records found', description = '', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-slate-900">{title}</h4>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
