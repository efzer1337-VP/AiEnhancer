
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
  characterReference?: string | null,
  compositionReference?: string | null,
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

    let systemInstructionText = `You are a world-class AI prompt engineer, a master of visual storytelling. Your task is to transform a user's input (which can be a text idea in ${language === 'ru' ? 'Russian' : 'English'}, reference images, or a combination) into an exceptionally detailed, structured JSON object. This prompt is specifically tailored for the **${targetModelName}** image generator. ${powerDescription} Your output MUST be a JSON object in English, adhering strictly to the provided, deeply nested schema. Every field must be filled with rich, specific, and creative details. You must think like a combination of a professional photographer, a cinematographer, and a renowned artist.`;

    if (characterReference && !compositionReference) {
        systemInstructionText += `

**Image Context: A character reference image is provided.**

**Your thought process must be:**
1.  **Analyze the Character:** Perform a detailed analysis of the character in the image. Identify their key features, clothing, style, species, and any notable accessories.
2.  **Define the Goal:** Your primary goal is to create a new prompt that features a subject who looks *exactly* like the one in the reference image.
3.  **Populate Subject:** Use your analysis to populate the 'subject' field with an extremely detailed description of this character.
4.  **Incorporate Text Prompt:** If a text prompt is also provided, use it to define the *action* and *environment* for this character. If no text prompt is given, invent a creative and fitting scene for them.
5.  **Complete the Scene:** Creatively fill all other fields (style, camera, lighting) to produce a high-quality image of this character in the new scene.`;
    } else if (!characterReference && compositionReference) {
        systemInstructionText += `

**Image Context: A composition reference image is provided.**

**Your thought process must be:**
1.  **Analyze the Composition:** Perform a deep analysis of this image. Deconstruct its artistic style, color palette, mood, lighting setup (source, effect), and camera details (shot type, angle, lens).
2.  **Define the Goal:** Your primary goal is to create a prompt for a *new* image that captures the *exact same aesthetic, mood, and composition* as the reference.
3.  **Populate Scene:** Use your analysis to populate the 'style', 'technical', and 'scene_setup' fields with details that meticulously replicate the reference image's atmosphere.
4.  **Incorporate Text Prompt:** If a text prompt is also provided, it describes the *new subject* to place within this replicated scene. If no text prompt is provided, invent a new, interesting subject that fits the scene's style.`;
    } else if (characterReference && compositionReference) {
        systemInstructionText += `

**Image Context: Both CHARACTER and COMPOSITION reference images are provided.**

**Your thought process must be a three-part synthesis:**
1.  **Part 1: Character Analysis.** Deeply analyze the CHARACTER image. Identify the subject's exact appearance, clothing, species, features, and style. This is your model for the main subject.
2.  **Part 2: Composition Analysis.** Deeply analyze the COMPOSITION image. Deconstruct its artistic style, color palette, mood, lighting, and camera composition. This is your template for the scene.
3.  **Part 3: Synthesis.** Your goal is to create a prompt that seamlessly places the *character* from the Character Analysis into the *scene* from the Composition Analysis. Populate the 'subject' field based on Part 1, and populate 'style', 'technical', and 'scene_setup' based on Part 2.
4.  **Incorporate Text Prompt:** If a text prompt is also provided, use it as an instruction to modify the synthesized scene (e.g., change the character's action, add props). If no text prompt is given, create a natural and logical interaction between the character and the environment.`;
    }
    
    let finalContents: any;
    const partsForApi: any[] = [];
    
    const textPromptPart = simplePrompt.trim() 
      ? `User idea (in ${language === 'ru' ? 'Russian' : 'English'}): "${simplePrompt}"` 
      : "The user did not provide a text prompt; rely on the image(s) for creative direction.";

    if (characterReference || compositionReference) {
        partsForApi.push({ text: textPromptPart });

        if (characterReference) {
            partsForApi.push({ text: "--- CHARACTER reference image ---" });
            const match = characterReference.match(/^data:(image\/[a-z]+);base64,(.*)$/);
            if (!match) throw new Error("Invalid character image format.");
            partsForApi.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
        if (compositionReference) {
            partsForApi.push({ text: "--- COMPOSITION reference image ---" });
            const match = compositionReference.match(/^data:(image\/[a-z]+);base64,(.*)$/);
            if (!match) throw new Error("Invalid composition image format.");
            partsForApi.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
        finalContents = { parts: partsForApi };
    } else {
        finalContents = textPromptPart;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: finalContents,
      config: {
        systemInstruction: systemInstructionText,
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
    prompt_type: { type: Type.STRING, description: "The prompt type, enclosed in square brackets. E.g., '[SCENE]' or '[MOTION]'." },
    style: {
      type: Type.OBJECT,
      properties: {
        primary_style: { type: Type.STRING, description: "Primary style, e.g., 'Cinematic', 'Hyperrealistic'." },
        secondary_style: { type: Type.STRING, description: "Secondary style or medium, e.g., '8K RAW photo', 'Shot on 8mm film'." },
        artistic_influence: { type: Type.STRING, description: "Specific artists or genres, e.g., 'in the style of Wes Anderson'." },
        color_palette: { type: Type.STRING, description: "Color description, e.g., 'Vibrant neon colors', 'Monochromatic'." },
      },
      required: ['primary_style', 'secondary_style', 'artistic_influence', 'color_palette']
    },
    subject: {
      type: Type.OBJECT,
      properties: {
        full_description: { type: Type.STRING, description: "The complete, detailed subject description. Use double parentheses `((word))` for heavy emphasis and single `(word)` for light emphasis." },
        multi_prompts: {
          type: Type.ARRAY,
          description: "An array of concepts to be blended using multi-prompting. Only use this if the user's idea implies blending distinct concepts (e.g., 'robot knight'). If not applicable, return an empty array.",
          items: {
            type: Type.OBJECT,
            properties: {
              concept: { type: Type.STRING },
              weight: { type: Type.NUMBER },
            },
            required: ['concept', 'weight']
          }
        },
      },
      required: ['full_description', 'multi_prompts']
    },
    action: { type: Type.STRING, description: "The vivid action the subject is performing." },
    environment: { type: Type.STRING, description: "A rich description of the scene's environment or background." },
    composition: {
      type: Type.OBJECT,
      properties: {
        shot_type: { type: Type.STRING, description: "Shot type, e.g., 'Wide Angle Shot', 'Close-up'." },
        camera_angle: { type: Type.STRING, description: "Camera angle, e.g., 'Low angle', 'Aerial view'." },
        camera_movement: { type: Type.STRING, description: "Camera movement, e.g., 'Dolly zoom', 'Time-lapse'." },
      },
      required: ['shot_type', 'camera_angle', 'camera_movement']
    },
    lighting: {
      type: Type.OBJECT,
      properties: {
        style: { type: Type.STRING, description: "Lighting style, e.g., 'Cinematic Lighting', 'Golden Hour'." },
        effect: { type: Type.STRING, description: "Specific lighting effects, e.g., 'Volumetric rays', 'Lens flare'." },
      },
      required: ['style', 'effect']
    },
    parameters: {
      type: Type.OBJECT,
      properties: {
        aspect_ratio: { type: Type.STRING, description: "Aspect ratio, e.g., '16:9' or '9:16'." },
        negative_prompt: { type: Type.STRING, description: "Comma-separated keywords to exclude, e.g., 'blurry, grainy, watermark'." },
        seed: { type: Type.NUMBER, description: "A seed number for repeatable results, or null.", nullable: true },
        stylize: { type: Type.NUMBER, description: "Stylization value (0-1000), or null.", nullable: true },
        chaos: { type: Type.NUMBER, description: "Chaos value (0-100), or null.", nullable: true },
        quality: { type: Type.STRING, description: "Quality setting (e.g., '0.5', '1'), or null.", nullable: true },
        weird: { type: Type.NUMBER, description: "Weirdness value (0-3000), or null.", nullable: true },
        tile: { type: Type.BOOLEAN, description: "Whether the output should be a seamless tile." },
      },
      required: ['aspect_ratio', 'negative_prompt', 'seed', 'stylize', 'chaos', 'quality', 'weird', 'tile']
    },
    final_prompt: { type: Type.STRING, description: "The final, assembled prompt string ready to be used in VEO, constructed from all the other fields." }
  },
  required: ['prompt_type', 'style', 'subject', 'action', 'environment', 'composition', 'lighting', 'parameters', 'final_prompt']
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

    const systemInstruction = `You are a master VEO prompt engineer and an expert in the official Google VEO Prompting Guide. Your goal is to convert a user's idea and a starting frame image into an expertly crafted, structured JSON prompt for the VEO video generation model.

**Your Process & Rules:**

1.  **Analyze Input**: Deeply analyze the user's idea (in ${language === 'ru' ? 'Russian' : 'English'}) and the provided first-frame image. The generated video should be a natural continuation or an enhanced version of the provided image.
2.  **Populate JSON**: Fill out every field of the JSON object with rich, creative, and specific details based on your analysis.
3.  **Subject & Multi-Prompting**:
    *   For the \`subject.full_description\`, be extremely detailed. Use double parentheses \`((word))\` for heavy emphasis and single \`(word)\` for light emphasis on key elements.
    *   If the user's idea blends two distinct concepts (e.g., "a cat astronaut"), use the \`subject.multi_prompts\` array. For "a cat astronaut", you would create \`[{ "concept": "cat", "weight": 1 }, { "concept": "astronaut", "weight": 1 }]\`. If one is more important, adjust the weights. If it's just a single concept, leave the array empty.
4.  **Style & Cinematography**: Be specific. Use terms like "Cinematic," "Hyperrealistic," "Shot on 8mm film," "Low-angle shot," "Dolly zoom," "Golden hour," "Vibrant colors."
5.  **Parameters**: Provide sensible default values. \`aspect_ratio\` should be '16:9' or '9:16'. Leave numeric fields as \`null\` if not directly implied. Set \`tile\` to \`false\` unless requested.
6.  **Assemble \`final_prompt\` (CRITICAL)**: This is the most important step. You must construct the final prompt string by concatenating the other fields in a precise order and syntax.

**Final Prompt Assembly Rules:**

*   **Structure:** \`[Prompt Type] (Styles) [Subject/Multi-Prompt] [Action] in a [Environment], (Composition), (Lighting) --parameters\`
*   **Styles/Composition/Lighting:** Every single descriptor from these sections (e.g., "Cinematic", "8K RAW photo", "Low angle") MUST be wrapped in its own individual parentheses \`()\`.
*   **Subject:** If \`multi_prompts\` has items, format it as \`[concept1]::[weight1] [concept2]::[weight2]\`. If not, use the \`subject.full_description\`.
*   **Parameters:**
    *   Format as \`--ar [aspect_ratio]\`.
    *   Format negative prompt as \`--no [negative_prompt]\`.
    *   Format others as \`--[param] [value]\`, e.g., \`--s 750\`, \`--c 20\`.
    *   Include \`--tile\` only if \`tile\` is true.

**High-Quality Example:**
*User Idea:* "A crystal wolf running through a neon forest."
*Resulting \`final_prompt\`*: \`[MOTION] (Cinematic) (Hyperrealistic) (Vibrant neon colors) a ((crystal wolf)) with glowing blue eyes running swiftly through a dense, neon-lit forest, (Medium shot), (Tracking shot), (Low angle), (Dramatic Lighting), (Volumetric rays) --ar 16:9 --no blurry, cartoon --s 800 --c 10\`

Your output MUST be a single, valid JSON object in English adhering strictly to the provided schema. ${powerDescription} Tailor the prompt for the **${targetModelName}** video generator.`;
    
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

    const systemInstruction = `You are an AI assistant that refines detailed JSON prompts for the **${targetModelName}** video generator, based on the official Google VEO Prompting Guide. You will be given a JSON object representing the current prompt and a user's request for modification.

**Your task is to:**
1.  Apply the user's modification to the relevant fields in the JSON object. You might need to add or modify multi-prompts, change styles, or adjust parameters.
2.  **CRITICAL:** Re-assemble the 'final_prompt' string based on ALL the updated fields. The final string MUST strictly follow the VEO prompt syntax rules:
    *   **Structure:** \`[Prompt Type] (Styles) [Subject/Multi-Prompt] [Action] in a [Environment], (Composition), (Lighting) --parameters\`
    *   **Parentheses:** Wrap every individual style, composition, and lighting descriptor in its own parentheses \`()\`.
    *   **Multi-Prompt:** If applicable, use the \`[concept]::[weight]\` syntax.
    *   **Parameters:** Correctly format all parameters (\`--ar\`, \`--no\`, \`--s\`, etc.).
3.  Return the new, valid JSON object. Do not add any explanatory text, just the JSON.`;

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
