
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { AppMode } from '../types';

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
    <header className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 flex-shrink-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white border border-indigo-500/30">
            <SparklesIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
            <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
            Prompt<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Enhancer</span>
            </h1>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">Generative Suite</span>
        </div>
      </div>

      {/* Center Navigation */}
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
      
      {/* Right Side - Branding Accent */}
      <div className="flex items-center gap-3">
         <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2 bg-[#13151C] border border-white/10 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    System Active
                </span>
             </div>
             <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[9px] text-slate-600 hover:text-indigo-400 transition-colors uppercase tracking-tighter flex items-center gap-1 pr-1"
             >
                Usage Policy
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
             </a>
         </div>
      </div>
    </header>
  );
};
