
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
    1: "Subtle refinement. Fix grammar and add minimal detail. Keep it simple.",
    2: "Mild enhancement. Improve clarity and add essential visual descriptors.",
    3: "Balanced enhancement. Flesh out the scene with lighting, texture, and mood.",
    4: "Strong enhancement. Add significant creative details, artistic influences, and complex camera directions.",
    5: "Maximum creative expansion. Reimagine the prompt with vivid, intricate, and highly artistic details, creating a masterpiece description."
  };
  return descriptions[power] || descriptions[3];
};

const Z_IMAGE_MASTER_PROMPT = `
# Role: Z-Image Turbo Master Architect
You are an AI specialist designed to convert simple user ideas into high-performance, structured prompts for the Z-Image (S3-DiT) diffusion model.

# Model Intelligence (Z-Image Specifics)
- Z-Image is a single-stream transformer. It follows instructions exceptionally well.
- IMPORTANT: It does NOT use Classifier-Free Guidance (CFG) effectively in its Turbo version. 
- DO NOT use a "negative prompt" box/field for exclusions. 
- All exclusions (e.g., "no watermarks") MUST be written as positive instructions at the end of the prompt.
- The model prefers long, descriptive prompts (80-200 words) in natural language.

# Output Structural Scaffold (MANDATORY FOR Z-IMAGE)
For z-image, generate a single, cohesive paragraph following this sequence:
1. [Shot Type & Subject]: e.g., "A wide-angle full-body shot of a young adult..."
2. [Physical Appearance]: Detailed age, hair, skin, and expression. Always include "adult" for human subjects.
3. [Clothing & Modesty]: Explicitly describe fabric, fit, and coverage (to ensure safety).
4. [Environment & Background]: Specific setting, level of detail, and depth of field.
5. [Lighting]: Cinematic, diffused, rim-lighting, etc.
6. [Technical Specs]: Lens type (e.g., 50mm, 85mm), medium (e.g., realistic photography, oil painting).
7. [Constraints Clause]: A final section starting with "Constraints:" that lists things to avoid (no text, no watermark, no extra limbs, no logos).

# Style Guidelines
- Use natural language, not tag clouds.
- Avoid "poetic" fluff; use descriptive, concrete nouns and adjectives.
- If the user's request is vague, expand it into a rich, high-quality scene.
`;

const LTX2_MASTER_PROMPT = `
# Role: LTX2 Cinematic Director
You are the "LTX2 Cinematic Director," a specialized AI agent that transforms user concepts into high-fidelity, spatio-temporal instructions for the LTX2 video model.

# Model Intelligence: LTX2 (S3-DiT)
- LTX2 generates Video AND Audio simultaneously.
- It interprets prompts as "temporal evolution." 
- For Image-to-Video (I2V) with Start/End frames, the prompt must bridge the gap between Frame A and Frame B.
- It weighs concrete verbs and cinematography terms over "vibe" adjectives.

# Prompting Principles
1. [Shot & Atmosphere]: Establish the lens and lighting (e.g., "35mm anamorphic, golden hour").
2. [The Subject Action]: Use present-tense, physically measurable verbs (e.g., "leans," "rotates," "accelerates").
3. [Camera Choreography]: Define the path—Dolly, Pan, Tilt, Orbit, or Crane.
4. [Environmental Dynamics]: Describe secondary motion (e.g., "dust motes dance," "wind ripples the fabric").
5. [Audio Layer]: Describe the soundscape (e.g., "the low hum of an engine," "crunching gravel").
6. [Temporal Guardrails]: Use keywords like "natural motion blur," "180-degree shutter," and "50fps feel."

# Context Handling: Start & End Images
If the user provides both a Start Image and an End Image, your prompt MUST focus on the TRANSITION:
- "The subject begins in the pose of the first frame and smoothly evolves into the position of the second frame."
- "The camera moves from [Position A] to [Position B] to match the frame perspectives."

# Output Format
Provide a single, continuous paragraph (no bullet points). LTX2 understands flowing narratives better than lists.
`;

