
import React from 'react';
import type { HistoryItem } from '../types';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HistorySidebarProps {
  history: HistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

const typeConfig = {
  image: { color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', label: 'IMG' },
  video: { color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', label: 'VID' },
  edit:  { color: 'text-pink-400',   bg: 'bg-pink-500/15',   border: 'border-pink-500/30',   label: 'EDT' },
};

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, activeId, onSelect, onClear }) => {
  
  const getIcon = (type: HistoryItem['type']) => {
    switch(type) {
      case 'image': return <ImageIcon className="w-3.5 h-3.5" />;
      case 'video': return <VideoIcon className="w-3.5 h-3.5" />;
      case 'edit':  return <EditIcon  className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside className="h-full flex flex-col bg-[#0e1018]/80 backdrop-blur-2xl border border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3.5 border-b border-white/8 bg-gradient-to-r from-[#0e1018] to-[#13151c]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400 rounded-full" />
          <h2 className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Library</h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-slate-600 hover:text-red-400 transition-all p-1.5 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 active:scale-95"
            aria-label="Clear history"
            title="Clear all history"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Items List */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-2.5 space-y-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-xs text-center px-4 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
                <path d="M12 20v-6M6 20V10M18 20V4"/>
              </svg>
            </div>
            <p className="text-slate-500 leading-relaxed">History is empty.<br/><span className="text-slate-600">Create something amazing.</span></p>
          </div>
        ) : (
          history.map((item) => {
            const cfg = typeConfig[item.type];
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all duration-200 border group ${
                  isActive
                  ? `${cfg.bg} ${cfg.border} shadow-md`
                  : 'border-transparent hover:bg-white/[0.04] hover:border-white/8'
                }`}
              >
                {/* Type Icon */}
                <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  isActive ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-white/5 border-white/8 text-slate-500 group-hover:text-slate-300 group-hover:bg-white/10'
                }`}>
                  {getIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0 gap-1.5 flex-grow">
                  <span className={`truncate text-xs font-medium leading-snug transition-colors ${isActive ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {item.simplePrompt || (item.type === 'video' ? 'Video Generation' : 'Image Editing')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                      isActive ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-white/5 border-white/8 text-slate-600'
                    }`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wide truncate">
                      {item.model}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/8 bg-[#0e1018]/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-600 font-mono">{history.length} items</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
            <span className="text-[10px] text-slate-600 font-mono">Local</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
