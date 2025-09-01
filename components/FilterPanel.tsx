/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';

interface FilterPanelProps {
  onApplyFilter: (prompt: string) => void;
  isLoading: boolean;
  isOnline: boolean;
  searchQuery: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onApplyFilter, isLoading, isOnline, searchQuery }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
    { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
    { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
    { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
  ];
  
  const filteredPresets = useMemo(() => 
    presets.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  ), [searchQuery]);
  
  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };
  
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = () => {
    if (activePrompt) {
      onApplyFilter(activePrompt);
    }
  };

  return (
    <div className="w-full bg-panel border rounded-lg p-4 flex flex-col gap-4 animate-fade-in">
      <h3 className="text-lg font-semibold text-center text-subtle">Apply a Filter</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {filteredPresets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading || !isOnline}
            className={`w-full text-center btn-secondary font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-yellow-400' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe a custom filter (e.g., '80s synthwave glow')"
        className="flex-grow bg-input border text-main rounded-lg p-4 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading || !isOnline}
      />
      
      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
          <button
            onClick={handleApply}
            className="w-full btn-primary font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !activePrompt.trim() || !isOnline}
          >
            Apply Filter
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;