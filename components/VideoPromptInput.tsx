
import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import { resizeImage } from '../src/utils/imageUtils';
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
  isRelayMode: boolean;
  setIsRelayMode: (isRelay: boolean) => void;
  relayFrames: number;
  setRelayFrames: (frames: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const videoModels: { id: VideoModel; name: string; badge?: string }[] = [
  { id: 'veo', name: 'VEO', badge: '3' },
  { id: 'kling', name: 'Kling', badge: '3.0' },
  { id: 'ltx', name: 'LTX', badge: 'v2' },
  { id: 'seedance', name: 'Seed', badge: '2.0' },
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
  label?: string;
}> = ({ title, subtitle, image, setImage, isLoading, className, label }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (e) => {
        const resized = await resizeImage(e.target?.result as string);
        setImage(resized);
      };
      reader.readAsDataURL(file);
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
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">{label}</span>
        </div>
      )}
      <div
        className={`group relative w-full border border-dashed rounded-xl p-2 text-center cursor-pointer transition-all duration-300 flex flex-col justify-center items-center h-28 ${
          dragActive
            ? 'border-purple-500/60 bg-purple-500/8 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
            : image
            ? 'border-white/15 bg-black/40'
            : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
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
            <div className="absolute inset-0 bg-black/50 z-0 rounded-xl" />
            <img src={image} alt={`${title} preview`} className="relative z-10 max-h-full max-w-full object-contain rounded-lg" />
            <button
              onClick={(e) => { e.stopPropagation(); setImage(null); }}
              className="absolute -top-1.5 -right-1.5 bg-[#1a1c25] text-white rounded-full w-5 h-5 flex items-center justify-center border border-white/20 shadow-lg hover:bg-red-500 hover:border-red-400 transition-all z-20 active:scale-90"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 group-hover:text-slate-400 transition-colors relative z-10 gap-2">
            <ImageIcon className="w-5 h-5 opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="flex flex-col items-center gap-0.5">
              <p className="font-semibold text-[10px] uppercase tracking-widest">{title}</p>
              {subtitle && <p className="text-[9px] text-slate-700">{subtitle}</p>}
            </div>
          </div>
        )}
      </div>
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
        reader.onload = async (e) => {
          if (e.target?.result) {
            const resized = await resizeImage(e.target.result as string);
            newImages.push(resized);
          }
          processedCount++;
          if (processedCount === fileArray.length) setImages([...images, ...newImages]);
        };
        reader.readAsDataURL(file);
      });
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
    if (e.dataTransfer.files) handleFileChange(e.dataTransfer.files);
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div
      className={`group relative w-full border border-dashed rounded-xl p-2 text-center cursor-pointer transition-all duration-300 flex flex-col items-center min-h-[100px] ${
        dragActive
          ? 'border-purple-500/60 bg-purple-500/8'
          : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      } ${className}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) fileInputRef.current?.click();
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
          <div className="grid grid-cols-5 gap-1.5 w-full p-0.5">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group/img">
                <img src={img} alt={`Ref ${index}`} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity" />
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                  className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100 z-10"
                >
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center aspect-square rounded-lg border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] transition-colors">
              <span className="text-slate-600 group-hover:text-slate-400 text-lg leading-none">+</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 mt-1.5 font-mono text-center">{images.length} ref{images.length !== 1 ? 's' : ''} loaded</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full py-5 text-slate-600 group-hover:text-slate-400 transition-colors relative z-10 gap-2">
          <ImageIcon className="w-5 h-5 opacity-40" />
          <div className="flex flex-col items-center gap-0.5">
            <p className="font-semibold text-[10px] uppercase tracking-widest">{title}</p>
            {subtitle && <p className="text-[9px] text-slate-700">{subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export const VideoPromptInput: React.FC<VideoPromptInputProps> = ({
  prompt, setPrompt, language, setLanguage,
  firstFrame, setFirstFrame, lastFrame, setLastFrame,
  characterReferences, setCharacterReferences,
  videoModel, setVideoModel,
  enhancementPower, setEnhancementPower,
  isRelayMode, setIsRelayMode, relayFrames, setRelayFrames,
  onGenerate, isLoading,
}) => {
  const isGenerateDisabled = isLoading || (!firstFrame && !lastFrame && characterReferences.length === 0 && !prompt.trim());

  return (
    <div className="bg-[#0e1018]/80 backdrop-blur-2xl border border-white/8 rounded-2xl p-5 shadow-2xl shadow-black/40 flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-gradient-to-b from-purple-400 via-pink-400 to-indigo-400 rounded-full" />
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Video Config</h2>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
          className="bg-[#13151c] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none hover:border-white/20 transition-colors cursor-pointer"
        >
          <option value="en">🇬🇧 English</option>
          <option value="ru">🇷🇺 Russian</option>
        </select>
      </div>

      {/* Timeline Frames */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Timeline Frames</span>
        {/* Visual timeline connector */}
        <div className="relative grid grid-cols-2 gap-3">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-px bg-gradient-to-r from-purple-500/40 to-pink-500/40 z-10 pointer-events-none" />
          <VideoImageDropzone
            title="Start Frame"
            subtitle="First shot"
            image={firstFrame}
            setImage={setFirstFrame}
            isLoading={isLoading}
            label="▶ START"
          />
          <VideoImageDropzone
            title="End Frame"
            subtitle="Last shot"
            image={lastFrame}
            setImage={setLastFrame}
            isLoading={isLoading}
            label="■ END"
          />
        </div>
      </div>

      {/* Character References */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Subject References</span>
        <MultiImageDropzone
          title="Character References"
          subtitle="Upload consistent actor images"
          images={characterReferences}
          setImages={setCharacterReferences}
          isLoading={isLoading}
          className="min-h-[90px]"
        />
      </div>

      {/* Controls */}
      <div className="space-y-4 flex-shrink-0">
        {/* Enhancement Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <label className="text-slate-400 font-medium">Narrative Enhancement</label>
            <span className="text-purple-400 font-mono font-semibold">{powerLabels[enhancementPower]}</span>
          </div>
          <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/8">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
              style={{ width: `${(enhancementPower / 5) * 100}%` }}
            />
            <input
              type="range" min="1" max="5" step="1"
              value={enhancementPower}
              onChange={(e) => setEnhancementPower(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 font-mono px-0.5">
            <span>Subtle</span><span>Mild</span><span>Balanced</span><span>Strong</span><span>Max</span>
          </div>
        </div>

        {/* Model Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Target Model</label>
          <div className="grid grid-cols-4 gap-1.5">
            {videoModels.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setVideoModel(model.id);
                  if (model.id !== 'ltx') setIsRelayMode(false);
                }}
                className={`relative px-1 py-2.5 text-[10px] uppercase tracking-wider font-semibold rounded-xl border transition-all duration-200 active:scale-95 ${
                  videoModel === model.id
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'bg-white/[0.03] border-white/8 text-slate-500 hover:bg-white/[0.07] hover:text-slate-300 hover:border-white/15'
                }`}
              >
                <span className="block leading-none">{model.name}</span>
                {model.badge && (
                  <span className={`absolute -top-1.5 -right-1.5 text-[8px] font-bold px-1 rounded-full border ${
                    videoModel === model.id
                      ? 'bg-purple-500/30 border-purple-500/50 text-purple-300'
                      : 'bg-white/5 border-white/10 text-slate-600'
                  }`}>
                    {model.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* LTX Relay Mode */}
        {videoModel === 'ltx' && (
          <div className="flex flex-col gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-widest">Prompt Relay Mode</span>
                <span className="text-[9px] text-purple-400/60">Split into temporal segments</span>
              </div>
              <button
                onClick={() => setIsRelayMode(!isRelayMode)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  isRelayMode ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-white/10'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform ${isRelayMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {isRelayMode && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Total Frame Length</label>
                <div className="relative">
                  <input
                    type="number"
                    value={relayFrames}
                    onChange={(e) => setRelayFrames(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-white/[0.04] border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-purple-100 outline-none focus:ring-1 focus:ring-purple-500/50 pr-10 placeholder-purple-900"
                    placeholder="e.g. 240"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 font-mono font-bold">FR</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt Textarea */}
      <div className="flex-grow flex flex-col space-y-2 min-h-[120px]">
        <label className="text-xs font-medium text-slate-400">
          {isRelayMode ? 'Relay Concept' : 'Narrative / Action'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            isRelayMode
              ? 'Describe the sequence of actions to split into shots...'
              : language === 'en'
              ? 'e.g. camera dollies forward as the car accelerates through rain...'
              : 'например, камера наезжает, пока машина ускоряется под дождём...'
          }
          className={`w-full flex-grow p-4 border rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:ring-1 outline-none resize-none transition-all font-mono leading-relaxed ${
            isRelayMode
              ? 'bg-purple-900/10 border-purple-500/25 focus:ring-purple-500/40 focus:border-purple-500/40 hover:border-purple-500/40'
              : 'bg-[#13151c]/80 border-white/8 focus:ring-purple-500/40 focus:border-purple-500/40 hover:border-white/15'
          }`}
          disabled={isLoading}
        />
      </div>

      {/* Generate Button */}
      <div className="pt-0.5 pb-0 flex-shrink-0">
        <button
          onClick={onGenerate}
          disabled={isGenerateDisabled}
          className="relative w-full flex items-center justify-center gap-2.5 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group active:scale-[0.98]"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600" />
          <span className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />
          {isLoading ? (
            <span className="relative flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm">Processing...</span>
            </span>
          ) : (
            <span className="relative flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              <span className="text-sm tracking-wide">Enhance Video Prompt</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
