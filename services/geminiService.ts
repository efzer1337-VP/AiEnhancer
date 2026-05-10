
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ImageModel, VideoModel, EditModel, CategorizedReferences } from '../types';

const FLASH_MODEL = 'gemini-3-flash-preview';

const getAIClient = () => {
  // Поддержка Vite, Node.js (процесс), AI Studio, и localStorage (пользовательский ввод)
  const apiKey = import.meta.env?.VITE_API_KEY || 
                 (typeof process !== 'undefined' && process.env?.API_KEY) || 
                 (window as any).aistudio?.getApiKey?.() || 
                 localStorage.getItem('gemini_api_key') || 
                 '';
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please click 'Set API Key' in the header to provide a valid key.");
  }
  return new GoogleGenAI({ apiKey });
};

const parseJSONOutput = (text: string) => {
  if (!text) return {};
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Model returned invalid JSON format.");
  }
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 800): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message || "";
    const isRetryable = errorMsg.includes('500') ||
      errorMsg.includes('503') ||
      errorMsg.includes('Deadline expired') ||
      errorMsg.includes('UNAVAILABLE') ||
      error.status === 500 ||
      error.status === 503;

    if (retries > 0 && isRetryable) {
      console.warn(`Transient error detected. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

const getPowerDescription = (power: number): string => {
  const descriptions: { [key: number]: string } = {
    1: "Minimalist brief.",
    2: "Standard enhancement.",
    3: "Professional architecture.",
    4: "Hyper-detailed specification.",
    5: "Extreme creative precision."
  };
  return descriptions[power] || descriptions[3];
};

const MASTER_ARCHITECTURE_INSTRUCTION = `
# Role: Precision AI Prompt Architect
Transform user ideas into massive, technical briefs for AI generation models.
# Core Directive:
- SUBJECT: Extreme detail. 
- ANATOMY: skeletal locks, precise torque.
- CAMERA: lens terminology (85mm, anamorphic).
- OUTPUT: All generated content (prompts, descriptions, technical steps, elements, etc.) MUST be strictly in English, even if the user input is in Russian.
- FORMAT: Follow the provided JSON schema exactly.
`;

const MIDJOURNEY_SPECIFIC_INSTRUCTION = `
# Role: Midjourney V6 Master Prompt Engineer
# Specialized Structure for Midjourney V6:
- FORMAT: Write in natural, coherent sentences. DO NOT use keyword stuffing or tag-soup.
- EXPLICITNESS: Clearly describe the subject, action, setting, and mood.
- CAMERA & STYLE: Use parameters like "--style raw" for photorealism. Describe the medium (e.g., oil painting, 35mm photograph).
- AVOID: "Junk" words like "photorealistic", "4k", "8k", "award-winning". These add noise.
- TEXT RENDERING: If text is needed, place it in quotes (e.g., A neon sign that says "Hello World").
- NEGATIVE AVOIDANCE: Avoid contradictory instructions.
`;

const FLUX_SPECIFIC_INSTRUCTION = `
# Role: FLUX.1 Expert Prompt Architect
# Specialized Structure for FLUX.1:
- FORMAT: Natural, descriptive language. Treat the prompt like a description given to a human artist.
- HIERARCHY: [Subject] + [Action/Pose] + [Environment/Setting] + [Lighting] + [Style/Camera/Technical Specs].
- SPECIFICS: Avoid vague adjectives. Be precise about the subject and environment. Use technical photography specs (e.g., "Sony A7R IV, 85mm lens at f/2.8").
- TEXT: FLUX.1 renders text exceptionally well. Quote text clearly (e.g., a sign that says "OPEN").
- LENGTH: Aim for comprehensive but concise (40-50 words per major component).
- NEGATIVES: FLUX.1 does not typically use negative prompts effectively. Focus entirely on describing what you DO want to see.
`;

const NANOBANANA_SPECIFIC_INSTRUCTION = `
# Role: Nano Banana Pro Image Architect
# Specialized Structure for Nano Banana:
- FORMAT: Descriptive, organized, conversational.
- COMPONENTS: Subject + Context/Setting + Style + Composition & Lighting.
- TERMINOLOGY: Use photographic/cinematic terms (e.g., "85mm f/1.2 lens", "creamy bokeh", "dramatic backlighting").
- TEXT RENDERING: Enclose text in quotes and specify the font (e.g., "bold, sans-serif font").
- POSITIVE FRAMING: Describe what you DO want (e.g., "empty street" rather than "no cars"). Do not use negative constraints.
- STYLE: Avoid filler words. Be extremely precise with adjectives.
`;

const ZIMAGE_SPECIFIC_INSTRUCTION = `
# Role: Z-Image Turbo Prompt Engineer
# Specialized Structure for Z-Image:
- FORMAT: Structured, hierarchical descriptions. Do NOT use unstructured or poetic prose.
- ORDER: Subject -> Scene -> Composition -> Lighting -> Style -> Constraints.
- SPECIFICITY: Be hyper-specific (e.g., "27-year-old woman with copper-red hair" instead of "a person").
- PHOTOGRAPHIC: Use technical terms ("85mm lens", "soft diffused daylight", "Kodak Portra 400 film grain").
- NO FILLERS: Strictly avoid buzzwords like "masterpiece", "stunning", "best quality".
- CONSTRAINTS IN POSITIVE: The model has NO negative prompt. You MUST put constraints explicitly in the positive text (e.g., "no text, no watermark, plain background").
`;

const GENERAL_IMAGE_INSTRUCTION = `
# Role: General SD/Vision Model Prompt Architect
# Specialized Structure:
- Detail every aspect of the scene: Subject, pose, environment, lighting, and camera angle.
- Use strong, descriptive keywords and weight them if necessary.
- Separate distinct concepts with commas.
`;

const VEO_SPECIFIC_INSTRUCTION = `
# Role: Google Veo Director
# Specialized Structure for Veo:
- FRAMEWORK: [Cinematography] + [Subject] + [Action] + [Context/Environment] + [Style & Ambiance] + [Audio Cues].
- SPECIFICITY: Be unreasonably specific. Instead of "a woman drinks coffee", use "a close-up of a weary woman in a red hoodie sipping coffee on a foggy balcony at dawn, steam rising".
- CAMERA: Direct the camera explicitly (e.g., "The camera performs a smooth 180-degree arc shot").
- AUDIO: Describe sound effects in separate sentences. DO NOT use quotation marks for dialogue unless you explicitly want subtitles generated on screen.
- LENGTH: Keep the final prompt between 150-300 characters.
- NEGATIVES: Describe what you DO NOT want by using comma-separated exclusions (e.g., "wall, frame") instead of "no wall".
`;

const KLING_SPECIFIC_INSTRUCTION = `
# Role: Kling 3.0 Cinema Director
# Specialized Structure for Kling 3.0:
- FRAMEWORK: [Subject] + [Action] + [Context/Scene] + [Camera Language] + [Lighting/Style].
- MOTION & PHYSICS: Use tangible language. Instead of "moves", describe physics: lens flares, fabric sheen, reflections on wet pavement, smoke curling. Use specific verbs (sprinting, carefully assembling).
- CAMERA: Explicitly use "Dolly zoom", "Panning shot", "Tilt", "Crane shot", "Handheld shake", "Rack focus".
- QUALITY: Include "8K resolution", "hyper-realistic textures", "cinematic lighting", "sub-surface scattering".
- CONCISENESS: Stay within 3-6 sentences (50-100 words).
- OUTPUT: Must be strictly in English.

# Specialized Structure for Kling 3.0:
The output MUST be a single, comprehensive, and highly detailed narrative paragraph in the "full_prompt" field. Do NOT break the description into bullet points.
`;

const SEEDANCE_SPECIFIC_INSTRUCTION = `
# Role: Seedance 2.0 (Dreamina) Multimodal Expert
# Specialized Structure for Seedance 2.0:
1. SCENE ENVIRONMENT: Deep mood and visual context.
2. CAMERA BEHAVIOR: Explicit directional language (Pan, Zoom, Track, Orbit, Dolly, Hold).
3. LIGHTING QUALITY: Specific tone levers (Warm amber, cool blue, soft diffused).
4. MOTION PHYSICS: The kinetic feel (Slow deliberate, high energy rapid cuts).
5. AUDIO DIRECTION: Sonic layer details (ambient music, SFX, ASMR textures).
6. EMOTIONAL TARGET: The viewer's final feeling.

# Directive:
Output MUST be a single, cohesive, massive paragraph in English that weaves these 6 elements into a seamless cinematic script.
`;

const LTX_SPECIFIC_INSTRUCTION = `
# Role: LTX-Video Cinematic Visionary
# Specialized Structure for LTX-Video:
- FRAMEWORK: Shot Establishment -> Scene Setting -> Action Description -> Character Definition -> Camera Movement -> Audio Description.
- SINGLE PARAGRAPH: The output MUST be a single, flowing, cohesive paragraph. NO lists. NO bullet points.
- ACTION: Write in present tense. Describe natural progression. Use active motion verbs (pan, dolly, zoom, tilt) rather than vague words like "dynamic".
- AVOID VIBES: Do NOT use buzzwords like "cinematic", "hyper-realistic", or "amazing". Ground everything in physical reality.
- CAMERA STABILITY: Avoid "handheld chaotic". Prefer "subtle handheld" or "slow dolly".

# Directive:
- The "full_prompt" field MUST contain this entire narrative.
- Focus on temporal consistency.
- Output MUST be in English.
`;

const FLUX_KLEIN_SPECIFIC_INSTRUCTION = `
# Role: FLUX.2 [klein] Narrative Prompt Architect
# Specialized Structure for FLUX.2 [klein]:
1. NARRATIVE PROSE: Write like a novelist. Use descriptive, evocative language rather than just keywords.
2. LIGHTING MASTERY: This is the most critical element. Specify:
   - Source (natural, artificial, ambient)
   - Quality (soft, harsh, diffused, direct)
   - Direction (side, back, overhead, fill)
   - Temperature (warm, cool, golden, blue)
   - Interaction (how it catches, filters, or reflects on surfaces)
3. WORD ORDER: Place the most important elements at the beginning of the prompt.
4. STYLE & MOOD ANNOTATIONS: End the prompt with explicit Style and Mood tags (e.g., "Style: [Style description]. Mood: [Mood description].").
5. TECHNICAL PRECISION: Mention camera settings (e.g., "Shot on 35mm film (Kodak Portra 400) with shallow depth of field").

# Image Editing Directive:
- Describe the transformation in a narrative way.
- Maintain consistency with the original image's lighting and style unless explicitly asked to change them.
- For multi-reference editing, weave elements from all references into a single cohesive scene description.
`;

const IMAGE_PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    prompt: {
      type: Type.OBJECT,
      properties: {
        subject: {
          type: Type.OBJECT,
          properties: { description: { type: Type.STRING }, anatomy_constraints: { type: Type.STRING } },
          required: ["description", "anatomy_constraints"]
        },
        pose: {
          type: Type.OBJECT,
          properties: { description: { type: Type.STRING }, skeletal_lock: { type: Type.STRING } },
          required: ["description", "skeletal_lock"]
        },
        environment: {
          type: Type.OBJECT,
          properties: { setting: { type: Type.STRING }, elements: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["setting", "elements"]
        },
        camera: {
          type: Type.OBJECT,
          properties: { shot_type: { type: Type.STRING }, perspective: { type: Type.STRING }, focal_length: { type: Type.STRING }, depth_of_field: { type: Type.STRING }, framing: { type: Type.STRING } },
          required: ["shot_type", "perspective", "focal_length", "depth_of_field", "framing"]
        },
        lighting: {
          type: Type.OBJECT,
          properties: { type: { type: Type.STRING }, direction: { type: Type.STRING }, quality: { type: Type.STRING }, shadows: { type: Type.STRING } },
          required: ["type", "direction", "quality", "shadows"]
        },
        mood_and_expression: {
          type: Type.OBJECT,
          properties: { emotion: { type: Type.STRING }, facial_features: { type: Type.STRING }, atmosphere: { type: Type.STRING } },
          required: ["emotion", "facial_features", "atmosphere"]
        },
        style_and_realism: {
          type: Type.OBJECT,
          properties: { style: { type: Type.STRING }, fidelity: { type: Type.STRING }, skin_texture: { type: Type.STRING } },
          required: ["style", "fidelity", "skin_texture"]
        },
        colors_and_tone: {
          type: Type.OBJECT,
          properties: { palette: { type: Type.STRING }, contrast: { type: Type.STRING }, saturation: { type: Type.STRING } },
          required: ["palette", "contrast", "saturation"]
        },
        quality_and_technical_details: {
          type: Type.OBJECT,
          properties: { resolution: { type: Type.STRING }, sharpness: { type: Type.STRING }, noise: { type: Type.STRING } },
          required: ["resolution", "sharpness", "noise"]
        },
        aspect_ratio_and_output: {
          type: Type.OBJECT,
          properties: { ratio: { type: Type.STRING }, orientation: { type: Type.STRING } },
          required: ["ratio", "orientation"]
        },
        controlnet: {
          type: Type.OBJECT,
          properties: {
            pose_control: { type: Type.OBJECT, properties: { model_type: { type: Type.STRING }, purpose: { type: Type.STRING }, constraints: { type: Type.STRING }, recommended_weight: { type: Type.NUMBER } } },
            depth_control: { type: Type.OBJECT, properties: { model_type: { type: Type.STRING }, purpose: { type: Type.STRING }, constraints: { type: Type.STRING }, recommended_weight: { type: Type.NUMBER } } }
          },
          required: ["pose_control", "depth_control"]
        },
        negative_prompt: {
          type: Type.OBJECT,
          properties: { forbidden_content: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["forbidden_content"]
        }
      },
      required: ["subject", "pose", "environment", "camera", "lighting", "mood_and_expression", "style_and_realism", "colors_and_tone", "quality_and_technical_details", "aspect_ratio_and_output", "controlnet", "negative_prompt"]
    }
  }
};

const VIDEO_PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    full_prompt: { type: Type.STRING },
    general_scene_prompt: { type: Type.STRING },
    scene_setup: {
      type: Type.OBJECT,
      properties: {
        environment: { type: Type.STRING },
        time_and_weather: { type: Type.STRING },
        atmosphere: { type: Type.STRING }
      },
      required: ["environment", "time_and_weather", "atmosphere"]
    },
    subjects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          actions: { type: Type.STRING },
          expressions: { type: Type.STRING },
          clothing_and_textures: { type: Type.STRING }
        },
        required: ["description", "actions", "expressions", "clothing_and_textures"]
      }
    },
    motion_dynamics: {
      type: Type.OBJECT,
      properties: {
        physics_and_fluidity: { type: Type.STRING },
        pacing_and_speed: { type: Type.STRING },
        dynamic_elements: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["physics_and_fluidity", "pacing_and_speed", "dynamic_elements"]
    },
    camera_direction: {
      type: Type.OBJECT,
      properties: {
        movement: { type: Type.STRING },
        shot_type: { type: Type.STRING },
        perspective: { type: Type.STRING },
        lens_and_focus: { type: Type.STRING }
      },
      required: ["movement", "shot_type", "perspective", "lens_and_focus"]
    },
    lighting_and_color: {
      type: Type.OBJECT,
      properties: {
        setup: { type: Type.STRING },
        color_grading: { type: Type.STRING },
        shadow_play: { type: Type.STRING }
      },
      required: ["setup", "color_grading", "shadow_play"]
    },
    audio_direction: {
      type: Type.OBJECT,
      properties: {
        sound_design: { type: Type.STRING },
        ambient_textures: { type: Type.STRING },
        music_mood: { type: Type.STRING }
      },
      required: ["sound_design", "ambient_textures", "music_mood"]
    },
    negative_constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
    model_notes: { type: Type.STRING }
  },
  required: ["full_prompt", "general_scene_prompt", "scene_setup", "subjects", "motion_dynamics", "camera_direction", "lighting_and_color", "audio_direction", "negative_constraints"]
};

const EDIT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    edit_task_summary: { type: Type.STRING },
    transformation_logic: { type: Type.STRING },
    detailed_execution_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    preservation_locks: { type: Type.ARRAY, items: { type: Type.STRING } },
    master_edit_prompt: { type: Type.STRING },
    negative_edit_constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
    technical_params: { type: Type.OBJECT, properties: { inpaint_method: { type: Type.STRING }, denoising_target: { type: Type.STRING }, consistency_weight: { type: Type.STRING } } }
  },
  required: ["edit_task_summary", "transformation_logic", "detailed_execution_steps", "preservation_locks", "master_edit_prompt", "technical_params"]
};

const fileToGenerativePart = (base64Data: string) => {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType: base64Data.substring(base64Data.indexOf(':') + 1, base64Data.indexOf(';')),
    },
  };
};

export const generateEnhancedPrompt = async (
  prompt: string,
  language: 'en' | 'ru',
  targetModel: ImageModel,
  references: string[],
  power: number,
  categorizedReferences?: CategorizedReferences
): Promise<EnhancedPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    const parts: any[] = [];

    // Add main references
    if (references?.length > 0) {
      references.forEach(ref => parts.push(fileToGenerativePart(ref)));
    }

    // Add categorized references and build context
    let categorizedContext = "";
    if (categorizedReferences) {
      if (categorizedReferences.characters.length > 0) {
        categorizedContext += "\nCHARACTERS: Use attached character references for identity control.";
        categorizedReferences.characters.forEach(ref => parts.push(fileToGenerativePart(ref)));
      }
      if (categorizedReferences.composition.length > 0) {
        categorizedContext += "\nCOMPOSITION: Use attached layout/composition references for framing and perspective.";
        categorizedReferences.composition.forEach(ref => parts.push(fileToGenerativePart(ref)));
      }
      if (categorizedReferences.scene.length > 0) {
        categorizedContext += "\nSCENE: Use attached environment/scene references for background and atmosphere.";
        categorizedReferences.scene.forEach(ref => parts.push(fileToGenerativePart(ref)));
      }
      if (categorizedReferences.style.length > 0) {
        categorizedContext += "\nSTYLE: Use attached style references for aesthetic and texture guidance.";
        categorizedReferences.style.forEach(ref => parts.push(fileToGenerativePart(ref)));
      }
    }

    let modelInstruction = GENERAL_IMAGE_INSTRUCTION;
    if (targetModel === 'midjourney') {
      modelInstruction = MIDJOURNEY_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'flux') {
      modelInstruction = FLUX_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'nanobanana') {
      modelInstruction = NANOBANANA_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'z-image') {
      modelInstruction = ZIMAGE_SPECIFIC_INSTRUCTION;
    }

    parts.push({ text: `${MASTER_ARCHITECTURE_INSTRUCTION}\n${modelInstruction}\nTASK: Generation brief for ${targetModel}.\nINPUT: "${prompt}" (Language: ${language === 'en' ? 'English' : 'Russian'}).\nENHANCEMENT: ${getPowerDescription(power)}.\n${categorizedContext}\nIMPORTANT: EVERY TEXT FIELD IN JSON MUST BE IN ENGLISH.` });

    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const reversePromptImage = async (imageBase64: string, context: string, targetModel: ImageModel): Promise<EnhancedPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    let modelInstruction = GENERAL_IMAGE_INSTRUCTION;
    if (targetModel === 'midjourney') {
      modelInstruction = MIDJOURNEY_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'flux') {
      modelInstruction = FLUX_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'nanobanana') {
      modelInstruction = NANOBANANA_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'z-image') {
      modelInstruction = ZIMAGE_SPECIFIC_INSTRUCTION;
    }

    const parts: any[] = [fileToGenerativePart(imageBase64), { text: `${MASTER_ARCHITECTURE_INSTRUCTION}\n${modelInstruction}\nREVERSE INTERROGATION for ${targetModel}. ${context ? `Context: "${context}"` : ""}\nIMPORTANT: OUTPUT MUST BE IN ENGLISH.` }];
    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const generateEnhancedVideoPrompt = async (
  prompt: string,
  firstFrameBase64: string | null,
  lastFrameBase64: string | null,
  characterReferencesBase64: string[],
  language: 'en' | 'ru',
  targetModel: VideoModel,
  power: number,
  isRelayMode: boolean = false,
  relayFrames: number = 240
): Promise<EnhancedVideoPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    const parts: any[] = [];
    if (characterReferencesBase64?.length > 0) { characterReferencesBase64.forEach(base64 => parts.push(fileToGenerativePart(base64))); }
    if (firstFrameBase64) parts.push(fileToGenerativePart(firstFrameBase64));
    if (lastFrameBase64) parts.push(fileToGenerativePart(lastFrameBase64));

    let instruction = "";
    if (targetModel === 'kling') {
      instruction = KLING_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'seedance') {
      instruction = SEEDANCE_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'ltx') {
      instruction = LTX_SPECIFIC_INSTRUCTION;
      if (isRelayMode) {
        instruction += `
# PROMPT RELAY MODE (LTX-Video 2.3):
The user wants a "Prompt Relay" output. 
- You MUST split the total frame length (${relayFrames} frames) into logically separated shots/segments.
- Format each segment as: "[StartFrame]-[EndFrame]f [Detailed Prompt]".
- Each prompt must be a single cohesive shot description.
- Ensure the total frame count adds up to ${relayFrames}.
- Output the split prompt into the "full_prompt" field.
- IMPORTANT: You MUST also provide a cohesive, overarching description of the whole scene in the "general_scene_prompt" field.
- Example output for "full_prompt":
  0-90f The camera focuses tightly...
  90-161f The camera smoothly pulls back...
  162-240f The camera locks into...
`;
      }
    } else if (targetModel === 'veo') {
      instruction = VEO_SPECIFIC_INSTRUCTION;
    } else {
      instruction = "Director's script focus.";
    }

    const detailInstruction = `
# ULTRA-DETAILED VIDEO ARCHITECTURE DIRECTIVE:
- SCENE SETUP: Describe the microscopic details of the environment (dust motes, scratches on surfaces, humidity in the air).
- SUBJECTS: For every subject, describe their micro-expressions, the specific weave of their clothing, and the exact trajectory of their limbs.
- MOTION DYNAMICS: Describe the secondary motion (hair blowing, clothes rippling, debris flying).
- CAMERA: Describe the lens artifacts (lens flare, chromatic aberration, grain).
- LIGHTING: Describe the bounce light, the temperature in Kelvin, and the specific shadows cast by small objects.
- AUDIO: Describe the layered soundscape (low-frequency hums, sharp transients, spatial positioning).
`;

    parts.push({ text: `${instruction}\n${detailInstruction}\nTASK: Video generation brief for ${targetModel}${isRelayMode ? ' in RELAY MODE' : ''}.\nENHANCEMENT: ${getPowerDescription(power)}.\nPROMPT: "${prompt}".\nIMPORTANT: OUTPUT MUST BE IN ENGLISH.\nOutput MUST be JSON.` });

    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: VIDEO_PROMPT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const generateEnhancedEditPrompt = async (prompt: string, imageBase64: string, references: string[], language: 'en' | 'ru', targetModel: EditModel, power: number): Promise<EnhancedEditPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    const parts: any[] = [fileToGenerativePart(imageBase64)];
    if (references?.length > 0) { references.forEach(ref => parts.push(fileToGenerativePart(ref))); }

    let specificInstruction = "";
    if (targetModel === 'flux_klein') {
      specificInstruction = FLUX_KLEIN_SPECIFIC_INSTRUCTION;
    }

    parts.push({
      text: `
      ${specificInstruction}
      # ROLE: Technical Edit Assignment Architect.
      # TASK: Produce a technical assignment ("Задание на редактирование") for ${targetModel}.
      # INPUT: "${prompt}". 
      # POWER: ${getPowerDescription(power)}.
      # IMPORTANT: OUTPUT MUST BE IN ENGLISH.
      `});

    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: EDIT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const refineEnhancedPrompt = async (currentOutput: EnhancedPrompt, refinementInstruction: string, targetModel: ImageModel): Promise<EnhancedPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    let modelInstruction = GENERAL_IMAGE_INSTRUCTION;
    if (targetModel === 'midjourney') {
      modelInstruction = MIDJOURNEY_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'flux') {
      modelInstruction = FLUX_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'nanobanana') {
      modelInstruction = NANOBANANA_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'z-image') {
      modelInstruction = ZIMAGE_SPECIFIC_INSTRUCTION;
    }

    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts: [{ text: `${modelInstruction}\nCurrent Prompt JSON: ${JSON.stringify(currentOutput)}\nREFINE: "${refinementInstruction}" for ${targetModel}. Maintain schema. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const refineEnhancedVideoPrompt = async (currentOutput: EnhancedVideoPrompt, refinementInstruction: string, targetModel: VideoModel): Promise<EnhancedVideoPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    let specificInstruction = "";
    if (targetModel === 'kling') {
      specificInstruction = KLING_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'seedance') {
      specificInstruction = SEEDANCE_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'ltx') {
      specificInstruction = LTX_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'veo') {
      specificInstruction = VEO_SPECIFIC_INSTRUCTION;
    }
    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts: [{ text: `${specificInstruction}\nCurrent Video Brief: ${JSON.stringify(currentOutput)}\nREFINE: "${refinementInstruction}". Return updated JSON. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: VIDEO_PROMPT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const refineEnhancedEditPrompt = async (currentOutput: EnhancedEditPrompt, refinementInstruction: string, targetModel: EditModel): Promise<EnhancedEditPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    let specificInstruction = "";
    if (targetModel === 'flux_klein') {
      specificInstruction = FLUX_KLEIN_SPECIFIC_INSTRUCTION;
    }
    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts: [{ text: `${specificInstruction}\nCurrent Edit Task: ${JSON.stringify(currentOutput)}\nREFINEMENT REQUEST: "${refinementInstruction}". IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: EDIT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const superEnhanceVideoPrompt = async (currentOutput: EnhancedVideoPrompt, targetModel: VideoModel): Promise<EnhancedVideoPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts: [{ text: `SUPER ENHANCE narrative depth: ${JSON.stringify(currentOutput)}. Return JSON. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: VIDEO_PROMPT_SCHEMA,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};

export const superEnhanceImagePrompt = async (currentOutput: EnhancedPrompt, targetModel: ImageModel): Promise<EnhancedPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    let modelInstruction = GENERAL_IMAGE_INSTRUCTION;
    if (targetModel === 'midjourney') {
      modelInstruction = MIDJOURNEY_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'flux') {
      modelInstruction = FLUX_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'nanobanana') {
      modelInstruction = NANOBANANA_SPECIFIC_INSTRUCTION;
    } else if (targetModel === 'z-image') {
      modelInstruction = ZIMAGE_SPECIFIC_INSTRUCTION;
    }

    const result = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts: [{ text: `${modelInstruction}\nSUPER ENHANCE technical fidelity: ${JSON.stringify(currentOutput)}. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_SCHEMA,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};
