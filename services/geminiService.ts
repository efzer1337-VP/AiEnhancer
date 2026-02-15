
import { GoogleGenAI, Type } from "@google/genai";
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ImageModel, VideoModel, EditModel } from '../types';

const FLASH_MODEL = 'gemini-3-flash-preview';

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set. Please select an API key via the interface.");
  }
  return new GoogleGenAI({ apiKey });
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message || "";
    const isRetryable = errorMsg.includes('503') || 
                        errorMsg.includes('Deadline expired') || 
                        errorMsg.includes('UNAVAILABLE') ||
                        error.status === 503;
    
    if (retries > 0 && isRetryable) {
      console.warn(`Transient error detected (503/Timeout). Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
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

const KLING_SPECIFIC_INSTRUCTION = `
# Role: Kling 3.0 Cinema Director
Specialized in Kling 3.0's structural requirements.
- FRAMEWORK: [Subject] + [Action] + [Environment] + [Camera].
- MOTION: Describe intensity and fluidness of movement.
- COHERENCE: Emphasize physical consistency and temporal logic.
- CAMERA: Explicitly use "Dolly zoom", "Panning shot", "Tilt", "Crane shot".
- QUALITY: Include "8K resolution", "hyper-realistic textures", "cinematic lighting".
- OUTPUT: Must be strictly in English.
`;

const SEEDANCE_SPECIFIC_INSTRUCTION = `
# Role: Seedance 2.0 (Dreamina) Multimodal Expert
# Specialized Structure for Seedance 2.0:
1. SCENE ENVIRONMENT: Start with deep mood and visual context (e.g., opulent study vs clinical studio).
2. CAMERA BEHAVIOR: Explicit directional language (Pan, Zoom, Track, Orbit, Dolly, Hold).
3. LIGHTING QUALITY: Specific tone levers (Warm amber, cool blue, soft diffused, hard directional).
4. MOTION PHYSICS: The kinetic feel (Slow deliberate, high energy rapid cuts, gentle fluid).
5. AUDIO DIRECTION: Sonic layer details (Deep voiceover, ambient music, SFX, ASMR textures).
6. EMOTIONAL TARGET: The viewer's final feeling (Aspiration, craving, confidence, calm).

# High-Quality Reference Styles:
- Luxury: Dim illumination, mahogany, golden halo light, cinematic zoom, resonant voiceover.
- Energy: State-of-the-art gym, low-angle ground shots, pulsating beats, sweat particle effects.
- ASMR: Rustic cafe, morning sunlight, steam physics, manual bean grinding SFX, cozy amber tones.
- Tech: Futuristic lab, neon accents, holographic displays, click/whoosh feedback, sleek minimalist.

# Directive:
Output MUST be a single, cohesive, massive paragraph in English that weaves these 6 elements into a seamless cinematic script.
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
    audio_description: { type: Type.STRING },
    model_notes: { type: Type.STRING }
  },
  required: ["full_prompt"]
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

export const generateEnhancedPrompt = async (prompt: string, language: 'en' | 'ru', targetModel: ImageModel, references: string[], power: number): Promise<EnhancedPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    const parts: any[] = [];
    if (references?.length > 0) { references.forEach(ref => parts.push(fileToGenerativePart(ref))); }
    parts.push({ text: `${MASTER_ARCHITECTURE_INSTRUCTION}\nTASK: Generation brief for ${targetModel}.\nINPUT: "${prompt}" (Language: ${language === 'en' ? 'English' : 'Russian'}).\nENHANCEMENT: ${getPowerDescription(power)}.\nIMPORTANT: EVERY TEXT FIELD IN JSON MUST BE IN ENGLISH.` });
    
    const result = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: { parts }, 
      config: { 
        responseMimeType: "application/json", 
        responseSchema: IMAGE_PROMPT_SCHEMA
      } 
    });
    return JSON.parse(result.text || "{}");
  });
};

export const reversePromptImage = async (imageBase64: string, context: string, targetModel: ImageModel): Promise<EnhancedPrompt> => {
  return withRetry(async () => {
    const ai = getAIClient();
    const parts: any[] = [fileToGenerativePart(imageBase64), { text: `${MASTER_ARCHITECTURE_INSTRUCTION}\nREVERSE INTERROGATION for ${targetModel}. ${context ? `Context: "${context}"` : ""}\nIMPORTANT: OUTPUT MUST BE IN ENGLISH.` }];
    const result = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: { parts }, 
      config: { 
        responseMimeType: "application/json", 
        responseSchema: IMAGE_PROMPT_SCHEMA
      } 
    });
    return JSON.parse(result.text || "{}");
  });
};

