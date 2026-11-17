import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
      <p className="text-xs text-slate-600">
        Showing page <span className="font-semibold text-slate-900">{meta.page}</span> of{' '}
        <span className="font-semibold text-slate-900">{meta.totalPages}</span> ({meta.total} total records)
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPrevPage}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNextPage}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
