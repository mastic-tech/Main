/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, PaletteIcon, SunIcon, LightbulbIcon } from './icons';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
  onStartTutorial: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect, onStartTutorial }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  return (
    <div 
      className={`w-full max-w-5xl mx-auto text-center p-8 transition-all duration-300 rounded-2xl border-2 ${isDraggingOver ? 'bg-yellow-500/10 border-dashed border-yellow-400' : 'border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        onFileSelect(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <h1 className="text-4xl font-extrabold tracking-tight text-main">
          AI-Powered Photo Editing, <span className="text-yellow-400">Simplified</span>.
        </h1>
        
        <div className="w-full max-w-3xl perspective-container">
            <div className="description-3d-card rounded-2xl p-6">
                <p className="text-lg text-main text-center font-bold tracking-wide leading-relaxed">
                    A powerful, AI photo editor. Retouch, apply creative filters, change backgrounds, use color splash, and make professional adjustments to your images using simple text prompts.
                </p>
            </div>
        </div>

        <div className="flex flex-col items-center gap-4">
            <label htmlFor="image-upload-start" className="relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold btn-primary rounded-full cursor-pointer group hover:-translate-y-px transition-transform duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40">
                <UploadIcon className="w-6 h-6 mr-3 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110" />
                Upload an Image
            </label>
            <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            <p className="text-sm text-subtle">or drag and drop a file</p>
        </div>
        
        <div>
            <button
                onClick={onStartTutorial}
                className="flex items-center gap-2 text-yellow-400 font-semibold hover:text-yellow-300 transition-colors group"
            >
                <LightbulbIcon className="w-5 h-5" />
                <span>New here? Start a guided tour.</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </button>
        </div>

        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-panel border p-6 rounded-lg flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-input rounded-full mb-4">
                       <MagicWandIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    <h3 className="text-xl font-bold text-main">Precise Retouching</h3>
                    <p className="mt-2 text-subtle">Click any point on your image to remove blemishes, change colors, or add elements with pinpoint accuracy.</p>
                </div>
                <div className="bg-panel border p-6 rounded-lg flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-input rounded-full mb-4">
                       <PaletteIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    <h3 className="text-xl font-bold text-main">Creative Filters</h3>
                    <p className="mt-2 text-subtle">Transform photos with artistic styles. From vintage looks to futuristic glows, find or create the perfect filter.</p>
                </div>
                <div className="bg-panel border p-6 rounded-lg flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-input rounded-full mb-4">
                       <SunIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    <h3 className="text-xl font-bold text-main">Pro Adjustments</h3>
                    <p className="mt-2 text-subtle">Enhance lighting, blur backgrounds, or change the mood. Get studio-quality results without complex tools.</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default StartScreen;