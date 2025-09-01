/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const dataUrlToPart = (dataUrl: string): { inlineData: { mimeType: string; data: string; } } => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

export interface GenerationOptions {
    prompt: string;
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    numberOfImages: number;
}

/**
 * Generates one or more images from a text prompt using an image generation model.
 * @param options An object containing the prompt, desired aspect ratio, and number of images.
 * @returns A promise that resolves to an array of data URLs for the generated images.
 */
export const generateImageFromPrompt = async (
    options: GenerationOptions
): Promise<string[]> => {
    console.log(`Starting image generation with options:`, options);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: options.prompt,
        config: {
            numberOfImages: options.numberOfImages || 1,
            outputMimeType: 'image/png',
            aspectRatio: options.aspectRatio,
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('Image generation failed. The prompt may have been blocked due to safety policies. Please try a different prompt.');
    }

    const imageUrls = response.generatedImages.map(img => {
        const base64ImageBytes: string = img.image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    });

    console.log(`Successfully generated ${imageUrls.length} images.`);
    return imageUrls;
};


/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates an auto-enhanced image using generative AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the enhanced image.
 */
export const generateAutoEnhancedImage = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting auto-enhancement...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a subtle, automatic enhancement of the provided image. Analyze the image and improve its overall quality by adjusting brightness, contrast, and color saturation. The result should be natural and photorealistic. Do not make any creative, stylistic, or compositional changes.

Output: Return ONLY the final enhanced image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and auto-enhance prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for auto-enhance.', response);
    
    return handleApiResponse(response, 'auto-enhance');
};

/**
 * Creates a collage from multiple images based on a specified layout.
 * @param images An array of image files for the collage.
 * @param layout A string identifying the desired layout (e.g., '2-vertical').
 * @returns A promise that resolves to the data URL of the final collage image.
 */
