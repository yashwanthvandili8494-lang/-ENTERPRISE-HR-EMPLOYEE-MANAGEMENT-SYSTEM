import React from 'react';
import { getStatusBadgeClass } from '../../utils/formatters';

export default function Badge({ status, children, className = '' }) {
  const text = children || status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(
        status || text
      )} ${className}`}
    >
      {text}
    </span>
  );
}
