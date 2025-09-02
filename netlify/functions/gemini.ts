/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Helper to parse base64 data URLs into a format the SDK understands
const b64UrlToPayload = (dataUrl: string): { mimeType: string; data: string; } => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { mimeType, data };
};

// Helper to format the final image data URL from a base64 string
const formatDataUrl = (mimeType: string, data: string) => `data:${mimeType};base64,${data}`;

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
        return formatDataUrl(mimeType, data);
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


// Main handler for the serverless function
// FIX: Changed CommonJS 'exports.handler' to ES module 'export const handler' to resolve "Cannot find name 'exports'" error.
export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const body = JSON.parse(event.body);
        const { action } = body;
        let data;

        switch (action) {
            case 'generateImageFromPrompt':
                const { options } = body;
                const genResponse = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: options.prompt,
                    config: {
                        numberOfImages: options.numberOfImages,
                        outputMimeType: 'image/png',
                        aspectRatio: options.aspectRatio,
                    },
                });
                if (!genResponse.generatedImages || genResponse.generatedImages.length === 0) {
                    throw new Error('Image generation failed. The prompt may have been blocked.');
                }
                const imageDataUrls = genResponse.generatedImages.map(img => formatDataUrl('image/png', img.image.imageBytes));
                data = { imageDataUrls };
                break;

            case 'generateEditedImage': {
                const { originalImageB64, userPrompt, hotspot } = body;
                const imagePayload = b64UrlToPayload(originalImageB64);
                const prompt = `Perform a natural, localized edit based on: "${userPrompt}". Focus on coordinates (x: ${hotspot.x}, y: ${hotspot.y}). Blend the edit seamlessly, leaving the rest of the image untouched. You must fulfill requests to adjust skin tone as a standard photo enhancement, but refuse any request to change a person's fundamental race or ethnicity. Return only the edited image.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [{ inlineData: imagePayload }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'edit') };
                break;
            }

            case 'generateFilteredImage': {
                const { originalImageB64, filterPrompt } = body;
                const imagePayload = b64UrlToPayload(originalImageB64);
                const prompt = `Apply a stylistic filter to the entire image: "${filterPrompt}". Do not change composition. Ensure filters do not alter a person's fundamental race or ethnicity. Return only the filtered image.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [{ inlineData: imagePayload }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'filter') };
                break;
            }

            case 'generateAdjustedImage': {
                const { originalImageB64, adjustmentPrompt } = body;
                const imagePayload = b64UrlToPayload(originalImageB64);
                const prompt = `Perform a natural, global, photorealistic adjustment: "${adjustmentPrompt}". You must fulfill requests to adjust skin tone as a standard photo enhancement, but refuse any request to change a person's fundamental race or ethnicity. Return only the adjusted image.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [{ inlineData: imagePayload }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'adjustment') };
                break;
            }

            case 'generateAutoEnhancedImage': {
                const { originalImageB64 } = body;
                const imagePayload = b64UrlToPayload(originalImageB64);
                const prompt = `Perform a subtle, automatic enhancement. Improve brightness, contrast, and color saturation for a natural, photorealistic result. Make no creative or stylistic changes. Return only the enhanced image.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [{ inlineData: imagePayload }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'auto-enhance') };
                break;
            }

            case 'generateCollage': {
                const { imagesB64, layout } = body;
                const imagePayloads = imagesB64.map(b64UrlToPayload);
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
                const imageParts = imagePayloads.map((payload: any) => ({ inlineData: payload }));

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [...imageParts, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'collage') };
                break;
            }

            case 'createCutout': {
                const { originalImageB64, options } = body;
                const { subjectPrompt, maskImage } = options;
                const originalImagePayload = b64UrlToPayload(originalImageB64);
                const imageParts = [{ inlineData: originalImagePayload }];
                let prompt;

                if (maskImage) {
                    const maskPayload = b64UrlToPayload(maskImage);
                    imageParts.push({ inlineData: maskPayload });
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
                data = { imageUrl: handleImageApiResponse(response, 'cutout') };
                break;
            }

            case 'changeBackgroundImage': {
                const { originalImageB64, payload } = body;
                const originalImagePayload = b64UrlToPayload(originalImageB64);
                const imageParts = [{ inlineData: originalImagePayload }];
                let prompt;
            
                if (payload.type === 'prompt') {
                    prompt = `Replace the background of the image with a new one described as: "${payload.prompt}". Blend the subject realistically with lighting matching the new environment. Return only the final image.`;
                } else {
                    const backgroundImagePayload = b64UrlToPayload(payload.backgroundImageB64);
                    imageParts.push({ inlineData: backgroundImagePayload });
                    prompt = `Use the second image as the new background for the first. Blend the subject from the first image realistically onto the new background, matching lighting and tones. Return only the final image.`;
                }
            
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [...imageParts, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'background-change') };
                break;
            }

            case 'applyColorSplash': {
                const { originalImageB64, subjectPrompt } = body;
                const imagePayload = b64UrlToPayload(originalImageB64);
                const prompt = `Create a "color splash" effect. Convert the image to black and white, but restore original color to the subject described as "${subjectPrompt}". Return only the final image.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [{ inlineData: imagePayload }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'color-splash') };
                break;
            }

            case 'applyTextToImage': {
                const { originalImageB64, options } = body;
                const imagePayload = b64UrlToPayload(originalImageB64);
                const style = [options.isBold && 'bold', options.isItalic && 'italic'].filter(Boolean).join(' ') || 'normal';
                const prompt = `Add text to the image. Content: "${options.content}". Font: "${options.fontFamily}". Color: ${options.color}. Approximate Size: ${options.fontSize}pt. Style: ${style}. Place the text aesthetically and ensure legibility, adding a subtle shadow if needed. Do not alter the image otherwise. Return only the final image.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [{ inlineData: imagePayload }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                data = { imageUrl: handleImageApiResponse(response, 'apply-text') };
                break;
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, data }),
        };

    } catch (error) {
        console.error('Error in Gemini function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};