export const generateCollage = async (
    images: File[],
    layout: string
): Promise<string> => {
    console.log(`Starting collage generation with layout: ${layout}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const getLayoutDescription = (layoutId: string): string => {
        switch (layoutId) {
            case '2-vertical':
                return 'a collage with the two images arranged vertically, one on top of the other';
            case '2-horizontal':
                return 'a collage with the two images arranged horizontally, side-by-side';
            case '3-vertical':
                return 'a collage with the three images arranged in a vertical column';
            case '2x2-grid':
                return 'a 2x2 grid collage with the four images';
            case 'photo-strip':
                return 'a photo strip collage with the four images arranged horizontally side-by-side in a single row';
            case '3x3-grid':
                return 'a 3x3 grid collage with the nine images';
            case 'freestyle':
                return 'an artistic, freestyle collage of the five images. Arrange them in a creative, scrapbook-style layout, with some images overlapping slightly.';
            default:
                throw new Error(`Unknown collage layout: ${layoutId}`);
        }
    };
    
    const layoutDescription = getLayoutDescription(layout);
    const imageParts = await Promise.all(images.map(fileToPart));

    const prompt = `You are an expert collage maker AI. Your task is to combine the following images into a single collage image.
Layout Request: "${layoutDescription}".

Collage Guidelines:
- Arrange the images in the order they are provided.
- Ensure the images are seamlessly stitched together with no borders or gaps unless it's a natural part of the layout.
- The final output should be a single, flat image file.

Output: Return ONLY the final collage image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending images and collage prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...imageParts, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for collage.', response);

    return handleApiResponse(response, 'collage');
};

/**
 * Creates a cutout of a subject from an image with a transparent background.
 * Can be guided by a text prompt, a mask image, or be fully automatic.
 * @param originalImage The original image file.
 * @param options An object containing an optional subject prompt or a mask image data URL.
 * @returns A promise that resolves to the data URL of the cutout image (PNG).
 */
export const createCutout = async (
    originalImage: File,
    options: { subjectPrompt?: string; maskImage?: string } = {},
): Promise<string> => {
    const { subjectPrompt, maskImage } = options;
    console.log(
        subjectPrompt ? `Starting cutout generation for: ${subjectPrompt}` :
        maskImage ? 'Starting cutout generation from highlight mask...' :
        'Starting automatic cutout generation...'
    );

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const parts: ( { text: string } | { inlineData: { mimeType: string, data: string } } )[] = [originalImagePart];
    let prompt: string;

    if (maskImage) {
        const maskImagePart = dataUrlToPart(maskImage);
        parts.push(maskImagePart);
        prompt = `You are an expert photo editor AI. Use the second image, which is a highlight mask, to perfectly cut out the subject from the first image. The non-black area in the mask indicates the subject to keep. Create a precise mask around this subject, remove the background completely, making it transparent. The final output must be a single PNG image file with a transparent background. Return ONLY the final cutout image. Do not return text.`;
    } else if (subjectPrompt) {
        prompt = `You are an expert photo editor AI. Your task is to identify the subject described as "${subjectPrompt}" in the provided image, perfectly cut it out, and remove the background.
    
Instructions:
1.  Identify the subject(s) described by the user: "${subjectPrompt}".
2.  Create a precise mask around the subject(s).
3.  Remove the background completely, making it transparent.
4.  The final output must be a single PNG image file with a transparent background.

Output: Return ONLY the final cutout image. Do not return any text or other content.`;
    } else {
        prompt = `You are an expert photo editor AI. Your task is to identify the main subject in the provided image, perfectly cut it out, and remove the background.
    
Instructions:
1.  Identify the primary subject(s) of the photo.
2.  Create a precise mask around the subject(s).
3.  Remove the background completely, making it transparent.
4.  The final output must be a single PNG image file with a transparent background.

Output: Return ONLY the final cutout image. Do not return any text or other content.`;
    }
    
    const textPart = { text: prompt };
    parts.push(textPart);

    console.log('Sending image(s) and cutout prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for cutout.', response);

    return handleApiResponse(response, 'cutout');
};


/**
 * Changes the background of an image based on a prompt or a new background image.
 * @param originalImage The original image file.
 * @param payload An object containing either a text prompt or a new background image file.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const changeBackgroundImage = async (
    originalImage: File,
    payload: { type: 'prompt', prompt: string } | { type: 'image', file: File }
): Promise<string> => {
    console.log('Starting background change...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = await fileToPart(originalImage);
    const parts = [originalImagePart];
    let prompt: string;

    if (payload.type === 'prompt') {
        prompt = `You are an expert photo editor AI. Your task is to perfectly replace the background of the provided image.
        
Instructions:
1.  Identify the main subject(s) of the photo.
2.  Create a precise mask around the subject(s).
3.  Replace the original background with a new background described as: "${payload.prompt}".
4.  Ensure the new background is photorealistic and that the lighting on the subject matches the new environment.
5.  The final output must be a single, seamlessly blended image.

Output: Return ONLY the final edited image. Do not return text.`;
    } else {
        const backgroundImagePart = await fileToPart(payload.file);
        parts.push(backgroundImagePart);
        prompt = `You are an expert photo editor AI. Your task is to use the second image provided as the new background for the first image.
        
Instructions:
1.  In the first image, identify the main subject(s).
2.  Create a precise mask around the subject(s).
3.  Place the subject(s) onto the second image (the new background).
4.  Ensure the subject is realistically blended into the new background. Adjust lighting, shadows, and color tones on the subject to match the new environment perfectly.
5.  The final output must be a single, seamlessly blended image.

Output: Return ONLY the final edited image. Do not return text.`;
    }
    
    // FIX: The `parts` array was inferred as containing only image parts, causing a type error
    // when pushing a text part. This is fixed by creating a new array at the call site,
    // which allows TypeScript to correctly infer the union type for the array elements.
    const textPart = { text: prompt };

    console.log('Sending images and background change prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...parts, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for background change.', response);

    return handleApiResponse(response, 'background-change');
};


/**
 * Applies a color splash effect to an image, keeping a specified subject in color.
 * @param originalImage The original image file.
 * @param subjectPrompt A text prompt describing the subject to keep in color.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const applyColorSplash = async (
    originalImage: File,
    subjectPrompt: string
): Promise<string> => {
    console.log(`Starting color splash for: ${subjectPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to create a "color splash" effect.
    
Instructions:
1.  Convert the entire image to black and white.
2.  Identify the object(s) described by the user: "${subjectPrompt}".
3.  Restore the original, vibrant color ONLY to the identified object(s).
4.  The rest of the image must remain in black and white.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and color splash prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for color splash.', response);

    return handleApiResponse(response, 'color-splash');
};

export interface TextOptions {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    isBold: boolean;
    isItalic: boolean;
}

/**
 * Applies text to an image with specified styling.
 * @param originalImage The original image file.
 * @param options An object containing text content and styling information.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const applyTextToImage = async (
    originalImage: File,
    options: TextOptions
): Promise<string> => {
    console.log(`Applying text to image with options:`, options);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const styleParts = [];
    if (options.isBold) styleParts.push('bold');
    if (options.isItalic) styleParts.push('italic');
    const styleString = styleParts.length > 0 ? `Style: ${styleParts.join(' ')}.` : 'Style: normal.';

    const prompt = `You are an expert photo editor AI. Your task is to add text to the provided image precisely as requested.
    
Instructions:
1.  Add the following text to the image: "${options.content}"
2.  Use the font family: "${options.fontFamily}". If you cannot use the exact font, use a very similar one.
3.  The text color should be: ${options.color}.
4.  The font size should be approximately ${options.fontSize}pt.
5.  ${styleString}
6.  Placement: Position the text in a sensible, aesthetically pleasing, and generally centered location. The text must be clearly legible against the background. You may add a subtle drop shadow or outline to the text if necessary to improve readability, but the text color itself should remain ${options.color}.
7.  Do not alter the original image in any other way.

Output: Return ONLY the final image with the text added. Do not return any text.`;
    const textPart = { text: prompt };

    console.log('Sending image and text prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for apply-text.', response);
    
    return handleApiResponse(response, 'apply-text');
};