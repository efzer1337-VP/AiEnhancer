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
      case 'image':
        return <ImageIcon className="w-5 h-5 text-cyan-400" />;
      case 'video':
        return <VideoIcon className="w-5 h-5 text-purple-400" />;
      case 'edit':
        return <EditIcon className="w-5 h-5 text-green-400" />;
      default:
        return null;
    }
  }
  
  return (
    <aside className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl flex flex-col h-full max-h-[calc(100vh-12rem)]">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-gray-100">History</h2>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-md transition-colors"
            aria-label="Clear history"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto p-2">
        {history.length === 0 ? (
          <div className="text-center text-gray-500 p-6">
            <p>Your generated prompts will appear here.</p>
          </div>
        ) : (
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left p-3 my-1 rounded-lg flex items-center gap-3 transition-colors duration-200 ${
                    activeId === item.id ? 'bg-blue-600/30 text-white' : 'hover:bg-gray-700/50 text-gray-300'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <span className="truncate text-sm">
                    {item.simplePrompt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};