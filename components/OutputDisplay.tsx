
import React, { useState, useEffect } from 'react';
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ViewMode } from '../types';
import { CodeIcon } from './icons/CodeIcon';
import { TextIcon } from './icons/TextIcon';
import { SendIcon } from './icons/SendIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';

// Prop definitions
interface OutputDisplayProps {
  output: EnhancedPrompt | EnhancedVideoPrompt | EnhancedEditPrompt | null;
  isLoading: boolean;
  isRefining: boolean;
  isSuperEnhancing: boolean;
  error: string | null;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onRefine: (refinementPrompt: string) => void;
  onSuperEnhance: () => void;
}

// Type guards
const isImagePrompt = (o: any): o is EnhancedPrompt => o && o.prompt && 'core' in o.prompt;
const isVideoPrompt = (o: any): o is EnhancedVideoPrompt => o && 'full_prompt' in o;
const isEditPrompt = (o: any): o is EnhancedEditPrompt => o && 'master_prompt' in o;

// Helper for collapsible sections
const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10 last:border-b-0 bg-[#0B0D12]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-3 px-4 text-left font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-[11px] uppercase tracking-widest opacity-90 font-semibold">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform transform duration-200 ${isOpen ? 'rotate-180' : ''} opacity-50`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 bg-[#090a0e] animate-in fade-in slide-in-from-top-1 duration-200 border-t border-white/5">{children}</div>}
    </div>
  );
};

