
import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import type { VideoModel } from '../types';

interface VideoPromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  language: 'en' | 'ru';
  setLanguage: (language: 'en' | 'ru') => void;
  firstFrame: string | null;
  setFirstFrame: (frame: string | null) => void;
  lastFrame: string | null;
  setLastFrame: (frame: string | null) => void;
  characterReferences: string[];
  setCharacterReferences: (refs: string[]) => void;
  videoModel: VideoModel;
  setVideoModel: (model: VideoModel) => void;
  enhancementPower: number;
  setEnhancementPower: (power: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const videoModels: { id: VideoModel; name: string }[] = [
  { id: 'veo', name: 'VEO' },
  { id: 'kling', name: 'Kling 3.0' },
  { id: 'ltx', name: 'LTX' },
  { id: 'seedance', name: 'Seedance 2.0' },
];

const powerLabels: { [key: number]: string } = {
  1: 'Subtle',
  2: 'Mild',
  3: 'Balanced',
  4: 'Strong',
  5: 'Max Creative',
};

const VideoImageDropzone: React.FC<{
  title: string;
  subtitle?: string;
  image: string | null;
  setImage: (image: string | null) => void;
  isLoading: boolean;
  className?: string;
}> = ({ title, subtitle, image, setImage, isLoading, className }) => {
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
      className={`group relative w-full border border-dashed rounded-xl p-2 text-center cursor-pointer transition-all duration-300 flex flex-col justify-center items-center h-28 bg-zinc-900/30 hover:bg-white/[0.04] ${
        dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/30'
      } ${className}`}
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
          <div className="absolute inset-0 bg-black/60 z-0 rounded-xl"></div>
          <img src={image} alt={`${title} preview`} className="relative z-10 max-h-full max-w-full object-contain rounded-lg shadow-lg" />
          <button
            onClick={(e) => { e.stopPropagation(); setImage(null); }}
            className="absolute -top-1.5 -right-1.5 bg-zinc-800 text-white rounded-full w-5 h-5 flex items-center justify-center border border-zinc-600 shadow-md hover:bg-red-500 transition-colors z-20"
          >
            &times;
          </button>
        </>
      ) : (
         <div className="flex flex-col items-center justify-center h-full text-slate-500 group-hover:text-slate-300 transition-colors relative z-10">
          <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
          <p className="font-medium text-[10px] uppercase tracking-wide">{title}</p>
          {subtitle && <p className="text-[9px] text-slate-600 mt-0.5">{subtitle}</p>}
        </div>
      )}
    </div>
  );
};

const MultiImageDropzone: React.FC<{
  title: string;
  subtitle?: string;
  images: string[];
  setImages: (images: string[]) => void;
  isLoading: boolean;
  className?: string;
}> = ({ title, subtitle, images, setImages, isLoading, className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files) {
      const newImages: string[] = [];
      const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
      
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
            setImages([...images, ...newImages]);
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
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div
      className={`group relative w-full border border-dashed rounded-xl p-2 text-center cursor-pointer transition-all duration-300 flex flex-col items-center min-h-[100px] bg-zinc-900/30 hover:bg-white/[0.04] ${
        dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/30'
      } ${className}`}
      onClick={(e) => {
        // Only trigger click if not clicking a remove button
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
            <div className="grid grid-cols-4 gap-2 w-full p-1">
                {images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group/img">
                        <img src={img} alt={`Ref ${index}`} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                         <button
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100"
                         >
                            &times;
                         </button>
                    </div>
                ))}
                <div className="flex flex-col items-center justify-center aspect-square rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                     <span className="text-xl text-slate-500">+</span>
                </div>
            </div>
             <p className="text-[9px] text-slate-500 mt-2 font-mono">{images.length} images selected</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full py-4 text-slate-500 group-hover:text-slate-300 transition-colors relative z-10">
          <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
          <p className="font-medium text-[10px] uppercase tracking-wide">{title}</p>
          {subtitle && <p className="text-[9px] text-slate-600 mt-0.5">{subtitle}</p>}
        </div>
      )}
    </div>
  );
};

export const VideoPromptInput: React.FC<VideoPromptInputProps> = ({
  prompt,
  setPrompt,
  language,
  setLanguage,
  firstFrame,
  setFirstFrame,
  lastFrame,
  setLastFrame,
  characterReferences,
  setCharacterReferences,
  videoModel,
  setVideoModel,
  enhancementPower,
  setEnhancementPower,
  onGenerate,
  isLoading,
}) => {
  // Allow generation if ANY input is provided (Prompt OR FirstFrame OR LastFrame OR CharacterRef)
  const isGenerateDisabled = isLoading || (!firstFrame && !lastFrame && characterReferences.length === 0 && !prompt.trim());

  return (
    <div className="bg-[#13151C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 h-full ring-1 ring-white/5 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between flex-shrink-0">
         <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Video Parameters</h2>
         <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
            className="bg-zinc-900/80 border border-white/10 rounded-md px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none hover:border-white/20 transition-colors"
          >
            <option value="en">English</option>
            <option value="ru">Russian</option>
          </select>
      </div>

      <div className="flex flex-col gap-3 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">Timeline Ref</span>
            <div className="grid grid-cols-2 gap-3">
                <VideoImageDropzone 
                title="Start Frame"
                image={firstFrame}
                setImage={setFirstFrame}
                isLoading={isLoading}
                />
                <VideoImageDropzone 
                title="End Frame"
                image={lastFrame}
                setImage={setLastFrame}
                isLoading={isLoading}
                />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
             <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">Subject Ref (Multiple)</span>
             <MultiImageDropzone 
                title="Character References"
                subtitle="Upload consistent actor images"
                images={characterReferences}
                setImages={setCharacterReferences}
                isLoading={isLoading}
                className="min-h-[100px]"
            />
          </div>
      </div>

      <div className="space-y-4 flex-shrink-0">
        {/* Enhancement Power Slider */}
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
                <label className="text-slate-400">Narrative Enhancement</label>
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
            <div className="grid grid-cols-4 gap-2">
                {videoModels.map((model) => (
                    <button
                    key={model.id}
                    onClick={() => setVideoModel(model.id)}
                    className={`px-1 py-2 text-[9px] uppercase tracking-tight font-bold rounded-lg border transition-all duration-200 ${
                        videoModel === model.id
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
        <label className="text-xs font-medium text-slate-400">Narrative/Action</label>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={language === 'en' ? 'e.g. camera dollies forward as the car accelerates...' : 'например, камера наезжает, пока машина ускоряется...'}
            className="w-full flex-grow p-4 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none transition-all font-mono hover:border-white/20"
            disabled={isLoading}
        />
      </div>

      <div className="pt-2 pb-1 flex-shrink-0">
          <button
            onClick={onGenerate}
            disabled={isGenerateDisabled}
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
                <span className="text-sm tracking-wide">Enhance Video Prompt</span>
              </>
            )}
          </button>
      </div>
    </div>
  );
};
