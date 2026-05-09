
import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import { resizeImage } from '../src/utils/imageUtils';
import type { EditModel } from '../types';

interface EditPromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  language: 'en' | 'ru';
  setLanguage: (language: 'en' | 'ru') => void;
  sourceImage: string | null;
  setSourceImage: (frame: string | null) => void;
  references: string[];
  setReferences: (images: string[] | ((prev: string[]) => string[])) => void;
  editModel: EditModel;
  setEditModel: (model: EditModel) => void;
  enhancementPower: number;
  setEnhancementPower: (power: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const editModels: { id: EditModel; name: string }[] = [
  { id: 'nanobanana', name: 'NanoBanana' },
  { id: 'z-image', name: 'Z-Image Edit' },
  { id: 'flux_klein', name: 'Flux Klein' },
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
        reader.onload = async (e) => {
          if (e.target?.result) {
            const resized = await resizeImage(e.target.result as string);
            newImages.push(resized);
          }
          processedCount++;
          if (processedCount === fileArray.length) {
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
      className={`group relative w-full border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all duration-300 flex flex-col items-center min-h-[100px] bg-zinc-900/30 hover:bg-white/[0.04] ${
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
            <div className="flex justify-between items-center mb-2 px-1">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{images.length} References</p>
                <button 
                    onClick={(e) => { e.stopPropagation(); setImages([]); }}
                    className="text-[9px] text-red-400 hover:text-red-300 uppercase tracking-tighter font-bold border border-red-500/20 px-1 py-0.5 rounded bg-red-500/5 transition-colors"
                >
                    Clear All
                </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 w-full p-1">
                {images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group/img shadow-md">
                        <img src={img} alt={`Ref ${index}`} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center z-10" />
                         <button
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100 z-20"
                         >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                         </button>
                    </div>
                ))}
                <div className="flex flex-col items-center justify-center aspect-square rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group/add">
                     <span className="text-xl text-slate-500 group-hover/add:text-slate-200">+</span>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full py-4 text-slate-500 group-hover:text-slate-300 transition-colors relative z-10">
          <ImageIcon className="w-6 h-6 mb-2 opacity-50" />
          <p className="font-bold text-[10px] uppercase tracking-widest">{title}</p>
        </div>
      )}
    </div>
  );
};

export const EditPromptInput: React.FC<EditPromptInputProps> = ({
  prompt,
  setPrompt,
  language,
  setLanguage,
  sourceImage,
  setSourceImage,
  references,
  setReferences,
  editModel,
  setEditModel,
  enhancementPower,
  setEnhancementPower,
  onGenerate,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (e) => {
        const resized = await resizeImage(e.target?.result as string);
        setSourceImage(resized);
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
    <div className="bg-[#13151C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 h-full ring-1 ring-white/5 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between flex-shrink-0">
         <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Edit Configuration</h2>
         <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
            className="bg-zinc-900/80 border border-white/10 rounded-md px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none hover:border-white/20 transition-colors"
          >
            <option value="en">English</option>
            <option value="ru">Russian</option>
          </select>
      </div>

      <div className="flex flex-col gap-4 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">Primary Source Image</span>
            <div 
                className={`group relative border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 bg-zinc-900/30 hover:bg-white/[0.04] h-40 flex items-center justify-center ${
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
                {sourceImage ? (
                <>
                    <img src={sourceImage} alt="Image to edit preview" className="mx-auto max-h-full rounded-lg shadow-lg object-contain" />
                    <button
                        onClick={(e) => { e.stopPropagation(); setSourceImage(null); }}
                        className="absolute top-2 right-2 bg-zinc-800 text-white rounded-full w-6 h-6 flex items-center justify-center border border-zinc-600 shadow-md hover:bg-red-500 transition-colors"
                    >
                        &times;
                    </button>
                </>
                ) : (
                <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-slate-600 opacity-50" />
                    <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                        {dragActive ? 'Drop source' : 'Upload Primary Source'}
                    </p>
                </div>
                )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">Additional Reference Images</span>
            <MultiImageDropzone 
                title="Style/Character Refs"
                images={references}
                setImages={setReferences}
                isLoading={isLoading}
            />
          </div>
      </div>

      <div className="space-y-4 flex-shrink-0">
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
                <label className="text-slate-400">Edit Intensity</label>
                <span className="text-indigo-400">{powerLabels[enhancementPower]}</span>
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
        </div>
      
       <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Target Model</label>
            <div className="grid grid-cols-3 gap-2">
            {editModels.map((model) => (
                <button
                key={model.id}
                onClick={() => setEditModel(model.id)}
                className={`px-2 py-2 text-[10px] uppercase tracking-wide font-semibold rounded-lg border transition-all duration-200 ${
                    editModel === model.id
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 shadow-sm'
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
        <label className="text-xs font-medium text-slate-400">Instruction</label>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={language === 'en' ? 'e.g., change the background to a winter forest' : 'например, измени фон на зимний лес'}
            className="w-full flex-grow p-4 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none transition-all font-mono hover:border-white/20"
            disabled={isLoading}
        />
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading || !prompt.trim() || !sourceImage}
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
            <span className="text-sm tracking-wide">Enhance Edit Prompt</span>
          </>
        )}
      </button>
    </div>
  );
};
