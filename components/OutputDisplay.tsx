
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

const isImagePrompt = (o: any): o is EnhancedPrompt => 
  !!(o && typeof o === 'object' && o.prompt && typeof o.prompt === 'object' && 'subject' in o.prompt);

const isVideoPrompt = (o: any): o is EnhancedVideoPrompt => 
  !!(o && typeof o === 'object' && 'full_prompt' in o);

const isEditPrompt = (o: any): o is EnhancedEditPrompt => 
  !!(o && typeof o === 'object' && 'edit_task_summary' in o);

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
        {label && <span className="text-indigo-400 mr-2 font-medium capitalize">{label.replace(/_/g, ' ')}:</span>}
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
    const fullPrompt = [
        cleanPrefix(p.subject.description), p.pose.description, p.environment.setting, 
        p.environment.elements.join(", "), p.camera.shot_type, p.lighting.type, 
        p.style_and_realism.style, p.quality_and_technical_details.resolution
    ].filter(Boolean).join(", ");

    return (
      <div className="flex flex-col">
          <RefineInput onRefine={onRefine} isRefining={isRefining} />
          <CollapsibleSection title="Master Execution Prompt" defaultOpen={true}>
            <div className="relative group">
              <button onClick={() => handleCopy(fullPrompt, 'full')} className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all z-10"><ClipboardIcon className="w-3 h-3" /></button>
              <p className="text-slate-300 font-mono text-sm pr-8">{fullPrompt}</p>
            </div>
          </CollapsibleSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 bg-[#0B0D12] border-b border-white/10">
              <div className="p-4 border-r border-white/10 bg-indigo-500/5">
                <Detail label="Subject Lock" value={p.subject.anatomy_constraints} />
                <Detail label="Skeletal Lock" value={p.pose.skeletal_lock} />
              </div>
              <div className="p-4 bg-emerald-500/5">
                <Detail label="Pose Control" value={p.controlnet.pose_control} />
                <Detail label="Depth Control" value={p.controlnet.depth_control} />
              </div>
          </div>
          <CollapsibleSection title="Structural Details">
              <Detail label="Mood" value={p.mood_and_expression} />
              <Detail label="Camera" value={p.camera} />
              <Detail label="Materials" value={p.style_and_realism} />
          </CollapsibleSection>
      </div>
    );
  };

  const renderVideoView = (data: EnhancedVideoPrompt) => (
    <div className="flex flex-col h-full">
      <RefineInput onRefine={onRefine} isRefining={isRefining} />
      <CollapsibleSection title={targetModel === 'ltx' ? "Final LTX Prompt" : targetModel === 'kling' ? "Final Kling Prompt" : "Master Cinematic Prompt"} defaultOpen={true}>
        <div className="relative group">
          <button 
            onClick={() => handleCopy(data.full_prompt, 'video-full')} 
            className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
          >
            <ClipboardIcon className="w-3 h-3" />
          </button>
          <p className="text-slate-200 font-mono text-sm leading-relaxed pr-8">{data.full_prompt}</p>
        </div>
      </CollapsibleSection>

      {data.general_scene_prompt && (
        <CollapsibleSection title="General Scene Prompt" defaultOpen={true}>
          <div className="relative group">
            <button 
              onClick={() => handleCopy(data.general_scene_prompt!, 'video-general')} 
              className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <ClipboardIcon className="w-3 h-3" />
            </button>
            <p className="text-slate-400 font-mono text-sm leading-relaxed pr-8 italic">{data.general_scene_prompt}</p>
          </div>
        </CollapsibleSection>
      )}

      {targetModel !== 'ltx' && targetModel !== 'kling' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 bg-[#0B0D12] border-b border-white/10">
            <div className="p-4 border-r border-white/10 bg-indigo-500/5">
              <h3 className="text-[10px] uppercase text-indigo-400 font-bold mb-3">Scene & Atmosphere</h3>
              <Detail label="Environment" value={data.scene_setup.environment} />
              <Detail label="Time/Weather" value={data.scene_setup.time_and_weather} />
              <Detail label="Atmosphere" value={data.scene_setup.atmosphere} />
            </div>
            <div className="p-4 bg-emerald-500/5">
              <h3 className="text-[10px] uppercase text-emerald-400 font-bold mb-3">Motion Dynamics</h3>
              <Detail label="Physics" value={data.motion_dynamics.physics_and_fluidity} />
              <Detail label="Pacing" value={data.motion_dynamics.pacing_and_speed} />
              <Detail label="Dynamic Elements" value={data.motion_dynamics.dynamic_elements} />
            </div>
          </div>

          <CollapsibleSection title="Subject Details" defaultOpen={false}>
            {data.subjects.map((subject, idx) => (
              <div key={idx} className="mb-6 last:mb-0 pb-6 last:pb-0 border-b last:border-0 border-white/5">
                <h4 className="text-[11px] text-indigo-300 font-bold mb-2 uppercase tracking-tighter">Subject #{idx + 1}</h4>
                <Detail label="Description" value={subject.description} />
                <Detail label="Actions" value={subject.actions} />
                <Detail label="Expressions" value={subject.expressions} />
                <Detail label="Textures" value={subject.clothing_and_textures} />
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection title="Technical Direction">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-[10px] text-slate-500 font-bold mb-2 uppercase">Camera</h4>
                <Detail label="Movement" value={data.camera_direction.movement} />
                <Detail label="Shot Type" value={data.camera_direction.shot_type} />
                <Detail label="Perspective" value={data.camera_direction.perspective} />
                <Detail label="Lens/Focus" value={data.camera_direction.lens_and_focus} />
              </div>
              <div>
                <h4 className="text-[10px] text-slate-500 font-bold mb-2 uppercase">Lighting & Color</h4>
                <Detail label="Setup" value={data.lighting_and_color.setup} />
                <Detail label="Grading" value={data.lighting_and_color.color_grading} />
                <Detail label="Shadows" value={data.lighting_and_color.shadow_play} />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Audio & Negative Constraints">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-[10px] text-slate-500 font-bold mb-2 uppercase">Audio Direction</h4>
                <Detail label="Sound Design" value={data.audio_direction.sound_design} />
                <Detail label="Ambient" value={data.audio_direction.ambient_textures} />
                <Detail label="Music" value={data.audio_direction.music_mood} />
              </div>
              <div>
                <h4 className="text-[10px] text-slate-500 font-bold mb-2 uppercase">Negative Constraints</h4>
                <Detail label="Avoid" value={data.negative_constraints} />
              </div>
            </div>
          </CollapsibleSection>
        </>
      )}
      
      {data.model_notes && (
        <div className="p-4 bg-black/40 border-t border-white/5">
          <p className="text-[10px] text-slate-500 italic"><span className="font-bold uppercase mr-2">Model Notes:</span>{data.model_notes}</p>
        </div>
      )}
    </div>
  );

  const renderEditView = (data: EnhancedEditPrompt) => (
    <div className="flex flex-col">
       <RefineInput onRefine={onRefine} isRefining={isRefining} />
       <div className="p-4 bg-indigo-500/10 border-b border-white/10">
            <h2 className="text-sm font-bold text-indigo-100 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-indigo-400" />
                EDIT TASK: {data.edit_task_summary}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 italic">{data.transformation_logic}</p>
       </div>
       <CollapsibleSection title="Master Prompt (For AI Editor)" defaultOpen={true}>
            <div className="relative group">
                <button onClick={() => handleCopy(data.master_edit_prompt, 'edit-master')} className="absolute top-0 right-0 p-1.5 bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all z-10"><ClipboardIcon className="w-3 h-3" /></button>
                <p className="text-slate-300 font-mono text-sm leading-relaxed pr-8">{data.master_edit_prompt}</p>
            </div>
       </CollapsibleSection>
       <div className="grid grid-cols-1 sm:grid-cols-2 bg-[#0B0D12] border-b border-white/10">
            <div className="p-4 border-r border-white/10 bg-emerald-500/5">
                <h3 className="text-[10px] uppercase text-emerald-400 font-bold mb-3">Preservation Locks</h3>
                <Detail label="" value={data.preservation_locks} />
            </div>
            <div className="p-4 bg-amber-500/5">
                <h3 className="text-[10px] uppercase text-amber-400 font-bold mb-3">Technical Brief</h3>
                <Detail label="" value={data.technical_params} />
            </div>
       </div>
       <CollapsibleSection title="Technical Steps" defaultOpen={true}>
            <Detail label="Sequence" value={data.detailed_execution_steps} />
       </CollapsibleSection>
    </div>
  );

  const renderContent = () => {
    if (isLoading) return <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500 font-mono"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" /><p>Processing Assignment...</p></div>;
    if (error) return <div className="p-6 h-full flex items-center justify-center"><div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-400 text-xs font-mono">Error: {error}</div></div>;
    if (!output) return <div className="flex flex-col items-center justify-center h-full p-12 text-slate-600 font-mono"><p>Awaiting Input...</p></div>;
    if (viewMode === 'json') return <pre className="p-6 text-xs text-indigo-200 font-mono overflow-x-auto h-full">{JSON.stringify(output, null, 2)}</pre>;
    if (isImagePrompt(output)) return renderImageView(output);
    if (isVideoPrompt(output)) return renderVideoView(output);
    if (isEditPrompt(output)) return renderEditView(output);
    return <div className="p-6 h-full flex items-center justify-center"><div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-amber-400 text-xs font-mono">Unknown Output Format</div></div>;
  };

  return (
    <div className="bg-[#13151C]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden ring-1 ring-white/5">
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-[#0B0D12]">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Output Terminal</h2>
        {output && !isLoading && (
            <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/10">
                <button onClick={() => setViewMode('text')} className={`px-3 py-1 rounded-md text-[10px] ${viewMode === 'text' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Text</button>
                <button onClick={() => setViewMode('json')} className={`px-3 py-1 rounded-md text-[10px] ${viewMode === 'json' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>JSON</button>
            </div>
        )}
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#090a0e]">{renderContent()}</div>
    </div>
  );
};
