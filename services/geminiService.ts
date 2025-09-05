/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Initialize the Google GenAI client for direct browser-side calls
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert a file to a base64 string
const fileToB64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        // Get only the base64 part of the data URL
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

// Central handler for API responses that expect an image
const handleImageApiResponse = (
    response: GenerateContentResponse,
    context: string
): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        throw new Error(`Request blocked: ${blockReason}. ${blockReasonMessage || ''}`);
    }

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePart?.inlineData) {
        const { mimeType, data } = imagePart.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        throw new Error(`Image generation stopped for ${context}. Reason: ${finishReason}.`);
    }

    const textFeedback = response.text?.trim();
    throw new Error(
        `AI model did not return an image for ${context}. ${textFeedback ? `Response: "${textFeedback}"` : 'This might be due to safety filters.'}`
    );
};


export interface GenerationOptions {
    prompt: string;
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    numberOfImages: number;
}

export const generateImageFromPrompt = async (
    options: GenerationOptions
): Promise<string[]> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: options.prompt,
        config: {
            numberOfImages: options.numberOfImages,
            outputMimeType: 'image/png',
            aspectRatio: options.aspectRatio,
        },
    });
    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('Image generation failed. The prompt may have been blocked.');
    }
    return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
};

export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    const data = await fileToB64(originalImage);
    const mimeType = originalImage.type;
    const prompt = `Perform a natural, localized edit based on: "${userPrompt}". Focus on coordinates (x: ${hotspot.x}, y: ${hotspot.y}). Blend the edit seamlessly, leaving the rest of the image untouched. You must fulfill requests to adjust skin tone as a standard photo enhancement, but refuse any request to change a person's fundamental race or ethnicity. Return only the edited image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'edit');
};

export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    const data = await fileToB64(originalImage);
    const mimeType = originalImage.type;
    const prompt = `Apply a stylistic filter to the entire image: "${filterPrompt}". Do not change composition. Ensure filters do not alter a person's fundamental race or ethnicity. Return only the filtered image.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'filter');
};

export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    const data = await fileToB64(originalImage);
    const mimeType = originalImage.type;
    const prompt = `Perform a natural, global, photorealistic adjustment: "${adjustmentPrompt}". You must fulfill requests to adjust skin tone as a standard photo enhancement, but refuse any request to change a person's fundamental race or ethnicity. Return only the adjusted image.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'adjustment');
};

export const generateAutoEnhancedImage = async (
    originalImage: File,
): Promise<string> => {
    const data = await fileToB64(originalImage);
    const mimeType = originalImage.type;
    const prompt = `Perform a subtle, automatic enhancement. Improve brightness, contrast, and color saturation for a natural, photorealistic result. Make no creative or stylistic changes. Return only the enhanced image.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'auto-enhance');
};

export const generateCollage = async (
    images: File[],
    layout: string
): Promise<string> => {
    const imagePayloads = await Promise.all(images.map(async (file) => ({
        mimeType: file.type,
        data: await fileToB64(file),
    })));

    const getLayoutDescription = (layoutId: string) => ({
        '2-vertical': 'a collage with two images arranged vertically',
        '2-horizontal': 'a collage with two images side-by-side',
        '3-vertical': 'a collage with three images in a vertical column',
        '2x2-grid': 'a 2x2 grid collage',
        'photo-strip': 'a horizontal photo strip collage',
        '3x3-grid': 'a 3x3 grid collage',
        'freestyle': 'an artistic, scrapbook-style freestyle collage',
    }[layoutId] || 'a grid collage');
    
    const prompt = `Combine the images into ${getLayoutDescription(layout)}. Arrange images in the order provided, stitching them seamlessly. Return only the final collage image.`;
    const imageParts = imagePayloads.map(payload => ({ inlineData: payload }));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'collage');
};

export const createCutout = async (
    originalImage: File,
    options: { subjectPrompt?: string; maskImage?: string } = {},
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const originalImageMimeType = originalImage.type;
    const { subjectPrompt, maskImage } = options;
    const imageParts = [{ inlineData: { mimeType: originalImageMimeType, data: originalImageB64 } }];
    let prompt;

    if (maskImage) {
        const maskData = maskImage.split(',')[1];
        const maskMimeType = maskImage.match(/:(.*?);/)?.[1] || 'image/png';
        imageParts.push({ inlineData: { mimeType: maskMimeType, data: maskData } });
        prompt = `Use the second image (a highlight mask) to cut out the subject from the first image. Make the background transparent. Return a single PNG file.`;
    } else if (subjectPrompt) {
        prompt = `Identify and cut out the subject described as "${subjectPrompt}". Make the background transparent. Return a single PNG file.`;
    } else {
        prompt = `Identify the main subject, cut it out, and make the background transparent. Return a single PNG file.`;
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'cutout');
};

export const changeBackgroundImage = async (
    originalImage: File,
    payload: { type: 'prompt', prompt: string } | { type: 'image', file: File }
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const originalImageMimeType = originalImage.type;
    const imageParts = [{ inlineData: { mimeType: originalImageMimeType, data: originalImageB64 } }];
    let prompt;

    if (payload.type === 'prompt') {
        prompt = `Replace the background of the image with a new one described as: "${payload.prompt}". Blend the subject realistically with lighting matching the new environment. Return only the final image.`;
    } else {
        const backgroundImageB64 = await fileToB64(payload.file);
        const backgroundImageMimeType = payload.file.type;
        imageParts.push({ inlineData: { mimeType: backgroundImageMimeType, data: backgroundImageB64 } });
        prompt = `Use the second image as the new background for the first. Blend the subject from the first image realistically onto the new background, matching lighting and tones. Return only the final image.`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'background-change');
};

export const applyColorSplash = async (
    originalImage: File,
    subjectPrompt: string
): Promise<string> => {
    const data = await fileToB64(originalImage);
    const mimeType = originalImage.type;
    const prompt = `Create a "color splash" effect. Convert the image to black and white, but restore original color to the subject described as "${subjectPrompt}". Return only the final image.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'color-splash');
};

export interface TextOptions {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    isBold: boolean;
    isItalic: boolean;
}

export const applyTextToImage = async (
    originalImage: File,
    options: TextOptions
): Promise<string> => {
    const data = await fileToB64(originalImage);
    const mimeType = originalImage.type;
    const style = [options.isBold && 'bold', options.isItalic && 'italic'].filter(Boolean).join(' ') || 'normal';
    const prompt = `Add text to the image. Content: "${options.content}". Font: "${options.fontFamily}". Color: ${options.color}. Approximate Size: ${options.fontSize}pt. Style: ${style}. Place the text aesthetically and ensure legibility, adding a subtle shadow if needed. Do not alter the image otherwise. Return only the final image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleImageApiResponse(response, 'apply-text');
};
