
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
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-xl max-h-[90vh] bg-[#13151C] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar flex flex-col ring-1 ring-white/5 animate-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B0D12]">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Reverse Prompting</h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Image Interrogator</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-6">
            <div 
                className={`group relative border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 h-48 flex flex-col items-center justify-center bg-zinc-900/30 ${
                    dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/30'
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
                    <div className="relative h-full w-full flex items-center justify-center">
                        <img src={image} alt="Preview" className="max-h-full max-w-full rounded-lg shadow-lg object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <span className="text-xs text-white font-bold uppercase tracking-wider">Change Image</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        <p className="text-slate-500 text-sm group-hover:text-slate-300">
                            {dragActive ? 'Drop image here' : 'Click or drop an image to interrogate'}
                        </p>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Optional context / Instructions</label>
                <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="e.g. Focus on the lighting style, ignore the text..."
                    className="w-full h-24 p-4 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none transition-all font-mono"
                    disabled={isLoading}
                />
            </div>
        </div>

        <div className="p-6 pt-0">
            <button
                onClick={() => image && onReverse(image, context)}
                disabled={isLoading || !image}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-sm tracking-widest uppercase">Start Interrogation</span>
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
