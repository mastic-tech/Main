/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useMemo } from 'react';
import { ChangeBackgroundIcon, ColorSplashIcon, UploadIcon } from './icons';

type BackgroundPayload = { type: 'prompt', prompt: string } | { type: 'image', file: File };
export type ManualEdit = 
    | { type: 'background', payload: BackgroundPayload }
    | { type: 'splash', payload: { prompt: string } };

interface EditorPanelProps {
  onApplyEdit: (edit: ManualEdit) => void;
  isLoading: boolean;
  isOnline: boolean;
  searchQuery: string;
}

type EditorView = 'main' | 'background' | 'splash';

export const backgroundPresets = [
    { name: 'Abstract Art', prompt: 'a vibrant and colorful abstract painting with swirling patterns and textures', style: 'bg-gradient-to-br from-purple-400 to-pink-500' },
    { name: 'Misty Forest', prompt: 'a serene, misty forest with tall pine trees and soft, diffused light filtering through the canopy', style: 'bg-gradient-to-br from-green-600 to-gray-500' },
    { name: 'Cyberpunk City', prompt: 'a futuristic cyberpunk cityscape at night, with towering neon-lit skyscrapers, flying vehicles, and rain-slicked streets reflecting the glowing signs', style: 'bg-gradient-to-br from-indigo-800 to-purple-900' },
    { name: 'Tropical Beach', prompt: 'a beautiful tropical beach with white sand, crystal-clear turquoise water, and palm trees leaning over the shore under a bright blue sky', style: 'bg-gradient-to-br from-sky-400 to-yellow-200' },
    { name: 'Mountain Sunset', prompt: 'a dramatic mountain range at sunset, with fiery orange and purple clouds in the sky and long shadows stretching across the valleys', style: 'bg-gradient-to-br from-orange-500 to-purple-700' },
    { name: 'Minimalist Studio', prompt: 'a clean, minimalist studio backdrop with a solid light-gray color and soft, even lighting', style: 'bg-gray-200' },
];

