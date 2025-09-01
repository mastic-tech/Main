/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { type TextOptions } from '../services/geminiService';

interface TextPanelProps {
  onApplyText: (options: TextOptions) => void;
  isLoading: boolean;
  isOnline: boolean;
}

const fonts = [
  // Sans-serif
  'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS', 'Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Raleway',
  // Serif
  'Times New Roman', 'Georgia', 'Garamond', 'Playfair Display', 'Merriweather',
  // Monospace
  'Courier New', 'Source Code Pro',
  // Script
  'Brush Script MT', 'Lobster', 'Pacifico', 'Dancing Script',
  // Display
  'Oswald',
];

const TextPanel: React.FC<TextPanelProps> = ({ onApplyText, isLoading, isOnline }) => {
    const [content, setContent] = useState('');
    const [fontFamily, setFontFamily] = useState('Arial');
    const [fontSize, setFontSize] = useState(48);
    const [color, setColor] = useState('#FFFFFF');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);

    const handleApply = () => {
        if (!content.trim()) return;
        onApplyText({ content, fontFamily, fontSize, color, isBold, isItalic });
    };

    return (
        <div className="w-full bg-panel border rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-subtle">Add Text to Image</h3>
            <p className="text-sm text-subtle -mt-2">The AI will place your text in a sensible, centered location.</p>
            
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your text here..."
                className="w-full bg-input border text-main rounded-lg p-3 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
                rows={3}
                disabled={isLoading || !isOnline}
            />

            <div className="w-full grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2">
                    <label htmlFor="font-family" className="text-sm font-medium text-subtle">Font Family</label>
                    <select
                        id="font-family"
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full bg-input border text-main rounded-lg p-3 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLoading || !isOnline}
                        style={{ fontFamily: fontFamily }}
                    >
                        {fonts.sort().map(font => <option key={font} value={font} style={{ fontFamily: font, fontSize: '16px' }}>{font}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="font-size" className="text-sm font-medium text-subtle">Font Size ({fontSize}pt)</label>
                    <input
                        id="font-size"
                        type="range"
                        min="12"
                        max="120"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer accent-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLoading || !isOnline}
                    />
                </div>
            </div>
            
            <div className="w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="font-color" className="text-sm font-medium text-subtle">Color:</label>
                    <input
                        id="font-color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-10 h-10 p-1 bg-input border-none rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLoading || !isOnline}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsBold(!isBold)} disabled={isLoading || !isOnline} className={`font-bold px-4 py-2 rounded-md transition-colors ${isBold ? 'btn-primary shadow-md' : 'btn-secondary'}`}>B</button>
                    <button onClick={() => setIsItalic(!isItalic)} disabled={isLoading || !isOnline} className={`italic px-4 py-2 rounded-md transition-colors ${isItalic ? 'btn-primary shadow-md' : 'btn-secondary'}`}>I</button>
                </div>
            </div>

            <button
                onClick={handleApply}
                disabled={isLoading || !content.trim() || !isOnline}
                className="w-full max-w-xs mt-2 btn-primary font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            >
                Apply Text
            </button>
        </div>
    );
};

export default TextPanel;