
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { VideoPromptInput } from './components/VideoPromptInput';
import { EditPromptInput } from './components/EditPromptInput';
import { OutputDisplay } from './components/OutputDisplay';
import { HistorySidebar } from './components/HistorySidebar';
import { ReversePromptModal } from './components/ReversePromptModal';
import { generateEnhancedPrompt, generateEnhancedVideoPrompt, generateEnhancedEditPrompt, refineEnhancedPrompt, refineEnhancedVideoPrompt, refineEnhancedEditPrompt, superEnhanceVideoPrompt, superEnhanceImagePrompt, reversePromptImage } from './services/geminiService';
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ViewMode, ImageModel, VideoModel, EditModel, HistoryItem, AppMode } from './types';

const App: React.FC = () => {
  // Key state
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Common state
  const [mode, setMode] = useState<AppMode>('image');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isSuperEnhancing, setIsSuperEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [language, setLanguage] = useState<'en' | 'ru'>('en');
  const [enhancementPower, setEnhancementPower] = useState<number>(3);

  // Image-specific state
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [imageReferences, setImageReferences] = useState<string[]>([]);
  const [imageModel, setImageModel] = useState<ImageModel>('midjourney');
  const [imageOutput, setImageOutput] = useState<EnhancedPrompt | null>(null);
  const [isReversePromptOpen, setIsReversePromptOpen] = useState<boolean>(false);

  // Video-specific state
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [videoCharacterReferences, setVideoCharacterReferences] = useState<string[]>([]);
  const [videoModel, setVideoModel] = useState<VideoModel>('veo');
  const [videoOutput, setVideoOutput] = useState<EnhancedVideoPrompt | null>(null);

  // Edit-specific state
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editReferences, setEditReferences] = useState<string[]>([]);
  const [editModel, setEditModel] = useState<EditModel>('nanobanana');
  const [editOutput, setEditOutput] = useState<EnhancedEditPrompt | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Check for key on mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (e) {
        console.warn("Key selection check not available in this environment.");
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Assume success to prevent race condition
      setHasApiKey(true);
    } catch (e) {
      setError("Unable to open API key selector. Ensure you are logged into Google AI Studio.");
    }
  };

  const resetAllOutputs = () => {
    setImageOutput(null);
    setVideoOutput(null);
    setEditOutput(null);
    setActiveHistoryId(null);
  };

  const handleImageGenerate = useCallback(async () => {
    if (!imagePrompt.trim() && imageReferences.length === 0) {
      setError('Please enter a prompt or provide at least one reference image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    resetAllOutputs();
    try {
      const result = await generateEnhancedPrompt(imagePrompt, language, imageModel, imageReferences, enhancementPower);
      setImageOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'image',
        simplePrompt: imagePrompt,
        language,
        model: imageModel,
        output: result,
        references: imageReferences,
        enhancementPower
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key or Project not found. Please re-select your key.");
      } else {
        setError(`Failed to generate prompt. ${e.message || 'Please try again.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [imagePrompt, language, imageModel, imageReferences, enhancementPower]);

  const handleReversePrompt = async (imageBase64: string, context: string) => {
    setIsLoading(true);
    setError(null);
    setIsReversePromptOpen(false);
    resetAllOutputs();
    try {
      const result = await reversePromptImage(imageBase64, context, imageModel);
      setImageOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'image',
        simplePrompt: `Reverse Prompting: ${context || 'Image Analysis'}`,
        language,
        model: imageModel,
        output: result,
        enhancementPower: 3
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to reverse prompt image. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoGenerate = useCallback(async () => {
    if (!firstFrame && !lastFrame && !videoPrompt.trim() && videoCharacterReferences.length === 0) {
      setError('Please provide at least a prompt, a start/end frame, or a character reference.');
      return;
    }
    setIsLoading(true);
    setError(null);
    resetAllOutputs();
    try {
      const result = await generateEnhancedVideoPrompt(videoPrompt, firstFrame, lastFrame, videoCharacterReferences, language, videoModel, enhancementPower);
      setVideoOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'video',
        simplePrompt: videoPrompt,
        language,
        model: videoModel,
        output: result,
        firstFrame: firstFrame || null,
        lastFrame: lastFrame || null,
        characterReferences: videoCharacterReferences,
        enhancementPower
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate video prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [videoPrompt, firstFrame, lastFrame, videoCharacterReferences, language, videoModel, enhancementPower]);
  
  const handleEditGenerate = useCallback(async () => {
    if (!editPrompt.trim()) {
      setError('Please enter an editing instruction.');
      return;
    }
    if (!editImage) {
      setError('Please upload an image to edit.');
      return;
    }
    setIsLoading(true);
    setError(null);
    resetAllOutputs();
    try {
      const result = await generateEnhancedEditPrompt(editPrompt, editImage, editReferences, language, editModel, enhancementPower);
      setEditOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'edit',
        simplePrompt: editPrompt,
        language,
        model: editModel,
        output: result,
        sourceImage: editImage,
        references: editReferences,
        enhancementPower
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate edit prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [editPrompt, editImage, editReferences, language, editModel, enhancementPower]);

  const handleRefine = useCallback(async (refinementPrompt: string) => {
    if (!refinementPrompt.trim()) return;
    setIsRefining(true);
    setError(null);

    try {
      let newOutput;
      if (mode === 'image' && imageOutput) {
        newOutput = await refineEnhancedPrompt(imageOutput, refinementPrompt, imageModel);
        setImageOutput(newOutput);
      } else if (mode === 'video' && videoOutput) {
        newOutput = await refineEnhancedVideoPrompt(videoOutput, refinementPrompt, videoModel);
        setVideoOutput(newOutput);
      } else if (mode === 'edit' && editOutput) {
        newOutput = await refineEnhancedEditPrompt(editOutput, refinementPrompt, editModel);
        setEditOutput(newOutput);
      }
      
      if (activeHistoryId && newOutput) {
        setHistory(prev => prev.map(item => {
          if (item.id === activeHistoryId) {
            return { ...item, output: newOutput as any };
          }
          return item;
        }));
      }

    } catch (e: any) {
      console.error(e);
      setError(`Failed to refine prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsRefining(false);
    }

  }, [mode, imageOutput, videoOutput, editOutput, imageModel, videoModel, editModel, activeHistoryId]);

  const handleSuperEnhance = useCallback(async () => {
    if ((mode !== 'video' || !videoOutput) && (mode !== 'image' || !imageOutput)) return;
    setIsSuperEnhancing(true);
    setError(null);

    try {
      if (mode === 'video' && videoOutput) {
        const newOutput = await superEnhanceVideoPrompt(videoOutput, videoModel);
        setVideoOutput(newOutput);
        
        if (activeHistoryId) {
            setHistory(prev => prev.map(item => {
                if (item.id === activeHistoryId) {
                    return { ...item, output: newOutput };
                }
                return item;
            }));
        }

      } else if (mode === 'image' && imageOutput) {
        const newOutput = await superEnhanceImagePrompt(imageOutput, imageModel);
        setImageOutput(newOutput);

         if (activeHistoryId) {
            setHistory(prev => prev.map(item => {
                if (item.id === activeHistoryId) {
                    return { ...item, output: newOutput };
                }
                return item;
            }));
        }
      }

    } catch (e: any) {
      console.error(e);
      setError(`Failed to super-enhance. ${e.message || 'Please try again.'}`);
    } finally {
      setIsSuperEnhancing(false);
    }
  }, [mode, videoOutput, imageOutput, videoModel, imageModel, activeHistoryId]);

  const handleHistorySelect = (id: string) => {
    const item = history.find(i => i.id === id);
    if (!item) return;

    setActiveHistoryId(id);
    setMode(item.type);
    
    // Restore state from history
    setLanguage(item.language);
    if (item.enhancementPower) setEnhancementPower(item.enhancementPower);

    if (item.type === 'image') {
        setImagePrompt(item.simplePrompt);
        setImageModel(item.model);
        setImageOutput(item.output);
        setImageReferences(item.references || []);
        setVideoOutput(null);
        setEditOutput(null);
    } else if (item.type === 'video') {
        setVideoPrompt(item.simplePrompt);
        setVideoModel(item.model);
        setVideoOutput(item.output);
        setFirstFrame(item.firstFrame || null);
        setLastFrame(item.lastFrame || null);
        setVideoCharacterReferences(item.characterReferences || []);
        setImageOutput(null);
        setEditOutput(null);
    } else if (item.type === 'edit') {
        setEditPrompt(item.simplePrompt);
        setEditModel(item.model);
        setEditOutput(item.output);
        setEditImage(item.sourceImage);
        setEditReferences(item.references || []);
        setImageOutput(null);
        setVideoOutput(null);
    }
  };

  const handleHistoryClear = () => {
    if (confirm('Are you sure you want to clear your history?')) {
        setHistory([]);
        resetAllOutputs();
    }
  };

  const onGenerate = () => {
    if (mode === 'image') handleImageGenerate();
    else if (mode === 'video') handleVideoGenerate();
    else if (mode === 'edit') handleEditGenerate();
  };

  const currentOutput = mode === 'image' ? imageOutput : mode === 'video' ? videoOutput : editOutput;
  const currentTargetModel = mode === 'image' ? imageModel : mode === 'video' ? videoModel : editModel;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#02040a] text-slate-200 font-sans selection:bg-indigo-500/30">
        <div className="fixed inset-0 pointer-events-none z-0">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[120px]" />
             <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-cyan-900/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col h-full max-w-[1600px] mx-auto w-full px-4 md:px-6">
            <Header 
              mode={mode} 
              setMode={setMode}
              hasApiKey={hasApiKey}
              onOpenKeySelector={handleOpenKeySelector}
            />

            {!hasApiKey && (
              <div className="px-4 py-2 mt-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between group animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <p className="text-[11px] text-indigo-300 font-medium tracking-wide">
                    Using shared rate limits. <button onClick={handleOpenKeySelector} className="underline font-bold hover:text-white transition-colors">Provide your own API Key</button> for higher limits.
                  </p>
                </div>
                <button onClick={handleOpenKeySelector} className="text-[10px] bg-indigo-500 text-white px-2 py-1 rounded-lg font-bold uppercase tracking-tighter hover:bg-indigo-400 transition-colors">Setup Key</button>
              </div>
            )}

            <main className="flex-grow flex flex-col md:flex-row gap-6 pb-6 min-h-0 pt-4">
                <div className="hidden md:flex flex-col w-64 flex-shrink-0">
                    <HistorySidebar 
                        history={history} 
                        activeId={activeHistoryId} 
                        onSelect={handleHistorySelect}
                        onClear={handleHistoryClear}
                    />
                </div>

                <div className="flex-1 min-w-0 flex flex-col h-full">
                   {mode === 'image' && (
                        <PromptInput 
                            prompt={imagePrompt}
                            setPrompt={setImagePrompt}
                            references={imageReferences}
                            setReferences={setImageReferences}
                            language={language}
                            setLanguage={setLanguage}
                            imageModel={imageModel}
                            setImageModel={setImageModel}
                            enhancementPower={enhancementPower}
                            setEnhancementPower={setEnhancementPower}
                            onGenerate={onGenerate}
                            isLoading={isLoading}
                            onReversePromptOpen={() => setIsReversePromptOpen(true)}
                        />
                   )}
                   {mode === 'video' && (
                       <VideoPromptInput 
                            prompt={videoPrompt}
                            setPrompt={setVideoPrompt}
                            language={language}
                            setLanguage={setLanguage}
                            firstFrame={firstFrame}
                            setFirstFrame={setFirstFrame}
                            lastFrame={lastFrame}
                            setLastFrame={setLastFrame}
                            characterReferences={videoCharacterReferences}
                            setCharacterReferences={setVideoCharacterReferences}
                            videoModel={videoModel}
                            setVideoModel={setVideoModel}
                            enhancementPower={enhancementPower}
                            setEnhancementPower={setEnhancementPower}
                            onGenerate={onGenerate}
                            isLoading={isLoading}
                       />
                   )}
                   {mode === 'edit' && (
                        <EditPromptInput 
                            prompt={editPrompt}
                            setPrompt={setEditPrompt}
                            language={language}
                            setLanguage={setLanguage}
                            sourceImage={editImage}
                            setSourceImage={setEditImage}
                            references={editReferences}
                            setReferences={setEditReferences}
                            editModel={editModel}
                            setEditModel={setEditModel}
                            enhancementPower={enhancementPower}
                            setEnhancementPower={setEnhancementPower}
                            onGenerate={onGenerate}
                            isLoading={isLoading}
                        />
                   )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col h-full">
                    <OutputDisplay 
                        output={currentOutput}
                        targetModel={currentTargetModel}
                        isLoading={isLoading}
                        isRefining={isRefining}
                        isSuperEnhancing={isSuperEnhancing}
                        error={error}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        onRefine={handleRefine}
                        onSuperEnhance={handleSuperEnhance}
                    />
                </div>
            </main>
        </div>

        {isReversePromptOpen && (
            <ReversePromptModal 
                onClose={() => setIsReversePromptOpen(false)}
                onReverse={handleReversePrompt}
                isLoading={isLoading}
            />
        )}
    </div>
  );
};

export default App;