const EditorPanel: React.FC<EditorPanelProps> = ({ onApplyEdit, isLoading, isOnline, searchQuery }) => {
    const [view, setView] = useState<EditorView>('main');
    
    // State for background changer
    const [backgroundBuilderMode, setBackgroundBuilderMode] = useState<'guided' | 'advanced'>('guided');
    const [bgSubject, setBgSubject] = useState('');
    const [bgDetails, setBgDetails] = useState('');
    const [customBackgroundPrompt, setCustomBackgroundPrompt] = useState('');
    
    const [splashPrompt, setSplashPrompt] = useState('');
    const backgroundFileInputRef = useRef<HTMLInputElement>(null);

    const handleApplyBackground = (payload: BackgroundPayload) => {
        onApplyEdit({ type: 'background', payload });
    };
    
    const handleApplyGuidedBackground = () => {
        if (!bgSubject.trim() || !bgDetails.trim()) return;
        const prompt = `${bgSubject}, ${bgDetails}`;
        handleApplyBackground({ type: 'prompt', prompt });
    };
    
    const handleApplySplash = () => {
        if (!splashPrompt.trim()) return;
        onApplyEdit({ type: 'splash', payload: { prompt: splashPrompt } });
    };

    const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleApplyBackground({ type: 'image', file: e.target.files[0] });
        }
    };
    
    const mainTools = useMemo(() => [
        { name: 'Change Background', description: 'Replace the background with a preset, a description, or your own image.', icon: ChangeBackgroundIcon, action: () => setView('background') },
        { name: 'Color Splash', description: 'Highlight a specific object in color while the rest of the image is black and white.', icon: ColorSplashIcon, action: () => setView('splash') },
    ], []);
    
    const filteredMainTools = useMemo(() => mainTools.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery, mainTools]);
    
    const renderMainMenu = () => (
        <div className="w-full bg-panel border rounded-lg p-4 grid grid-cols-1 gap-4 animate-fade-in">
            {filteredMainTools.map(tool => (
                <button 
                    key={tool.name}
                    onClick={tool.action}
                    className="group flex flex-col items-center justify-center p-6 bg-input rounded-lg hover:bg-white/10 transition-colors"
                >
                    <tool.icon className="w-10 h-10 mb-3 text-yellow-400" />
                    <h3 className="text-lg font-bold text-main">{tool.name}</h3>
                    <p className="text-sm text-subtle text-center">{tool.description}</p>
                </button>
            ))}
        </div>
    );
    
    const renderBackgroundChanger = () => {
        const filteredBackgroundPresets = useMemo(() => backgroundPresets.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
        ), [searchQuery]);

        return (
            <div className="w-full bg-panel border rounded-lg p-4 flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('main')} className="btn-secondary py-2 px-3 rounded-md">&larr; Back</button>
                    <h3 className="text-lg font-semibold text-center text-subtle flex-grow">Change Background</h3>
                </div>
                
                <p className="text-sm text-center text-subtle -mt-2">Select a preset for a quick change, or describe a custom background.</p>

                <div className="grid grid-cols-3 gap-2">
                    {filteredBackgroundPresets.map(preset => (
                        <button
                            key={preset.name}
                            onClick={() => handleApplyBackground({ type: 'prompt', prompt: preset.prompt })}
                            disabled={isLoading || !isOnline}
                            className="group aspect-square w-full flex flex-col items-center justify-end p-2 rounded-lg transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:ring-2 hover:ring-yellow-400 ring-offset-2 ring-offset-panel"
                        >
                            <div className={`w-full h-full rounded-md ${preset.style}`}></div>
                            <span className="text-xs font-semibold text-main mt-1.5">{preset.name}</span>
                        </button>
                    ))}
                </div>

                <div className="bg-input/50 border-panel-border-light/50 dark:border-panel-border-dark/50 rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-main">Describe a Custom Background</h4>
                        <div className="bg-panel border p-0.5 rounded-md flex items-center gap-1">
                            <button 
                                onClick={() => setBackgroundBuilderMode('guided')} 
                                className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                                    backgroundBuilderMode === 'guided' ? 'btn-primary text-black shadow' : 'hover:bg-white/10'
                                }`}
                            >
                                Guided
                            </button>
                            <button 
                                onClick={() => setBackgroundBuilderMode('advanced')} 
                                className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                                    backgroundBuilderMode === 'advanced' ? 'btn-primary text-black shadow' : 'hover:bg-white/10'
                                }`}
                            >
                                Advanced
                            </button>
                        </div>
                    </div>

                    {backgroundBuilderMode === 'guided' ? (
                        <div className="flex flex-col gap-2 animate-fade-in">
                            <input
                                type="text"
                                value={bgSubject}
                                onChange={(e) => setBgSubject(e.target.value)}
                                placeholder="Location or Subject (e.g., 'a beach')"
                                className="bg-panel border text-main rounded-lg p-3 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isLoading || !isOnline}
                            />
                            <input
                                type="text"
                                value={bgDetails}
                                onChange={(e) => setBgDetails(e.target.value)}
                                placeholder="Details & Style (e.g., 'sunny with palm trees')"
                                className="bg-panel border text-main rounded-lg p-3 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isLoading || !isOnline}
                            />
                            <button
                                onClick={handleApplyGuidedBackground}
                                className="w-full btn-primary font-bold py-3 px-6 rounded-lg transition-all"
                                disabled={isLoading || !bgSubject.trim() || !bgDetails.trim() || !isOnline}
                            >
                                Apply Background
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 animate-fade-in">
                            <textarea
                                value={customBackgroundPrompt}
                                onChange={(e) => setCustomBackgroundPrompt(e.target.value)}
                                placeholder="Describe the background in detail (e.g., 'A foggy mountain range at sunrise, with misty valleys and a soft golden light hitting the peaks.')"
                                className="bg-panel border text-main rounded-lg p-3 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                                rows={3}
                                disabled={isLoading || !isOnline}
                            />
                            <button
                                onClick={() => handleApplyBackground({ type: 'prompt', prompt: customBackgroundPrompt })}
                                className="w-full btn-primary font-bold py-3 px-6 rounded-lg transition-all"
                                disabled={isLoading || !customBackgroundPrompt.trim() || !isOnline}
                            >
                                Apply Background
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="h-px bg-panel flex-grow"></div>
                    <span className="text-subtle text-sm font-semibold">OR</span>
                    <div className="h-px bg-panel flex-grow"></div>
                </div>
                <button
                    onClick={() => backgroundFileInputRef.current?.click()}
                    disabled={isLoading || !isOnline}
                    className="w-full btn-secondary font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    <UploadIcon className="w-5 h-5" />
                    Upload Custom Background
                </button>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={backgroundFileInputRef}
                    onChange={handleBackgroundFileChange}
                />

            </div>
        );
    }
    
    const renderColorSplash = () => (
        <div className="w-full bg-panel border rounded-lg p-4 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView('main')} className="btn-secondary py-2 px-3 rounded-md">&larr; Back</button>
                <h3 className="text-lg font-semibold text-center text-subtle flex-grow">Color Splash</h3>
            </div>
            
            <p className="text-sm text-center text-subtle -mt-2">Describe the object to keep in color.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); handleApplySplash(); }} className="w-full flex items-center gap-2">
                <input
                    type="text"
                    value={splashPrompt}
                    onChange={(e) => setSplashPrompt(e.target.value)}
                    placeholder="e.g., 'the red dress' or 'the yellow taxi'"
                    className="flex-grow bg-input border text-main rounded-lg p-4 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
                    disabled={isLoading || !isOnline}
                />
                <button
                    type="submit"
                    className="btn-primary font-bold py-4 px-6 rounded-lg transition-all"
                    disabled={isLoading || !splashPrompt.trim() || !isOnline}
                >
                    Apply
                </button>
            </form>
        </div>
    );

    switch (view) {
        case 'background': return renderBackgroundChanger();
        case 'splash': return renderColorSplash();
        default: return renderMainMenu();
    }
};

export default EditorPanel;