/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ZoomInIcon, ZoomOutIcon, ExpandIcon, InformationCircleIcon } from './icons';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  scale: number;
  onShowInfo: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset, scale, onShowInfo }) => {
  return (
    <div className="absolute bottom-4 right-4 z-20 bg-panel border rounded-lg p-1 flex items-center justify-center gap-1">
       <button
        onClick={onShowInfo}
        className="p-2 text-subtle hover:text-main rounded-md transition-colors"
        aria-label="Show image information"
      >
        <InformationCircleIcon className="w-6 h-6" />
      </button>
      <div className="h-6 w-px bg-panel mx-1"></div>
      <button
        onClick={onZoomOut}
        className="p-2 text-subtle hover:text-main rounded-md transition-colors"
        aria-label="Zoom out"
      >
        <ZoomOutIcon className="w-6 h-6" />
      </button>
      <span className="text-sm font-semibold text-main w-16 text-center tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="p-2 text-subtle hover:text-main rounded-md transition-colors"
        aria-label="Zoom in"
      >
        <ZoomInIcon className="w-6 h-6" />
      </button>
       <div className="h-6 w-px bg-panel mx-1"></div>
      <button
        onClick={onReset}
        className="p-2 text-subtle hover:text-main rounded-md transition-colors"
        aria-label="Reset zoom"
      >
        <ExpandIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

export default ZoomControls;