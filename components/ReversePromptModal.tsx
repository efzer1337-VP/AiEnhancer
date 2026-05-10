
import React, { useRef, useState } from 'react';
import { ImageIcon } from './icons/ImageIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface ReversePromptModalProps {
  onClose: () => void;
  onReverse: (imageBase64: string, context: string) => void;
  isLoading: boolean;
}

export const ReversePromptModal: React.FC<ReversePromptModalProps> = ({ onClose, onReverse, isLoading }) => {
  const [image, setImage] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl max-h-[90vh] bg-[#0e1018] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-y-auto custom-scrollbar flex flex-col">

        {/* Decorative top gradient */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <ImageIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">Reverse Prompting</h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">Image Interrogator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Image Dropzone */}
          <div
            className={`group relative border border-dashed rounded-xl text-center cursor-pointer transition-all duration-300 h-52 flex flex-col items-center justify-center overflow-hidden ${dragActive
                ? 'border-indigo-500/60 bg-indigo-500/8 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
                : image
                  ? 'border-white/15 bg-black/40'
                  : 'border-white/8 bg-white/[0.02] hover:border-indigo-500/30 hover:bg-white/[0.04]'
              }`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files)}
              disabled={isLoading}
            />
            {image ? (
              <div className="relative h-full w-full flex items-center justify-center p-3">
                <img src={image} alt="Preview" className="max-h-full max-w-full rounded-lg object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full">
                    <ImageIcon className="w-4 h-4 text-white" />
                    <span className="text-xs text-white font-semibold uppercase tracking-wider">Change Image</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-600 group-hover:text-slate-400 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center group-hover:bg-indigo-500/10 group-hover:border-indigo-500/25 transition-all">
                  <ImageIcon className="w-6 h-6 opacity-50" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                    {dragActive ? 'Drop image here' : 'Click or drop an image'}
                  </p>
                  <p className="text-[11px] text-slate-700">to interrogate and generate a prompt from it</p>
                </div>
              </div>
            )}
          </div>

          {/* Context textarea */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Optional Context / Instructions
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Focus on the lighting style, ignore the text elements..."
              className="w-full h-24 p-4 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 outline-none resize-none transition-all font-mono hover:border-white/15 leading-relaxed"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="px-5 pb-5">
          <button
            onClick={() => image && onReverse(image, context)}
            disabled={isLoading || !image}
            className="relative w-full flex items-center justify-center gap-3 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />
            {isLoading ? (
              <span className="relative w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="relative flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                <span className="text-sm tracking-widest uppercase">Start Interrogation</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
