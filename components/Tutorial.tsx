/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useLayoutEffect, useRef } from 'react';
import { LightbulbIcon } from './icons';

interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ step, currentStep, totalSteps, onNext, onPrev, onSkip }) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const updatePosition = () => {
      const targetElement = document.getElementById(step.targetId);
      const tooltipElement = tooltipRef.current;

      if (targetElement && tooltipElement) {
        const target = targetElement.getBoundingClientRect();
        setTargetRect(target);

        const tooltip = tooltipElement.getBoundingClientRect();
        const { innerWidth: vw, innerHeight: vh } = window;
        const margin = 12;

        let top: number;
        let left: number;

        // Calculate ideal position based on preference
        switch (step.position) {
          case 'bottom':
            top = target.bottom + margin;
            left = target.left + target.width / 2 - tooltip.width / 2;
            break;
          case 'top':
            top = target.top - margin - tooltip.height;
            left = target.left + target.width / 2 - tooltip.width / 2;
            break;
          case 'left':
            top = target.top + target.height / 2 - tooltip.height / 2;
            left = target.left - margin - tooltip.width;
            break;
          case 'right':
            top = target.top + target.height / 2 - tooltip.height / 2;
            left = target.right + margin;
            break;
          default:
            top = 0; left = 0;
        }

        // Adjust position to stay within the viewport
        if (left < margin) left = margin;
        if (left + tooltip.width > vw - margin) left = vw - tooltip.width - margin;
        if (top < margin) top = margin;
        if (top + tooltip.height > vh - margin) top = vh - tooltip.height - margin;

        setTooltipStyle({
          position: 'fixed',
          zIndex: 1001,
          transition: 'all 0.3s ease-in-out, opacity 0.2s ease-in-out',
          top: `${top}px`,
          left: `${left}px`,
          opacity: 1,
        });

      } else {
        setTargetRect(null); // Hide if element not found
        setTooltipStyle({ opacity: 0 });
      }
    };

    // RAF ensures the update happens in the next paint cycle, after dimensions are stable.
    const animationFrameId = requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [step]);

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black/70 animate-fade-in"
        style={{
            clipPath: targetRect 
                ? `path(evenodd, "M0 0 H ${window.innerWidth} V ${window.innerHeight} H 0 V 0 Z M ${targetRect.x - 4} ${targetRect.y - 4} H ${targetRect.right + 4} V ${targetRect.bottom + 4} H ${targetRect.x - 4} V ${targetRect.y - 4} Z")`
                : 'none'
        }}
      ></div>

      <div
          ref={tooltipRef}
          className="bg-panel border rounded-lg p-5 w-80 shadow-2xl"
          style={tooltipStyle}
      >
          {targetRect && (
            <>
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                        <LightbulbIcon className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-main">{step.title}</h3>
                        <p className="text-subtle mt-1">{step.content}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-semibold text-subtle">
                        {currentStep} / {totalSteps}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSkip}
                            className="text-sm font-semibold text-subtle hover:text-main transition-colors px-3 py-1"
                        >
                            Skip
                        </button>
                        {currentStep > 1 && (
                            <button
                                onClick={onPrev}
                                className="btn-secondary font-semibold py-2 px-4 rounded-md text-sm"
                            >
                                Previous
                            </button>
                        )}
                        <button
                            onClick={onNext}
                            className="btn-primary font-bold py-2 px-4 rounded-md text-sm"
                        >
                            {currentStep === totalSteps ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </>
          )}
      </div>

      {targetRect && (
        <div
            className="absolute bg-transparent pointer-events-none rounded-lg"
            style={{
                left: targetRect.x - 4,
                top: targetRect.y - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: '0 0 0 2px #FFD60A, 0 0 15px #FFD60A',
                transition: 'all 0.3s ease-in-out',
                zIndex: 1000,
            }}
        />
      )}
    </div>
  );
};

export default Tutorial;
