
import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';
import type { VideoModel } from '../types';

interface VideoPromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  language: 'en' | 'ru';
  setLanguage: (language: 'en' | 'ru') => void;
  firstFrame: string | null;
  setFirstFrame: (frame: string | null) => void;
  lastFrame: string | null;
  setLastFrame: (frame: string | null) => void;
  videoModel: VideoModel;
  setVideoModel: (model: VideoModel) => void;
  enhancementPower: number;
  setEnhancementPower: (power: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const videoModels: { id: VideoModel; name: string }[] = [
  { id: 'veo', name: 'VEO' },
  { id: 'wan', name: 'Wan' },
  { id: 'grok', name: 'Grok' },
];

const powerLabels: { [key: number]: string } = {
  1: 'Subtle',
  2: 'Mild',
  3: 'Balanced',
  4: 'Strong',
  5: 'Max Creative',
};

const VideoImageDropzone: React.FC<{
  title: string;
  image: string | null;
  setImage: (image: string | null) => void;
  isLoading: boolean;
}> = ({ title, image, setImage, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files);
    }
  };
  
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  return (
    <div
      className={`relative w-full border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors flex flex-col justify-center items-center h-28 ${dragActive ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-blue-500'}`}
      onClick={() => fileInputRef.current?.click()}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files)}
        disabled={isLoading}
      />
      {image ? (
        <>
          <img src={image} alt={`${title} preview`} className="max-h-full max-w-full object-contain rounded-md" />
          <button
            onClick={handleRemoveImage}
            className="absolute top-1 right-1 bg-gray-900/70 hover:bg-red-600/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-all transform hover:scale-110 focus:outline-none z-10"
            aria-label={`Remove ${title}`}
          >
            &times;
          </button>
        </>
      ) : (
         <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <ImageIcon className="w-6 h-6 mb-1" />
          <p className="font-semibold text-gray-300 text-sm">{title}</p>
        </div>
      )}
    </div>
  );
};

export const VideoPromptInput: React.FC<VideoPromptInputProps> = ({
  prompt,
  setPrompt,
  language,
  setLanguage,
  firstFrame,
  setFirstFrame,
  lastFrame,
  setLastFrame,
  videoModel,
  setVideoModel,
  enhancementPower,
  setEnhancementPower,
  onGenerate,
  isLoading,
}) => {
  const isGenerateDisabled = isLoading || !firstFrame || (!lastFrame && !prompt.trim());
  const placeholderText = firstFrame && lastFrame
    ? (language === 'en' ? 'Optionally, describe the transition...' : 'Опционально, опишите переход...')
    : (language === 'en' ? 'e.g., a car driving through a neon city at night' : 'например, машина едет по ночному неоновому городу');


  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-2xl flex flex-col gap-4 h-full">
      <h2 className="text-2xl font-semibold text-gray-100">Your Video Idea</h2>

      <div className="grid grid-cols-2 gap-4">
        <VideoImageDropzone 
          title="First Frame"
          image={firstFrame}
          setImage={setFirstFrame}
          isLoading={isLoading}
        />
        <VideoImageDropzone 
          title="Last Frame"
          image={lastFrame}
          setImage={setLastFrame}
          isLoading={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label htmlFor="enhancement-power-video" className="text-gray-400">Power of Enhance:</label>
          <span className="text-blue-400 font-semibold">{powerLabels[enhancementPower]}</span>
        </div>
        <input
          id="enhancement-power-video"
          type="range"
          min="1"
          max="5"
          step="1"
          value={enhancementPower}
          onChange={(e) => setEnhancementPower(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          disabled={isLoading}
        />
      </div>
      
       <div className="flex flex-col gap-2">
        <label className="text-gray-400">Target Model:</label>
        <div className="grid grid-cols-3 gap-2">
          {videoModels.map((model) => (
            <button
              key={model.id}
              onClick={() => setVideoModel(model.id)}
              className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                videoModel === model.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label htmlFor="language" className="text-gray-400">Prompt Language:</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'ru')}
          className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="en">English</option>
          <option value="ru">Russian</option>
        </select>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholderText}
        className="w-full flex-grow p-4 bg-gray-900 border border-gray-600 rounded-lg text-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-colors"
        disabled={isLoading}
      />

      <button
        onClick={onGenerate}
        disabled={isGenerateDisabled}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:transform-none"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <SparklesIcon className="w-6 h-6" />
            Enhance Video Prompt
          </>
        )}
      </button>
    </div>
  );
};
