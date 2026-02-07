
import { GoogleGenAI, Type } from "@google/genai";
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ImageModel, VideoModel, EditModel, GeminiModelType } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelName = (modelType: GeminiModelType): string => {
    return modelType === 'gemini-3-pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
};

const getPowerDescription = (power: number): string => {
  const descriptions: { [key: number]: string } = {
    1: "Minimalist technical brief.",
    2: "Standard prompt enhancement.",
    3: "Detailed professional architecture.",
    4: "Hyper-detailed technical specification with deep anatomy and lighting locks.",
    5: "Ultimate precision: Complex layered environment, skeletal locks, and specific material fidelity."
  };
  return descriptions[power] || descriptions[3];
};

const MASTER_ARCHITECTURE_INSTRUCTION = `
# Role: Precision AI Prompt Architect (High-Fidelity Mode)
Transform simple user ideas into massive, technical, and hyper-detailed generation briefs.

# Core Directive:
- SUBJECT: Use extreme anatomical detail. If multiple references are provided, synthesize their common traits to lock physical proportions and style.
- ANATOMY CONSTRAINTS: Explicitly forbid "anatomy normalization". Ensure the model preserves prominent or non-average features.
- POSE & SKELETAL LOCK: Describe exact limb placement and torso torque in skeletal terms.
- CONTROLNET: Suggest OpenPose and MiDaS (Depth) weights.
- CAMERA: Use real lens terminology (50mm, 85mm, anamorphic depth).
- Z-IMAGE RULE: For the cohesive text output, never use "no". Use "without", "free from", "excluding".

# CRITICAL FORMATTING RULE:
DO NOT start any description or field with the name of the target model (e.g., DO NOT write "Nanobanana:", "Midjourney:", "Flux prompt:"). 
Start the "description" fields directly with the content. No headers, no labels, no prefixes inside the JSON values.

# Output Requirement:
You MUST follow the provided JSON schema exactly. Every field should be populated with rich, evocative, and technically accurate strings.
`;

const IMAGE_PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    prompt: {
      type: Type.OBJECT,
      properties: {
        subject: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            anatomy_constraints: { type: Type.STRING }
          },
          required: ["description", "anatomy_constraints"]
        },
        pose: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            skeletal_lock: { type: Type.STRING }
          },
          required: ["description", "skeletal_lock"]
        },
        environment: {
          type: Type.OBJECT,
          properties: {
            setting: { type: Type.STRING },
            elements: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["setting", "elements"]
        },
        camera: {
          type: Type.OBJECT,
          properties: {
            shot_type: { type: Type.STRING },
            perspective: { type: Type.STRING },
            focal_length: { type: Type.STRING },
            depth_of_field: { type: Type.STRING },
            framing: { type: Type.STRING }
          },
          required: ["shot_type", "perspective", "focal_length", "depth_of_field", "framing"]
        },
        lighting: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            direction: { type: Type.STRING },
            quality: { type: Type.STRING },
            shadows: { type: Type.STRING }
          },
          required: ["type", "direction", "quality", "shadows"]
        },
        mood_and_expression: {
          type: Type.OBJECT,
          properties: {
            emotion: { type: Type.STRING },
            facial_features: { type: Type.STRING },
            atmosphere: { type: Type.STRING }
          },
          required: ["emotion", "facial_features", "atmosphere"]
        },
        style_and_realism: {
          type: Type.OBJECT,
          properties: {
            style: { type: Type.STRING },
            fidelity: { type: Type.STRING },
            skin_texture: { type: Type.STRING }
          },
          required: ["style", "fidelity", "skin_texture"]
        },
        colors_and_tone: {
          type: Type.OBJECT,
          properties: {
            palette: { type: Type.STRING },
            contrast: { type: Type.STRING },
            saturation: { type: Type.STRING }
          },
          required: ["palette", "contrast", "saturation"]
        },
        quality_and_technical_details: {
          type: Type.OBJECT,
          properties: {
            resolution: { type: Type.STRING },
            sharpness: { type: Type.STRING },
            noise: { type: Type.STRING }
          },
          required: ["resolution", "sharpness", "noise"]
        },
        aspect_ratio_and_output: {
          type: Type.OBJECT,
          properties: {
            ratio: { type: Type.STRING },
            orientation: { type: Type.STRING }
          },
          required: ["ratio", "orientation"]
        },
        controlnet: {
          type: Type.OBJECT,
          properties: {
            pose_control: {
              type: Type.OBJECT,
              properties: {
                model_type: { type: Type.STRING },
                purpose: { type: Type.STRING },
                constraints: { type: Type.STRING },
                recommended_weight: { type: Type.NUMBER }
              }
            },
            depth_control: {
              type: Type.OBJECT,
              properties: {
                model_type: { type: Type.STRING },
                purpose: { type: Type.STRING },
                constraints: { type: Type.STRING },
                recommended_weight: { type: Type.NUMBER }
              }
            }
          },
          required: ["pose_control", "depth_control"]
        },
        negative_prompt: {
          type: Type.OBJECT,
          properties: {
            forbidden_content: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["forbidden_content"]
        }
      },
      required: [
        "subject", "pose", "environment", "camera", "lighting", 
        "mood_and_expression", "style_and_realism", "colors_and_tone", 
        "quality_and_technical_details", "aspect_ratio_and_output", 
        "controlnet", "negative_prompt"
      ]
    }
  }
};

