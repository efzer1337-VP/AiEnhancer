
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { VideoPromptInput } from './components/VideoPromptInput';
import { EditPromptInput } from './components/EditPromptInput';
import { OutputDisplay } from './components/OutputDisplay';
import { HistorySidebar } from './components/HistorySidebar';
import { generateEnhancedPrompt, generateEnhancedVideoPrompt, generateEnhancedEditPrompt, refineEnhancedPrompt, refineEnhancedVideoPrompt, refineEnhancedEditPrompt } from './services/geminiService';
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ViewMode, ImageModel, VideoModel, EditModel, HistoryItem } from './types';

export type AppMode = 'image' | 'video' | 'edit';

const App: React.FC = () => {
  // Common state
  const [mode, setMode] = useState<AppMode>('image');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
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
    if (!videoPrompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (!firstFrame) {
      setError('Please upload a first frame image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    resetAllOutputs();
    try {
      const result = await generateEnhancedVideoPrompt(videoPrompt, firstFrame, language, videoModel, enhancementPower);
      setVideoOutput(result);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        type: 'video',
        simplePrompt: videoPrompt,
        language,
        model: videoModel,
        output: result,
        firstFrame: firstFrame,
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
  }, [videoPrompt, firstFrame, language, videoModel, enhancementPower]);
  
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
      
      // Update history if an item was being refined
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
    setVideoPrompt(''); setVideoOutput(null); setFirstFrame(null);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900/50 font-sans">
      <div className="container mx-auto px-4 py-8">
        <Header mode={mode} setMode={setMode} />
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[350px_1fr] gap-8">
          <HistorySidebar
            history={history}
            activeId={activeHistoryId}
            onSelect={handleSelectHistory}
            onClear={handleClearHistory}
          />
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {renderInput()}
            <OutputDisplay
              output={currentOutput}
              isLoading={isLoading}
              isRefining={isRefining}
              error={error}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onRefine={handleRefine}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
