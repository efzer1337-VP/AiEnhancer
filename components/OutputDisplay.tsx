
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

// Type guards to differentiate between prompt types
const isImagePrompt = (o: any): o is EnhancedPrompt => o && o.prompt && 'core' in o.prompt;
const isVideoPrompt = (o: any): o is EnhancedVideoPrompt => o && 'description' in o && 'keywords' in o && 'camera' in o;
const isEditPrompt = (o: any): o is EnhancedEditPrompt => o && 'master_prompt' in o;

// Helper component for collapsible sections
const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-3 px-4 text-left font-semibold text-gray-200 hover:bg-gray-700/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 bg-gray-900/50">{children}</div>}
    </div>
  );
};

// Helper for rendering key-value pairs
const Detail: React.FC<{ label: string; value: string | string[] | number | null | undefined }> = ({ label, value }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="mb-3">
        <strong className="text-gray-400 block font-medium">{label}:</strong>
        {Array.isArray(value) ? (
          <ul className="list-disc list-inside ml-2 text-cyan-300 space-y-1 mt-1">
            {value.map((item, index) => <li key={index} className="text-gray-200">{item}</li>)}
          </ul>
        ) : (
          <span className="text-gray-200 whitespace-pre-wrap">{value}</span>
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
        <div className="p-4 border-b border-gray-700 bg-gray-800/30">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <input
                    type="text"
                    value={refinement}
                    onChange={(e) => setRefinement(e.target.value)}
                    placeholder="Refine the prompt... e.g., 'make it a night scene'"
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                    disabled={isRefining}
                    aria-label="Refinement input"
                />
                <button
                    type="submit"
                    disabled={isRefining || !refinement.trim()}
                    className="p-2.5 bg-blue-600 rounded-lg text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    aria-label="Refine prompt"
                >
                   {isRefining ? (
                       <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                   ) : (
                       <SendIcon className="w-5 h-5" />
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
    // Reset checkboxes when a new output is generated
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
        { key: 'core', label: 'Core Details' },
        { key: 'style', label: 'Style' },
        { key: 'technical', label: 'Technical Details' },
        { key: 'scene_setup', label: 'Scene Setup' },
        { key: 'modifications', label: 'Modifications' },
        { key: 'quality', label: 'Quality Keywords' },
    ];

    return (
      <div>
          <RefineInput onRefine={onRefine} isRefining={isRefining} />
          <div className="border-b border-gray-700">
            <h3 className="w-full flex justify-between items-center py-3 px-4 text-left font-semibold text-gray-200">
                <span>Customize Prompt Output</span>
            </h3>
            <div className="p-4 bg-gray-900/50">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sections.map(({ key, label }) => (
                        <label key={key} className="flex items-center space-x-2 text-gray-300 cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                checked={!!selectedSections[key]}
                                onChange={() => handleSectionToggle(key)}
                                className="h-4 w-4 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-gray-900 focus:ring-offset-0"
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </div>
          </div>

          <CollapsibleSection title="Full Generated Prompt" defaultOpen={true}>
            <div className="relative">
              <button
                onClick={() => handleCopy(fullPrompt, 'image-full')}
                className="absolute top-2 right-2 p-1.5 bg-gray-700/80 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors z-10"
                aria-label="Copy prompt"
              >
                {copiedKey === 'image-full' ? (
                  <CheckIcon className="w-4 h-4 text-green-400" />
                ) : (
                  <ClipboardIcon className="w-4 h-4" />
                )}
              </button>
              <p className="text-gray-300 bg-gray-900 p-3 rounded-md font-mono text-sm whitespace-pre-wrap">{fullPrompt}</p>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Core Details">
              <Detail label="Subject" value={core.subject} />
              <Detail label="Concept" value={core.concept} />
          </CollapsibleSection>

          <CollapsibleSection title="Style">
              <Detail label="Primary" value={style.primary} />
              <Detail label="Secondary" value={style.secondary} />
              <Detail label="Mood" value={style.mood} />
              <Detail label="Artistic Influence" value={style.artistic_influence} />
          </CollapsibleSection>
          
          <CollapsibleSection title="Technical Details">
               <Detail label="Shot Type" value={technical.camera.shot_type} />
               <Detail label="Angle" value={technical.camera.angle} />
               <Detail label="Lens" value={technical.camera.lens} />
               <Detail label="Focus" value={technical.camera.focus} />
               <Detail label="Lighting Source" value={technical.lighting.source} />
               <Detail label="Lighting Effect" value={technical.lighting.effect} />
               <Detail label="Quality" value={technical.resolution.quality} />
               <Detail label="Texture" value={technical.resolution.texture} />
          </CollapsibleSection>

          <CollapsibleSection title="Scene Setup">
               <Detail label="Surface" value={scene_setup.surface} />
               <Detail label="Background Type" value={scene_setup.background.type} />
               <Detail label="Background Description" value={scene_setup.background.description} />
               <Detail label="Background Color" value={scene_setup.background.color} />
               <Detail label="Props" value={scene_setup.props} />
          </CollapsibleSection>

          <CollapsibleSection title="Modifications">
            {modifications.map((mod, i) => (
               <div key={i} className="mb-4 p-3 border-l-2 border-cyan-500 bg-gray-800/40 rounded-r-md">
                  <Detail label="Target Area" value={mod.target_area} />
                  <Detail label="Action" value={mod.action} />
                  <Detail label="Materials" value={mod.details.materials} />
                  <Detail label="Architectural Translation" value={mod.details.architectural_translation} />
               </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection title="Quality">
               <Detail label="Positive Keywords" value={quality.positive_keywords} />
               <Detail label="Negative Prompt" value={quality.negative_prompt} />
          </CollapsibleSection>
      </div>
    );
  };

  // Specific view for EnhancedVideoPrompt
  const renderVideoView = (data: EnhancedVideoPrompt) => (
    <div>
      <RefineInput onRefine={onRefine} isRefining={isRefining} />
      
      <CollapsibleSection title="Cinematic Description" defaultOpen={true}>
        <div className="p-1">
          <p className="text-gray-200 whitespace-pre-wrap">{data.description}</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Shot Details" defaultOpen={true}>
        <Detail label="Style" value={data.style} />
        <Detail label="Camera" value={data.camera} />
        <Detail label="Lighting" value={data.lighting} />
        <Detail label="Environment" value={data.environment} />
      </CollapsibleSection>

      <CollapsibleSection title="Scene Elements & Motion">
        <Detail label="Key Elements" value={data.elements} />
        <Detail label="Motion" value={data.motion} />
        <Detail label="Ending" value={data.ending} />
      </CollapsibleSection>

      <CollapsibleSection title="Metadata">
        <Detail label="Text / Tagline" value={data.text} />
        <Detail label="Audio" value={data.audio} />
        <Detail label="Keywords" value={data.keywords} />
      </CollapsibleSection>
    </div>
  );

  const renderEditView = (data: EnhancedEditPrompt) => (
    <div>
       <RefineInput onRefine={onRefine} isRefining={isRefining} />
       <CollapsibleSection title="Master Edit Prompt" defaultOpen={true}>
        <div className="relative">
          <button
            onClick={() => handleCopy(data.master_prompt, 'edit-master')}
            className="absolute top-2 right-2 p-1.5 bg-gray-700/80 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors z-10"
            aria-label="Copy prompt"
          >
            {copiedKey === 'edit-master' ? (
              <CheckIcon className="w-4 h-4 text-green-400" />
            ) : (
              <ClipboardIcon className="w-4 h-4" />
            )}
          </button>
          <p className="text-gray-300 bg-gray-900 p-3 rounded-md font-mono text-sm whitespace-pre-wrap">{data.master_prompt}</p>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Original Image Analysis">
        <Detail label="Style" value={data.original_image_analysis.style} />
        <Detail label="Lighting" value={data.original_image_analysis.lighting} />
        <Detail label="Subject" value={data.original_image_analysis.subject} />
        <Detail label="Composition" value={data.original_image_analysis.composition} />
      </CollapsibleSection>
      <CollapsibleSection title="Requested Changes">
        {data.requested_changes.map((change, i) => (
          <div key={i} className="mb-3 p-3 border-l-2 border-cyan-500 bg-gray-800/40 rounded-r-md">
            <Detail label="Target Area" value={change.target_area} />
            <Detail label="Action" value={change.action} />
            <Detail label="Detailed Instruction" value={change.detailed_instruction} />
          </div>
        ))}
      </CollapsibleSection>
       <CollapsibleSection title="Consistency Keywords">
        <Detail label="Positive Keywords" value={data.consistency_keywords.positive} />
        <Detail label="Negative Keywords" value={data.consistency_keywords.negative} />
      </CollapsibleSection>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-gray-400">
          <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg">Generating enhanced prompt...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-400 text-lg font-semibold">An error occurred:</p>
          <p className="mt-2 text-gray-300 bg-red-900/50 p-4 rounded-md">{error}</p>
        </div>
      );
    }

    if (!output) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
          <p className="text-xl">Your enhanced prompt will appear here.</p>
          <p>Enter an idea and click "Enhance" to begin.</p>
        </div>
      );
    }

    if (viewMode === 'json') {
      const jsonString = JSON.stringify(output, null, 2);
      return (
        <div className="p-1 relative">
           <button
            onClick={() => handleCopy(jsonString, 'json-full')}
            className="absolute top-3 right-3 p-1.5 bg-gray-700/80 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors z-10"
            aria-label="Copy JSON"
          >
            {copiedKey === 'json-full' ? (
              <CheckIcon className="w-4 h-4 text-green-400" />
            ) : (
              <ClipboardIcon className="w-4 h-4" />
            )}
          </button>
          <pre className="p-4 text-sm text-cyan-200 bg-gray-900/80 rounded-lg overflow-x-auto">
            {jsonString}
          </pre>
        </div>
      );
    }
    
    if (isImagePrompt(output)) {
      return renderImageView(output);
    }
    
    if (isVideoPrompt(output)) {
      return renderVideoView(output);
    }

    if (isEditPrompt(output)) {
      return renderEditView(output);
    }

    return <p className="p-4 text-red-500">Could not determine prompt type.</p>;
  };

  const buttonBaseClasses = "px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors duration-200";
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "bg-gray-700 hover:bg-gray-600/80 text-gray-300";

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-wrap gap-2">
        <h2 className="text-2xl font-semibold text-gray-100">Enhanced Prompt</h2>
        {output && !isLoading && (
            <div className="flex items-center gap-2">
               {(isImagePrompt(output) || isVideoPrompt(output)) && viewMode === 'text' && (
                  <button
                    onClick={onSuperEnhance}
                    disabled={isSuperEnhancing || isRefining}
                    className="px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors duration-200 bg-purple-600 hover:bg-purple-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {isSuperEnhancing ? (
                        <>
                           <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           <span>Enhancing...</span>
                        </>
                    ) : (
                        <>
                           <SparklesIcon className="w-4 h-4" />
                           <span>Make it even more enhanced</span>
                        </>
                    )}
                  </button>
                )}
                <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('text')} 
                        className={`${buttonBaseClasses} ${viewMode === 'text' ? activeClasses : inactiveClasses}`}
                        aria-pressed={viewMode === 'text'}
                    >
                        <TextIcon className="w-4 h-4"/>
                        <span>Text</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('json')} 
                        className={`${buttonBaseClasses} ${viewMode === 'json' ? activeClasses : inactiveClasses}`}
                        aria-pressed={viewMode === 'json'}
                    >
                        <CodeIcon className="w-4 h-4"/>
                        <span>JSON</span>
                    </button>
                </div>
            </div>
        )}
      </div>
      <div className="flex-grow overflow-y-auto">
          {renderContent()}
      </div>
    </div>
  );
};
