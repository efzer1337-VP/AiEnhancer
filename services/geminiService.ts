
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
    1: "Minimalist brief: Focus on core subject and essential style. Simple, clean, effective.",
    2: "Standard enhancement: Add environmental context, basic lighting, and standard camera framing.",
    3: "Professional architecture: Include technical camera specs (lens, f-stop), layered lighting, and specific textures.",
    4: "Hyper-detailed specification: Deep dive into microscopic details, secondary motion, atmospheric effects, and complex color theory.",
    5: "Extreme creative precision: Absolute maximalist approach. Describe every photon of light, every skin pore, every environmental particle, and the complete philosophical mood of the scene."
  };
  return descriptions[power] || descriptions[3];
};

const MASTER_ARCHITECTURE_INSTRUCTION = `
# Role: Elite AI Prompt Architect & Cinematographer
Transform user concepts into professional-grade, technical blueprints for state-of-the-art AI generation models.

# Core Directive:
- SUBJECT ARCHITECTURE: Describe physical attributes, materials, and anatomical precision (skeletal torque, micro-expressions).
- OPTICAL PRECISION: Use technical photography and cinematography terminology (f-stop, focal length, lens coatings, sensor types like "Arri Alexa" or "Sony A7R V").
- VOLUMETRIC LIGHTING: Specify light sources, Kelvin temperatures, bounce logic, and shadows (Rembrandt lighting, rim light, volumetric haze).
- PHYSICS & MOTION: For video, describe the conservation of momentum, fluid dynamics, and secondary motion (hair, cloth).
- CRITIQUE & REFINE: Internalize a critique of the initial idea—identify gaps in lighting or composition—and fill them with professional detail.
- LANGUAGE: All generated technical content MUST be in English.
- FORMAT: Strictly adhere to the provided JSON schema. No conversational filler.
`;

const MIDJOURNEY_SPECIFIC_INSTRUCTION = `
# Role: Midjourney V6.1 Master Prompt Engineer
# Best Practices for Midjourney V6.1:
- STYLE: Use natural language prose. Avoid "keyword soup".
- PHOTOGRAPHY: Define the camera (e.g., "shot on 35mm film", "Kodak Portra 400"). Use "--style raw" for literalism.
- PARAMETERS: Explicitly use parameters: "--v 6.1", "--ar [ratio]", "--stylize [250-750]", "--chaos [0-10]".
- TEXT: Use "quotation marks" for specific text rendering.
- COMPOSITION: Use terms like "rule of thirds", "low-angle shot", "symmetrical composition".
- AVOID: "Photorealistic", "4k", "hyper-detailed". Instead, describe the texture (e.g., "visible skin pores", "fine fabric weave").
`;

const FLUX_SPECIFIC_INSTRUCTION = `
# Role: FLUX.1 [pro] Prompt Architect
# Best Practices for FLUX.1:
- LANGUAGE: Conversational, descriptive, natural language. Treat it as a direct instruction to an artist.
- CAMERA SPECS: Be hyper-specific about gear (e.g., "Shot on Hasselblad X2D, 80mm f/1.9 lens").
- TEXT RENDERING: Flux is elite at text. Specify font styles and placement in quotes (e.g., "a neon sign saying 'CYBERPUNK' in a bold serif font").
- HIERARCHY: Primary Subject -> Specific Action -> Detailed Environment -> Lighting Conditions -> Technical Aesthetics.
- LENGTH: Aim for 40-70 words of dense, descriptive prose.
- NEGATIVES: Do not use negative prompts. Describe the absence of things positively (e.g., "clean, empty street").
`;

const NANOBANANA_SPECIFIC_INSTRUCTION = `
# Role: Nano Banana [V3] Aesthetic Architect
# Best Practices:
- STYLE: Highly stylized, vibrant, and "hyper-real".
- LIGHTING: Use "neon glows", "cinematic volumetric lighting", and "dramatic highlights".
- COMPOSITION: Wide-angle or close-up macro shots work best.
- TEXT: Enclose in double quotes. Specify the material (e.g., "glowing neon text").
- PROMPT: Use descriptive, sensory-rich language. Focus on "feel" and "glow".
`;

const ZIMAGE_SPECIFIC_INSTRUCTION = `
# Role: Z-Image [Turbo] Precision Engineer
# Best Practices:
- STRUCTURE: Strict hierarchy. Primary Subject -> Secondary Elements -> Background.
- TECHNICAL: Use "Shot on 8k digital cinema camera", "anamorphic lens flare", "high dynamic range".
- TEXTURES: Describe "tactile surfaces", "specular highlights", "micro-reflections".
- POSITIVE ONLY: There is NO negative prompt. Describe the exclusion as a positive presence (e.g., "pristine white background" instead of "no clutter").
`;

const GENERAL_IMAGE_INSTRUCTION = `
# Role: General SD/Vision Model Prompt Architect
# Specialized Structure:
- Detail every aspect of the scene: Subject, pose, environment, lighting, and camera angle.
- Use strong, descriptive keywords and weight them if necessary.
- Separate distinct concepts with commas.
`;