export const generateEnhancedPrompt = async (
  prompt: string,
  language: 'en' | 'ru',
  targetModel: ImageModel,
  geminiModel: GeminiModelType,
  references: string[],
  power: number
): Promise<EnhancedPrompt> => {
  const modelName = getModelName(geminiModel);
  // Using any[] to bypass strict inferred type checks when mixing Part types
  const parts: any[] = [];
  
  if (references?.length > 0) {
    references.forEach(ref => parts.push(fileToGenerativePart(ref)));
  }
  
  let userInstruction = `${MASTER_ARCHITECTURE_INSTRUCTION}
  
  TASK: Create a technical generation brief for ${targetModel}.
  USER INPUT: "${prompt}". 
  LANGUAGE: Output MUST be in English.
  ENHANCEMENT POWER: ${getPowerDescription(power)}.
  
  Populate every section of the schema with maximum technical density.
  `;

  parts.push({ text: userInstruction });
  const result = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: { responseMimeType: "application/json", responseSchema: IMAGE_PROMPT_SCHEMA }
  });
  return JSON.parse(result.text || "{}");
};

export const reversePromptImage = async (
  imageBase64: string,
  context: string,
  targetModel: ImageModel,
  geminiModel: GeminiModelType
): Promise<EnhancedPrompt> => {
  const modelName = getModelName(geminiModel);
  // Using any[] to allow mixing of inlineData and text parts without type errors
  const parts: any[] = [
    fileToGenerativePart(imageBase64),
    { text: `${MASTER_ARCHITECTURE_INSTRUCTION}\nREVERSE INTERROGATION: Deconstruct this image into the 'Perfect' prompt architecture for ${targetModel}. ${context ? `Context: "${context}"` : ""}` }
  ];
  const result = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: { responseMimeType: "application/json", responseSchema: IMAGE_PROMPT_SCHEMA }
  });
  return JSON.parse(result.text || "{}");
};

export const generateEnhancedVideoPrompt = async (
  prompt: string,
  firstFrameBase64: string | null,
  lastFrameBase64: string | null,
  characterReferencesBase64: string[],
  language: 'en' | 'ru',
  targetModel: VideoModel,
  geminiModel: GeminiModelType,
  power: number
): Promise<EnhancedVideoPrompt> => {
  const modelName = getModelName(geminiModel);
  // Explicitly typing parts as any[] to support multi-modal input parts
  const parts: any[] = [];
  let inputsDescription = "";
  if (characterReferencesBase64?.length > 0) {
      characterReferencesBase64.forEach((base64, index) => {
        parts.push(fileToGenerativePart(base64));
        inputsDescription += `Character Reference Image #${index + 1}. `;
      });
  }
  if (firstFrameBase64) { parts.push(fileToGenerativePart(firstFrameBase64)); inputsDescription += "Start Frame provided. "; }
  if (lastFrameBase64) { parts.push(fileToGenerativePart(lastFrameBase64)); inputsDescription += "End Frame provided. "; }
  if (prompt?.trim()) inputsDescription += `Text Prompt: "${prompt}". `;

  const userInstruction = `Act as a Cinematic Director for ${targetModel}. Create a massive, detailed narrative paragraph for video generation.
  Inputs: ${inputsDescription}
  Target: ${targetModel}
  Enhancement: ${getPowerDescription(power)}
  Language: English.
  
  Describe: Temporal flow, subject action in present tense, camera choreography (panning, tracking, zooming), lighting changes over time, and environmental dynamics (particles, weather, movement).
  `;

  parts.push({ text: userInstruction });
  const result = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          full_prompt: { type: Type.STRING },
          audio_description: { type: Type.STRING },
          model_notes: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(result.text || "{}");
};

