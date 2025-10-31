
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


// --- ENHANCED VIDEO PROMPT TYPES (VEO META-FRAMEWORK) ---

interface MultiPromptConcept {
  concept: string; // e.g., "cat", "astronaut"
  weight: number; // e.g., 2, 1
}

export interface EnhancedVideoPrompt {
  prompt_type: string; // e.g., "[SCENE]"
  style: {
    primary_style: string; // e.g., "Cinematic"
    secondary_style: string; // e.g., "8K RAW photo"
    artistic_influence: string; // e.g., "in the style of Wes Anderson"
    color_palette: string; // e.g., "Vibrant neon colors", "Monochromatic"
  };
  subject: {
    full_description: string; // The complete subject string with weighting, e.g., "a majestic ((lion)) with a golden mane"
    multi_prompts: MultiPromptConcept[]; // For blending concepts, e.g., [{ concept: 'cat', weight: 2 }, { concept: 'astronaut', weight: 1 }]
  };
  action: string;
  environment: string;
  composition: {
    shot_type: string; // e.g., "Wide Angle Shot", "Close-up"
    camera_angle: string; // e.g., "Low angle", "Aerial view"
    camera_movement: string; // e.g., "Dolly zoom", "Time-lapse"
  };
  lighting: {
    style: string; // e.g., "Cinematic Lighting", "Golden Hour"
    effect: string; // e.g., "Volumetric rays", "Lens flare"
  };
  parameters: {
    aspect_ratio: string; // e.g., "16:9"
    negative_prompt: string; // e.g., "blurry, grainy, watermark"
    seed: number | null;
    stylize: number | null; // --s
    chaos: number | null; // --c
    quality: string | null; // --q, e.g., "0.5", "1"
    weird: number | null; // --weird
    tile: boolean; // --tile
  };
  final_prompt: string;
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
}

export interface HistoryItemEdit extends HistoryItemBase {
  type: 'edit';
  model: EditModel;
  output: EnhancedEditPrompt;
  sourceImage: string;
}

export type HistoryItem = HistoryItemImage | HistoryItemVideo | HistoryItemEdit;
