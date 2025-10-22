import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { AppMode } from '../App';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, setMode }) => {
  const navButtonClasses = "px-4 py-2 rounded-lg font-semibold transition-colors duration-300 flex-1";
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "bg-gray-700/50 hover:bg-gray-600/80 text-gray-300";

  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-4">
        <SparklesIcon className="w-10 h-10 text-cyan-400" />
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          AI Prompt Enhancer
        </h1>
      </div>
      <p className="mt-4 text-lg text-gray-300">
        Transform your simple ideas into detailed, powerful prompts for AI generation.
      </p>
      <nav className="mt-6 flex justify-center items-center gap-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-2 max-w-md mx-auto">
        <button
          onClick={() => setMode('image')}
          className={`${navButtonClasses} ${mode === 'image' ? activeClasses : inactiveClasses}`}
        >
          Image
        </button>
        <button
          onClick={() => setMode('video')}
          className={`${navButtonClasses} ${mode === 'video' ? activeClasses : inactiveClasses}`}
        >
          Video
        </button>
        <button
          onClick={() => setMode('edit')}
          className={`${navButtonClasses} ${mode === 'edit' ? activeClasses : inactiveClasses}`}
        >
          Edit
        </button>
      </nav>
    </header>
  );
};