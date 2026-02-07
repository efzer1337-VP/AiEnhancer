
import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import type { ImageModel } from '../types';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  references: string[];
  setReferences: (images: string[] | ((prev: string[]) => string[])) => void;
  language: 'en' | 'ru';
  setLanguage: (language: 'en' | 'ru') => void;
  imageModel: ImageModel;
  setImageModel: (model: ImageModel) => void;
  enhancementPower: number;
  setEnhancementPower: (power: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
  onReversePromptOpen: () => void;
}

const imageModels: { id: ImageModel; name: string }[] = [
  { id: 'midjourney', name: 'Midjourney' },
  { id: 'nanobanana', name: 'NanoBanana' },
  { id: 'flux', name: 'Flux' },
  { id: 'z-image', name: 'Z-Image' },
];

const powerLabels: { [key: number]: string } = {
  1: 'Subtle',
  2: 'Mild',
  3: 'Balanced',
  4: 'Strong',
  5: 'Max Creative',
};

const MultiImageDropzone: React.FC<{
  title: string;
  subtitle?: string;
  images: string[];
  setImages: (update: string[] | ((prev: string[]) => string[])) => void;
  isLoading: boolean;
  className?: string;
}> = ({ title, subtitle, images, setImages, isLoading, className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
      const newImages: string[] = [];
      
      let processedCount = 0;
      if (fileArray.length === 0) return;

      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
          }
          processedCount++;
          if (processedCount === fileArray.length) {
            // Use functional update to avoid stale closure issues
            setImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
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
    if (e.dataTransfer.files) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div
      className={`group relative w-full border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all duration-300 flex flex-col items-center min-h-[120px] bg-zinc-900/30 hover:bg-white/[0.04] ${
        dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/30'
      } ${className}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) {
            fileInputRef.current?.click();
        }
      }}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
        disabled={isLoading}
      />
      
      {images.length > 0 ? (
        <div className="w-full">
            <div className="flex justify-between items-center mb-3 px-1">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{images.length} References Selected</p>
                <button 
                    onClick={(e) => { e.stopPropagation(); setImages([]); }}
                    className="text-[9px] text-red-400 hover:text-red-300 uppercase tracking-tighter font-bold border border-red-500/20 px-1.5 py-0.5 rounded bg-red-500/5 transition-colors"
                >
                    Clear All
                </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 w-full p-1">
                {images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group/img shadow-lg">
                        <img src={img} alt={`Ref ${index}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center" />
                         <button
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100 z-20 shadow-xl"
                         >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                         </button>
                    </div>
                ))}
                <div className="flex flex-col items-center justify-center aspect-square rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group/add">
                     <span className="text-xl text-slate-500 group-hover/add:text-slate-300 group-hover/add:scale-125 transition-all">+</span>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full py-4 text-slate-500 group-hover:text-slate-300 transition-colors relative z-10">
          <ImageIcon className="w-6 h-6 mb-2 opacity-50" />
          <p className="font-bold text-[11px] uppercase tracking-widest">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
        </div>
      )}
    </div>
  );
};

export const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  setPrompt,
  references,
  setReferences,
  language,
  setLanguage,
  imageModel,
  setImageModel,
  enhancementPower,
  setEnhancementPower,
  onGenerate,
  isLoading,
  onReversePromptOpen,
}) => {
  return (
    <div className="bg-[#13151C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 h-full ring-1 ring-white/5 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between flex-shrink-0">
         <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Input Config</h2>
            <button
                onClick={onReversePromptOpen}
                className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded transition-all font-bold uppercase tracking-tight"
            >
                Reverse Prompting
            </button>
         </div>
         <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
            className="bg-zinc-900/80 border border-white/10 rounded-md px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none hover:border-white/20 transition-colors"
          >
            <option value="en">English</option>
            <option value="ru">Russian</option>
          </select>
      </div>

      <div className="flex flex-col gap-2 flex-shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">Reference Images (Character, Style, Composition)</span>
          <MultiImageDropzone 
            title="Upload references" 
            subtitle="Drop multiple files or click to browse"
            images={references} 
            setImages={setReferences} 
            isLoading={isLoading}
          />
      </div>
      
      <div className="space-y-5 flex-shrink-0">
        <div className="space-y-2.5">
            <div className="flex justify-between text-xs font-medium">
                <label className="text-slate-400">Enhancement Strength</label>
                <span className="text-indigo-400 font-mono">{powerLabels[enhancementPower]}</span>
            </div>
            <div className="relative h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${(enhancementPower / 5) * 100}%` }}
                />
                <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={enhancementPower}
                    onChange={(e) => setEnhancementPower(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                />
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 font-mono px-0.5">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
        </div>

        <div className="space-y-2.5">
            <label className="text-xs font-medium text-slate-400">Target Model</label>
            <div className="grid grid-cols-4 gap-2">
                {imageModels.map((model) => (
                    <button
                    key={model.id}
                    onClick={() => setImageModel(model.id)}
                    className={`px-1 py-2 text-[10px] uppercase tracking-wide font-semibold rounded-lg border transition-all duration-200 ${
                        imageModel === model.id
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                        : 'bg-zinc-900/30 border-white/5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300 hover:border-white/10'
                    }`}
                    >
                    {model.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col space-y-2 min-h-[120px]">
        <label className="text-xs font-medium text-slate-400">Prompt Idea</label>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={language === 'en' ? 'Describe your idea briefly...' : 'Опишите вашу идею кратко...'}
            className="w-full flex-grow p-4 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none transition-all font-mono hover:border-white/20"
            disabled={isLoading}
        />
      </div>

      <div className="pt-2 pb-1 flex-shrink-0">
          <button
            onClick={onGenerate}
            disabled={isLoading || (!prompt.trim() && references.length === 0)}
            className="relative z-10 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(79,70,229,0.25)] hover:shadow-[0_4px_30px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none border border-white/10"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 <span className="text-sm">Processing...</span>
              </div>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span className="text-sm tracking-wide">Enhance Prompt</span>
              </>
            )}
          </button>
      </div>
    </div>
  );
};
