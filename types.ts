
export type AppMode = 'image' | 'video' | 'edit';
export type ImageModel = 'midjourney' | 'nanobanana' | 'flux' | 'z-image';
export type VideoModel = 'veo' | 'ltx' | 'seedance' | 'kling';
export type EditModel = 'nanobanana' | 'z-image' | 'flux_klein';

// --- IMAGE PROMPT TYPES ---

export interface CategorizedReferences {
  characters: string[];
  composition: string[];
  scene: string[];
  style: string[];
}

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

export interface VideoSceneSetup {
  environment: string;
  time_and_weather: string;
  atmosphere: string;
}

export interface VideoSubject {
  description: string;
  actions: string;
  expressions: string;
  clothing_and_textures: string;
}

export interface VideoMotion {
  physics_and_fluidity: string;
  pacing_and_speed: string;
  dynamic_elements: string[];
}

export interface VideoCamera {
  movement: string;
  shot_type: string;
  perspective: string;
  lens_and_focus: string;
}

export interface VideoLighting {
  setup: string;
  color_grading: string;
  shadow_play: string;
}

export interface VideoAudio {
  sound_design: string;
  ambient_textures: string;
  music_mood: string;
}

export interface EnhancedVideoPrompt {
  full_prompt: string;
  general_scene_prompt: string;
  scene_setup: VideoSceneSetup;
  subjects: VideoSubject[];
  motion_dynamics: VideoMotion;
  camera_direction: VideoCamera;
  lighting_and_color: VideoLighting;
  audio_direction: VideoAudio;
  negative_constraints: string[];
  model_notes?: string;
}

// --- EDIT PROMPT TYPES (Refocused on "Task/Assignment") ---

export interface EnhancedEditPrompt {
  edit_task_summary: string;           // Concise title of the edit assignment
  transformation_logic: string;       // How the original image is converted to the target
  detailed_execution_steps: string[]; // Technical step-by-step for the editor/AI
  preservation_locks: string[];       // What MUST NOT change (facials, lighting, background)
  master_edit_prompt: string;         // The final enhanced prompt string for editing
  negative_edit_constraints: string[]; // What to avoid adding or changing
  technical_params: {
      inpaint_method: string;
      denoising_target: string;
      consistency_weight: string;
  };
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
  references?: string[];
  categorizedReferences?: CategorizedReferences;
}

export interface HistoryItemVideo extends HistoryItemBase {
  type: 'video';
  model: VideoModel;
  output: EnhancedVideoPrompt;
  firstFrame?: string | null;
  lastFrame?: string | null;
  characterReferences?: string[];
  isRelayMode?: boolean;
  relayFrames?: number;
}

export interface HistoryItemEdit extends HistoryItemBase {
  type: 'edit';
  model: EditModel;
  output: EnhancedEditPrompt;
  sourceImage: string;
  references?: string[];
}

export type HistoryItem = HistoryItemImage | HistoryItemVideo | HistoryItemEdit;
