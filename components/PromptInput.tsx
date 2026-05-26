
import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import { resizeImage } from '../src/utils/imageUtils';
import { Globe, Brain } from 'lucide-react';
import type { ImageModel, CategorizedReferences } from '../types';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  references: string[];
  setReferences: (images: string[] | ((prev: string[]) => string[])) => void;
  categorizedReferences: CategorizedReferences;
  setCategorizedReferences: (refs: CategorizedReferences | ((prev: CategorizedReferences) => CategorizedReferences)) => void;
  language: 'en' | 'ru';
  setLanguage: (language: 'en' | 'ru') => void;
  imageModel: ImageModel;
  setImageModel: (model: ImageModel) => void;
  enhancementPower: number;
  setEnhancementPower: (power: number) => void;
  webSearch: boolean;
  setWebSearch: (enabled: boolean) => void;
  thinkingMode: 'off' | 'low' | 'medium' | 'high';
  setThinkingMode: (mode: 'off' | 'low' | 'medium' | 'high') => void;
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
  compact?: boolean;
}> = ({ title, subtitle, images, setImages, isLoading, className, compact }) => {
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
      className={`group relative w-full border border-dashed rounded-xl ${compact ? 'p-1.5' : 'p-3'} text-center cursor-pointer transition-all duration-300 flex flex-col items-center ${compact ? 'min-h-[80px]' : 'min-h-[120px]'} bg-zinc-900/30 hover:bg-white/[0.04] ${
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
            <div className={`flex justify-between items-center ${compact ? 'mb-1' : 'mb-3'} px-1`}>
                <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-slate-500 font-mono uppercase tracking-widest`}>{images.length} {compact ? 'Items' : 'References Selected'}</p>
                <button 
                    onClick={(e) => { e.stopPropagation(); setImages([]); }}
                    className={`${compact ? 'text-[8px] px-1' : 'text-[9px] px-1.5'} text-red-400 hover:text-red-300 uppercase tracking-tighter font-bold border border-red-500/20 py-0.5 rounded bg-red-500/5 transition-colors`}
                >
                    Clear
                </button>
            </div>
            <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-4 sm:grid-cols-5'} gap-2 w-full p-1`}>
                {images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded overflow-hidden border border-white/10 group/img shadow-lg">
                        <img src={img} alt={`Ref ${index}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center" />
                         <button
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className={`absolute top-0.5 right-0.5 bg-red-600/80 text-white rounded-full ${compact ? 'w-4 h-4' : 'w-5 h-5'} flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100 z-20 shadow-xl`}
                         >
                            <svg className={`${compact ? 'w-2 h-2' : 'w-3 h-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                         </button>
                    </div>
                ))}
                <div className="flex flex-col items-center justify-center aspect-square rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group/add">
                     <span className={`${compact ? 'text-sm' : 'text-xl'} text-slate-500 group-hover/add:text-slate-300 group-hover/add:scale-125 transition-all`}>+</span>
                </div>
            </div>
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center h-full ${compact ? 'py-2' : 'py-4'} text-slate-500 group-hover:text-slate-300 transition-colors relative z-10`}>
          <ImageIcon className={`${compact ? 'w-4 h-4 mb-1' : 'w-6 h-6 mb-2'} opacity-50`} />
          <p className={`font-bold ${compact ? 'text-[8px]' : 'text-[11px]'} uppercase tracking-widest`}>{title}</p>
          {!compact && subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
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
  categorizedReferences,
  setCategorizedReferences,
  language,
  setLanguage,
  imageModel,
  setImageModel,
  enhancementPower,
  setEnhancementPower,
  webSearch,
  setWebSearch,
  thinkingMode,
  setThinkingMode,
  onGenerate,
  isLoading,
  onReversePromptOpen,
}) => {
  return (
    <div className="bg-[#0e1018]/80 backdrop-blur-2xl border border-white/8 rounded-2xl p-5 shadow-2xl shadow-black/40 flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-4 bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400 rounded-full" />
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Image Config</h2>
            <button
                onClick={onReversePromptOpen}
                className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition-all duration-200 font-semibold uppercase tracking-tight hover:border-indigo-500/50 active:scale-95"
            >
                Reverse Prompting
            </button>
         </div>
         <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
            className="bg-[#13151c] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none hover:border-white/20 transition-colors cursor-pointer"
          >
            <option value="en">🇬🇧 English</option>
            <option value="ru">🇷🇺 Russian</option>
          </select>
      </div>

      <div className="flex flex-col gap-3 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Reference Images</span>
            
            {/* Categorized Grid */}
            <div className="grid grid-cols-2 gap-2">
              <MultiImageDropzone 
                title="Characters" 
                images={categorizedReferences.characters} 
                setImages={(update) => setCategorizedReferences(prev => ({
                    ...prev,
                    characters: typeof update === 'function' ? (update as any)(prev.characters) : update
                }))} 
                isLoading={isLoading}
                compact={true}
              />
              <MultiImageDropzone 
                title="Composition" 
                images={categorizedReferences.composition} 
                setImages={(update) => setCategorizedReferences(prev => ({
                    ...prev,
                    composition: typeof update === 'function' ? (update as any)(prev.composition) : update
                }))} 
                isLoading={isLoading}
                compact={true}
              />
              <MultiImageDropzone 
                title="Scene/BG" 
                images={categorizedReferences.scene} 
                setImages={(update) => setCategorizedReferences(prev => ({
                    ...prev,
                    scene: typeof update === 'function' ? (update as any)(prev.scene) : update
                }))} 
                isLoading={isLoading}
                compact={true}
              />
              <MultiImageDropzone 
                title="Style" 
                images={categorizedReferences.style} 
                setImages={(update) => setCategorizedReferences(prev => ({
                    ...prev,
                    style: typeof update === 'function' ? (update as any)(prev.style) : update
                }))} 
                isLoading={isLoading}
                compact={true}
              />
            </div>

            {/* General References */}
            <MultiImageDropzone 
                title="General References" 
                subtitle="Drop files or click"
                images={references} 
                setImages={setReferences} 
                isLoading={isLoading}
                className="mt-1"
            />
          </div>
      </div>
      
      <div className="space-y-4 flex-shrink-0">
        <div className="space-y-3">
            <div className="flex justify-between text-xs">
                <label className="text-slate-400 font-medium">Enhancement Strength</label>
                <span className="text-indigo-400 font-mono font-semibold">{powerLabels[enhancementPower]}</span>
            </div>
            <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/8">
                <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300" 
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
                <span>Subtle</span><span>Mild</span><span>Balanced</span><span>Strong</span><span>Max</span>
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Target Model</label>
            <div className="grid grid-cols-4 gap-1.5">
                {imageModels.map((model) => (
                    <button
                    key={model.id}
                    onClick={() => setImageModel(model.id)}
                    className={`px-1 py-2.5 text-[10px] uppercase tracking-wider font-semibold rounded-xl border transition-all duration-200 active:scale-95 ${
                        imageModel === model.id
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'bg-white/[0.03] border-white/8 text-slate-500 hover:bg-white/[0.07] hover:text-slate-300 hover:border-white/15'
                    }`}
                    >
                    {model.name}
                    </button>
                ))}
            </div>
        </div>

        {/* Search & Reasoning Panel */}
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                {language === 'en' ? 'Web Grounding' : 'Веб-поиск'}
              </span>
            </div>
            <button
              onClick={() => setWebSearch(!webSearch)}
              className={`relative inline-flex h-5.5 w-10.5 items-center rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                webSearch ? 'bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'bg-white/10 hover:bg-white/15'
              }`}
              disabled={isLoading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  webSearch ? 'translate-x-5.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            {language === 'en'
              ? 'Enables real-time search for looking up facts, details, and current events directly during prompt generation.'
              : 'Включает поиск в реальном времени для уточнения фактов, деталей и последних событий непосредственно при генерации.'}
          </p>

          <div className="h-px bg-white/5" />

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-purple-400" />
              <label className="text-xs font-medium text-slate-400">
                {language === 'en' ? 'Thinking Level' : 'Уровень мышления'}
              </label>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['off', 'low', 'medium', 'high'] as const).map((lvl) => {
                const labelsEn = { off: 'Off', low: 'Low', medium: 'Mid', high: 'Max' };
                const labelsRu = { off: 'Выкл', low: 'Низкий', medium: 'Ср', high: 'Макс' };
                const activeStyles = {
                  off: 'bg-slate-500/10 border-slate-500/40 text-slate-300',
                  low: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
                  medium: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
                  high: 'bg-pink-500/15 border-pink-500/40 text-pink-300',
                };
                const isSelected = thinkingMode === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setThinkingMode(lvl)}
                    disabled={isLoading}
                    className={`py-1.5 text-[9px] font-semibold uppercase tracking-wider rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
                      isSelected
                        ? `${activeStyles[lvl]} shadow-lg`
                        : 'bg-white/[0.02] border-white/5 text-slate-600 hover:bg-white/[0.04] hover:text-slate-400'
                    }`}
                  >
                    {language === 'en' ? labelsEn[lvl] : labelsRu[lvl]}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-600 leading-normal font-mono mt-1">
              {thinkingMode === 'off' && (language === 'en' ? '⚡ Instant generation, no reasoning.' : '⚡ Мгновенная генерация без размышлений.')}
              {thinkingMode === 'low' && (language === 'en' ? '💡 Light reasoning logic.' : '💡 Легкая логика рассуждений.')}
              {thinkingMode === 'medium' && (language === 'en' ? '🧠 Medium reasoning (2048 token budget).' : '🧠 Среднее мышление (лимит 2048 токенов).')}
              {thinkingMode === 'high' && (language === 'en' ? '🔮 Deep creative thinking (4096 token budget).' : '🔮 Глубокое мышление (лимит 4096 токенов).')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col space-y-2 min-h-[120px]">
        <label className="text-xs font-medium text-slate-400">Prompt Idea</label>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={language === 'en' ? 'Describe your idea briefly...' : 'Опишите вашу идею кратко...'}
            className="w-full flex-grow p-4 bg-[#13151c]/80 border border-white/8 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none transition-all font-mono hover:border-white/15 leading-relaxed"
            disabled={isLoading}
        />
      </div>

      <div className="pt-1 pb-0.5 flex-shrink-0">
          <button
            onClick={onGenerate}
            disabled={isLoading || (!prompt.trim() && references.length === 0 && Object.values(categorizedReferences).every(arr => (arr as string[]).length === 0))}
            className="relative w-full flex items-center justify-center gap-2.5 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group active:scale-[0.98]"
            style={{ background: isLoading ? undefined : undefined }}
          >
            {/* Button gradient background */}
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 transition-all duration-500" />
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />
            {/* Glow effect */}
            <span className="absolute inset-0 blur-xl bg-gradient-to-r from-indigo-600/40 via-purple-600/40 to-pink-600/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isLoading ? (
              <span className="relative flex items-center gap-2">
                 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 <span className="text-sm">Processing...</span>
              </span>
            ) : (
              <span className="relative flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                <span className="text-sm tracking-wide">Enhance Prompt</span>
              </span>
            )}
          </button>
      </div>
    </div>
  );
};
