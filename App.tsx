
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Key } from 'lucide-react';
import { PromptInput } from './components/PromptInput';
import { VideoPromptInput } from './components/VideoPromptInput';
import { EditPromptInput } from './components/EditPromptInput';
import { OutputDisplay } from './components/OutputDisplay';
import { HistorySidebar } from './components/HistorySidebar';
import { ReversePromptModal } from './components/ReversePromptModal';
import { generateEnhancedPrompt, generateEnhancedVideoPrompt, generateEnhancedEditPrompt, refineEnhancedPrompt, refineEnhancedVideoPrompt, refineEnhancedEditPrompt, superEnhanceVideoPrompt, superEnhanceImagePrompt, reversePromptImage } from './services/geminiService';
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ViewMode, ImageModel, VideoModel, EditModel, HistoryItem, AppMode, CategorizedReferences } from './types';

const App: React.FC = () => {
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
  const [categorizedReferences, setCategorizedReferences] = useState<CategorizedReferences>({
    characters: [],
    composition: [],
    scene: [],
    style: [],
  });
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
  const [isVideoRelay, setIsVideoRelay] = useState<boolean>(false);
  const [videoRelayFrames, setVideoRelayFrames] = useState<number>(240);

  // Edit-specific state
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editReferences, setEditReferences] = useState<string[]>([]);
  const [editModel, setEditModel] = useState<EditModel>('nanobanana');
  const [editOutput, setEditOutput] = useState<EnhancedEditPrompt | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('prompt_enhancer_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      return [];
    }
  });
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true); // Default to true to avoid flicker, check on mount
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Check API Key status
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      } else {
        const localKey = localStorage.getItem('gemini_api_key');
        setHasApiKey(!!localKey);
      }
    };
    checkKey();
    
    // Periodically check or listen for focus to update status
    const interval = setInterval(checkKey, 5000);
    window.addEventListener('focus', checkKey);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkKey);
    };
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // After opening, we assume success or the user will try again
      setHasApiKey(true);
    } else {
      const key = window.prompt('Please enter your Gemini API Key:\n\nYour key is saved locally in your browser and is never sent to our servers.');
      if (key && key.trim().length > 0) {
        localStorage.setItem('gemini_api_key', key.trim());
        setHasApiKey(true);
      }
    }
  };

  // Persist history to localStorage
  useEffect(() => {
    try {
      // Очищаем Base64 изображения перед сохранением, чтобы не превысить лимит в 5 МБ для localStorage
      const trimmedHistory = history.slice(0, 30).map(item => {
        if (item.type === 'image') {
          return { ...item, references: [], categorizedReferences: undefined };
        } else if (item.type === 'video') {
          return { ...item, firstFrame: null, lastFrame: null, characterReferences: [] };
        } else if (item.type === 'edit') {
          return { ...item, sourceImage: '', references: [] };
        }
        return item;
      });
      localStorage.setItem('prompt_enhancer_history', JSON.stringify(trimmedHistory));
    } catch (e) {
      console.warn("Failed to save history to localStorage (possibly quota exceeded)", e);
    }
  }, [history]);

  // Global error handling for unhandled rejections and errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Убираем агрессивный вывод ошибок в интерфейс (setError), 
      // чтобы сторонние ошибки (расширения, вебсокеты) не блокировали UI.
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const resetAllOutputs = () => {
    setImageOutput(null);
    setVideoOutput(null);
    setEditOutput(null);
    setActiveHistoryId(null);
  };

  const handleImageGenerate = useCallback(async () => {
    if (!imagePrompt.trim() && imageReferences.length === 0 && 
        Object.values(categorizedReferences).every(arr => (arr as string[]).length === 0)) {
      setError('Please enter a prompt or provide at least one reference image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    resetAllOutputs();
    try {
      const result = await generateEnhancedPrompt(
        imagePrompt, 
        language, 
        imageModel, 
        imageReferences, 
        enhancementPower,
        categorizedReferences
      );
      setImageOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'image',
        simplePrompt: imagePrompt,
        language,
        model: imageModel,
        output: result,
        references: imageReferences,
        categorizedReferences,
        enhancementPower
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [imagePrompt, language, imageModel, imageReferences, categorizedReferences, enhancementPower]);

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
      const result = await generateEnhancedVideoPrompt(
        videoPrompt, 
        firstFrame, 
        lastFrame, 
        videoCharacterReferences, 
        language, 
        videoModel, 
        enhancementPower,
        isVideoRelay,
        videoRelayFrames
      );
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
        enhancementPower,
        isRelayMode: isVideoRelay,
        relayFrames: videoRelayFrames
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
                if (item.id === activeHistoryId && item.type === 'video') {
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
                if (item.id === activeHistoryId && item.type === 'image') {
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
        setCategorizedReferences(item.categorizedReferences || {
            characters: [],
            composition: [],
            scene: [],
            style: [],
        });
        setVideoOutput(null);
        setEditOutput(null);
    } else if (item.type === 'video') {
        setVideoPrompt(item.simplePrompt);
        setVideoModel(item.model);
        setVideoOutput(item.output);
        setFirstFrame(item.firstFrame || null);
        setLastFrame(item.lastFrame || null);
        setVideoCharacterReferences(item.characterReferences || []);
        setIsVideoRelay(item.isRelayMode || false);
        setVideoRelayFrames(item.relayFrames || 240);
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
        localStorage.removeItem('prompt_enhancer_history');
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
    <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-[#02040a] text-slate-200 font-sans selection:bg-indigo-500/30">
        <div className="fixed inset-0 pointer-events-none z-0">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[120px]" />
             <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-cyan-900/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col h-full max-w-[1600px] mx-auto w-full px-4 md:px-6">
            <Header 
              mode={mode} 
              setMode={setMode}
              hasKey={hasApiKey}
              onSetKey={handleOpenKeySelector}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <main className="flex-grow flex flex-col md:flex-row gap-6 pb-6 min-h-0 pt-4 relative">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <div className={`
                    ${isSidebarOpen ? 'fixed left-0 top-0 bottom-0 w-72 z-50 translate-x-0' : 'fixed left-0 top-0 bottom-0 w-72 z-50 -translate-x-full'} 
                    md:relative md:translate-x-0 md:flex md:w-64 md:z-auto
                    transition-transform duration-300 ease-in-out flex flex-col flex-shrink-0
                `}>
                    <HistorySidebar 
                        history={history} 
                        activeId={activeHistoryId} 
                        onSelect={(id) => {
                            handleHistorySelect(id);
                            setIsSidebarOpen(false);
                        }}
                        onClear={handleHistoryClear}
                    />
                </div>

                <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-6 lg:h-full overflow-y-auto lg:overflow-visible custom-scrollbar">
                    <div className="flex-1 min-w-0 flex flex-col min-h-[500px] lg:h-full relative">
                       {!hasApiKey && (
                     <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
                       <div className="bg-[#13151C]/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl ring-1 ring-indigo-500/20">
                         <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                           <Key className="w-8 h-8 text-indigo-400" />
                         </div>
                         <h2 className="text-xl font-bold text-white mb-3">API Key Required</h2>
                         <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                           To use high-quality generative models, you need to select a paid Gemini API key. Your key is handled securely by the platform and never stored in the application code.
                         </p>
                         <button
                           onClick={handleOpenKeySelector}
                           className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                         >
                           <Key className="w-4 h-4" />
                           Select API Key
                         </button>
                         <p className="mt-4 text-[10px] text-slate-500 uppercase tracking-widest">
                           Secure • Encrypted • Platform Managed
                         </p>
                       </div>
                     </div>
                   )}
                   {mode === 'image' && (
                        <PromptInput 
                            prompt={imagePrompt}
                            setPrompt={setImagePrompt}
                            references={imageReferences}
                            setReferences={setImageReferences}
                            categorizedReferences={categorizedReferences}
                            setCategorizedReferences={setCategorizedReferences}
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
                            isRelayMode={isVideoRelay}
                            setIsRelayMode={setIsVideoRelay}
                            relayFrames={videoRelayFrames}
                            setRelayFrames={setVideoRelayFrames}
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

                    <div className="flex-1 min-w-0 flex flex-col min-h-[500px] lg:h-full">
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