export const generateEnhancedEditPrompt = async (
    prompt: string,
    imageBase64: string,
    references: string[],
    language: 'en' | 'ru',
    targetModel: EditModel,
    geminiModel: GeminiModelType,
    power: number
): Promise<EnhancedEditPrompt> => {
    const modelName = getModelName(geminiModel);
    const parts: any[] = [fileToGenerativePart(imageBase64)];
    
    if (references?.length > 0) {
        references.forEach(ref => parts.push(fileToGenerativePart(ref)));
    }

    const editSystemInstruction = `
    # Role: Professional Image Editing Specialist (AI Task Architect)
    # Task: Create a technical EDIT ASSIGNMENT (Задание на редактирование) based on the user's request.
    # Logic: 
    Focus strictly on the TRANSFORMATION of the source image.
    Identify what stays the same (Locks) and what changes (Steps).
    This is for an Inpainting or Img2Img workflow.
    
    # Guidelines:
    1. edit_task_summary: A high-level title for the task (e.g., "Atmospheric Background Replacement").
    2. transformation_logic: Technical explanation of how to alter pixels while maintaining structural integrity.
    3. detailed_execution_steps: Granular instructions for an AI editor.
    4. preservation_locks: Critical list of features from the original that MUST be protected from change.
    5. master_edit_prompt: A cohesive, technical prompt optimized for ${targetModel} edit/inpaint mode.
    6. technical_params: Recommended values for an editing pipeline.
    `;

    parts.push({ text: `${editSystemInstruction}
        User Request: "${prompt}". 
        Enhancement Power: ${getPowerDescription(power)}.
        Analyze the primary source image and any references provided to ensure style consistency.` });

    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    edit_task_summary: { type: Type.STRING },
                    transformation_logic: { type: Type.STRING },
                    detailed_execution_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    preservation_locks: { type: Type.ARRAY, items: { type: Type.STRING } },
                    master_edit_prompt: { type: Type.STRING },
                    negative_edit_constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    technical_params: {
                        type: Type.OBJECT,
                        properties: {
                            inpaint_method: { type: Type.STRING },
                            denoising_target: { type: Type.STRING },
                            consistency_weight: { type: Type.STRING }
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(result.text || "{}");
};

export const refineEnhancedPrompt = async (currentOutput: EnhancedPrompt, refinementInstruction: string, targetModel: ImageModel, geminiModel: GeminiModelType): Promise<EnhancedPrompt> => {
    const modelName = getModelName(geminiModel);
    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: `Current Prompt Data: ${JSON.stringify(currentOutput)}\n\nUSER REQUEST FOR REFINEMENT: "${refinementInstruction}"\n\nApply this refinement while keeping the output detailed and technically rich for ${targetModel}.` }] },
        config: { responseMimeType: "application/json", responseSchema: IMAGE_PROMPT_SCHEMA }
    });
    return JSON.parse(result.text || "{}");
};

export const refineEnhancedVideoPrompt = async (currentOutput: EnhancedVideoPrompt, refinementInstruction: string, targetModel: VideoModel, geminiModel: GeminiModelType): Promise<EnhancedVideoPrompt> => {
    const modelName = getModelName(geminiModel);
    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: `Current Video Brief: ${JSON.stringify(currentOutput)}\n\nREFINEMENT: "${refinementInstruction}"\n\nUpdate the full_prompt to reflect this change.` }] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(result.text || "{}");
};

export const refineEnhancedEditPrompt = async (currentOutput: EnhancedEditPrompt, refinementInstruction: string, targetModel: EditModel, geminiModel: GeminiModelType): Promise<EnhancedEditPrompt> => {
    const modelName = getModelName(geminiModel);
    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: `Current Edit Plan: ${JSON.stringify(currentOutput)}\n\nREFINEMENT: "${refinementInstruction}"` }] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(result.text || "{}");
};

export const superEnhanceVideoPrompt = async (currentOutput: EnhancedVideoPrompt, targetModel: VideoModel, geminiModel: GeminiModelType): Promise<EnhancedVideoPrompt> => {
     const modelName = getModelName(geminiModel);
     const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: `SUPER ENHANCE: Take this video prompt and turn it into an epic, cinematic masterpiece description with extreme detail. JSON: ${JSON.stringify(currentOutput)}` }] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(result.text || "{}");
};

export const superEnhanceImagePrompt = async (currentOutput: EnhancedPrompt, targetModel: ImageModel, geminiModel: GeminiModelType): Promise<EnhancedPrompt> => {
    const modelName = getModelName(geminiModel);
    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: `SUPER ENHANCE: Take this image prompt and exponentially increase the detail in every field. Think about textures, atmospheric scattering, lighting complexity, and artistic depth. JSON: ${JSON.stringify(currentOutput)}` }] },
        config: { responseMimeType: "application/json", responseSchema: IMAGE_PROMPT_SCHEMA }
    });
    return JSON.parse(result.text || "{}");
};

// Helper function to convert base64 image strings into the format required by the GenAI SDK
const fileToGenerativePart = (base64Data: string) => {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType: base64Data.substring(base64Data.indexOf(':') + 1, base64Data.indexOf(';')),
    },
  };
};
