
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { AppMode, GeminiModelType } from '../types';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  geminiModel: GeminiModelType;
  setGeminiModel: (model: GeminiModelType) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, setMode, geminiModel, setGeminiModel }) => {
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
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">Generative Suite</span>
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
         <div className="relative group">
             <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value as GeminiModelType)}
                className="appearance-none bg-[#13151C] border border-white/10 text-slate-300 text-[10px] font-mono font-medium rounded-full pl-3 pr-8 py-1.5 focus:outline-none focus:border-indigo-500 hover:border-white/20 transition-all shadow-sm cursor-pointer"
             >
                <option value="gemini-3-pro">Gemini 3.0 Pro</option>
                <option value="gemini-3-flash">Gemini 3.0 Flash</option>
             </select>
             <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="m6 9 6 6 6-6"/>
                 </svg>
             </div>
         </div>
      </div>
    </header>
  );
};
