import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { VideoPromptInput } from './components/VideoPromptInput';
import { EditPromptInput } from './components/EditPromptInput';
import { OutputDisplay } from './components/OutputDisplay';
import { HistorySidebar } from './components/HistorySidebar';
import { generateEnhancedPrompt, generateEnhancedVideoPrompt, generateEnhancedEditPrompt, refineEnhancedPrompt, refineEnhancedVideoPrompt, refineEnhancedEditPrompt, superEnhanceVideoPrompt, superEnhanceImagePrompt } from './services/geminiService';
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ViewMode, ImageModel, VideoModel, EditModel, HistoryItem } from './types';

export type AppMode = 'image' | 'video' | 'edit';

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
  const [characterReference, setCharacterReference] = useState<string | null>(null);
  const [compositionReference, setCompositionReference] = useState<string | null>(null);
  const [imageModel, setImageModel] = useState<ImageModel>('midjourney');
  const [imageOutput, setImageOutput] = useState<EnhancedPrompt | null>(null);

  // Video-specific state
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [videoModel, setVideoModel] = useState<VideoModel>('veo');
  const [videoOutput, setVideoOutput] = useState<EnhancedVideoPrompt | null>(null);

  // Edit-specific state
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editModel, setEditModel] = useState<EditModel>('nanobanana');
  const [editOutput, setEditOutput] = useState<EnhancedEditPrompt | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const resetAllOutputs = () => {
    setImageOutput(null);
    setVideoOutput(null);
    setEditOutput(null);
    setActiveHistoryId(null);
  };

  const handleImageGenerate = useCallback(async () => {
    if (!imagePrompt.trim() && !characterReference && !compositionReference) {
      setError('Please enter a prompt or provide at least one reference image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    resetAllOutputs();
    try {
      const result = await generateEnhancedPrompt(imagePrompt, language, imageModel, characterReference, compositionReference, enhancementPower);
      setImageOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'image',
        simplePrompt: imagePrompt,
        language,
        model: imageModel,
        output: result,
        characterReference,
        compositionReference,
        enhancementPower,
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [imagePrompt, language, imageModel, characterReference, compositionReference, enhancementPower]);

  const handleVideoGenerate = useCallback(async () => {
    if (!firstFrame) {
      setError('Please upload a first frame image.');
      return;
    }
    if (!lastFrame && !videoPrompt.trim()) {
      setError('Please enter a prompt if you are not providing a last frame.');
      return;
    }

    setIsLoading(true);
    setError(null);
    resetAllOutputs();
    try {
      const result = await generateEnhancedVideoPrompt(videoPrompt, firstFrame, lastFrame, language, videoModel, enhancementPower);
      setVideoOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'video',
        simplePrompt: videoPrompt,
        language,
        model: videoModel,
        output: result,
        firstFrame: firstFrame,
        lastFrame: lastFrame,
        enhancementPower,
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate video prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [videoPrompt, firstFrame, lastFrame, language, videoModel, enhancementPower]);
  
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
      const result = await generateEnhancedEditPrompt(editPrompt, editImage, language, editModel, enhancementPower);
      setEditOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'edit',
        simplePrompt: editPrompt,
        language,
        model: editModel,
        output: result,
        sourceImage: editImage,
        enhancementPower,
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveHistoryId(newHistoryItem.id);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate edit prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [editPrompt, editImage, language, editModel, enhancementPower]);

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
          setHistory(prev => prev.map(item => 
            (item.id === activeHistoryId && item.type === 'video') ? { ...item, output: newOutput } : item
          ));
        }
      } else if (mode === 'image' && imageOutput) {
        const newOutput = await superEnhanceImagePrompt(imageOutput, imageModel);
        setImageOutput(newOutput);

        if (activeHistoryId) {
          setHistory(prev => prev.map(item => 
            (item.id === activeHistoryId && item.type === 'image') ? { ...item, output: newOutput } : item
          ));
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(`Failed to super-enhance prompt. ${e.message || 'Please try again.'}`);
    } finally {
      setIsSuperEnhancing(false);
    }
  }, [mode, videoOutput, videoModel, imageOutput, imageModel, activeHistoryId]);
  
  const handleSelectHistory = useCallback((id: string) => {
    const item = history.find(h => h.id === id);
    if (!item) return;

    setError(null);
    setMode(item.type);
    setLanguage(item.language);
    setActiveHistoryId(item.id);
    setEnhancementPower(item.enhancementPower ?? 3);
    
    // Reset all inputs and outputs before setting the active one
    setImagePrompt(''); setImageOutput(null); setCharacterReference(null); setCompositionReference(null);
    setVideoPrompt(''); setVideoOutput(null); setFirstFrame(null); setLastFrame(null);
    setEditPrompt(''); setEditOutput(null); setEditImage(null);

    if (item.type === 'image') {
      setImagePrompt(item.simplePrompt);
      setImageModel(item.model);
      setImageOutput(item.output);
      setCharacterReference(item.characterReference || null);
      setCompositionReference(item.compositionReference || null);
    } else if (item.type === 'video') {
      setVideoPrompt(item.simplePrompt);
      setVideoModel(item.model);
      setVideoOutput(item.output);
      setFirstFrame(item.firstFrame);
      setLastFrame(item.lastFrame || null);
    } else if (item.type === 'edit') {
      setEditPrompt(item.simplePrompt);
      setEditModel(item.model);
      setEditOutput(item.output);
      setEditImage(item.sourceImage);
    }
  }, [history]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setActiveHistoryId(null);
    setImagePrompt('');
    setImageOutput(null);
    setCharacterReference(null);
    setCompositionReference(null);
    setVideoPrompt('');
    setVideoOutput(null);
    setFirstFrame(null);
    setLastFrame(null);
    setEditPrompt('');
    setEditOutput(null);
    setEditImage(null);
    setError(null);
    setEnhancementPower(3);
  }, []);

  const currentOutput = mode === 'image' ? imageOutput : mode === 'video' ? videoOutput : editOutput;

  const renderInput = () => {
    switch(mode) {
      case 'image':
        return <PromptInput
          prompt={imagePrompt}
          setPrompt={setImagePrompt}
          characterReference={characterReference}
          setCharacterReference={setCharacterReference}
          compositionReference={compositionReference}
          setCompositionReference={setCompositionReference}
          language={language}
          setLanguage={setLanguage}
          imageModel={imageModel}
          setImageModel={setImageModel}
          enhancementPower={enhancementPower}
          setEnhancementPower={setEnhancementPower}
          onGenerate={handleImageGenerate}
          isLoading={isLoading}
        />;
      case 'video':
        return <VideoPromptInput
          prompt={videoPrompt}
          setPrompt={setVideoPrompt}
          language={language}
          setLanguage={setLanguage}
          firstFrame={firstFrame}
          setFirstFrame={setFirstFrame}
          lastFrame={lastFrame}
          setLastFrame={setLastFrame}
          videoModel={videoModel}
          setVideoModel={setVideoModel}
          enhancementPower={enhancementPower}
          setEnhancementPower={setEnhancementPower}
          onGenerate={handleVideoGenerate}
          isLoading={isLoading}
        />;
      case 'edit':
        return <EditPromptInput
          prompt={editPrompt}
          setPrompt={setEditPrompt}
          language={language}
          setLanguage={setLanguage}
          sourceImage={editImage}
          setSourceImage={setEditImage}
          editModel={editModel}
          setEditModel={setEditModel}
          enhancementPower={enhancementPower}
          setEnhancementPower={setEnhancementPower}
          onGenerate={handleEditGenerate}
          isLoading={isLoading}
        />
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-300 bg-[#02040a] relative overflow-hidden selection:bg-indigo-500/30">
        {/* Sophisticated Ambient Light - Increased opacity slightly for separation */}
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/15 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
        <div className="fixed top-[20%] right-[-10%] w-[40%] h-[60%] bg-violet-900/15 rounded-full blur-[180px] pointer-events-none mix-blend-screen" />
        <div className="fixed bottom-[-20%] left-[20%] w-[60%] h-[50%] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
        
        {/* Main Content Container */}
        <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 h-screen flex flex-col">
            <Header mode={mode} setMode={setMode} />
            
            <div className="mt-6 flex-grow grid grid-cols-1 lg:grid-cols-[260px_1fr_1fr] xl:grid-cols-[300px_minmax(500px,1fr)_minmax(500px,1fr)] gap-6 h-full min-h-0">
                {/* History - Hidden on mobile, visible on LG+ */}
                <div className="hidden lg:block h-full min-h-0">
                   <HistorySidebar
                        history={history}
                        activeId={activeHistoryId}
                        onSelect={handleSelectHistory}
                        onClear={handleClearHistory}
                    />
                </div>

                {/* Input Panel */}
                <div className="flex flex-col h-full min-h-0">
                    {renderInput()}
                </div>

                {/* Output Panel */}
                <div className="flex flex-col h-full min-h-0">
                    <OutputDisplay
                        output={currentOutput}
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
        </div>
    </div>
  );
};

export default App;