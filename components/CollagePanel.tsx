/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface CollagePanelProps {
  onLayoutChange: (layoutId: string) => void;
  onCreateCollage: () => void;
  onAddImages: () => void;
  onClearImages: () => void;
  images: File[];
  layout: string;
  isLoading: boolean;
  layouts: { id: string, name: string, required: number }[];
  isOnline: boolean;
}

const CollagePanel: React.FC<CollagePanelProps> = ({ 
    onLayoutChange, 
    onCreateCollage, 
    onAddImages,
    onClearImages,
    images, 
    layout, 
    isLoading,
    layouts,
    isOnline,
}) => {
  const selectedLayout = layouts.find(l => l.id === layout);
  const canCreate = selectedLayout && images.length === selectedLayout.required;

  return (
    <div className="w-full bg-panel border rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in">
        <h3 className="text-lg font-semibold text-subtle">Create a Collage</h3>
        <p className="text-sm text-subtle -mt-2">Choose a layout and add your images.</p>
        
        <div className="flex flex-wrap items-center justify-center gap-2">
            {layouts.map(({ id, name }) => (
            <button
                key={id}
                onClick={() => onLayoutChange(id)}
                disabled={isLoading}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                layout === id
                ? 'btn-primary shadow-md shadow-yellow-500/20' 
                : 'btn-secondary'
                }`}
            >
                {name}
            </button>
            ))}
        </div>
        
        <div className="flex items-center gap-2">
            <button
                onClick={onAddImages}
                disabled={isLoading}
                className="btn-secondary font-semibold py-2 px-4 rounded-md text-sm"
            >
                Add More Images
            </button>
            <button
                onClick={onClearImages}
                disabled={isLoading || images.length === 0}
                className="btn-secondary font-semibold py-2 px-4 rounded-md text-sm disabled:opacity-50"
            >
                Clear Images
            </button>
            <span className="text-sm text-subtle pl-2">
                {images.length} / {selectedLayout?.required || 0} images added
            </span>
        </div>

        <button
            onClick={onCreateCollage}
            disabled={isLoading || !canCreate || !isOnline}
            className="w-full max-w-xs mt-2 btn-primary font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
            Create Collage
        </button>
    </div>
  );
};

export default CollagePanel;