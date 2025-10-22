
import { GoogleGenAI, Type } from "@google/genai";
import type { EnhancedPrompt, EnhancedVideoPrompt, EnhancedEditPrompt, ImageModel, VideoModel, EditModel } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getPowerDescription = (power: number): string => {
  const descriptions: { [key: number]: string } = {
    1: "This generation should have a **subtle enhancement**. Stick very closely to the user's original idea with minimal additions.",
    2: "This generation should have a **mild enhancement**. Add some detail but keep the core concept simple and direct.",
    3: "This generation should have a **balanced enhancement**. Elaborate on the user's idea with creative details while preserving the original intent.",
    4: "This generation should have a **strong enhancement**. Be very creative and introduce complex visual elements and concepts inspired by the user's idea.",
    5: "This generation should have a **maximum creative enhancement**. Radically transform the user's idea into a masterpiece of complexity and visual storytelling. Take significant artistic liberties.",
  };
  return descriptions[power] || descriptions[3];
};


// --- IMAGE PROMPT GENERATION ---

const imageResponseSchema = {
  type: Type.OBJECT,
  properties: {
    prompt: {
      type: Type.OBJECT,
      description: "The root object containing all prompt details.",
      properties: {
        core: {
          type: Type.OBJECT,
          description: "The fundamental subject and concept of the image.",
          properties: {
            subject: { type: Type.STRING, description: 'A hyperrealistic, extremely detailed description of the main subject.' },
            concept: { type: Type.STRING, description: 'The overall concept, scene, and mood of the image.' },
          },
          required: ['subject', 'concept']
        },
        style: {
          type: Type.OBJECT,
          description: "Artistic and stylistic elements.",
          properties: {
            primary: { type: Type.STRING, description: 'The primary artistic style, e.g., "Photorealistic Macro Photography".' },
            secondary: { type: Type.STRING, description: 'Secondary styles or mediums, e.g., "Culinary Art".' },
            mood: { type: Type.STRING, description: 'The emotional tone and atmosphere.' },
            artistic_influence: { type: Type.STRING, description: 'Specific artists, movements, or media influences.' },
          },
          required: ['primary', 'secondary', 'mood', 'artistic_influence']
        },
        technical: {
          type: Type.OBJECT,
          description: "Cinematographic and photographic details.",
          properties: {
            camera: {
              type: Type.OBJECT,
              properties: {
                shot_type: { type: Type.STRING },
                angle: { type: Type.STRING },
                lens: { type: Type.STRING },
                focus: { type: Type.STRING },
              },
              required: ['shot_type', 'angle', 'lens', 'focus']
            },
            lighting: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                effect: { type: Type.STRING },
              },
              required: ['source', 'effect']
            },
            resolution: {
              type: Type.OBJECT,
              properties: {
                quality: { type: Type.STRING },
                texture: { type: Type.STRING },
              },
              required: ['quality', 'texture']
            },
          },
          required: ['camera', 'lighting', 'resolution']
        },
        scene_setup: {
          type: Type.OBJECT,
          description: "Details about the environment and props.",
          properties: {
            surface: { type: Type.STRING, description: 'The surface the scene is on.' },
            background: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                color: { type: Type.STRING },
              },
              required: ['type', 'description', 'color']
            },
            props: { type: Type.STRING, description: 'Supporting props in the scene.' },
          },
          required: ['surface', 'background', 'props']
        },
        modifications: {
          type: Type.ARRAY,
          description: "Specific, detailed instructions for constructing or altering parts of the subject.",
          items: {
            type: Type.OBJECT,
            properties: {
              target_area: { type: Type.STRING },
              action: { type: Type.STRING },
              details: {
                type: Type.OBJECT,
                properties: {
                  materials: { type: Type.STRING },
                  architectural_translation: { type: Type.STRING },
                },
                required: ['materials', 'architectural_translation']
              },
            },
            required: ['target_area', 'action', 'details']
          }
        },
        quality: {
          type: Type.OBJECT,
          description: "Keywords for controlling the final output quality.",
          properties: {
            positive_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            negative_prompt: { type: Type.STRING },
          },
          required: ['positive_keywords', 'negative_prompt']
        },
      },
      required: ['core', 'style', 'technical', 'scene_setup', 'modifications', 'quality']
    }
  },
  required: ['prompt']
};


