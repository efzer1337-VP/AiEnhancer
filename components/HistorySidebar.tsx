
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

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, activeId, onSelect, onClear }) => {
  
  const getIcon = (type: HistoryItem['type']) => {
    switch(type) {
      case 'image': return <ImageIcon className="w-3.5 h-3.5" />;
      case 'video': return <VideoIcon className="w-3.5 h-3.5" />;
      case 'edit': return <EditIcon className="w-3.5 h-3.5" />;
    }
  }
  
  return (
    <aside className="h-full flex flex-col bg-[#13151C]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden ring-1 ring-white/5 shadow-2xl">
      <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#0B0D12]">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Library</h2>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded-md"
            aria-label="Clear history"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-xs text-center px-4">
            <span className="mb-2 opacity-40">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
            </span>
            <p className="text-slate-500">History is empty.<br/>Create something amazing.</p>
          </div>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all duration-200 border group ${
                activeId === item.id 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100 shadow-md shadow-indigo-900/10' 
                : 'border-transparent hover:bg-white/[0.03] hover:border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`mt-0.5 flex-shrink-0 transition-colors ${activeId === item.id ? 'text-indigo-400' : 'opacity-50 group-hover:text-slate-300'}`}>
                {getIcon(item.type)}
              </div>
              <div className="flex flex-col min-w-0 gap-1 flex-grow">
                 <span className="truncate text-xs font-medium leading-snug">
                    {item.simplePrompt || (item.type === 'video' ? 'Video Generation' : 'Image Editing')}
                 </span>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-60 font-mono uppercase tracking-wide">
                        {item.model}
                    </span>
                    {item.geminiModel && (
                         <span className={`text-[9px] px-1 py-0.5 rounded border ${
                            item.geminiModel === 'gemini-3-pro' 
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                         }`}>
                             {item.geminiModel === 'gemini-3-pro' ? 'G 3.0 Pro' : 'G 3.0 Flash'}
                         </span>
                    )}
                 </div>
              </div>
            </button>
          ))
        )}
      </div>
      
      {/* Bottom Status/Info */}
      <div className="p-3 border-t border-white/10 bg-[#0B0D12]">
        <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono">
            <span>{history.length} Items</span>
            <span>Local Storage</span>
        </div>
      </div>
    </aside>
  );
};