export const generateEnhancedVideoPrompt = async (prompt: string, firstFrameBase64: string | null, lastFrameBase64: string | null, characterReferencesBase64: string[], language: 'en' | 'ru', targetModel: VideoModel, power: number): Promise<EnhancedVideoPrompt> => {
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
    } else {
      instruction = "Director's script focus.";
    }
    
    parts.push({ text: `${instruction}\nTASK: Video generation brief for ${targetModel}.\nENHANCEMENT: ${getPowerDescription(power)}.\nPROMPT: "${prompt}".\nIMPORTANT: OUTPUT MUST BE IN ENGLISH.\nOutput MUST be JSON.` });
    
    const result = await ai.models.generateContent({ 
      model: FLASH_MODEL, 
      contents: { parts }, 
      config: { 
        responseMimeType: "application/json", 
        responseSchema: VIDEO_PROMPT_SCHEMA
      } 
    });
    return JSON.parse(result.text || "{}");
  });
};

export const generateEnhancedEditPrompt = async (prompt: string, imageBase64: string, references: string[], language: 'en' | 'ru', targetModel: EditModel, power: number): Promise<EnhancedEditPrompt> => {
    return withRetry(async () => {
      const ai = getAIClient();
      const parts: any[] = [fileToGenerativePart(imageBase64)];
      if (references?.length > 0) { references.forEach(ref => parts.push(fileToGenerativePart(ref))); }

      parts.push({ text: `
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
              responseSchema: EDIT_SCHEMA
          }
      });
      return JSON.parse(result.text || "{}");
    });
};

export const refineEnhancedPrompt = async (currentOutput: EnhancedPrompt, refinementInstruction: string, targetModel: ImageModel): Promise<EnhancedPrompt> => {
    return withRetry(async () => {
      const ai = getAIClient();
      const result = await ai.models.generateContent({
          model: FLASH_MODEL,
          contents: { parts: [{ text: `Current Prompt JSON: ${JSON.stringify(currentOutput)}\nREFINE: "${refinementInstruction}" for ${targetModel}. Maintain schema. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
          config: { 
              responseMimeType: "application/json", 
              responseSchema: IMAGE_PROMPT_SCHEMA
          }
      });
      return JSON.parse(result.text || "{}");
    });
};

export const refineEnhancedVideoPrompt = async (currentOutput: EnhancedVideoPrompt, refinementInstruction: string, targetModel: VideoModel): Promise<EnhancedVideoPrompt> => {
    return withRetry(async () => {
      const ai = getAIClient();
      const result = await ai.models.generateContent({
          model: FLASH_MODEL,
          contents: { parts: [{ text: `Current Video Brief: ${JSON.stringify(currentOutput)}\nREFINE: "${refinementInstruction}". Return updated JSON. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
          config: { 
              responseMimeType: "application/json", 
              responseSchema: VIDEO_PROMPT_SCHEMA
          }
      });
      return JSON.parse(result.text || "{}");
    });
};

export const refineEnhancedEditPrompt = async (currentOutput: EnhancedEditPrompt, refinementInstruction: string, targetModel: EditModel): Promise<EnhancedEditPrompt> => {
    return withRetry(async () => {
      const ai = getAIClient();
      const result = await ai.models.generateContent({
          model: FLASH_MODEL,
          contents: { parts: [{ text: `Current Edit Task: ${JSON.stringify(currentOutput)}\nREFINEMENT REQUEST: "${refinementInstruction}". IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
          config: { 
              responseMimeType: "application/json", 
              responseSchema: EDIT_SCHEMA
          }
      });
      return JSON.parse(result.text || "{}");
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
      return JSON.parse(result.text || "{}");
     });
};

export const superEnhanceImagePrompt = async (currentOutput: EnhancedPrompt, targetModel: ImageModel): Promise<EnhancedPrompt> => {
    return withRetry(async () => {
      const ai = getAIClient();
      const result = await ai.models.generateContent({
          model: FLASH_MODEL,
          contents: { parts: [{ text: `SUPER ENHANCE technical fidelity: ${JSON.stringify(currentOutput)}. IMPORTANT: ALL TEXT MUST REMAIN IN ENGLISH.` }] },
          config: { 
              responseMimeType: "application/json", 
              responseSchema: IMAGE_PROMPT_SCHEMA, 
              thinkingConfig: { thinkingBudget: 1024 } 
          }
      });
      return JSON.parse(result.text || "{}");
    });
};