export const generateEnhancedPrompt = async (
  simplePrompt: string,
  language: 'en' | 'ru',
  model: ImageModel,
  imageBase64?: string | null,
  enhancementPower: number = 3
): Promise<EnhancedPrompt> => {
  try {
    const modelNameMapping = {
      midjourney: 'Midjourney',
      nanobanana: 'NanoBanana (Google Gemini Image)',
      flux: 'Flux (Stable Diffusion 3)',
      wan: 'Wan (a cinematic and anime-focused model)'
    };
    const targetModelName = modelNameMapping[model];
    const powerDescription = getPowerDescription(enhancementPower);

    const systemInstruction = `You are a world-class AI prompt engineer, a master of visual storytelling. Your task is to transform a user's input (which can be a text idea in ${language === 'ru' ? 'Russian' : 'English'}, a reference image, or both) into an exceptionally detailed, structured JSON object. This prompt is specifically tailored for the **${targetModelName}** image generator. ${powerDescription} If an image is provided, analyze its subject, style, composition, and lighting as a base. If a text prompt is also given, use it to modify or enhance the elements from the image. Your output MUST be a JSON object in English, adhering strictly to the provided, deeply nested schema. Every field must be filled with rich, specific, and creative details derived from your analysis and the user's instructions. You must think like a combination of a professional photographer, a cinematographer, and a renowned artist.`;

    let contents: any;

    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/[a-z]+);base64,(.*)$/);
      if (!match) {
        throw new Error("Invalid base64 image format.");
      }
      const mimeType = match[1];
      const data = match[2];
      const imagePart = { inlineData: { mimeType, data } };
      
      let textPrompt;
      if (simplePrompt.trim()) {
        textPrompt = `The user's idea is (in ${language === 'ru' ? 'Russian' : 'English'}): "${simplePrompt}". Use the provided image as a strong visual reference. The generated prompt should describe a new, enhanced image that is heavily inspired by or a variation of the provided image, guided by the text prompt.`;
      } else {
        textPrompt = `Analyze the provided image and generate a detailed, enhanced prompt that captures and elevates its essence. The user has not provided any text, so your analysis of the image is the primary input.`;
      }
      
      const textPart = { text: textPrompt };
      contents = { parts: [imagePart, textPart] };
    } else {
      contents = `Here is the user's idea: "${simplePrompt}"`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: imageResponseSchema,
        temperature: 0.9,
        topP: 0.95,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedPrompt;

  } catch (error) {
    console.error("Error calling Gemini API for image prompt:", error);
    throw new Error("Failed to get a valid response from the AI model.");
  }
};

export const refineEnhancedPrompt = async (
  currentPrompt: EnhancedPrompt,
  refinementRequest: string,
  model: ImageModel
): Promise<EnhancedPrompt> => {
   try {
    const modelNameMapping = {
      midjourney: 'Midjourney',
      nanobanana: 'NanoBanana (Google Gemini Image)',
      flux: 'Flux (Stable Diffusion 3)',
      wan: 'Wan (a cinematic and anime-focused model)'
    };
    const targetModelName = modelNameMapping[model];

    const systemInstruction = `You are an AI assistant that refines detailed JSON prompts for the **${targetModelName}** image generator. You will be given a JSON object representing the current prompt and a user's request for modification. Your task is to apply the modification and return a new, valid JSON object that strictly adheres to the original schema. Do not add any explanatory text, just output the modified JSON. Ensure the refinement logically integrates with the existing prompt details.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Here is the current JSON prompt: ${JSON.stringify(currentPrompt)}. Here is the user's request: "${refinementRequest}".`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: imageResponseSchema,
        temperature: 0.8,
      },
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedPrompt;
  } catch (error) {
    console.error("Error calling Gemini API for image prompt refinement:", error);
    throw new Error("Failed to refine the prompt.");
  }
};


