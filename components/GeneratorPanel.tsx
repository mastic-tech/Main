/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { generateImageFromPrompt, type GenerationOptions } from '../services/geminiService';
import Spinner from './Spinner';
import { SparkleIcon, ExpandIcon, PromptIcon, UndoIcon, RedoIcon } from './icons';

interface GeneratorPanelProps {
  onImageGenerated: (imageDataUrl: string) => void;
  isOnline: boolean;
}

const FeatureGuide: React.FC = () => (
    <div className="w-full bg-input border rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-main mb-4 text-center">AI Image Generator</h2>
        <div className="grid grid-cols-1 gap-6 text-center">
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 bg-panel rounded-full mb-3">
                    <PromptIcon className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="font-semibold text-main">1. Write a Prompt</h3>
                <p className="text-sm text-subtle mt-1">Describe anything you can imagine. Be specific for best results!</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 bg-panel rounded-full mb-3">
                    <ExpandIcon className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="font-semibold text-main">2. Choose Aspect Ratio</h3>
                <p className="text-sm text-subtle mt-1">Select square, portrait, or landscape to fit your needs.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 bg-panel rounded-full mb-3">
                    <SparkleIcon className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="font-semibold text-main">3. Generate & Edit</h3>
                <p className="text-sm text-subtle mt-1">Create your image and then use it in the editor for more enhancements.</p>
            </div>
        </div>
    </div>
);


const GeneratorPanel: React.FC<GeneratorPanelProps> = ({ onImageGenerated, isOnline }) => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<GenerationOptions['aspectRatio']>('1:1');
    const [generationHistory, setGenerationHistory] = useState<string[][]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const currentImages = generationHistory[historyIndex] ?? [];
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < generationHistory.length - 1;

    const aspectRatios: { id: GenerationOptions['aspectRatio'], name: string }[] = [
        { id: '1:1', name: 'Square' },
        { id: '16:9', name: 'Landscape' },
        { id: '9:16', name: 'Portrait' },
        { id: '4:3', name: 'Standard' },
        { id: '3:4', name: 'Tall' },
    ];

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        setIsGenerating(true);
        setError(null);
        
        try {
            const images = await generateImageFromPrompt({
                prompt,
                aspectRatio,
                numberOfImages: 2,
            });
            const newHistory = generationHistory.slice(0, historyIndex + 1);
            newHistory.push(images);
            setGenerationHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate image. ${errorMessage}`);
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleUndo = () => {
        if (canUndo) {
            setHistoryIndex(historyIndex - 1);
        }
    };
    
    const handleRedo = () => {
        if (canRedo) {
            setHistoryIndex(historyIndex + 1);
        }
    };

    const handleDownloadImage = useCallback((imageDataUrl: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `generated-pixshop-${historyIndex + 1}-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [historyIndex]);

    return (
        <div className="w-full bg-panel border rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in">
            <FeatureGuide />
            
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A cute corgi wearing sunglasses on a skateboard, photorealistic."
                className="w-full bg-input border text-main rounded-lg p-4 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
                rows={3}
                disabled={isGenerating || !isOnline}
            />

            <div className="w-full flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm font-medium text-subtle mr-2">Aspect Ratio:</span>
                {aspectRatios.map(({ id, name }) => (
                  <button
                    key={id}
                    onClick={() => setAspectRatio(id)}
                    disabled={isGenerating || !isOnline}
                    className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                      aspectRatio === id
                      ? 'btn-primary shadow-md shadow-yellow-500/20' 
                      : 'btn-secondary'
                    }`}
                  >
                    {name}
                  </button>
                ))}
            </div>
            
            <div className="w-full max-w-lg mt-2 flex items-center justify-center gap-2">
                 <button 
                    onClick={handleUndo}
                    disabled={!canUndo || isGenerating || !isOnline}
                    className="btn-secondary font-semibold py-4 px-5 rounded-lg transition-all duration-200 ease-in-out active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Undo last generation"
                >
                    <UndoIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim() || !isOnline}
                    className="flex-grow btn-primary font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-lg disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                >
                    {isGenerating ? 'Generating...' : 'Generate Image'}
                    <SparkleIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleRedo}
                    disabled={!canRedo || isGenerating || !isOnline}
                    className="btn-secondary font-semibold py-4 px-5 rounded-lg transition-all duration-200 ease-in-out active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Redo last generation"
                >
                    <RedoIcon className="w-5 h-5" />
                </button>
            </div>


            {error && (
                <div className="mt-4 text-center bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
                    <p className="font-bold">Generation Failed</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            
            {isGenerating && <div className="mt-6"><Spinner /></div>}
            
            {currentImages.length > 0 && !isGenerating && (
                <div className="mt-6 w-full animate-fade-in">
                    <h3 className="text-lg font-semibold text-center text-subtle mb-4">Choose a result to edit or download:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentImages.map((src, index) => (
                            <div key={`${historyIndex}-${index}`} className="flex flex-col items-center gap-3 bg-input p-3 rounded-lg animate-fade-in">
                                <img src={src} alt={`Generated image ${index + 1}`} className="rounded-md w-full object-contain" />
                                <div className="w-full flex items-center gap-2 mt-2">
                                    <button 
                                        onClick={() => handleDownloadImage(src, index)}
                                        className="w-full btn-secondary font-bold py-3 px-5 rounded-md"
                                    >
                                        Download
                                    </button>
                                    <button 
                                        onClick={() => onImageGenerated(src)}
                                        className="w-full btn-primary font-bold py-3 px-5 rounded-md"
                                    >
                                        Use in Editor
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneratorPanel;