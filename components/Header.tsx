import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { AppMode } from '../App';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, setMode }) => {
  const modes: { id: AppMode; label: string }[] = [
    { id: 'image', label: 'Image Gen' },
    { id: 'video', label: 'Video Gen' },
    { id: 'edit', label: 'Image Edit' },
  ];

  return (
    <header className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 flex-shrink-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white border border-indigo-500/30">
            <SparklesIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
            <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
            Prompt<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Enhancer</span>
            </h1>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">Gemini 3.0 Pro</span>
        </div>
      </div>

      {/* Center Navigation - Segmented Control Look */}
      <nav className="bg-[#13151C] border border-white/10 rounded-full p-1 flex items-center shadow-lg shadow-black/20">
        {modes.map((m) => (
            <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`relative px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 z-10 ${
                    mode === m.id 
                    ? 'text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                {m.label}
                {mode === m.id && (
                    <span className="absolute inset-0 bg-[#272A35] border border-white/10 rounded-full -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
                )}
            </button>
        ))}
      </nav>
      
      {/* Right Side - Actions or Status */}
      <div className="hidden md:flex items-center gap-3">
         <div className="px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
            <span className="text-[10px] font-mono font-medium text-emerald-400">System Active</span>
         </div>
      </div>
    </header>
  );
};