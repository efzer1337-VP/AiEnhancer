import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import type { ImageModel } from '../types';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  characterReference: string | null;
  setCharacterReference: (image: string | null) => void;
  compositionReference: string | null;
  setCompositionReference: (image: string | null) => void;
  language: 'en' | 'ru';
  setLanguage: (language: 'en' | 'ru') => void;
  imageModel: ImageModel;
  setImageModel: (model: ImageModel) => void;
  enhancementPower: number;
  setEnhancementPower: (power: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const imageModels: { id: ImageModel; name: string }[] = [
  { id: 'midjourney', name: 'Midjourney' },
  { id: 'nanobanana', name: 'NanoBanana' },
  { id: 'flux', name: 'Flux' },
  { id: 'wan', name: 'Wan' },
];

const powerLabels: { [key: number]: string } = {
  1: 'Subtle',
  2: 'Mild',
  3: 'Balanced',
  4: 'Strong',
  5: 'Max Creative',
};

const ImageDropzone: React.FC<{
  title: string;
  subtitle: string;
  image: string | null;
  setImage: (image: string | null) => void;
  isLoading: boolean;
}> = ({ title, subtitle, image, setImage, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

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
    <div
      className={`group relative w-full border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-300 flex flex-col justify-center items-center h-28 overflow-hidden ${
        dragActive 
            ? 'border-indigo-500 bg-indigo-500/10' 
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04] bg-zinc-900/30'
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
        <>
          <div className="absolute inset-0 bg-black/60 z-0"></div>
          <img src={image} alt={`${title} preview`} className="relative z-10 max-h-full max-w-full object-contain rounded shadow-sm" />
          <button
            onClick={(e) => { e.stopPropagation(); setImage(null); }}
            className="absolute -top-1 -right-1 bg-zinc-800 text-white rounded-full w-5 h-5 flex items-center justify-center border border-zinc-600 shadow-md hover:bg-red-500 hover:border-red-500 transition-colors z-20"
          >
            &times;
          </button>
        </>
      ) : (
        <div className="relative z-10 flex flex-col items-center">
          <ImageIcon className="w-5 h-5 text-slate-500 mb-1 group-hover:text-indigo-400 transition-colors" />
          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">{title}</span>
          <span className="text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  setPrompt,
  characterReference,
  setCharacterReference,
  compositionReference,
  setCompositionReference,
  language,
  setLanguage,
  imageModel,
  setImageModel,
  enhancementPower,
  setEnhancementPower,
  onGenerate,
  isLoading,
}) => {
  return (
    <div className="bg-[#13151C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 h-full ring-1 ring-white/5">
      <div className="flex items-center justify-between">
         <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Input Config</h2>
         <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
            className="bg-zinc-900/80 border border-white/10 rounded-md px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none hover:border-white/20 transition-colors"
          >
            <option value="en">English</option>
            <option value="ru">Russian</option>
          </select>
      </div>

      {/* Image Dropzones */}
      <div className="grid grid-cols-2 gap-4">
        <ImageDropzone 
          title="Character Ref" 
          subtitle="Optional face/char"
          image={characterReference} 
          setImage={setCharacterReference} 
          isLoading={isLoading}
        />
        <ImageDropzone 
          title="Style Ref" 
          subtitle="Optional vibe/comp"
          image={compositionReference} 
          setImage={setCompositionReference} 
          isLoading={isLoading}
        />
      </div>
      
      {/* Controls */}
      <div className="space-y-5">
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

      {/* Text Area */}
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

      <button
        onClick={onGenerate}
        disabled={isLoading || (!prompt.trim() && !characterReference && !compositionReference)}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(79,70,229,0.25)] hover:shadow-[0_4px_30px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none border border-white/10"
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
  );
};