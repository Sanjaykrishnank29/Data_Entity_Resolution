import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

export default function ConflictRow({ field, value1, value2, isAllergy = false, match }) {
  const bgClass = isAllergy
    ? 'bg-red-50 border border-red-200'
    : match
    ? 'bg-green-50'
    : value1 && value2
    ? 'bg-red-50'
    : 'bg-gray-50';

  return (
    <div className={`grid grid-cols-3 gap-2 px-4 py-3 rounded-lg mb-1.5 ${bgClass}`}>
      <div className="flex items-center gap-2">
        {isAllergy && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${isAllergy ? 'text-red-700' : 'text-gray-500'}`}>
          {field}
        </span>
      </div>
      <div className="text-sm text-gray-800 truncate" title={value1}>{value1 || '—'}</div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-800 truncate" title={value2}>{value2 || '—'}</span>
        <span className="ml-2 shrink-0">
          {match
            ? <Check className="w-4 h-4 text-green-600" />
            : value1 && value2
            ? <X className="w-4 h-4 text-red-500" />
            : null}
        </span>
      </div>
      {isAllergy && (
        <div className="col-span-3 mt-1">
          <p className="text-xs font-bold text-red-700">⚠️ CRITICAL — DO NOT DISCARD — All allergy values must be merged</p>
        </div>
      )}
    </div>
  );
}
