import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function FormValidationMessage({ errors }) {
  if (!errors || Object.keys(errors).length === 0) return null;

  return (
    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-red-400 mb-1">Please fix the following errors:</p>
          <ul className="text-xs text-red-300 space-y-0.5">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>• {error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}