
import React, { useState } from 'react';
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ViewMode, ImageModel, VideoModel, EditModel, AppMode } from '../types';
import { CodeIcon } from './icons/CodeIcon';
import { SendIcon } from './icons/SendIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { Globe, Brain } from 'lucide-react';

interface OutputDisplayProps {
  output: EnhancedPrompt | EnhancedVideoPrompt | EnhancedEditPrompt | null;
  targetModel?: ImageModel | VideoModel | EditModel;
  mode: AppMode;
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

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; accentColor?: string }> = ({ title, children, defaultOpen = false, accentColor = 'indigo' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colorMap: Record<string, string> = {
    indigo: 'text-indigo-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    pink: 'text-pink-400',
  };
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-3 px-4 text-left hover:bg-white/[0.02] transition-colors group"
        aria-expanded={isOpen}
      >
        <span className={`text-[10px] uppercase tracking-widest font-semibold ${colorMap[accentColor] ?? colorMap.indigo} opacity-80 group-hover:opacity-100 transition-opacity`}>{title}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-slate-600 group-hover:text-slate-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
};

const Detail: React.FC<{ label: string; value: any }> = ({ label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="mb-3 last:mb-0 font-mono text-[12px] leading-relaxed">
        {label && <span className="text-indigo-400/80 mr-2 font-semibold capitalize text-[11px] uppercase tracking-wide">{label.replace(/_/g, ' ')}:</span>}
        {Array.isArray(value) ? (
          <div className="flex flex-col gap-1.5 mt-1.5 pl-2">
            {value.map((item, index) => <div key={index} className="text-slate-300 text-[12px] flex items-start gap-2">
                <span className="text-purple-500 mt-1 text-[8px]">◆</span>
                <span>{item}</span>
            </div>)}
          </div>
        ) : typeof value === 'object' ? (
          <div className="pl-4 mt-1 border-l border-white/8">
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
        <div className="px-4 py-3 border-b border-white/5">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 text-xs font-mono font-bold">{'>'}</span>
                    <input
                        type="text" value={refinement} onChange={(e) => setRefinement(e.target.value)}
                        placeholder="Refine the output..." className="w-full pl-7 pr-4 py-2 bg-white/[0.03] border border-white/8 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/40 outline-none font-mono placeholder-slate-600 hover:border-white/15 transition-all"
                        disabled={isRefining}
                    />
                </div>
                <button type="submit" disabled={isRefining || !refinement.trim()} className="p-2 bg-purple-600/80 hover:bg-purple-500 rounded-lg text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:bg-white/5 disabled:text-slate-600 transition-all active:scale-95">
                   {isRefining ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SendIcon className="w-4 h-4" />}
                </button>
            </form>
        </div>
    );
};

export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  output, targetModel, mode, isLoading, isRefining, isSuperEnhancing, error, viewMode, setViewMode, onRefine, onSuperEnhance,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const renderSearchAndReasoning = (data: any) => {
    const hasSearch = (data.searchQueries && data.searchQueries.length > 0) || (data.searchSources && data.searchSources.length > 0);
    const hasThoughts = !!data.thoughts;
    
    if (!hasSearch && !hasThoughts) return null;

    // Theme color based on mode
    const colors: Record<AppMode, { border: string; bg: string; text: string; tagBg: string; tagText: string; accent: string }> = {
      image: {
        border: 'border-indigo-500/20',
        bg: 'bg-indigo-500/[0.02]',
        text: 'text-indigo-400',
        tagBg: 'bg-indigo-500/10',
        tagText: 'text-indigo-300',
        accent: 'indigo'
      },
      video: {
        border: 'border-purple-500/20',
        bg: 'bg-purple-500/[0.02]',
        text: 'text-purple-400',
        tagBg: 'bg-purple-500/10',
        tagText: 'text-purple-300',
        accent: 'purple'
      },
      edit: {
        border: 'border-pink-500/20',
        bg: 'bg-pink-500/[0.02]',
        text: 'text-pink-400',
        tagBg: 'bg-pink-500/10',
        tagText: 'text-pink-300',
        accent: 'pink'
      }
    };

    const currentTheme = colors[mode] || colors.image;

    return (
      <div className="flex flex-col gap-4 p-4 border-b border-white/5 bg-zinc-950/20">
        {/* Web Grounding Results */}
        {hasSearch && (
          <div className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.bg} backdrop-blur-md relative overflow-hidden group/search`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent -translate-x-full group-hover/search:animate-shimmer pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${mode === 'image' ? 'bg-indigo-500 animate-pulse' : mode === 'video' ? 'bg-purple-500 animate-pulse' : 'bg-pink-500 animate-pulse'}`} />
              <Globe className={`w-4 h-4 ${currentTheme.text}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Web Grounding Sources</span>
            </div>
            
            {/* Search Queries */}
            {data.searchQueries && data.searchQueries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {data.searchQueries.map((query: string, idx: number) => (
                  <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${currentTheme.tagBg} ${currentTheme.tagText}`}>
                    Query: "{query}"
                  </span>
                ))}
              </div>
            )}
            
            {/* Search Sources */}
            {data.searchSources && data.searchSources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {data.searchSources.map((source: { title: string; uri: string }, idx: number) => {
                  let domain = "";
                  try {
                    domain = new URL(source.uri).hostname.replace('www.', '');
                  } catch (e) {
                    domain = "web";
                  }
                  return (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5 group/source shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-slate-400 group-hover/source:text-white transition-colors`}>
                          {domain}
                        </span>
                        <svg className="w-2.5 h-2.5 text-slate-600 group-hover/source:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-slate-300 group-hover/source:text-white transition-colors line-clamp-1">
                        {source.title || "Untitled Web Source"}
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">Fact verified using web data, no specific links returned.</p>
            )}
          </div>
        )}

        {/* Collapsible Model Thoughts */}
        {hasThoughts && (
          <CollapsibleSection title="Model Reasoning Process" defaultOpen={false} accentColor={currentTheme.accent}>
            <div className="mt-2 p-4 rounded-xl bg-black/60 border border-white/5 relative group/thoughts font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => handleCopy(data.thoughts, 'thoughts')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all ${
                    copiedKey === 'thoughts'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/10 opacity-0 group-hover/thoughts:opacity-100 hover:text-slate-200'
                  }`}
                >
                  {copiedKey === 'thoughts' ? <CheckIcon className="w-2 h-2" /> : <ClipboardIcon className="w-2 h-2" />}
                  {copiedKey === 'thoughts' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <span className="text-slate-500 select-none mr-2">$ cat reasoning_process.log</span>
              <p className="text-slate-400 whitespace-pre-wrap mt-2 pr-12 font-mono leading-relaxed">{data.thoughts}</p>
            </div>
          </CollapsibleSection>
        )}
      </div>
    );
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
    const fullPrompt = data.full_prompt || [
        cleanPrefix(p.subject.description), p.pose.description, p.environment.setting, 
        p.environment.elements.join(", "), p.camera.shot_type, p.lighting.type, 
        p.style_and_realism.style, p.quality_and_technical_details.resolution
    ].filter(Boolean).join(", ");

    return (
      <div className="flex flex-col">
          <RefineInput onRefine={onRefine} isRefining={isRefining} />
          {renderSearchAndReasoning(data)}
          <CollapsibleSection title="Master Execution Prompt" defaultOpen={true} accentColor="indigo">
            <div className="relative group">
              <button
                onClick={() => handleCopy(fullPrompt, 'full')}
                className={`absolute top-0 right-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all z-10 ${
                  copiedKey === 'full'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-100'
                  : 'bg-white/5 text-slate-500 border border-white/10 opacity-0 group-hover:opacity-100 hover:text-slate-200 hover:bg-white/10'
                }`}
              >
                {copiedKey === 'full' ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
                {copiedKey === 'full' ? 'Copied!' : 'Copy'}
              </button>
              <p className="text-slate-200 font-mono text-sm pr-24 leading-loose">{fullPrompt}</p>
            </div>
          </CollapsibleSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-white/5">
              <div className="p-4 border-r border-white/5 bg-indigo-500/[0.03]">
                <h4 className="text-[10px] uppercase text-indigo-400/60 font-bold mb-3 tracking-widest">Subject Lock</h4>
                <Detail label="" value={p.subject.anatomy_constraints} />
                <Detail label="Skeletal" value={p.pose.skeletal_lock} />
              </div>
              <div className="p-4 bg-emerald-500/[0.03]">
                <h4 className="text-[10px] uppercase text-emerald-400/60 font-bold mb-3 tracking-widest">Control Net</h4>
                <Detail label="Pose" value={p.controlnet.pose_control} />
                <Detail label="Depth" value={p.controlnet.depth_control} />
              </div>
          </div>
          <CollapsibleSection title="Structural Details" accentColor="purple">
              <Detail label="Mood" value={p.mood_and_expression} />
              <Detail label="Camera" value={p.camera} />
              <Detail label="Materials" value={p.style_and_realism} />
          </CollapsibleSection>
          {p.negative_prompt?.forbidden_content?.length > 0 && (
            <CollapsibleSection title="Negative Constraints" defaultOpen={true} accentColor="pink">
              <div className="relative group">
                <button
                  onClick={() => handleCopy(p.negative_prompt.forbidden_content.join(', '), 'image-neg')}
                  className={`absolute top-0 right-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all z-10 ${
                    copiedKey === 'image-neg'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-100'
                    : 'bg-white/5 text-slate-500 border border-white/10 opacity-0 group-hover:opacity-100 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {copiedKey === 'image-neg' ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
                </button>
                <p className="text-red-300/70 font-mono text-xs pr-10 leading-relaxed">{p.negative_prompt.forbidden_content.join(', ')}</p>
              </div>
            </CollapsibleSection>
          )}
      </div>
    );
  };

  const renderVideoView = (data: EnhancedVideoPrompt) => (
    <div className="flex flex-col h-full">
      <RefineInput onRefine={onRefine} isRefining={isRefining} />
      {renderSearchAndReasoning(data)}
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

      {true && (
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
                <h4 className="text-[10px] text-slate-500 font-bold mb-2 uppercase flex justify-between items-center">
                    Negative Constraints
                    {data.negative_constraints?.length > 0 && (
                        <button onClick={() => handleCopy(data.negative_constraints.join(', '), 'video-neg')} className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-all text-slate-300">
                            <ClipboardIcon className="w-2.5 h-2.5" />
                        </button>
                    )}
                </h4>
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
       {renderSearchAndReasoning(data)}
       {/* Task Summary Banner */}
       <div className="px-4 py-4 bg-gradient-to-r from-pink-500/8 via-rose-500/5 to-transparent border-b border-white/5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-pink-500/15 border border-pink-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-pink-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-pink-400/70 font-semibold mb-1">Edit Task</p>
                <h2 className="text-sm font-semibold text-slate-100 leading-snug">{data.edit_task_summary}</h2>
                <p className="text-[11px] text-slate-500 mt-1.5 italic leading-relaxed">{data.transformation_logic}</p>
              </div>
            </div>
       </div>
       <CollapsibleSection title="Master Prompt (AI Editor)" defaultOpen={true} accentColor="pink">
            <div className="relative group">
                <button
                  onClick={() => handleCopy(data.master_edit_prompt, 'edit-master')}
                  className={`absolute top-0 right-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all z-10 ${
                    copiedKey === 'edit-master'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-100'
                    : 'bg-white/5 text-slate-500 border border-white/10 opacity-0 group-hover:opacity-100 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {copiedKey === 'edit-master' ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
                  {copiedKey === 'edit-master' ? 'Copied!' : 'Copy'}
                </button>
                <p className="text-slate-200 font-mono text-sm leading-relaxed pr-24">{data.master_edit_prompt}</p>
            </div>
       </CollapsibleSection>
       <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-white/5">
            <div className="p-4 border-r border-white/5 bg-emerald-500/[0.03]">
                <h3 className="text-[10px] uppercase text-emerald-400/70 font-bold mb-3 tracking-widest">Preservation Locks</h3>
                <Detail label="" value={data.preservation_locks} />
            </div>
            <div className="p-4 bg-amber-500/[0.03]">
                <h3 className="text-[10px] uppercase text-amber-400/70 font-bold mb-3 tracking-widest">Technical Brief</h3>
                <Detail label="" value={data.technical_params} />
            </div>
       </div>
       <CollapsibleSection title="Execution Steps" defaultOpen={true} accentColor="purple">
            <Detail label="Sequence" value={data.detailed_execution_steps} />
       </CollapsibleSection>
    </div>
  );

  const renderContent = () => {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-full p-12 gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-purple-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border border-purple-500/20" />
          <div className="absolute inset-2 rounded-full border border-t-purple-500 border-r-pink-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-slate-400 font-mono text-sm">Processing Assignment...</p>
          <p className="text-slate-600 text-xs">AI is crafting your enhanced prompt</p>
        </div>
      </div>
    );
    if (error) return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="bg-red-500/8 border border-red-500/20 p-5 rounded-xl text-red-400 text-xs font-mono max-w-sm w-full">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="font-semibold uppercase tracking-wider text-[10px]">Error</span>
          </div>
          {error}
        </div>
      </div>
    );
    if (!output) return (
      <div className="flex flex-col items-center justify-center h-full p-12 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
          <SparklesIcon className="w-7 h-7 text-slate-700" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-slate-500 text-sm font-medium">Awaiting input</p>
          <p className="text-slate-700 text-xs">Configure your prompt and hit Enhance</p>
        </div>
      </div>
    );
    if (viewMode === 'json') return <pre className="p-5 text-xs text-indigo-200/80 font-mono overflow-x-auto h-full leading-relaxed">{JSON.stringify(output, null, 2)}</pre>;
    if (isImagePrompt(output)) return renderImageView(output);
    if (isVideoPrompt(output)) return renderVideoView(output);
    if (isEditPrompt(output)) return renderEditView(output);
    return <div className="p-6 h-full flex items-center justify-center"><div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-amber-400 text-xs font-mono">Unknown Output Format</div></div>;
  };

  return (
    <div className="bg-[#0e1018]/80 backdrop-blur-2xl border border-white/8 rounded-2xl shadow-2xl shadow-black/40 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3.5 border-b border-white/8 bg-[#0b0d14]/80">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-gradient-to-b from-purple-400 via-pink-400 to-indigo-400 rounded-full" />
          <h2 className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Output Terminal</h2>
        </div>
        <div className="flex items-center gap-3">
          {output && !isLoading && (mode === 'image' || mode === 'video') && (
            <button
              onClick={onSuperEnhance}
              disabled={isSuperEnhancing}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                isSuperEnhancing 
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                : 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-300 border-purple-500/20 hover:border-purple-500/40 hover:from-purple-600/30 hover:to-indigo-600/30'
              }`}
            >
              {isSuperEnhancing ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-3 h-3" />
                  Super Enhance
                </>
              )}
            </button>
          )}
          {output && !isLoading && (
              <div className="flex items-center gap-2">
                <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/8">
                    <button onClick={() => setViewMode('text')} className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all ${
                      viewMode === 'text' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                    }`}>Text</button>
                    <button onClick={() => setViewMode('json')} className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all ${
                      viewMode === 'json' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                    }`}>
                      <span className="flex items-center gap-1"><CodeIcon className="w-3 h-3" />JSON</span>
                    </button>
                </div>
              </div>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#080a10]">{renderContent()}</div>
    </div>
  );
};