// --- VIDEO PROMPT GENERATION ---

const videoResponseSchema = {
  type: Type.OBJECT,
  properties: {
    prompt: { type: Type.STRING, description: "A masterfully crafted, coherent paragraph combining all key details into a single, powerful prompt for advanced video generation models. This should be a single block of text that can be used directly." },
    style: {
      type: Type.OBJECT,
      description: "Detailed breakdown of the visual and artistic style.",
      properties: {
        type: { type: Type.STRING, description: "The type of animation or video style, e.g., '2D animation', 'cinematic live-action'." },
        aesthetic: { type: Type.STRING, description: "The overall aesthetic, e.g., 'folk-art illustration', 'cyberpunk noir'." },
        look_and_feel: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Descriptive keywords for the mood, e.g., ['whimsical', 'dreamlike', 'textured']." },
        artistic_references: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific artists or styles to reference, e.g., ['petroglyph art', 'Studio Ghibli']." },
      },
      required: ['type', 'aesthetic', 'look_and_feel', 'artistic_references']
    },
    scene_elements: {
      type: Type.OBJECT,
      description: "Detailed breakdown of all elements within the scene.",
      properties: {
        setting: { type: Type.STRING, description: "A vivid description of the environment, background, and location." },
        characters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name or identifier for the character." },
              description: { type: Type.STRING, description: "A detailed description of the character's appearance, clothing, and key features." }
            },
            required: ['name', 'description']
          },
          description: "An array of all characters or key animated objects in the scene."
        }
      },
      required: ['setting', 'characters']
    },
    sequence: {
      type: Type.ARRAY,
      description: "A shot-by-shot breakdown of the video's action and camera work.",
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING, description: "The time frame for this part of the sequence, e.g., '0-4 seconds'." },
          action: { type: Type.STRING, description: "A description of the action and events that occur in this time frame." },
          camera: { type: Type.STRING, description: "A description of the camera shot, angle, and movement. Use cinematography terms." }
        },
        required: ['time', 'action', 'camera']
      }
    },
    color_palette: {
      type: Type.OBJECT,
      description: "A detailed description of the color scheme and lighting.",
      properties: {
        overall: { type: Type.STRING, description: "An overall description of the color mood, e.g., 'Muted, harmonious, and earthy'." },
        dominant_colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of the primary colors used." },
        accent_colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of secondary or accent colors." },
        lighting: { type: Type.STRING, description: "A detailed description of the lighting style, quality, and direction." }
      },
      required: ['overall', 'dominant_colors', 'accent_colors', 'lighting']
    }
  },
  required: ['prompt', 'style', 'scene_elements', 'sequence', 'color_palette']
};


