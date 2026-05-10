
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { Key, Menu } from 'lucide-react';
import type { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  hasKey: boolean;
  onSetKey: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, setMode, hasKey, onSetKey, onToggleSidebar }) => {
  const modes: { id: AppMode; label: string }[] = [
    { id: 'image', label: 'Image Gen' },
    { id: 'video', label: 'Video Gen' },
    { id: 'edit', label: 'Image Edit' },
  ];

  return (
    <header className="flex flex-col lg:flex-row items-center justify-between gap-4 py-4 flex-shrink-0">
      <div className="flex items-center justify-between w-full lg:w-auto">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] text-white border border-white/20 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] group-hover:scale-105 transition-all duration-300">
              <SparklesIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">
              Prompt<span className="premium-gradient-text">Enhancer</span>
              </h1>
              <span className="text-[10px] text-slate-400 font-mono mt-1 tracking-widest uppercase">Generative Suite</span>
          </div>
        </div>

        {/* Mobile Key Status */}
        <div className="lg:hidden flex items-center gap-2">
            <button
                onClick={onSetKey}
                className={`p-2.5 rounded-xl border transition-all duration-300 active:scale-95 shadow-lg ${
                    hasKey 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10' 
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-indigo-500/10 hover:bg-indigo-500/20'
                }`}
            >
                <Key className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Center Navigation */}
      <nav className="glass-panel rounded-full p-1.5 flex items-center shadow-lg shadow-black/20 overflow-x-auto max-w-full no-scrollbar relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-full pointer-events-none" />
        {modes.map((m) => (
            <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`relative px-5 md:px-7 py-2 rounded-full text-sm font-medium transition-all duration-300 z-10 whitespace-nowrap outline-none ${
                    mode === m.id 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
                {m.label}
                {mode === m.id && (
                    <span className="absolute inset-0 bg-white/10 border border-white/20 rounded-full -z-10 shadow-[0_2px_15px_rgba(255,255,255,0.1)] backdrop-blur-md" />
                )}
            </button>
        ))}
      </nav>
      
      {/* Right Side - Branding Accent */}
      <div className="hidden lg:flex items-center gap-3">
         <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-3">
                <button
                    onClick={onSetKey}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 premium-hover ${
                        hasKey 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    }`}
                >
                    <Key className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-mono uppercase tracking-widest font-semibold">
                        {hasKey ? 'Key Set' : 'Set API Key'}
                    </span>
                </button>
                <div className="flex items-center gap-2 glass-panel px-4 py-2 rounded-full border-white/10 shadow-lg">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${hasKey ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`}></span>
                    <span className="text-[11px] font-mono text-slate-300 uppercase tracking-widest font-medium">
                        {hasKey ? 'System Active' : 'Key Required'}
                    </span>
                </div>
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
