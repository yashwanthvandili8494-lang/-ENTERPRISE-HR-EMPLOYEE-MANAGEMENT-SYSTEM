import React from 'react';

export default function Loader({ text = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
      <p className="mt-3 text-sm font-medium">{text}</p>
    </div>
  );
}
