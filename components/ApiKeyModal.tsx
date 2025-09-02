/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [apiKey, setApiKey] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            onSubmit(apiKey.trim());
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-panel border rounded-xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-main">Enter Gemini API Key</h2>
                    <button onClick={onClose} className="text-subtle hover:text-main text-3xl leading-none font-bold">&times;</button>
                </div>
                <p className="text-subtle mb-4 text-sm">
                    To use the AI features, you need a Google Gemini API key. You can get one for free from{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
                        Google AI Studio
                    </a>.
                    Your key is stored only in your browser for this session.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key here"
                        className="w-full bg-input border text-main rounded-lg p-3 text-base focus:ring-2 focus:ring-yellow-400 focus:outline-none transition"
                        aria-label="Gemini API Key"
                    />
                    <button
                        type="submit"
                        disabled={!apiKey.trim()}
                        className="w-full mt-4 btn-primary font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 disabled:opacity-60 disabled:shadow-none"
                    >
                        Save and Continue
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ApiKeyModal;