const REVERSE_PROMPT_SYSTEM_INSTRUCTION = `
# Role: Image Interrogator & Reverse Prompt Engineer
Analyze the provided image with extreme precision to reverse-engineer a prompt that could recreate it.
Focus on:
1. Subject details (physique, clothing, expressions).
2. Lighting (direction, color, intensity).
3. Composition (shot type, angle, depth of field).
4. Artistic style (medium, textures, period, influences).
5. Technical parameters (lens, film stock, lighting rig).

If user context is provided, prioritize it while maintaining the visual fidelity of the image.
Output must be in the structured JSON format provided.
`;

const fileToGenerativePart = (base64Data: string) => {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType: base64Data.substring(base64Data.indexOf(':') + 1, base64Data.indexOf(';')),
    },
  };
};

const IMAGE_PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    prompt: {
      type: Type.OBJECT,
      properties: {
        core: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "Main subject description" },
            concept: { type: Type.STRING, description: "The overarching concept or action" }
          }
        },
        style: {
          type: Type.OBJECT,
          properties: {
            primary: { type: Type.STRING },
            secondary: { type: Type.STRING },
            mood: { type: Type.STRING },
            artistic_influence: { type: Type.STRING }
          }
        },
        technical: {
          type: Type.OBJECT,
          properties: {
            camera: {
              type: Type.OBJECT,
              properties: {
                shot_type: { type: Type.STRING },
                angle: { type: Type.STRING },
                lens: { type: Type.STRING },
                focus: { type: Type.STRING }
              }
            },
            lighting: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                effect: { type: Type.STRING }
              }
            },
            resolution: {
              type: Type.OBJECT,
              properties: {
                quality: { type: Type.STRING },
                texture: { type: Type.STRING }
              }
            }
          }
        },
        scene_setup: {
          type: Type.OBJECT,
          properties: {
            surface: { type: Type.STRING },
            background: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                color: { type: Type.STRING }
              }
            },
            props: { type: Type.STRING }
          }
        },
        modifications: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              target_area: { type: Type.STRING },
              action: { type: Type.STRING },
              details: {
                type: Type.OBJECT,
                properties: {
                  materials: { type: Type.STRING },
                  architectural_translation: { type: Type.STRING }
                }
              }
            }
          }
        },
        quality: {
          type: Type.OBJECT,
          properties: {
            positive_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            negative_prompt: { type: Type.STRING }
          }
        }
      }
    }
  }
};

// --- IMAGE GENERATION ---

export const generateEnhancedPrompt = async (
  prompt: string,
  language: 'en' | 'ru',
  targetModel: ImageModel,
  geminiModel: GeminiModelType,
  characterReference: string | null,
  compositionReference: string | null,
  power: number
): Promise<EnhancedPrompt> => {
  
  const modelName = getModelName(geminiModel);
  const parts: any[] = [];

  if (characterReference) parts.push(fileToGenerativePart(characterReference));
  if (compositionReference) parts.push(fileToGenerativePart(compositionReference));
  
  let userInstruction = `Enhance this image prompt for ${targetModel}. 
  User Input: "${prompt}". 
  Language: ${language === 'ru' ? 'Russian (Output MUST be in English)' : 'English'}.
  Enhancement Level: ${getPowerDescription(power)}.
  
  ${targetModel === 'z-image' ? Z_IMAGE_MASTER_PROMPT : ""}
  
  ${characterReference ? "An image is provided as a Character Reference. Analyze it and incorporate its key features into the 'subject' description." : ""}
  ${compositionReference ? "An image is provided as a Style/Composition Reference. Analyze it and incorporate its artistic style, angle, and mood into the prompt." : ""}
  `;

  parts.push({ text: userInstruction });

  const result = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: IMAGE_PROMPT_SCHEMA
    }
  });

  return JSON.parse(result.text || "{}");
};

// --- REVERSE PROMPT ---

export const reversePromptImage = async (
  imageBase64: string,
  context: string,
  targetModel: ImageModel,
  geminiModel: GeminiModelType
): Promise<EnhancedPrompt> => {
  const modelName = getModelName(geminiModel);
  const parts = [
    fileToGenerativePart(imageBase64),
    { text: `Reverse-engineer this image for the target model: ${targetModel}. ${context ? `Additional Context: "${context}"` : ""} ${targetModel === 'z-image' ? Z_IMAGE_MASTER_PROMPT : ""}` }
  ];

  const result = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      systemInstruction: REVERSE_PROMPT_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: IMAGE_PROMPT_SCHEMA
    }
  });

  return JSON.parse(result.text || "{}");
};

