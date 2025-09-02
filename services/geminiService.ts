/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// All AI logic is now handled by a backend function for security.
const API_ENDPOINT = '/.netlify/functions/gemini';

// Helper to convert a file to a base64 string for JSON payload
const fileToB64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Central handler for making API calls to our backend function
const callApi = async (action: string, payload: object): Promise<any> => {
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'An unknown error occurred on the server.');
    }
    
    return result.data;
};

export interface GenerationOptions {
    prompt: string;
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    numberOfImages: number;
}

export const generateImageFromPrompt = async (
    options: GenerationOptions
): Promise<string[]> => {
    const data = await callApi('generateImageFromPrompt', { options });
    return data.imageDataUrls;
};

export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const data = await callApi('generateEditedImage', { originalImageB64, userPrompt, hotspot });
    return data.imageUrl;
};

export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const data = await callApi('generateFilteredImage', { originalImageB64, filterPrompt });
    return data.imageUrl;
};

export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const data = await callApi('generateAdjustedImage', { originalImageB64, adjustmentPrompt });
    return data.imageUrl;
};

export const generateAutoEnhancedImage = async (
    originalImage: File,
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const data = await callApi('generateAutoEnhancedImage', { originalImageB64 });
    return data.imageUrl;
};

export const generateCollage = async (
    images: File[],
    layout: string
): Promise<string> => {
    const imagesB64 = await Promise.all(images.map(fileToB64));
    const data = await callApi('generateCollage', { imagesB64, layout });
    return data.imageUrl;
};

export const createCutout = async (
    originalImage: File,
    options: { subjectPrompt?: string; maskImage?: string } = {},
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const data = await callApi('createCutout', { originalImageB64, options });
    return data.imageUrl;
};

export const changeBackgroundImage = async (
    originalImage: File,
    payload: { type: 'prompt', prompt: string } | { type: 'image', file: File }
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    let finalPayload: any = { type: payload.type };

    if (payload.type === 'prompt') {
        finalPayload.prompt = payload.prompt;
    } else {
        finalPayload.backgroundImageB64 = await fileToB64(payload.file);
    }
    
    const data = await callApi('changeBackgroundImage', { originalImageB64, payload: finalPayload });
    return data.imageUrl;
};

export const applyColorSplash = async (
    originalImage: File,
    subjectPrompt: string
): Promise<string> => {
    const originalImageB64 = await fileToB64(originalImage);
    const data = await callApi('applyColorSplash', { originalImageB64, subjectPrompt });
    return data.imageUrl;
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
    const originalImageB64 = await fileToB64(originalImage);
    const data = await callApi('applyTextToImage', { originalImageB64, options });
    return data.imageUrl;
};