export const generateEnhancedVideoPrompt = async (
  simplePrompt: string,
  imageBase64: string,
  language: 'en' | 'ru',
  model: VideoModel,
  enhancementPower: number = 3
): Promise<EnhancedVideoPrompt> => {
  try {
    const modelNameMapping = {
      veo: 'Google VEO',
      wan: 'Wan (a cinematic and anime-focused model)',
      grok: 'Grok (a hypothetical narrative-focused video model)'
    };
    const targetModelName = modelNameMapping[model];
    const powerDescription = getPowerDescription(enhancementPower);

    const systemInstruction = `You are a world-class AI prompt engineer, a master of visual storytelling and cinematography. Your task is to transform a user's simple idea and a starting frame into a SUPER EXTRA DETAILED and structured JSON object for the **${targetModelName}** AI video generator. ${powerDescription} The video should be a short, dynamic clip that starts with or is inspired by the provided image. The output must be a JSON object in English, adhering strictly to the provided, deeply nested schema. You must provide a detailed breakdown of the scene, including style, characters, a time-based sequence of actions, and the color palette. The main 'prompt' field should be a beautifully written paragraph that summarizes the entire scene for direct use in the **${targetModelName}** AI video model. Tailor the nuance and structure of the prompt to what would be most effective for **${targetModelName}**.`;
    
    const match = imageBase64.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!match) {
      throw new Error("Invalid base64 image format.");
    }
    const mimeType = match[1];
    const data = match[2];

    const imagePart = {
      inlineData: { mimeType, data },
    };
    
    const textPart = {
      text: `User's idea (in ${language === 'ru' ? 'Russian' : 'English'}): "${simplePrompt}". Based on the provided image as the first frame, generate the detailed video prompt.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: videoResponseSchema,
        temperature: 0.9,
        topP: 0.95,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedVideoPrompt;

  } catch (error) {
    console.error("Error calling Gemini API for video prompt:", error);
    throw new Error("Failed to get a valid response from the AI model.");
  }
};

export const refineEnhancedVideoPrompt = async (
  currentPrompt: EnhancedVideoPrompt,
  refinementRequest: string,
  model: VideoModel
): Promise<EnhancedVideoPrompt> => {
   try {
    const modelNameMapping = {
      veo: 'Google VEO',
      wan: 'Wan (a cinematic and anime-focused model)',
      grok: 'Grok (a hypothetical narrative-focused video model)'
    };
    const targetModelName = modelNameMapping[model];

    const systemInstruction = `You are an AI assistant that refines detailed JSON prompts for the **${targetModelName}** video generator. You will be given a JSON object representing the current prompt and a user's request for modification. Your task is to apply the modification and return a new, valid JSON object that strictly adheres to the original schema. Do not add any explanatory text, just output the modified JSON. Ensure the refinement logically integrates with the existing prompt details.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Here is the current JSON prompt: ${JSON.stringify(currentPrompt)}. Here is the user's request: "${refinementRequest}".`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: videoResponseSchema,
        temperature: 0.8,
      },
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedVideoPrompt;
  } catch (error) {
    console.error("Error calling Gemini API for video prompt refinement:", error);
    throw new Error("Failed to refine the prompt.");
  }
};

// --- EDIT PROMPT GENERATION ---

const editResponseSchema = {
  type: Type.OBJECT,
  properties: {
    master_prompt: { type: Type.STRING, description: "The final, complete prompt to be used for the image editing model. This should incorporate the user's request while maintaining the style of the original image." },
    original_image_analysis: {
      type: Type.OBJECT,
      description: "A concise analysis of the original image.",
      properties: {
        style: { type: Type.STRING, description: "e.g., 'Photorealistic', 'Oil Painting', 'Anime'." },
        lighting: { type: Type.STRING, description: "e.g., 'Soft diffused daylight', 'Dramatic chiaroscuro'." },
        subject: { type: Type.STRING, description: "The main subject of the image." },
        composition: { type: Type.STRING, description: "e.g., 'Rule of thirds, centered'." }
      },
      required: ['style', 'lighting', 'subject', 'composition']
    },
    requested_changes: {
      type: Type.ARRAY,
      description: "A breakdown of the specific edits requested by the user.",
      items: {
        type: Type.OBJECT,
        properties: {
          target_area: { type: Type.STRING, description: "The part of the image to be modified." },
          action: { type: Type.STRING, description: "The action to perform (e.g., 'Change color', 'Add item', 'Remove item')." },
          detailed_instruction: { type: Type.STRING, description: "A detailed description of how to perform the action." }
        },
        required: ['target_area', 'action', 'detailed_instruction']
      }
    },
    consistency_keywords: {
      type: Type.OBJECT,
      description: "Keywords to ensure the edited image matches the original.",
      properties: {
        positive: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords that describe the original image's aesthetic to preserve it." },
        negative: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords to prevent unwanted changes in style or quality." }
      },
      required: ['positive', 'negative']
    }
  },
  required: ['master_prompt', 'original_image_analysis', 'requested_changes', 'consistency_keywords']
};


export const generateEnhancedEditPrompt = async (
  simplePrompt: string,
  imageBase64: string,
  language: 'en' | 'ru',
  model: EditModel,
  enhancementPower: number = 3
): Promise<EnhancedEditPrompt> => {
  try {
    const modelNameMapping = {
      nanobanana: 'NanoBanana (Google Gemini Image)',
      wan: 'Wan (a cinematic and anime-focused model)'
    };
    const targetModelName = modelNameMapping[model];
    const powerDescription = getPowerDescription(enhancementPower);

    const systemInstruction = `You are an expert AI prompt engineer specializing in image editing, inpainting, and outpainting. Your task is to create a structured JSON prompt for an AI image editing model, specifically **${targetModelName}**. You will be given an image and a user's instruction (in ${language === 'ru' ? 'Russian' : 'English'}). ${powerDescription}

**CRITICAL GOAL:** The generated 'master_prompt' MUST be a direct, concise command to EDIT the image, not a re-description of the entire scene. Image editing models already have the original image as context. The prompt should focus ONLY on the desired change.

**Example:**
- User Instruction: "make the cat wear a party hat"
- BAD \`master_prompt\`: "A photorealistic cat sitting on a couch wearing a party hat" (This re-describes the whole scene and risks changing the cat and couch).
- GOOD \`master_prompt\`: "add a small, colorful party hat on the cat's head" (This is a direct, actionable edit).

**Your process:**
1. Analyze the provided image for its style, lighting, subject, and composition.
2. Interpret the user's editing instruction.
3. Break down the instruction into specific, actionable changes.
4. Construct the \`master_prompt\` as a concise, direct command for the edit.
5. Generate extensive \`consistency_keywords\` to ensure the rest of the image remains unchanged and the edit matches the original's aesthetic (lighting, texture, style, etc.).

The final output must be a JSON object in English that strictly follows the provided schema.`;
    
    const match = imageBase64.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!match) {
      throw new Error("Invalid base64 image format.");
    }
    const mimeType = match[1];
    const data = match[2];

    const imagePart = {
      inlineData: { mimeType, data },
    };
    
    const textPart = {
      text: `User's editing instruction (in ${language === 'ru' ? 'Russian' : 'English'}): "${simplePrompt}". Analyze the provided image and this instruction to generate the detailed edit prompt.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: editResponseSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedEditPrompt;

  } catch (error) {
    console.error("Error calling Gemini API for edit prompt:", error);
    throw new Error("Failed to get a valid response from the AI model.");
  }
};

export const refineEnhancedEditPrompt = async (
  currentPrompt: EnhancedEditPrompt,
  refinementRequest: string,
  model: EditModel
): Promise<EnhancedEditPrompt> => {
   try {
    const modelNameMapping = {
      nanobanana: 'NanoBanana (Google Gemini Image)',
      wan: 'Wan (a cinematic and anime-focused model)'
    };
    const targetModelName = modelNameMapping[model];

    const systemInstruction = `You are an AI assistant that refines detailed JSON prompts for the **${targetModelName}** image editing model. You will be given a JSON object representing the current prompt and a user's request for modification.

**CRITICAL GOAL:** Your primary task is to update the 'master_prompt' to be a direct, concise command to EDIT the image, reflecting the user's new request. Do NOT re-describe the entire scene in the master prompt. Focus only on the change.

Your task is to apply the modification and return a new, valid JSON object that strictly adheres to the original schema. Do not add any explanatory text, just output the modified JSON. Ensure the refinement logically integrates with the existing prompt details.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Here is the current JSON prompt: ${JSON.stringify(currentPrompt)}. Here is the user's request: "${refinementRequest}".`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: editResponseSchema,
        temperature: 0.8,
      },
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedEditPrompt;
  } catch (error) {
    console.error("Error calling Gemini API for edit prompt refinement:", error);
    throw new Error("Failed to refine the prompt.");
  }
};
