
export type ImageModel = 'midjourney' | 'nanobanana' | 'flux' | 'wan';
export type VideoModel = 'veo' | 'wan' | 'grok';
export type EditModel = 'nanobanana' | 'wan';

// --- NEW ENHANCED IMAGE PROMPT TYPES ---

interface PromptCore {
  subject: string;
  concept: string;
}

interface PromptStyle {
  primary: string;
  secondary: string;
  mood: string;
  artistic_influence: string;
}

interface PromptCamera {
  shot_type: string;
  angle: string;
  lens: string;
  focus: string;
}

interface PromptLighting {
  source: string;
  effect: string;
}

interface PromptResolution {
  quality: string;
  texture: string;
}

interface PromptTechnical {
  camera: PromptCamera;
  lighting: PromptLighting;
  resolution: PromptResolution;
}

interface PromptBackground {
  type: string;
  description: string;
  color: string;
}

interface PromptSceneSetup {
  surface: string;
  background: PromptBackground;
  props: string;
}

interface ModificationDetails {
  materials: string;
  architectural_translation: string;
}

interface PromptModification {
  target_area: string;
  action: string;
  details: ModificationDetails;
}

interface PromptQuality {
  positive_keywords: string[];
  negative_prompt: string;
}

interface PromptObject {
  core: PromptCore;
  style: PromptStyle;
  technical: PromptTechnical;
  scene_setup: PromptSceneSetup;
  modifications: PromptModification[];
  quality: PromptQuality;
}

export interface EnhancedPrompt {
  prompt: PromptObject;
}


// --- ENHANCED VIDEO PROMPT TYPES (VEO SHOT BRIEF) ---

export interface EnhancedVideoPrompt {
  description: string;
  style: string;
  camera: string;
  lighting: string;
  environment: string;
  elements: string[];
  motion: string;
  ending: string;
  text: string;
  audio: string;
  keywords: string[];
}


// --- ENHANCED EDIT PROMPT TYPES ---

interface OriginalImageAnalysis {
  style: string;
  lighting: string;
  subject: string;
  composition: string;
}

interface RequestedChange {
  target_area: string;
  action: string;
  detailed_instruction: string;
}

interface ConsistencyKeywords {
  positive: string[];
  negative: string[];
}

export interface EnhancedEditPrompt {
  master_prompt: string;
  original_image_analysis: OriginalImageAnalysis;
  requested_changes: RequestedChange[];
  consistency_keywords: ConsistencyKeywords;
}


export type ViewMode = 'text' | 'json';


// --- HISTORY TYPES ---
export interface HistoryItemBase {
  id: string;
  simplePrompt: string;
  language: 'en' | 'ru';
  enhancementPower?: number;
}

export interface HistoryItemImage extends HistoryItemBase {
  type: 'image';
  model: ImageModel;
  output: EnhancedPrompt;
  characterReference?: string | null;
  compositionReference?: string | null;
}

export interface HistoryItemVideo extends HistoryItemBase {
  type: 'video';
  model: VideoModel;
  output: EnhancedVideoPrompt;
  firstFrame: string;
  lastFrame?: string | null;
}

export interface HistoryItemEdit extends HistoryItemBase {
  type: 'edit';
  model: EditModel;
  output: EnhancedEditPrompt;
  sourceImage: string;
}

export type HistoryItem = HistoryItemImage | HistoryItemVideo | HistoryItemEdit;