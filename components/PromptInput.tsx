
import React, { useRef, useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { ImageModel } from '../types';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  referenceImage: string | null;
  setReferenceImage: (image: string | null) => void;
  language: 'en' | 'ru';
  setLanguage: (language: 'en' | 'ru') => void;
  imageModel: ImageModel;
  setImageModel: (model: ImageModel) => void;
  enhancementPower: number;
  setEnhancementPower: (power: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const imageModels: { id: ImageModel; name: string }[] = [
  { id: 'midjourney', name: 'Midjourney' },
  { id: 'nanobanana', name: 'NanoBanana' },
  { id: 'flux', name: 'Flux' },
  { id: 'wan', name: 'Wan' },
];

const powerLabels: { [key: number]: string } = {
  1: 'Subtle',
  2: 'Mild',
  3: 'Balanced',
  4: 'Strong',
  5: 'Max Creative',
};

export const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  setPrompt,
  referenceImage,
  setReferenceImage,
  language,
  setLanguage,
  imageModel,
  setImageModel,
  enhancementPower,
  setEnhancementPower,
  onGenerate,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setReferenceImage(e.target?.result as string);
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

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-2xl flex flex-col gap-4 h-full">
      <h2 className="text-2xl font-semibold text-gray-100">Your Idea</h2>
      
      <div 
        className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragActive ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-blue-500'}`}
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
        {referenceImage ? (
          <img src={referenceImage} alt="Reference image preview" className="mx-auto max-h-24 rounded-md" />
        ) : (
          <p className="text-gray-400">
            {dragActive ? 'Drop image here' : 'Optionally, click or drag & drop a reference image'}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label htmlFor="enhancement-power" className="text-gray-400">Power of Enhance:</label>
          <span className="text-blue-400 font-semibold">{powerLabels[enhancementPower]}</span>
        </div>
        <input
          id="enhancement-power"
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

      <div className="flex items-center gap-4">
        <label htmlFor="language" className="text-gray-400">Language:</label>
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
      <div className="flex flex-col gap-2">
        <label className="text-gray-400">Target Model:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {imageModels.map((model) => (
            <button
              key={model.id}
              onClick={() => setImageModel(model.id)}
              className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                imageModel === model.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>
       <p className="text-sm text-center text-gray-500 -mb-2">
          {referenceImage ? 'Describe what to do with the image, or leave blank to just enhance it.' : 'Describe your idea in text and/or upload an image to start.'}
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={language === 'en' ? 'e.g., a cat astronaut in space' : 'например, кот-астронавт в космосе'}
        className="w-full flex-grow h-24 p-4 bg-gray-900 border border-gray-600 rounded-lg text-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-colors"
        disabled={isLoading}
      />
      <button
        onClick={onGenerate}
        disabled={isLoading || (!prompt.trim() && !referenceImage)}
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
            <SparklesIcon className="w-6 h-6