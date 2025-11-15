
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

export const superEnhanceImagePrompt = async (
  currentPrompt: EnhancedPrompt,
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

    const systemInstruction = `You are an elite, world-class AI prompt engineer and a master of visual storytelling, specializing in the **${targetModelName}** image generator. You will be given a well-structured JSON prompt. Your mission is to elevate it to an award-winning, professional standard.

**Your Task:**
1.  **Deepen the Narrative:** Analyze the core concept of the provided JSON prompt.
2.  **Amplify Every Detail:** Go through every field of the JSON object and expand upon it. Make the 'subject' description hyperrealistic and vivid. Make the 'style' more nuanced and specific. Make the 'technical' details more professional and cinematic. Make the 'scene_setup' richer with more sensory information.
3.  **Maintain the Core:** Do NOT change the fundamental story, subject, or composition. Your goal is to enhance, not replace.
4.  **Return JSON:** Your output must be ONLY the new, more detailed JSON object, strictly adhering to the original schema. Do not add any extra text or explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", // Using a more powerful model for enhancement
      contents: `Here is the current JSON prompt. Enhance it: ${JSON.stringify(currentPrompt, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: imageResponseSchema,
        temperature: 0.85,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedPrompt;
  } catch (error) {
    console.error("Error calling Gemini API for image prompt super enhancement:", error);
    throw new Error("Failed to super-enhance the prompt.");
  }
};


// --- VIDEO PROMPT GENERATION ---

const videoResponseSchema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "Cinematic description of the scene, including main object or product and key action. Keep it vivid, sensory-rich, and visual." },
    style: { type: Type.STRING, description: "Define tone and look — e.g., photorealistic, cinematic, futuristic, minimalistic, magical realism." },
    camera: { type: Type.STRING, description: "Describe camera type and movement — e.g., wide shot, dolly in, crane up, orbital shot, slow zoom. Use syntax like '(thats where the camera is)' for critical positioning." },
    lighting: { type: Type.STRING, description: "Describe overall light mood and transitions — e.g., morning sunlight, neon glow, golden hour, or studio lighting." },
    environment: { type: Type.STRING, description: "Briefly describe the setting or background — e.g., kitchen, beach, city plaza, showroom." },
    elements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List each key visual element or object appearing in the scene in order of importance, each element should be descriptive."
    },
    motion: { type: Type.STRING, description: "Describe how elements move or transform dynamically (e.g., slow-motion pour, product assembles mid-air)." },
    ending: { type: Type.STRING, description: "Define the final visual moment or reveal (e.g., product centered, perfect composition, calm fade-out)." },
    text: { type: Type.STRING, description: "Add tagline text if needed or 'none' if no text appears." },
    audio: { type: Type.STRING, description: "Complete audio landscape. For dialogue, use 'Character Name: dialogue text' syntax with NO CAPS and max 1-2 short sentences. Include ambient sounds and SFX." },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of keywords including aspect ratio, brand name, core theme, visual tone, movement style, lighting style, and 'no text'."
    }
  },
  required: ['description', 'style', 'camera', 'lighting', 'environment', 'elements', 'motion', 'ending', 'text', 'audio', 'keywords']
};


