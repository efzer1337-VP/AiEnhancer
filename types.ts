
export type AppMode = 'image' | 'video' | 'edit';
export type ImageModel = 'midjourney' | 'nanobanana' | 'flux' | 'z-image';
export type VideoModel = 'veo' | 'ltx2' | 'grok';
export type EditModel = 'nanobanana' | 'z-image';
export type GeminiModelType = 'gemini-3-flash' | 'gemini-3-pro';

// --- IMAGE PROMPT TYPES (New PERFECT Schema) ---

export interface PromptSubject {
  description: string;
  anatomy_constraints: string;
}

export interface PromptPose {
  description: string;
  skeletal_lock: string;
}

export interface PromptEnvironment {
  setting: string;
  elements: string[];
}

export interface PromptCamera {
  shot_type: string;
  perspective: string;
  focal_length: string;
  depth_of_field: string;
  framing: string;
}

export interface PromptLighting {
  type: string;
  direction: string;
  quality: string;
  shadows: string;
}

export interface PromptMood {
  emotion: string;
  facial_features: string;
  atmosphere: string;
}

export interface PromptStyle {
  style: string;
  fidelity: string;
  skin_texture: string;
}

export interface PromptColors {
  palette: string;
  contrast: string;
  saturation: string;
}

export interface PromptTechnical {
  resolution: string;
  sharpness: string;
  noise: string;
}

export interface PromptOutput {
  ratio: string;
  orientation: string;
}

export interface ControlNetConfig {
  model_type: string;
  purpose: string;
  constraints: string;
  recommended_weight: number;
}

export interface PromptControlNet {
  pose_control: ControlNetConfig;
  depth_control: ControlNetConfig;
}

export interface PromptNegative {
  forbidden_content: string[];
}

export interface PromptObject {
  subject: PromptSubject;
  pose: PromptPose;
  environment: PromptEnvironment;
  camera: PromptCamera;
  lighting: PromptLighting;
  mood_and_expression: PromptMood;
  style_and_realism: PromptStyle;
  colors_and_tone: PromptColors;
  quality_and_technical_details: PromptTechnical;
  aspect_ratio_and_output: PromptOutput;
  controlnet: PromptControlNet;
  negative_prompt: PromptNegative;
}

export interface EnhancedPrompt {
  prompt: PromptObject;
}

// --- VIDEO PROMPT TYPES ---

export interface EnhancedVideoPrompt {
  full_prompt: string;
  audio_description?: string;
  model_notes?: string;
}

// --- EDIT PROMPT TYPES ---

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
  geminiModel?: GeminiModelType;
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
  firstFrame?: string | null;
  lastFrame?: string | null;
  characterReferences?: string[];
}

export interface HistoryItemEdit extends HistoryItemBase {
  type: 'edit';
  model: EditModel;
  output: EnhancedEditPrompt;
  sourceImage: string;
}

export type HistoryItem = HistoryItemImage | HistoryItemVideo | HistoryItemEdit;
