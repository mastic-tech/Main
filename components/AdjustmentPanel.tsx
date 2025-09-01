/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  isLoading: boolean;
  isOnline: boolean;
  searchQuery: string;
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, isLoading, isOnline }) => {
  const [contrast, setContrast] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [colorBalance, setColorBalance] = useState({ r: 0, g: 0, b: 0 });

  const isDirty = useMemo(() => {
    return contrast !== 0 || brightness !== 0 || saturation !== 0 || sharpen !== 0 || colorBalance.r !== 0 || colorBalance.g !== 0 || colorBalance.b !== 0;
  }, [contrast, brightness, saturation, sharpen, colorBalance]);

  const handleReset = () => {
    setContrast(0);
    setBrightness(0);
    setSaturation(0);
    setSharpen(0);
    setColorBalance({ r: 0, g: 0, b: 0 });
  };

  const handleApply = () => {
    if (!isDirty) return;

    const adjustments = [];
    if (contrast !== 0) adjustments.push(`${contrast > 0 ? 'increase' : 'decrease'} contrast by ${Math.abs(contrast)}%`);
    if (brightness !== 0) adjustments.push(`${brightness > 0 ? 'increase' : 'decrease'} brightness by ${Math.abs(brightness)}%`);
    if (saturation !== 0) adjustments.push(`${saturation > 0 ? 'increase' : 'decrease'} color saturation by ${Math.abs(saturation)}%`);
    if (sharpen > 0) adjustments.push(`apply a sharpen effect of ${sharpen}%`);
    if (colorBalance.r !== 0 || colorBalance.g !== 0 || colorBalance.b !== 0) {
        const cb_parts = [];
        if (colorBalance.r !== 0) cb_parts.push(`red by ${colorBalance.r}`);
        if (colorBalance.g !== 0) cb_parts.push(`green by ${colorBalance.g}`);
        if (colorBalance.b !== 0) cb_parts.push(`blue by ${colorBalance.b}`);
        adjustments.push(`adjust color balance, shifting ${cb_parts.join(', ')}`);
    }

    if (adjustments.length > 0) {
      const prompt = `Perform the following photorealistic adjustments: ${adjustments.join(', ')}. Keep the adjustments subtle and natural.`;
      onApplyAdjustment(prompt);
    }
  };

  const Slider = ({ label, value, onChange, min, max, unit = '%' }: { label: string, value: number, onChange: (val: number) => void, min: number, max: number, unit?: string }) => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-subtle">{label}</label>
        <span className="text-sm font-semibold text-main w-16 text-center tabular-nums">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer accent-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading || !isOnline}
      />
    </div>
  );

  return (
    <div className="w-full bg-panel border rounded-lg p-6 flex flex-col gap-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-center text-subtle">Professional Adjustments</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <Slider label="Brightness" value={brightness} onChange={setBrightness} min={-50} max={50} />
        <Slider label="Contrast" value={contrast} onChange={setContrast} min={-50} max={50} />
        <Slider label="Saturation" value={saturation} onChange={setSaturation} min={-50} max={50} />
        <Slider label="Sharpen" value={sharpen} onChange={setSharpen} min={0} max={100} />
      </div>

      <div>
        <h4 className="text-sm font-medium text-subtle mb-2 text-center">Color Balance</h4>
        <div className="grid grid-cols-1 gap-4 bg-input p-4 rounded-lg">
          <Slider label="Red" value={colorBalance.r} onChange={(v) => setColorBalance(p => ({...p, r: v}))} min={-50} max={50} unit="" />
          <Slider label="Green" value={colorBalance.g} onChange={(v) => setColorBalance(p => ({...p, g: v}))} min={-50} max={50} unit="" />
          <Slider label="Blue" value={colorBalance.b} onChange={(v) => setColorBalance(p => ({...p, b: v}))} min={-50} max={50} unit="" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={handleReset}
          disabled={isLoading || !isDirty}
          className="w-full btn-secondary font-semibold py-3 px-6 rounded-lg text-base disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="w-full btn-primary font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          disabled={isLoading || !isDirty || !isOnline}
        >
          Apply Adjustments
        </button>
      </div>
    </div>
  );
};

export default AdjustmentPanel;