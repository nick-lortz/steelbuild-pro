import React from 'react';
import { Button } from '@/components/ui/button';

export default function DenominatorToggle({ mode, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
      <button
        onClick={() => onChange('base')}
        className={`px-4 py-2 text-xs font-semibold transition-colors ${
          mode === 'base'
            ? 'bg-amber-500 text-black'
            : 'bg-zinc-900 text-zinc-400 hover:text-white'
        }`}
      >
        Base Contract
      </button>
      <button
        onClick={() => onChange('total')}
        className={`px-4 py-2 text-xs font-semibold transition-colors ${
          mode === 'total'
            ? 'bg-amber-500 text-black'
            : 'bg-zinc-900 text-zinc-400 hover:text-white'
        }`}
      >
        Total Contract
      </button>
    </div>
  );
}