export const generateEnhancedVideoPrompt = async (
  simplePrompt: string,
  firstFrameBase64: string,
  lastFrameBase64: string | null,
  language: 'en' | 'ru',
  model: VideoModel,
  enhancementPower: number = 3
): Promise<EnhancedVideoPrompt> => {
  try {
    const modelNameMapping = {
      veo: 'Google VEO 3.1',
      wan: 'Wan (a cinematic and anime-focused model)',
      grok: 'Grok (a hypothetical narrative-focused video model)'
    };
    const targetModelName = modelNameMapping[model];
    const powerDescription = getPowerDescription(enhancementPower);

    const systemInstruction = `You are a world-class creative director and AI prompt engineer, a master of the Google VEO 3.1 video generation model. Your mission is to transform user inputs (text, start/end frames) into an exceptionally detailed, technically compliant, structured JSON shot brief for **${targetModelName}**. Your output must strictly adhere to VEO 3.1's constraints.

**VEO 3.1 Core Rules (CRITICAL - YOU MUST FOLLOW):**
1.  **Consistency**: Descriptions of characters, settings, props, and lighting MUST be repeated EXACTLY verbatim if they are unchanged. Your prompt should focus on describing the VARIABLE elements (action, dialogue, camera movement).
2.  **Audio**: You MUST explicitly define the audio landscape to prevent hallucinations.
3.  **Dialogue**:
    *   Use colon syntax: \`Character Name: The dialogue text.\`
    *   NO CAPS LOCK in dialogue. Use standard casing.
    *   Dialogue must be short: 1-2 sentences maximum (approx. 12-15 words).

**Your Generation Process:**

**Step 1: Deep Frame Analysis**
*   **Analyze First Frame**: Perform a forensic analysis. For characters, define 15+ attributes (age, ethnicity, build, hair color/style, eye color, facial structure, specific attire top to bottom, accessories, distinguishing features). For the environment, detail the location, props, time of day, and atmosphere. Deconstruct composition, lighting, and artistic style.
*   **Analyze Last Frame (if provided)**: Perform the same forensic analysis.
*   **Synthesize the "Delta"**: Identify the core narrative of the 8-second clip. What is the fundamental change or transformation that occurs between the first and last frame? This is the story you must tell.

**Step 2: Synthesize the JSON Shot Brief**
Based on your analysis and the user's text prompt, populate the JSON brief. The user's prompt is a guide for the narrative "delta".
*   **If both frames are provided**: Your primary goal is to create a seamless and logical cinematic transition. The 'description', 'motion', and 'camera' fields must explicitly detail the transformation from the start state to the end state.
*   **If only the first frame is provided**: The user's text prompt is the driving force of the narrative. The video must evolve naturally from the starting frame, following the prompt's instructions. Invent a logical and creative ending.

**Step 3: Populate JSON Fields (Field-by-Field Guidance)**
*   **description**: A vivid, sensory-rich paragraph describing the core action and transformation. This is the narrative heart of the shot.
*   **style**: Use professional terms: 'photorealistic, shot on ARRI Alexa 65', 'cinematic anime', 'dramatic noir'.
*   **camera**: Be specific and technical. Describe the camera movement that connects the first frame's composition to the last (e.g., 'A slow, dramatic dolly zoom that pushes in on the character\\'s face'). Use syntax like \`(thats where the camera is)\` for critical positioning.
*   **lighting**: Describe the lighting and how it evolves (e.g., 'Hard key light softens into a diffused golden hour glow').
*   **environment**: Describe the setting with verbatim consistency for unchanged elements.
*   **elements**: List key visual components, noting their transformation.
*   **motion**: Critically describe the dynamics of the scene's evolution. How do things move and change?
*   **ending**: Describe the final frame's composition and mood.
*   **text**: Include any requested text or 'none'.
*   **audio**: Describe the complete audio landscape. Follow the critical dialogue rules above. Include ambient sounds and specific SFX (e.g., \`Ambience: distant city traffic, soft rain. SFX: a sharp gasp, a key turning in a lock.\`).
*   **keywords**: Compile essential tags. MUST include aspect ratio (default to '16:9'). Include themes, styles, and core actions.

**Final Output Rules**: Your output MUST be a single, valid JSON object in English, strictly following the schema. Do not add any extra text or explanations. ${powerDescription}`;
    
    const partsForApi: any[] = [];
    
    const textPromptPart = simplePrompt.trim()
        ? `User's idea (in ${language === 'ru' ? 'Russian' : 'English'}): "${simplePrompt}".`
        : "The user did not provide a text prompt; rely on the image(s) for creative direction.";
    
    partsForApi.push({ text: textPromptPart });
    
    const firstFrameMatch = firstFrameBase64.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (!firstFrameMatch) throw new Error("Invalid first frame image format.");
    partsForApi.push({ text: "--- FIRST FRAME (start of video) ---" });
    partsForApi.push({ inlineData: { mimeType: firstFrameMatch[1], data: firstFrameMatch[2] } });

    if (lastFrameBase64) {
      const lastFrameMatch = lastFrameBase64.match(/^data:(image\/[a-z]+);base64,(.*)$/);
      if (!lastFrameMatch) throw new Error("Invalid last frame image format.");
      partsForApi.push({ text: "--- LAST FRAME (end of video) ---" });
      partsForApi.push({ inlineData: { mimeType: lastFrameMatch[1], data: lastFrameMatch[2] } });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: partsForApi },
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
      veo: 'Google VEO 3.1',
      wan: 'Wan (a cinematic and anime-focused model)',
      grok: 'Grok (a hypothetical narrative-focused video model)'
    };
    const targetModelName = modelNameMapping[model];

    const systemInstruction = `You are an AI assistant that refines detailed JSON-based cinematic shot briefs for the **${targetModelName}** video generator, which is based on Google VEO. You will be given a JSON object representing the current brief and a user's request for modification.

**Your task is to:**
1.  Apply the user's modification to the relevant fields in the JSON object. Maintain a professional, cinematic tone.
2.  Ensure all fields remain logical and consistent with each other after the change. For example, if the user asks for a 'dark mood', you should update the 'lighting' and 'style' fields accordingly.
3.  Return the new, valid JSON object that strictly adheres to the original schema. Do not add any explanatory text, just the JSON.`;

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

export const superEnhanceVideoPrompt = async (
  currentPrompt: EnhancedVideoPrompt,
  model: VideoModel
): Promise<EnhancedVideoPrompt> => {
  try {
    const modelNameMapping = {
      veo: 'Google VEO 3.1',
      wan: 'Wan (a cinematic and anime-focused model)',
      grok: 'Grok (a hypothetical narrative-focused video model)'
    };
    const targetModelName = modelNameMapping[model];

    const systemInstruction = `You are an elite, world-class creative director and AI prompt engineer, specializing in the **${targetModelName}** video generator. You will be given a well-structured JSON shot brief. Your mission is to elevate it to an award-winning, professional standard.

**Your Task:**
1.  **Deepen the Narrative:** Analyze the core concept of the provided brief.
2.  **Amplify Every Detail:** Go through every field of the JSON object and expand upon it. Make the 'description' more vivid and sensory. Make the 'camera' movements more complex and specific. Make the 'lighting' more nuanced. Make the 'audio' landscape richer with more layers of sound.
3.  **Maintain the Core:** Do NOT change the fundamental story or subject. Your goal is to enhance, not replace.
4.  **Return JSON:** Your output must be ONLY the new, more detailed JSON object, strictly adhering to the original schema. Do not add any extra text or explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Here is the current JSON brief. Enhance it: ${JSON.stringify(currentPrompt, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: videoResponseSchema,
        temperature: 0.85,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EnhancedVideoPrompt;
  } catch (error) {
    console.error("Error calling Gemini API for video prompt super enhancement:", error);
    throw new Error("Failed to super-enhance the prompt.");
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

// FIX: This function was incomplete and caused a compile error. It has been implemented to refine an existing edit prompt.
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

    const systemInstruction = `You are an AI assistant that refines detailed JSON prompts for the **${targetModelName}** image editing model. You will be given a JSON object representing the current edit prompt and a user's request for modification. Your task is to apply the modification and return a new, valid JSON object that strictly adheres to the original schema. The 'master_prompt' should be a concise, direct command for the edit. Do not add any explanatory text, just output the modified JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Here is the current JSON prompt: ${JSON.stringify(currentPrompt)}. Here is the user's request: "${refinementRequest}".`,
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
    console.error("Error calling Gemini API for edit prompt refinement:", error);
    throw new Error("Failed to refine the edit prompt.");
  }
};
