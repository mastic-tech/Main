/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon, SunIcon, MoonIcon, UploadIcon, LightbulbIcon, SearchIcon } from './icons';

interface HeaderProps {
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onUploadClick: () => void;
    onStartTutorial: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, onUploadClick, onStartTutorial, searchQuery, onSearchChange }) => {
  return (
    <header className="w-full py-3 px-2 sm:px-4 border-b bg-panel sticky top-0 z-50">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
              <SparkleIcon className="w-7 h-7 text-yellow-400" />
              <h1 className="text-xl font-bold tracking-tight text-main hidden sm:block">
                Pixshop
              </h1>
          </div>
          <div className="flex-grow flex items-center justify-center min-w-0 px-2 sm:px-4">
            <div className="relative w-full max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-subtle" />
                </div>
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search for tools & filters..."
                    className="w-full bg-input border text-main rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition text-base"
                    aria-label="Search for tools and filters"
                />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
                onClick={onUploadClick}
                className="flex items-center justify-center text-center btn-primary font-bold p-2.5 rounded-md transition-all duration-300 ease-in-out text-base shadow-md shadow-yellow-500/20 hover:shadow-lg hover:shadow-yellow-500/30"
                aria-label="Upload a new image"
            >
                <UploadIcon className="w-5 h-5" />
            </button>
            
            <div className="h-6 w-px bg-panel mx-1 hidden sm:block"></div>
            
            <button
                onClick={onStartTutorial}
                className="p-2 text-subtle hover:text-main rounded-full hover:bg-white/10 transition-colors hidden sm:block"
                aria-label="Start guided tour"
            >
                <LightbulbIcon className="w-6 h-6" />
            </button>
            
            <SunIcon className={`w-6 h-6 transition-colors ${theme === 'light' ? 'text-yellow-500' : 'text-subtle'} hidden sm:block`} />
            <div className="theme-switch-wrapper">
                <label className="theme-switch" htmlFor="theme-checkbox">
                    <input 
                        type="checkbox" 
                        id="theme-checkbox" 
                        onChange={onToggleTheme} 
                        checked={theme === 'dark'}
                    />
                    <div className="slider round"></div>
                </label>
            </div>
            <MoonIcon className={`w-5 h-5 transition-colors ${theme === 'dark' ? 'text-yellow-400' : 'text-subtle'} hidden sm:block`} />
          </div>
      </div>
    </header>
  );
};

export default Header;