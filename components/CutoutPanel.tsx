/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { CutoutIcon, SparkleIcon, PromptIcon, BrushIcon, EraserIcon } from './icons';

interface CutoutPanelProps {
  onCreateCutout: (prompt?: string) => void;
  onCutoutFromHighlight: () => void;
  onToggleHighlight: (active: boolean) => void;
  onClearHighlight: () => void;
  isHighlightReady: boolean;
  isLoading: boolean;
  isOnline: boolean;
  brushSize: number;
  onSetBrushMode: (mode: 'add' | 'erase') => void;
  onSetBrushSize: (size: number) => void;
}

const CutoutPanel: React.FC<CutoutPanelProps> = ({ 
  onCreateCutout, 
  onCutoutFromHighlight,
  onToggleHighlight,
  onClearHighlight,
  isHighlightReady,
  isLoading, 
  isOnline,
  brushSize,
  onSetBrushMode,
  onSetBrushSize,
}) => {
  const [mode, setMode] = useState<'manual' | 'prompt' | 'auto'>('manual');
  const [prompt, setPrompt] = useState('');
  const [highlighterMode, setHighlighterMode] = useState<'add' | 'erase'>('add');

  useEffect(() => {
    onToggleHighlight(mode === 'manual');
    // Ensure we are in 'add' mode when switching to manual cutout
    handleBrushModeChange('add');
    return () => {
      onToggleHighlight(false);
    };
  }, [mode]);

  const handleBrushModeChange = (newMode: 'add' | 'erase') => {
    setHighlighterMode(newMode);
    onSetBrushMode(newMode);
  }

  const modeOptions = [
    { id: 'manual', name: 'Manual', icon: BrushIcon },
    { id: 'prompt', name: 'Prompt', icon: PromptIcon },
    { id: 'auto', name: 'Auto', icon: SparkleIcon },
  ] as const;

  const renderModeContent = () => {
    switch (mode) {
      case 'manual':
        return (
          <div className="w-full flex flex-col items-center gap-4 text-center animate-fade-in">
            <p className="text-md text-subtle">Use the brush to highlight the subject. Use erase to refine your selection.</p>
            
            <div className="w-full bg-input rounded-lg p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleBrushModeChange('add')}
                        disabled={isLoading || !isOnline}
                        className={`w-full flex items-center justify-center gap-2 font-semibold py-2 px-3 rounded-md text-sm transition-all ${
                            highlighterMode === 'add' ? 'btn-primary shadow-md' : 'btn-secondary'
                        }`}
                    >
                        <BrushIcon className="w-4 h-4" /> Add
                    </button>
                    <button
                        onClick={() => handleBrushModeChange('erase')}
                        disabled={isLoading || !isOnline}
                        className={`w-full flex items-center justify-center gap-2 font-semibold py-2 px-3 rounded-md text-sm transition-all ${
                            highlighterMode === 'erase' ? 'btn-primary shadow-md' : 'btn-secondary'
                        }`}
                    >
                        <EraserIcon className="w-4 h-4" /> Erase
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-subtle">Size</label>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={brushSize}
                        onChange={(e) => onSetBrushSize(Number(e.target.value))}
                        className="w-full h-2 bg-panel rounded-lg appearance-none cursor-pointer accent-yellow-400 disabled:cursor-not-allowed"
                        disabled={isLoading || !isOnline}
                    />
                    <span className="text-sm font-semibold text-main w-12 text-center tabular-nums">{brushSize}px</span>
                </div>
            </div>

            <div className="flex w-full gap-2">
              <button
                onClick={onClearHighlight}
                disabled={isLoading || !isOnline || !isHighlightReady}
                className="w-full btn-secondary font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-60"
              >
                Clear
              </button>
              <button
                onClick={onCutoutFromHighlight}
                disabled={isLoading || !isOnline || !isHighlightReady}
                className="w-full btn-primary font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-60"
              >
                Create Cutout
              </button>
            </div>
          </div>
        );
      case 'prompt':
        return (
          <form
            onSubmit={(e) => { e.preventDefault(); onCreateCutout(prompt); }}
            className="w-full flex items-center gap-2 animate-fade-in"
          >
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'the dog' or 'the person on the left'"
                className="flex-grow bg-input border text-main rounded-lg p-3 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition w-full disabled:cursor-not-allowed"
                disabled={isLoading || !isOnline}
            />
            <button
                type="submit"
                className="btn-primary font-bold py-3 px-5 rounded-lg transition-all"
                disabled={isLoading || !prompt.trim() || !isOnline}
            >
                Cutout
            </button>
          </form>
        );
      case 'auto':
        return (
            <div className="w-full flex flex-col items-center gap-4 text-center animate-fade-in">
                <p className="text-md text-subtle">Automatically detect and isolate the main subject.</p>
                <button
                    onClick={() => onCreateCutout()}
                    disabled={isLoading || !isOnline}
                    className="w-full btn-secondary font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                >
                    <SparkleIcon className="w-5 h-5" />
                    Auto-Detect & Cutout
                </button>
            </div>
        );
    }
  };

  return (
    <div className="w-full bg-panel border rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in text-center">
      <div className="flex items-center justify-center w-16 h-16 bg-input rounded-full mb-2">
        <CutoutIcon className="w-8 h-8 text-yellow-400" />
      </div>
      <h3 className="text-xl font-bold text-main">Create a Cutout</h3>
      
      <div className="bg-input p-1 rounded-lg flex items-center gap-1">
        {modeOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            className={`flex items-center gap-2 capitalize font-semibold py-2 px-4 rounded-md transition-all duration-200 text-sm ${
              mode === opt.id
                ? 'btn-primary text-black shadow-md'
                : 'text-subtle hover:text-main hover:bg-white/10'
            }`}
          >
            <opt.icon className="w-4 h-4" />
            {opt.name}
          </button>
        ))}
      </div>
      
      <div className="w-full max-w-lg mt-4">
        {renderModeContent()}
      </div>
    </div>
  );
};

export default CutoutPanel;