// --- VIDEO GENERATION ---

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
  const parts: any[] = [];

  let inputsDescription = "";
  
  if (characterReferencesBase64 && characterReferencesBase64.length > 0) {
      characterReferencesBase64.forEach((base64, index) => {
        parts.push(fileToGenerativePart(base64));
        inputsDescription += `Character Reference Image #${index + 1} is provided. `;
      });
  }
  if (firstFrameBase64) {
    parts.push(fileToGenerativePart(firstFrameBase64));
    inputsDescription += "Start Frame is provided. ";
  }
  if (lastFrameBase64) {
    parts.push(fileToGenerativePart(lastFrameBase64));
    inputsDescription += "End Frame is provided. ";
  }
  if (prompt && prompt.trim()) {
    inputsDescription += `Text Prompt: "${prompt}". `;
  } else {
    inputsDescription += "No text prompt provided, rely on images. ";
  }

  const userInstruction = `Create a single continuous narrative paragraph for video generation using ${targetModel}.
  Inputs: ${inputsDescription}
  Language: ${language === 'ru' ? 'Russian (Output MUST be in English)' : 'English'}.
  Enhancement Level: ${getPowerDescription(power)}.
  
  ${targetModel === 'ltx2' ? LTX2_MASTER_PROMPT : `Generate a professional prompt for ${targetModel}. Do not use bullet points or lists. Provide a single, flowing paragraph.`}
  
  If Character References are provided: Maintain subject consistency based on their visual traits.
  If Start/End frames are provided: Focus heavily on the TRANSITION and temporal evolution from Frame A to Frame B.
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
          full_prompt: { type: Type.STRING, description: "A single, continuous paragraph (no bullet points) describing the entire video scene, action, and technical specs." },
          audio_description: { type: Type.STRING, description: "A brief description of the soundscape (integrated or separate)." },
          model_notes: { type: Type.STRING, description: "Any specific model-level technical instructions." }
        }
      }
    }
  });

  return JSON.parse(result.text || "{}");
};


// --- EDIT GENERATION ---

export const generateEnhancedEditPrompt = async (
    prompt: string,
    imageBase64: string,
    language: 'en' | 'ru',
    targetModel: EditModel,
    geminiModel: GeminiModelType,
    power: number
): Promise<EnhancedEditPrompt> => {

    const modelName = getModelName(geminiModel);
    const parts = [
        fileToGenerativePart(imageBase64),
        {
            text: `Analyze this image and the user's edit request to generate a precise instruction for an AI image editor like ${targetModel}.
            User Request: "${prompt}".
            Language: ${language === 'ru' ? 'Russian (Output MUST be in English)' : 'English'}.
            Enhancement Level: ${getPowerDescription(power)}.
            
            ${targetModel === 'z-image' ? Z_IMAGE_MASTER_PROMPT + "\nNote: Adapt the persona to focus on targeted edits while maintaining the Master Architect style." : ""}
            
            Identify the specific area to change. Keep the rest of the image consistent.`
        }
    ];

    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    master_prompt: { type: Type.STRING, description: "The single, most effective command string for the AI editor." },
                    original_image_analysis: {
                        type: Type.OBJECT,
                        properties: {
                            style: { type: Type.STRING },
                            lighting: { type: Type.STRING },
                            subject: { type: Type.STRING },
                            composition: { type: Type.STRING }
                        }
                    },
                    requested_changes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                target_area: { type: Type.STRING },
                                action: { type: Type.STRING },
                                detailed_instruction: { type: Type.STRING }
                            }
                        }
                    },
                    consistency_keywords: {
                        type: Type.OBJECT,
                        properties: {
                            positive: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Elements to strictly preserve" },
                            negative: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Elements to avoid introducing" }
                        }
                    }
                }
            }
        }
    });

    return JSON.parse(result.text || "{}");
};

// --- REFINEMENT & SUPER ENHANCE ---

export const refineEnhancedPrompt = async (
    currentOutput: EnhancedPrompt,
    refinementInstruction: string,
    targetModel: ImageModel,
    geminiModel: GeminiModelType
): Promise<EnhancedPrompt> => {
    const modelName = getModelName(geminiModel);
    const promptText = `Existing Prompt JSON: ${JSON.stringify(currentOutput)}
    
    Refinement Instruction: "${refinementInstruction}"
    Target Model: ${targetModel}
    
    ${targetModel === 'z-image' ? Z_IMAGE_MASTER_PROMPT : ""}
    
    Update the JSON to reflect this instruction. Maintain the same schema. Output strictly JSON.`;

    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: promptText }] },
        config: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.text || "{}");
};

export const refineEnhancedVideoPrompt = async (
    currentOutput: EnhancedVideoPrompt,
    refinementInstruction: string,
    targetModel: VideoModel,
    geminiModel: GeminiModelType
): Promise<EnhancedVideoPrompt> => {
     const modelName = getModelName(geminiModel);
     const promptText = `Existing Video Brief JSON: ${JSON.stringify(currentOutput)}
    
    Refinement Instruction: "${refinementInstruction}"
    Target Model: ${targetModel}

    ${targetModel === 'ltx2' ? LTX2_MASTER_PROMPT : ""}
    
    Update the JSON to reflect this instruction. Ensure it remains a single continuous paragraph. Output strictly JSON.`;

    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: promptText }] },
         config: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.text || "{}");
};

export const refineEnhancedEditPrompt = async (
    currentOutput: EnhancedEditPrompt,
    refinementInstruction: string,
    targetModel: EditModel,
    geminiModel: GeminiModelType
): Promise<EnhancedEditPrompt> => {
    const modelName = getModelName(geminiModel);
    const promptText = `Existing Edit Plan JSON: ${JSON.stringify(currentOutput)}
    
    Refinement Instruction: "${refinementInstruction}"
    Target Model: ${targetModel}

    ${targetModel === 'z-image' ? Z_IMAGE_MASTER_PROMPT : ""}
    
    Update the JSON to reflect this instruction. Maintain the same schema. Output strictly JSON.`;

    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: promptText }] },
         config: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.text || "{}");
};


export const superEnhanceVideoPrompt = async (
    currentOutput: EnhancedVideoPrompt,
    targetModel: VideoModel,
    geminiModel: GeminiModelType
): Promise<EnhancedVideoPrompt> => {
     const modelName = getModelName(geminiModel);
     
     const promptText = `You are a visionary film director. Take this existing video generation prompt and "Super Enhance" it into a masterpiece narrative.
     Target Model: ${targetModel}
     ${targetModel === 'ltx2' ? LTX2_MASTER_PROMPT : ""}
     
     Current Prompt: ${JSON.stringify(currentOutput)}
     
     Your Goal:
     1. Deepen the atmosphere and emotional resonance.
     2. Add extremely specific visual details (textures, micro-movements, lighting nuances).
     3. Ensure the camera work is sophisticated and cinematic.
     4. Make it a single, flowing, continuous paragraph.
     
     Return the result in the exact same JSON schema.`;

     const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: promptText }] },
         config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(result.text || "{}");
};


export const superEnhanceImagePrompt = async (
    currentOutput: EnhancedPrompt,
    targetModel: ImageModel,
    geminiModel: GeminiModelType
): Promise<EnhancedPrompt> => {
    const modelName = getModelName(geminiModel);
    
    const promptText = `You are a world-class art director. Take this existing image prompt and "Super Enhance" it.
     Target Model: ${targetModel}

     ${targetModel === 'z-image' ? Z_IMAGE_MASTER_PROMPT : ""}
     
     Current Prompt: ${JSON.stringify(currentOutput)}
     
     Your Goal:
     1. Elevate the artistic style to be more distinct and cohesive.
     2. Add sophisticated lighting and textural details.
     3. Ensure the composition is dynamic and balanced.
     4. Push the concept to be more unique while preserving the original subject.
     
     Return the result in the exact same JSON schema.`;

    const result = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: promptText }] },
        config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(result.text || "{}");
};
