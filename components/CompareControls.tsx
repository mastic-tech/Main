/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export type CompareMode = 'off' | 'split' | 'slider';

interface CompareControlsProps {
  compareMode: CompareMode;
  onSetCompareMode: (mode: CompareMode) => void;
  disabled: boolean;
}

const CompareControls: React.FC<CompareControlsProps> = ({ compareMode, onSetCompareMode, disabled }) => {
  const modes: { id: CompareMode, label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'split', label: 'Split' },
    { id: 'slider', label: 'Slider' },
  ];

  return (
    <div className="bg-panel border rounded-lg p-1 flex items-center justify-center gap-1">
      <span className="text-sm font-semibold text-subtle px-3 hidden sm:inline">Compare:</span>
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => onSetCompareMode(mode.id)}
          disabled={disabled}
          className={`capitalize font-semibold py-2 px-3 sm:px-4 rounded-md transition-all duration-200 text-sm ${
            compareMode === mode.id
              ? 'btn-primary text-black shadow-md shadow-yellow-500/20'
              : 'text-subtle hover:text-main hover:bg-white/10'
          }`}
          aria-pressed={compareMode === mode.id}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};

export default CompareControls;