const VEO_SPECIFIC_INSTRUCTION = `
# Role: Google Veo Film Director
# Best Practices for Veo:
- CINEMATOGRAPHY: Describe shots in a sequence. Use "Shot 1: [description]. Shot 2: [description]."
- CAMERA: Explicitly state "Orbit shot", "Whip pan", "Slow dolly zoom (Vertigo effect)".
- AUDIO SYNC: Describe the soundscape in the "audio_direction" field with temporal cues.
- SPECIFICITY: Describe the physics of movement (e.g., "liquid splashing with high surface tension", "cloth fluttering in 15mph wind").
- LENGTH: Veo likes density. Fill the schema with technical jargon.
`;

const KLING_SPECIFIC_INSTRUCTION = `
# Role: Kling 3.0 Cinematic Director
# Best Practices for Kling 3.0:
- MOTION PHYSICS: Describe the weight and gravity. Use verbs like "sprinting", "carefully grasping", "swaying rhythmically".
- CAMERA LANGUAGE: Use "Dolly zoom", "Tracking shot", "Handheld shake", "Rack focus from foreground to background".
- VISUAL FIDELITY: Specify "sub-surface scattering for skin", "ray-traced reflections", "volumetric dust motes".
- SEQUENCE: Describe the shot as a progression: "The subject starts by... then moves toward... finally looking into the lens."
- OUTPUT: The "full_prompt" must be a single, massive, hyper-detailed paragraph (150-300 words).
`;

const SEEDANCE_SPECIFIC_INSTRUCTION = `
# Role: Seedance 2.0 (Dreamina) Multimodal Expert
# Best Practices:
- MULTIMODAL: If references are provided, mention them using "@Image", "@Video", or "@Audio" logic in the description.
- MOTION: Describe the kinetic energy. Use "explosive movement", "slow-motion grace", "fluid transitions".
- LIGHTING: Use "Kelvin temperature (3200K vs 5600K)", "God rays", "cyberpunk neon bounce".
- NARRATIVE: The "full_prompt" must be a massive, cohesive cinematic script paragraph.
`;

const LTX_SPECIFIC_INSTRUCTION = `
# Role: LTX-Video [Ultra] Director
# Best Practices for LTX-Video:
- TEMPORAL CONTINUITY: Focus on the transition of motion. Describe the "start-state" and "end-state".
- CAMERA: Use "Shot on 35mm anamorphic lenses". Specify "slow tracking pan" or "subtle handheld breathing".
- ENVIRONMENT: Describe physical interactions (e.g., "feet crunching on dry leaves", "wind whipping through hair").
- NARRATIVE: Write in a single, flowing, professional paragraph.
- RELAY MODE: If active, ensure precise frame-accurate shot transitions (e.g., "0-120f", "121-240f").
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

const EDIT_NANOBANANA_INSTRUCTION = `
# Role: Nano Banana Image Editor
# Specialized Structure for Nano Banana Editing:
1. FOCUS ON PRESERVATION: Clearly state what must NOT change (e.g., "Keep the background exactly the same. Do not alter the subject's face.").
2. INPAINTING LOGIC: Describe the area to be replaced precisely and seamlessly. Ensure new elements match the existing lighting and style of the original image.
3. AVOID NEGATIVE CONSTRAINTS: Frame your edits positively. Instead of "remove the tree", write "replace the tree with clear blue sky".
`;

const EDIT_ZIMAGE_INSTRUCTION = `
# Role: Z-Image Turbo Inpainting Expert
# Specialized Structure for Z-Image Editing:
1. EXPLICIT CONSTRAINTS: Since Z-Image has no negative prompt, all negative constraints MUST be explicitly stated as positive directions (e.g., "Ensure the background remains clean and unchanged").
2. HIERARCHY OF EDITS: Detail the primary subject edit first, then the blending/lighting matching.
3. HYPER-SPECIFICITY: Use technical terms for any added elements to perfectly match the original plate's resolution and grain.
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
    } else if (targetModel === 'nanobanana') {
      specificInstruction = EDIT_NANOBANANA_INSTRUCTION;
    } else if (targetModel === 'z-image') {
      specificInstruction = EDIT_ZIMAGE_INSTRUCTION;
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
    } else if (targetModel === 'nanobanana') {
      specificInstruction = EDIT_NANOBANANA_INSTRUCTION;
    } else if (targetModel === 'z-image') {
      specificInstruction = EDIT_ZIMAGE_INSTRUCTION;
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
      contents: { parts: [{ text: `SUPER ENHANCE INSTRUCTION: Critically analyze this video prompt's weaknesses. Then rewrite it to drastically maximize cinematic impact, lighting complexity, narrative depth, and realism. Target Model: ${targetModel}.\nCurrent Video Brief: ${JSON.stringify(currentOutput)}.\nReturn updated JSON. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
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
      contents: { parts: [{ text: `${modelInstruction}\nSUPER ENHANCE INSTRUCTION: Critically analyze this image prompt's weaknesses. Then rewrite it to drastically maximize visual impact, lighting complexity, anatomical perfection, and realism. Target Model: ${targetModel}.\nCurrent Prompt: ${JSON.stringify(currentOutput)}.\nReturn updated JSON. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_SCHEMA,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });
    return parseJSONOutput(result.text || "");
  });
};