// Helper for rendering key-value pairs
const Detail: React.FC<{ label: string; value: string | string[] | number | null | undefined }> = ({ label, value }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="mb-3 last:mb-0 font-mono text-[13px] leading-relaxed">
        <span className="text-indigo-400 mr-2 font-medium">{label}:</span>
        {Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {value.map((item, index) => (
                <span key={index} className="inline-block px-2 py-0.5 rounded bg-white/[0.07] text-slate-300 text-[11px] border border-white/[0.08]">
                    {item}
                </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-300 whitespace-pre-wrap">{value}</span>
        )}
      </div>
    );
}

type ImagePromptSection = 'core' | 'style' | 'technical' | 'scene_setup' | 'modifications' | 'quality';

const RefineInput: React.FC<{onRefine: (p: string) => void, isRefining: boolean}> = ({ onRefine, isRefining }) => {
    const [refinement, setRefinement] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (refinement.trim() && !isRefining) {
            onRefine(refinement);
            setRefinement('');
        }
    };
    
    return (
        <div className="p-3 border-b border-white/10 bg-[#0B0D12]">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative flex-grow">
                     <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500 text-xs font-mono">{'>'}</span>
                    <input
                        type="text"
                        value={refinement}
                        onChange={(e) => setRefinement(e.target.value)}
                        placeholder="Refine prompt (e.g., 'make it darker', 'add rain')..."
                        className="w-full pl-7 pr-4 py-2 bg-[#090a0e] border border-white/10 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-colors font-mono"
                        disabled={isRefining}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isRefining || !refinement.trim()}
                    className="p-2 bg-indigo-600 rounded-md text-white hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors flex-shrink-0 border border-transparent disabled:border-white/5"
                >
                   {isRefining ? (
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                       <SendIcon className="w-4 h-4" />
                   )}
                </button>
            </form>
        </div>
    );
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  output,
  isLoading,
  isRefining,
  isSuperEnhancing,
  error,
  viewMode,
  setViewMode,
  onRefine,
  onSuperEnhance,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<Record<ImagePromptSection, boolean>>({
    core: true,
    style: true,
    technical: true,
    scene_setup: true,
    modifications: true,
    quality: true,
  });
  
  useEffect(() => {
    if (output) {
      setSelectedSections({
        core: true,
        style: true,
        technical: true,
        scene_setup: true,
        modifications: true,
        quality: true,
      });
    }
  }, [output]);

  const handleCopy = (textToCopy: string, key: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  // Specific view for EnhancedPrompt (Image)
  const renderImageView = (data: EnhancedPrompt) => {
    const { core, style, technical, scene_setup, modifications, quality } = data.prompt;

    const handleSectionToggle = (section: ImagePromptSection) => {
      setSelectedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };
    
    const promptParts: string[] = [];
    if (selectedSections.core) {
        promptParts.push(core.subject, core.concept);
    }
    if (selectedSections.style) {
        promptParts.push(`Style: ${style.primary}, ${style.secondary}.`, `Mood: ${style.mood}.`, `Influence: ${style.artistic_influence}.`);
    }
    if (selectedSections.technical) {
        promptParts.push(
            `Shot: ${technical.camera.shot_type}, ${technical.camera.angle}, with a ${technical.camera.lens}.`,
            `Focus: ${technical.camera.focus}.`,
            `Lighting: ${technical.lighting.source}, creating ${technical.lighting.effect}.`,
            `Resolution: ${technical.resolution.quality}, with ${technical.resolution.texture} textures.`
        );
    }
    if (selectedSections.scene_setup) {
        promptParts.push(
          `Scene: on a ${scene_setup.surface}, with ${scene_setup.props}.`,
          `Background: ${scene_setup.background.description} (${scene_setup.background.type}) with ${scene_setup.background.color} colors.`
        );
    }
    if (selectedSections.modifications && modifications?.length > 0) {
        const mods = modifications.map(mod => `${mod.action} ${mod.target_area} using ${mod.details.materials}`).join(', ');
        promptParts.push(`Modifications: ${mods}.`);
    }
    if (selectedSections.quality) {
        promptParts.push(...quality.positive_keywords, `--no ${quality.negative_prompt}`);
    }

    const fullPrompt = promptParts.filter(p => p && p.trim() !== '').join(' ');

    const sections: { key: ImagePromptSection; label: string }[] = [
        { key: 'core', label: 'Core' },
        { key: 'style', label: 'Style' },
        { key: 'technical', label: 'Tech' },
        { key: 'scene_setup', label: 'Scene' },
        { key: 'modifications', label: 'Mods' },
        { key: 'quality', label: 'Quality' },
    ];

    return (
      <div>
          <RefineInput onRefine={onRefine} isRefining={isRefining} />
          
          <div className="border-b border-white/10 bg-[#0B0D12]">
            <h3 className="w-full py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Composition
            </h3>
            <div className="px-4 pb-4 pt-1">
                <div className="flex flex-wrap gap-2">
                    {sections.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => handleSectionToggle(key)}
                            className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-all ${
                                selectedSections[key]
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <CollapsibleSection title="Final Prompt Output" defaultOpen={true}>
            <div className="relative group">
              <button
                onClick={() => handleCopy(fullPrompt, 'image-full')}
                className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded border border-zinc-700 text-slate-400 hover:text-white transition-all z-10 opacity-0 group-hover:opacity-100 shadow-sm"
                aria-label="Copy prompt"
              >
                {copiedKey === 'image-full' ? (
                  <CheckIcon className="w-3 h-3 text-green-400" />
                ) : (
                  <ClipboardIcon className="w-3 h-3" />
                )}
              </button>
              <p className="text-slate-300 font-mono text-sm leading-relaxed">{fullPrompt}</p>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Core Data">
              <Detail label="Subject" value={core.subject} />
              <Detail label="Concept" value={core.concept} />
          </CollapsibleSection>

          <CollapsibleSection title="Style Matrix">
              <Detail label="Primary" value={style.primary} />
              <Detail label="Secondary" value={style.secondary} />
              <Detail label="Mood" value={style.mood} />
              <Detail label="Influence" value={style.artistic_influence} />
          </CollapsibleSection>
          
          <CollapsibleSection title="Technical Specs">
               <Detail label="Shot" value={technical.camera.shot_type} />
               <Detail label="Angle" value={technical.camera.angle} />
               <Detail label="Lens" value={technical.camera.lens} />
               <Detail label="Focus" value={technical.camera.focus} />
               <Detail label="Light Src" value={technical.lighting.source} />
               <Detail label="Light FX" value={technical.lighting.effect} />
               <Detail label="Quality" value={technical.resolution.quality} />
               <Detail label="Texture" value={technical.resolution.texture} />
          </CollapsibleSection>

          <CollapsibleSection title="Environment">
               <Detail label="Surface" value={scene_setup.surface} />
               <Detail label="Bg Type" value={scene_setup.background.type} />
               <Detail label="Bg Desc" value={scene_setup.background.description} />
               <Detail label="Bg Color" value={scene_setup.background.color} />
               <Detail label="Props" value={scene_setup.props} />
          </CollapsibleSection>

          {modifications.length > 0 && (
              <CollapsibleSection title="Modifications">
                {modifications.map((mod, i) => (
                <div key={i} className="mb-4 p-3 border-l-2 border-indigo-500 bg-white/[0.03] rounded-r">
                    <Detail label="Target" value={mod.target_area} />
                    <Detail label="Action" value={mod.action} />
                    <Detail label="Material" value={mod.details.materials} />
                </div>
                ))}
              </CollapsibleSection>
          )}

          <CollapsibleSection title="Quality Tokens">
               <Detail label="Positive" value={quality.positive_keywords} />
               <Detail label="Negative" value={quality.negative_prompt} />
          </CollapsibleSection>
      </div>
    );
  };

  // Simplified Video View: Single Continuous Narrative
  const renderVideoView = (data: EnhancedVideoPrompt) => (
    <div className="flex flex-col h-full">
      <RefineInput onRefine={onRefine} isRefining={isRefining} />
      
      <div className="flex-grow p-6 space-y-8">
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                    <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                    Director's Master Prompt
                </h3>
                <button
                    onClick={() => handleCopy(data.full_prompt, 'video-full')}
                    className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors uppercase font-bold"
                >
                    {copiedKey === 'video-full' ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
                    {copiedKey === 'video-full' ? 'Copied' : 'Copy Prompt'}
                </button>
            </div>
            <div className="bg-[#0B0D12] border border-white/5 rounded-xl p-5 shadow-inner">
                <p className="text-slate-200 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {data.full_prompt}
                </p>
            </div>
        </div>

        {data.audio_description && (
            <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                    <span className="w-1 h-3 bg-violet-500 rounded-full"></span>
                    Soundscape Specification
                </h3>
                <div className="bg-[#0B0D12] border border-white/5 rounded-xl p-5 shadow-inner">
                    <p className="text-slate-400 font-mono text-xs leading-relaxed italic">
                        {data.audio_description}
                    </p>
                </div>
            </div>
        )}

        {data.model_notes && (
            <div className="pt-4 border-t border-white/5">
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-tighter">
                    Technical Footnote: {data.model_notes}
                </p>
            </div>
        )}
      </div>
    </div>
  );

  const renderEditView = (data: EnhancedEditPrompt) => (
    <div>
       <RefineInput onRefine={onRefine} isRefining={isRefining} />
       <CollapsibleSection title="Master Edit Command" defaultOpen={true}>
        <div className="relative group">
          <button
            onClick={() => handleCopy(data.master_prompt, 'edit-master')}
            className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded border border-zinc-700 text-slate-400 hover:text-white transition-all z-10 opacity-0 group-hover:opacity-100 shadow-sm"
            aria-label="Copy prompt"
          >
            {copiedKey === 'edit-master' ? (
              <CheckIcon className="w-3 h-3 text-green-400" />
            ) : (
              <ClipboardIcon className="w-3 h-3" />
            )}
          </button>
          <p className="text-slate-300 font-mono text-sm">{data.master_prompt}</p>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Analysis">
        <Detail label="Style" value={data.original_image_analysis.style} />
        <Detail label="Lighting" value={data.original_image_analysis.lighting} />
        <Detail label="Subject" value={data.original_image_analysis.subject} />
        <Detail label="Comp" value={data.original_image_analysis.composition} />
      </CollapsibleSection>
      <CollapsibleSection title="Changes">
        {data.requested_changes.map((change, i) => (
          <div key={i} className="mb-3 p-3 border-l-2 border-indigo-500 bg-white/[0.03] rounded-r">
            <Detail label="Target" value={change.target_area} />
            <Detail label="Action" value={change.action} />
            <Detail label="Detail" value={change.detailed_instruction} />
          </div>
        ))}
      </CollapsibleSection>
       <CollapsibleSection title="Consistency">
        <Detail label="Keep" value={data.consistency_keywords.positive} />
        <Detail label="Avoid" value={data.consistency_keywords.negative} />
      </CollapsibleSection>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500 font-mono text-sm">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="animate-pulse text-slate-400">Processing Neural Data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 flex items-center justify-center h-full">
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg max-w-md text-center shadow-lg shadow-red-900/20">
            <p className="text-red-400 text-sm font-medium font-mono">System Error</p>
            <p className="mt-2 text-slate-400 text-xs">{error}</p>
          </div>
        </div>
      );
    }

    if (!output) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-slate-600 font-mono">
          <div className="bg-white/[0.03] p-4 rounded-full mb-4 border border-white/[0.05]">
            <CodeIcon className="w-6 h-6 opacity-40" />
          </div>
          <p className="text-sm tracking-wide text-slate-500">Awaiting Input Stream</p>
          <p className="text-xs mt-2 opacity-40">Output will render here</p>
        </div>
      );
    }

    if (viewMode === 'json') {
      const jsonString = JSON.stringify(output, null, 2);
      return (
        <div className="relative h-full bg-[#090a0e]">
           <button
            onClick={() => handleCopy(jsonString, 'json-full')}
            className="absolute top-4 right-4 p-1.5 bg-zinc-800 rounded border border-zinc-700 text-slate-400 hover:text-white transition-all z-10 shadow-sm"
            aria-label="Copy JSON"
          >
            {copiedKey === 'json-full' ? (
              <CheckIcon className="w-3 h-3 text-green-400" />
            ) : (
              <ClipboardIcon className="w-3 h-3" />
            )}
          </button>
          <pre className="p-6 text-xs text-indigo-200 font-mono overflow-x-auto h-full custom-scrollbar">
            {jsonString}
          </pre>
        </div>
      );
    }
    
    if (isImagePrompt(output)) return renderImageView(output);
    if (isVideoPrompt(output)) return renderVideoView(output);
    if (isEditPrompt(output)) return renderEditView(output);

    return <p className="p-4 text-red-500 font-mono text-xs">Unknown data format.</p>;
  };

  return (
    <div className="bg-[#13151C]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden ring-1 ring-white/5">
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-[#0B0D12]">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
           Output Terminal
        </h2>
        
        {output && !isLoading && (
            <div className="flex items-center gap-3">
               {(isImagePrompt(output) || isVideoPrompt(output)) && viewMode === 'text' && (
                  <button
                    onClick={onSuperEnhance}
                    disabled={isSuperEnhancing || isRefining}
                    className="group px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 transition-all duration-200 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSuperEnhancing ? (
                        <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <SparklesIcon className="w-3 h-3" />
                    )}
                    <span>Super Enhance</span>
                  </button>
                )}
                <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-white/10">
                    <button 
                        onClick={() => setViewMode('text')} 
                        className={`px-3 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 transition-all ${viewMode === 'text' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <TextIcon className="w-3 h-3"/>
                        Text
                    </button>
                    <button 
                        onClick={() => setViewMode('json')} 
                        className={`px-3 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 transition-all ${viewMode === 'json' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <CodeIcon className="w-3 h-3"/>
                        JSON
                    </button>
                </div>
            </div>
        )}
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#090a0e]">
          {renderContent()}
      </div>
    </div>
  );
};
