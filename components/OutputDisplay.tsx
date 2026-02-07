
import React, { useState } from 'react';
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ViewMode, ImageModel, VideoModel, EditModel } from '../types';
import { CodeIcon } from './icons/CodeIcon';
import { SendIcon } from './icons/SendIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface OutputDisplayProps {
  output: EnhancedPrompt | EnhancedVideoPrompt | EnhancedEditPrompt | null;
  targetModel?: ImageModel | VideoModel | EditModel;
  isLoading: boolean;
  isRefining: boolean;
  isSuperEnhancing: boolean;
  error: string | null;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onRefine: (refinementPrompt: string) => void;
  onSuperEnhance: () => void;
}

const isImagePrompt = (o: any): o is EnhancedPrompt => o && o.prompt && 'subject' in o.prompt;
const isVideoPrompt = (o: any): o is EnhancedVideoPrompt => o && 'full_prompt' in o;
const isEditPrompt = (o: any): o is EnhancedEditPrompt => o && 'edit_task_summary' in o;

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
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} opacity-50`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 bg-[#090a0e] border-t border-white/5">{children}</div>}
    </div>
  );
};

const Detail: React.FC<{ label: string; value: any }> = ({ label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="mb-3 last:mb-0 font-mono text-[13px] leading-relaxed">
        <span className="text-indigo-400 mr-2 font-medium capitalize">{label.replace(/_/g, ' ')}:</span>
        {Array.isArray(value) ? (
          <div className="flex flex-col gap-1.5 mt-1.5 pl-2">
            {value.map((item, index) => <div key={index} className="text-slate-300 text-[12px] flex items-start gap-2">
                <span className="text-indigo-500 mt-1">•</span>
                <span>{item}</span>
            </div>)}
          </div>
        ) : typeof value === 'object' ? (
          <div className="pl-4 mt-1 border-l border-white/10">
             {Object.entries(value).map(([k, v]) => <Detail key={k} label={k} value={v} />)}
          </div>
        ) : <span className="text-slate-300 whitespace-pre-wrap">{String(value)}</span>}
      </div>
    );
};

const RefineInput: React.FC<{onRefine: (p: string) => void, isRefining: boolean}> = ({ onRefine, isRefining }) => {
    const [refinement, setRefinement] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (refinement.trim() && !isRefining) { onRefine(refinement); setRefinement(''); }
    };
    return (
        <div className="p-3 border-b border-white/10 bg-[#0B0D12]">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 text-xs font-mono">{'>'}</span>
                    <input
                        type="text" value={refinement} onChange={(e) => setRefinement(e.target.value)}
                        placeholder="Refine parameters..." className="w-full pl-7 pr-4 py-2 bg-[#090a0e] border border-white/10 rounded-md text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500/50 outline-none font-mono"
                        disabled={isRefining}
                    />
                </div>
                <button type="submit" disabled={isRefining || !refinement.trim()} className="p-2 bg-indigo-600 rounded-md text-white hover:bg-indigo-500 disabled:bg-zinc-800 transition-colors">
                   {isRefining ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SendIcon className="w-4 h-4" />}
                </button>
            </form>
        </div>
    );
};

export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  output, targetModel, isLoading, isRefining, isSuperEnhancing, error, viewMode, setViewMode, onRefine, onSuperEnhance,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const scrubNo = (text: string) => text.replace(/\bno\b/gi, "without");

  const cleanPrefix = (text: string) => {
      if (!text) return "";
      const prefixes = ["nanobanana", "midjourney", "flux", "z-image", "prompt for", "a prompt"];
      let cleaned = text.trim();
      
      prefixes.forEach(p => {
          const regex = new RegExp(`^${p}[:\\s-]*`, "i");
          cleaned = cleaned.replace(regex, "");
      });
      
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const renderImageView = (data: EnhancedPrompt) => {
    const p = data.prompt;
    const isZImage = targetModel === 'z-image';

    const buildFullPrompt = () => {
        const parts = [
            cleanPrefix(p.subject.description),
            p.pose.description,
            p.environment.setting,
            p.environment.elements.join(", "),
            p.camera.shot_type,
            p.camera.perspective,
            p.camera.focal_length,
            p.lighting.type,
            p.lighting.quality,
            p.mood_and_expression.atmosphere,
            p.style_and_realism.style,
            p.style_and_realism.fidelity,
            p.quality_and_technical_details.resolution
        ].filter(Boolean);
        
        let text = parts.join(", ");
        if (isZImage) {
            text = scrubNo(text);
            if (p.negative_prompt.forbidden_content.length > 0) {
                text += ` | Constraints: ${scrubNo(p.negative_prompt.forbidden_content.join(", "))}`;
            }
        }
        return text;
    };

    const fullPrompt = buildFullPrompt();

    return (
      <div className="flex flex-col">
          <RefineInput onRefine={onRefine} isRefining={isRefining} />
          
          <CollapsibleSection title="Master Execution Prompt" defaultOpen={true}>
            <div className="relative group">
              <button onClick={() => handleCopy(fullPrompt, 'full')} className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all z-10">
                {copiedKey === 'full' ? <CheckIcon className="w-3 h-3 text-green-400" /> : <ClipboardIcon className="w-3 h-3" />}
              </button>
              <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap pr-8">{fullPrompt}</p>
            </div>
          </CollapsibleSection>

          <div className="grid grid-cols-1 md:grid-cols-2 bg-[#0B0D12] border-b border-white/10">
              <div className="p-4 border-r border-white/10 bg-indigo-500/5">
                <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    Anatomy & Skeletal Lock
                </h3>
                <div className="space-y-3">
                    <Detail label="Subject Lock" value={p.subject.anatomy_constraints} />
                    <Detail label="Skeletal Lock" value={p.pose.skeletal_lock} />
                </div>
              </div>
              <div className="p-4 bg-emerald-500/5">
                <h3 className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ControlNet Config
                </h3>
                <div className="space-y-3">
                    <Detail label="Pose Control" value={p.controlnet.pose_control} />
                    <Detail label="Depth Control" value={p.controlnet.depth_control} />
                </div>
              </div>
          </div>

          <CollapsibleSection title="Subject & Pose Architecture">
              <Detail label="Subject" value={cleanPrefix(p.subject.description)} />
              <Detail label="Pose" value={p.pose.description} />
              <Detail label="Expression" value={p.mood_and_expression} />
          </CollapsibleSection>

          <CollapsibleSection title="Cinematography & Lighting">
              <Detail label="Camera" value={p.camera} />
              <Detail label="Lighting" value={p.lighting} />
              <Detail label="Environment" value={p.environment} />
          </CollapsibleSection>

          <CollapsibleSection title="Materials & Rendering">
              <Detail label="Style & Fidelity" value={p.style_and_realism} />
              <Detail label="Tones" value={p.colors_and_tone} />
              <Detail label="Technical" value={p.quality_and_technical_details} />
              <Detail label="Output" value={p.aspect_ratio_and_output} />
          </CollapsibleSection>

          <div className="p-4 bg-red-900/10">
              <h3 className="text-[10px] uppercase tracking-widest text-red-400/80 font-bold mb-2">Strict Negative Terminal</h3>
              <div className="bg-black/20 p-3 rounded-lg border border-red-500/10">
                  <Detail label="Forbidden Content" value={p.negative_prompt.forbidden_content} />
              </div>
          </div>
      </div>
    );
  };

  const renderVideoView = (data: EnhancedVideoPrompt) => (
    <div className="flex flex-col h-full">
      <RefineInput onRefine={onRefine} isRefining={isRefining} />
      <div className="flex-grow p-6 space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase text-slate-500 font-bold">Director's Script</h3>
            <button onClick={() => handleCopy(data.full_prompt, 'video-full')} className="text-slate-500 hover:text-indigo-400 transition-colors">
                {copiedKey === 'video-full' ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
            </button>
        </div>
        <div className="bg-[#0B0D12] border border-white/5 rounded-xl p-5 shadow-inner">
            <p className="text-slate-200 font-mono text-sm leading-relaxed">{data.full_prompt}</p>
        </div>
        {data.audio_description && (
            <div>
                <h3 className="text-[10px] uppercase text-slate-500 font-bold mb-2">Audio Layer</h3>
                <div className="bg-[#0B0D12] p-4 text-slate-400 text-xs italic border border-white/5 rounded-lg">{data.audio_description}</div>
            </div>
        )}
      </div>
    </div>
  );

  const renderEditView = (data: EnhancedEditPrompt) => (
    <div className="flex flex-col">
       <RefineInput onRefine={onRefine} isRefining={isRefining} />
       
       <div className="p-4 bg-indigo-500/10 border-b border-white/10">
            <h2 className="text-sm font-bold text-indigo-100 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-indigo-400" />
                {data.edit_task_summary}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 italic leading-snug">
                {data.transformation_logic}
            </p>
       </div>

       <CollapsibleSection title="Enhanced Edit Prompt (Master Command)" defaultOpen={true}>
            <div className="relative group">
                <button onClick={() => handleCopy(data.master_edit_prompt, 'edit-master')} className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all z-10">
                    {copiedKey === 'edit-master' ? <CheckIcon className="w-3 h-3 text-green-400" /> : <ClipboardIcon className="w-3 h-3" />}
                </button>
                <p className="text-slate-300 font-mono text-sm leading-relaxed pr-8">{data.master_edit_prompt}</p>
            </div>
       </CollapsibleSection>

       <div className="grid grid-cols-1 md:grid-cols-2 bg-[#0B0D12] border-b border-white/10">
            <div className="p-4 border-r border-white/10 bg-emerald-500/5">
                <h3 className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-3">Preservation Locks</h3>
                <Detail label="" value={data.preservation_locks} />
            </div>
            <div className="p-4 bg-amber-500/5">
                <h3 className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-3">Technical Brief</h3>
                <Detail label="Methods" value={data.technical_params} />
            </div>
       </div>

       <CollapsibleSection title="Technical Execution Steps" defaultOpen={true}>
            <Detail label="Task Steps" value={data.detailed_execution_steps} />
       </CollapsibleSection>

       {data.negative_edit_constraints.length > 0 && (
            <div className="p-4 bg-red-900/10">
                <h3 className="text-[10px] uppercase tracking-widest text-red-400/80 font-bold mb-2">Edit Constraints</h3>
                <div className="bg-black/20 p-3 rounded-lg border border-red-500/10">
                    <Detail label="Avoid" value={data.negative_edit_constraints} />
                </div>
            </div>
       )}
    </div>
  );

  const renderContent = () => {
    if (isLoading) return <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500 font-mono"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" /><p>Synthesizing Architecture...</p></div>;
    if (error) return <div className="p-6 h-full flex items-center justify-center"><div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-400 text-xs font-mono">Fatal Linkage Error: {error}</div></div>;
    if (!output) return <div className="flex flex-col items-center justify-center h-full p-12 text-slate-600 font-mono"><CodeIcon className="w-6 h-6 opacity-40 mb-4" /><p>Awaiting Stream Input</p></div>;
    if (viewMode === 'json') return <div className="relative h-full bg-[#090a0e]"><pre className="p-6 text-xs text-indigo-200 font-mono overflow-x-auto h-full">{JSON.stringify(output, null, 2)}</pre></div>;
    if (isImagePrompt(output)) return renderImageView(output);
    if (isVideoPrompt(output)) return renderVideoView(output);
    if (isEditPrompt(output)) return renderEditView(output);
    return null;
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
                <button 
                    onClick={onSuperEnhance} 
                    disabled={isSuperEnhancing || isRefining} 
                    className="px-3 py-1 rounded-md text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-all flex items-center gap-1.5"
                >
                    {isSuperEnhancing ? <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                    <span>SUPER</span>
                </button>

                <button 
                    onClick={() => handleCopy(JSON.stringify(output, null, 2), 'global-json')} 
                    className="px-3 py-1 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                >
                    {copiedKey === 'global-json' ? <CheckIcon className="w-3 h-3 text-green-400" /> : <CodeIcon className="w-3 h-3" />}
                    <span>JSON</span>
                </button>

                <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/10">
                    <button onClick={() => setViewMode('text')} className={`px-3 py-1 rounded-md text-[10px] transition-all ${viewMode === 'text' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Text</button>
                    <button onClick={() => setViewMode('json')} className={`px-3 py-1 rounded-md text-[10px] transition-all ${viewMode === 'json' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>JSON</button>
                </div>
            </div>
        )}
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#090a0e]">{renderContent()}</div>
    </div>
  );
};
