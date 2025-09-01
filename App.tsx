/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


// FIX: Corrected the import statement for React hooks.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import ExifReader from 'exifreader';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateAutoEnhancedImage, generateCollage, createCutout, changeBackgroundImage, applyColorSplash, applyTextToImage, type TextOptions } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import CollagePanel from './components/CollagePanel';
import CutoutPanel from './components/CutoutPanel';
import EditorPanel, { type ManualEdit, backgroundPresets } from './components/EditorPanel';
import TextPanel from './components/TextPanel';
import GeneratorPanel from './components/GeneratorPanel';
import { UndoIcon, RedoIcon, SparkleIcon, UploadIcon } from './components/icons';
import ZoomControls from './components/ZoomControls';
import CompareControls, { type CompareMode } from './components/CompareControls';
import Tutorial from './components/Tutorial';
import StartScreen from './components/StartScreen';
import SplashScreen from './components/SplashScreen';
import MetadataModal, { type ImageMetadata } from './components/MetadataModal';
import { SAMPLE_IMAGE_DATA_URL } from './assets';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    // FIX: Corrected typo from UintArray to Uint8Array.
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'generate' | 'retouch' | 'editor' | 'text' | 'adjust' | 'filters' | 'crop' | 'collage' | 'cutout';
type Theme = 'light' | 'dark';

// FIX: Added an interface for tutorial steps to ensure type safety, especially for the 'position' property.
interface TutorialStep {
    targetId: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    tab?: Tab;
}

const tutorialSteps: TutorialStep[] = [
    {
        targetId: 'image-container',
        title: 'Welcome to the Editor!',
        content: 'This is your main canvas. You can zoom and pan the image using your mouse wheel and by clicking and dragging.',
        position: 'bottom',
    },
    {
        targetId: 'tab-retouch',
        tab: 'retouch',
        title: 'Precise Retouching',
        content: 'Use this tab for localized edits. Simply click a point on the image to select an area.',
        position: 'bottom',
    },
    {
        targetId: 'retouch-prompt-input',
        tab: 'retouch',
        title: 'Describe Your Edit',
        content: 'After clicking on the image, describe the change you want to make in this box, like "remove the person" or "make the flower red".',
        position: 'top',
    },
    {
        targetId: 'tab-editor',
        tab: 'editor',
        title: 'Major Edits',
        content: 'The Editor tab contains powerful tools for major changes, like replacing the background or applying a color splash effect.',
        position: 'bottom',
    },
    {
        targetId: 'tab-text',
        tab: 'text',
        title: 'Add Text',
        content: 'Add custom text to your image. You can choose from various fonts, sizes, and colors.',
        position: 'bottom',
    },
    {
        targetId: 'tab-adjust',
        tab: 'adjust',
        title: 'Professional Adjustments',
        content: 'Make professional-grade adjustments, like blurring the background, enhancing details, or changing the lighting.',
        position: 'top',
    },
    {
        targetId: 'tab-filters',
        tab: 'filters',
        title: 'Creative Filters',
        content: 'Apply stunning, artistic filters to completely change the mood and style of your photo.',
        position: 'top',
    },
    {
        targetId: 'tab-crop',
        tab: 'crop',
        title: 'Crop & Resize',
        content: 'Use the crop tool to trim your image or change its aspect ratio.',
        position: 'top',
    },
    {
        targetId: 'auto-enhance-button',
        title: 'One-Click Enhancement',
        content: 'Not sure where to start? Click "Auto-Enhance" and let the AI instantly improve your image\'s quality.',
        position: 'top',
    },
    {
        targetId: 'history-controls',
        title: 'Undo & Redo',
        content: 'You can easily undo and redo any edits you make. Feel free to experiment!',
        position: 'top',
    },
    {
        targetId: 'download-button',
        title: 'Download Your Creation',
        content: 'Once you\'re happy with your masterpiece, click here to download it to your device.',
        position: 'top',
    },
];

// Define presets outside component for stable reference in useEffect
const adjustmentPresets = [
    { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
    { name: 'Enhance Details', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
    { name: 'Warmer Lighting', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
    { name: 'Studio Light', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
    { name: 'Increase Contrast', prompt: 'Increase the image contrast for a more dramatic look.' },
    { name: 'Soften Image', prompt: 'Apply a subtle softening effect to reduce harshness and create a smoother appearance.' },
];
const filterPresets = [
    { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
    { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
    { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
    { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
];
const editorTools = [
    { name: 'Change Background', prompt: 'Replace the background with a preset, a description, or your own image.' },
    { name: 'Color Splash', prompt: 'Highlight a specific object in color while the rest of the image is black and white.' },
];

const searchableMap: { [key in Tab]?: { name: string, prompt: string }[] } = {
    adjust: adjustmentPresets,
    filters: filterPresets,
    editor: [...editorTools, ...backgroundPresets],
};

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  
  // Zoom and Pan State
  const [scale, setScale] = useState(1);
  const [translation, setTranslation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Compare Mode State
  const [compareMode, setCompareMode] = useState<CompareMode>('off');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isSliderDragging, setIsSliderDragging] = useState<boolean>(false);
  
  // Collage State
  const [collageImages, setCollageImages] = useState<File[]>([]);
  const [collageLayout, setCollageLayout] = useState<string>('2-vertical');
  const [collageImageUrls, setCollageImageUrls] = useState<string[]>([]);
  const collageFileInputRef = useRef<HTMLInputElement>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);

  // Theme State
  const [theme, setTheme] = useState<Theme>('light');
  
  // Tutorial State
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);

  // Offline State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Splash Screen State
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // Metadata Modal State
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  
  // Highlighter State
  const [isHighlightingActive, setIsHighlightingActive] = useState(false);
  const [highlighterMask, setHighlighterMask] = useState<string | null>(null);
  const [isDrawingHighlight, setIsDrawingHighlight] = useState(false);
  const [highlighterBrushMode, setHighlighterBrushMode] = useState<'add' | 'erase'>('add');
  const [highlighterBrushSize, setHighlighterBrushSize] = useState<number>(40);
  const [brushPreview, setBrushPreview] = useState<{ x: number, y: number, visible: boolean } | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0 });
  const hasPanned = useRef(false);
  const initialPinchDistance = useRef(0);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastHighlightPoint = useRef<{ x: number, y: number } | null>(null);
  const hasDraggedHighlight = useRef(false);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  
  const resetZoom = useCallback(() => {
      setScale(1);
      setTranslation({ x: 0, y: 0 });
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCompareMode('off');
    setCollageImages([]);
    resetZoom();
  }, [resetZoom]);

  const handleLoadGeneratedImage = useCallback((imageDataUrl: string) => {
    const newImageFile = dataURLtoFile(imageDataUrl, `generated-${Date.now()}.png`);
    handleImageUpload(newImageFile);
  }, [handleImageUpload]);

  // Effect to hide splash screen after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplashScreen(false);
    }, 5000); // 5 seconds
    return () => clearTimeout(timer);
  }, []);

  // Effect to synchronize React theme state with the DOM on initial load.
  // The initial class on <html> is set by the inline script in index.html.
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);
  
  // Effect to handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toggles the theme and saves the preference to localStorage.
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Effect for search functionality to switch tabs
  useEffect(() => {
    if (!searchQuery) return;
    const query = searchQuery.toLowerCase();
    
    // Check for direct tab name match first
    const tabs: Tab[] = ['generate', 'retouch', 'editor', 'text', 'adjust', 'filters', 'crop', 'collage', 'cutout'];
    const tabMatch = tabs.find(t => t.includes(query));
    if (tabMatch && activeTab !== tabMatch) {
      setActiveTab(tabMatch);
      return;
    }

    // If no direct tab match, check for preset match
    for (const tab in searchableMap) {
      const presets = searchableMap[tab as keyof typeof searchableMap];
      if (presets) {
        const found = presets.some(
          preset => preset.name.toLowerCase().includes(query) || preset.prompt.toLowerCase().includes(query)
        );
        if (found && activeTab !== tab) {
          setActiveTab(tab as Tab);
          return; // Stop after finding the first match
        }
      }
    }
  }, [searchQuery, activeTab]);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);
  
  // Effect to manage collage image URLs
  useEffect(() => {
    const urls = collageImages.map(file => URL.createObjectURL(file));
    setCollageImageUrls(urls);
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [collageImages]);
  
  // Effect to initialize collage images when switching to collage tab
  useEffect(() => {
    if (activeTab === 'collage' && currentImage && collageImages.length === 0) {
      setCollageImages([currentImage]);
    }
  }, [activeTab, currentImage, collageImages]);

  useEffect(() => {
    if (activeTab === 'crop' || activeTab === 'collage' || activeTab === 'cutout' || activeTab === 'editor' || activeTab === 'text') {
        setCompareMode('off');
    }
  }, [activeTab]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    setSliderPosition(50);
    resetZoom();
  }, [history, historyIndex, resetZoom]);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleAutoEnhance = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to enhance.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const enhancedImageUrl = await generateAutoEnhancedImage(currentImage);
        const newImageFile = dataURLtoFile(enhancedImageUrl, `enhanced-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to auto-enhance the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleCreateCollage = useCallback(async () => {
    if (collageImages.length < 2) {
      setError('Please add at least 2 images to create a collage.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const collageDataUrl = await generateCollage(collageImages, collageLayout);
        const newImageFile = dataURLtoFile(collageDataUrl, `collage-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setActiveTab('retouch'); // Switch to edit the new collage
        setCollageImages([]); // Clear collage images after creation
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to create the collage. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [collageImages, collageLayout, addImageToHistory]);

  const handleCreateCutout = useCallback(async (prompt?: string) => {
    if (!currentImage) {
      setError('No image loaded to create a cutout from.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const cutoutImageUrl = await createCutout(currentImage, { subjectPrompt: prompt });
        const newImageFile = dataURLtoFile(cutoutImageUrl, `cutout-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to create the cutout. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyManualEdit = useCallback(async (edit: ManualEdit) => {
    if (!currentImage) {
        setError('No image loaded to apply an edit to.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        let newImageUrl: string;
        if (edit.type === 'background') {
            newImageUrl = await changeBackgroundImage(currentImage, edit.payload);
        } else if (edit.type === 'splash') {
            newImageUrl = await applyColorSplash(currentImage, edit.payload.prompt);
        } else {
            throw new Error('Unknown manual edit type');
        }
        
        const newImageFile = dataURLtoFile(newImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the edit. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyText = useCallback(async (options: TextOptions) => {
    if (!currentImage) {
        setError('No image loaded to apply text to.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        const newImageUrl = await applyTextToImage(currentImage, options);
        const newImageFile = dataURLtoFile(newImageUrl, `text-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the text. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleCollageImagesUpload = (files: FileList | null) => {
    if (files) {
      setCollageImages(prev => [...prev, ...Array.from(files)]);
    }
  };

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setSliderPosition(50);
      resetZoom();
    }
  }, [canUndo, historyIndex, resetZoom]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setSliderPosition(50);
      resetZoom();
    }
  }, [canRedo, historyIndex, resetZoom]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setSliderPosition(50);
      setCollageImages([]);
      resetZoom();
    }
  }, [history, resetZoom]);

  const handleUploadNewClick = useCallback(() => {
      mainFileInputRef.current?.click();
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch' || hasPanned.current) return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;

    const elementX = viewportX / scale;
    const elementY = viewportY / scale;
    
    setDisplayHotspot({ x: elementX, y: elementY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleToNaturalX = naturalWidth / clientWidth;
    const scaleToNaturalY = naturalHeight / clientHeight;

    const originalX = Math.round(elementX * scaleToNaturalX);
    const originalY = Math.round(elementY * scaleToNaturalY);

    setEditHotspot({ x: originalX, y: originalY });
};

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageContainerRef.current || activeTab === 'collage' || isTutorialActive || isHighlightingActive) return;
    e.preventDefault();

    const ZOOM_SPEED = 0.005;
    const newScale = Math.max(0.5, Math.min(5, scale - e.deltaY * ZOOM_SPEED));

    const rect = imageContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newTranslation = {
        x: mouseX - ((mouseX - translation.x) * newScale) / scale,
        y: mouseY - ((mouseY - translation.y) * newScale) / scale,
    };

    setScale(newScale);
    setTranslation(newTranslation);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || activeTab === 'collage' || isTutorialActive || isHighlightingActive) return;
    e.preventDefault();
    setIsDragging(true);
    hasPanned.current = false;
    panStart.current = {
        x: e.clientX - translation.x,
        y: e.clientY - translation.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || activeTab === 'collage' || isTutorialActive || isHighlightingActive) return;
    hasPanned.current = true;
    
    const newX = e.clientX - panStart.current.x;
    const newY = e.clientY - panStart.current.y;
    
    setTranslation({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (activeTab === 'collage' || isTutorialActive || isHighlightingActive) return;
      hasPanned.current = false;
      if (e.touches.length === 1) {
          setIsDragging(true);
          panStart.current = {
              x: e.touches[0].clientX - translation.x,
              y: e.touches[0].clientY - translation.y,
          };
      } else if (e.touches.length === 2) {
          setIsDragging(false);
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
      if (activeTab === 'collage' || isTutorialActive || isHighlightingActive) return;
      if (e.touches.length === 1 && isDragging) {
          hasPanned.current = true;
          const newX = e.touches[0].clientX - panStart.current.x;
          const newY = e.touches[0].clientY - panStart.current.y;
          setTranslation({ x: newX, y: newY });
      } else if (e.touches.length === 2 && initialPinchDistance.current > 0) {
          hasPanned.current = true;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentPinchDistance = Math.sqrt(dx * dx + dy * dy);
          
          const scaleFactor = currentPinchDistance / initialPinchDistance.current;
          // Use the previous scale value from the last render cycle for a stable zoom
          setScale(prevScale => {
            const newScale = Math.max(0.5, Math.min(5, prevScale * scaleFactor));
            if (!imageContainerRef.current) return newScale;

            const rect = imageContainerRef.current.getBoundingClientRect();
            const touchCenterX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            const touchCenterY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
    
            setTranslation(prevTrans => ({
                x: touchCenterX - ((touchCenterX - prevTrans.x) * newScale) / prevScale,
                y: touchCenterY - ((touchCenterY - prevTrans.y) * newScale) / prevScale,
            }));
            
            return newScale;
          });
          initialPinchDistance.current = currentPinchDistance;
      }
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      initialPinchDistance.current = 0;
  };
  
  const handleZoomIn = () => {
      if (!imageContainerRef.current) return;
      const newScale = Math.min(5, scale * 1.2);
      const rect = imageContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const newTranslation = {
          x: centerX - ((centerX - translation.x) * newScale) / scale,
          y: centerY - ((centerY - translation.y) * newScale) / scale,
      };
      setScale(newScale);
      setTranslation(newTranslation);
  };

  const handleZoomOut = () => {
      if (!imageContainerRef.current) return;
      const newScale = Math.max(0.5, scale / 1.2);
      const rect = imageContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const newTranslation = {
          x: centerX - ((centerX - translation.x) * newScale) / scale,
          y: centerY - ((centerY - translation.y) * newScale) / scale,
      };
      setScale(newScale);
      setTranslation(newTranslation);
  };

  const handleSetCompareMode = useCallback((mode: CompareMode) => {
    setSliderPosition(50);
    setCompareMode(mode);
  }, []);

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSliderDragging(true);
  };

  const handleSliderTouchStart = () => {
    setIsSliderDragging(true);
  };

  const updateSliderPosition = useCallback((clientX: number) => {
      if (!imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
  }, []);
  
  // Tutorial handlers
  const startTutorial = useCallback(() => {
    // Reset to the sample image for a clean tour start
    const sampleImageFile = dataURLtoFile(SAMPLE_IMAGE_DATA_URL, 'sample-photo.jpg');
    handleImageUpload(sampleImageFile);
    setTutorialStepIndex(0);
    setIsTutorialActive(true);
  }, [handleImageUpload]);
  
  const skipTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setTutorialStepIndex(0);
    localStorage.setItem('tutorialCompleted', 'true');
  }, []);

  const handleNextStep = useCallback(() => {
    if (tutorialStepIndex < tutorialSteps.length - 1) {
        setTutorialStepIndex(prev => prev + 1);
    } else {
        skipTutorial();
    }
  }, [tutorialStepIndex, skipTutorial]);
  
  const handlePrevStep = useCallback(() => {
    if (tutorialStepIndex > 0) {
        setTutorialStepIndex(prev => prev + 1);
    }
  }, [tutorialStepIndex]);

  const handleShowMetadata = useCallback(async () => {
    if (!currentImage) return;

    try {
        const tags = await ExifReader.load(currentImage);
        const widthValue = tags.ImageWidth?.value;
        const heightValue = tags.ImageLength?.value;

        const metadata: ImageMetadata = {
            Make: tags.Make,
            Model: tags.Model,
            DateTimeOriginal: tags.DateTimeOriginal,
            ImageWidth: Array.isArray(widthValue) ? widthValue[0] : (typeof widthValue === 'number' ? widthValue : undefined),
            ImageLength: Array.isArray(heightValue) ? heightValue[0] : (typeof heightValue === 'number' ? heightValue : undefined),
            FileSize: currentImage.size,
            FileName: currentImage.name,
        };
         setImageMetadata(metadata);
    } catch (error) {
        console.error("Could not read EXIF data:", error);
        // Fallback to basic info if EXIF parsing fails
        const basicMetadata: ImageMetadata = {
            FileSize: currentImage.size,
            FileName: currentImage.name,
        };
        setImageMetadata(basicMetadata);
    }
    setIsMetadataModalOpen(true);
  }, [currentImage]);
  
  // Highlighter handlers
  const handleToggleHighlight = useCallback((active: boolean) => {
      setIsHighlightingActive(active);
      if (!active) {
          handleClearHighlight();
      }
  }, []);

  const handleClearHighlight = useCallback(() => {
      const canvas = maskCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHighlighterMask(null);
  }, []);

  const scaleCanvasToImage = useCallback(async (maskDataUrl: string, imageElement: HTMLImageElement | null): Promise<string | null> => {
      if (!imageElement) return null;
      return new Promise((resolve) => {
          const maskImg = new Image();
          maskImg.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = imageElement.naturalWidth;
              canvas.height = imageElement.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL('image/png'));
              } else {
                  resolve(null);
              }
          };
          maskImg.src = maskDataUrl;
      });
  }, []);

  const handleCreateCutoutFromHighlight = useCallback(async () => {
      if (!currentImage || !highlighterMask) {
          setError('Please highlight an area on the image to create a cutout.');
          return;
      }
      setIsLoading(true);
      setError(null);
      try {
          const finalMask = await scaleCanvasToImage(highlighterMask, imgRef.current);
          if (!finalMask) throw new Error("Could not process the highlight mask.");

          const cutoutImageUrl = await createCutout(currentImage, { maskImage: finalMask });
          const newImageFile = dataURLtoFile(cutoutImageUrl, `cutout-highlighted-${Date.now()}.png`);
          addImageToHistory(newImageFile);
          handleClearHighlight();
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to create cutout from highlight. ${errorMessage}`);
          console.error(err);
      } finally {
          setIsLoading(false);
      }
  }, [currentImage, highlighterMask, addImageToHistory, handleClearHighlight, scaleCanvasToImage]);

  const getPointOnCanvas = (e: React.MouseEvent | React.TouchEvent) => {
      if (!maskCanvasRef.current) return null;
      const canvas = maskCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleHighlightStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isHighlightingActive || isDragging) return;
      e.preventDefault();
      setIsDrawingHighlight(true);
      hasDraggedHighlight.current = false;
      const point = getPointOnCanvas(e);
      if (point) {
          lastHighlightPoint.current = point;
      }
  };

  const handleHighlightMove = (e: React.MouseEvent | React.TouchEvent) => {
    // Update brush preview on any move event when highlighting is active
    if (isHighlightingActive) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        if (brushPreview) {
             setBrushPreview({ ...brushPreview, x: clientX, y: clientY });
        }
    }

      if (!isDrawingHighlight || !isHighlightingActive) return;
      e.preventDefault();
      hasDraggedHighlight.current = true;
      const canvas = maskCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      const currentPoint = getPointOnCanvas(e);

      if (ctx && currentPoint && lastHighlightPoint.current) {
          ctx.globalCompositeOperation = highlighterBrushMode === 'add' ? 'source-over' : 'destination-out';
          ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
          ctx.lineWidth = highlighterBrushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(lastHighlightPoint.current.x, lastHighlightPoint.current.y);
          ctx.lineTo(currentPoint.x, currentPoint.y);
          ctx.stroke();
          lastHighlightPoint.current = currentPoint;
      }
  };

  const handleHighlightEnd = () => {
      if (!isDrawingHighlight) return;

      if (!hasDraggedHighlight.current && lastHighlightPoint.current) {
          const canvas = maskCanvasRef.current;
          const ctx = canvas?.getContext('2d');
          const point = lastHighlightPoint.current;
          if (ctx) {
              ctx.globalCompositeOperation = highlighterBrushMode === 'add' ? 'source-over' : 'destination-out';
              ctx.fillStyle = highlighterBrushMode === 'add' ? 'rgba(255, 255, 0, 0.7)' : 'rgba(0,0,0,1)';
              ctx.beginPath();
              ctx.arc(point.x, point.y, highlighterBrushSize / 2, 0, Math.PI * 2, false);
              ctx.fill();
          }
      }
      
      setIsDrawingHighlight(false);
      lastHighlightPoint.current = null;
      if (maskCanvasRef.current) {
          setHighlighterMask(maskCanvasRef.current.toDataURL('image/png'));
      }
  };

  const handleCanvasMouseEnter = (e: React.MouseEvent) => {
      if (isHighlightingActive) {
          setBrushPreview({ x: e.clientX, y: e.clientY, visible: true });
      }
  };
  
  const handleCanvasMouseLeave = () => {
      if (isHighlightingActive) {
          setBrushPreview(prev => prev ? { ...prev, visible: false } : null);
      }
  };

  useEffect(() => {
    if (isTutorialActive) {
        const currentStep = tutorialSteps[tutorialStepIndex];
        if (currentStep.tab && activeTab !== currentStep.tab) {
            setActiveTab(currentStep.tab as Tab);
        }
    }
  }, [tutorialStepIndex, isTutorialActive, activeTab]);

  useEffect(() => {
    const handleMouseUp = () => setIsSliderDragging(false);
    const handleMouseMove = (e: MouseEvent) => updateSliderPosition(e.clientX);
    const handleTouchMove = (e: TouchEvent) => updateSliderPosition(e.touches[0].clientX);

    if (isSliderDragging) {
        document.body.style.cursor = 'ew-resize';
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
    }

    return () => {
        document.body.style.cursor = '';
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchend', handleMouseUp);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isSliderDragging, updateSliderPosition]);
  
  // Effect to resize the highlight canvas when the image loads or highlighting is activated
  useEffect(() => {
    const resizeCanvas = () => {
        if (isHighlightingActive && maskCanvasRef.current && imgRef.current) {
            const canvas = maskCanvasRef.current;
            const image = imgRef.current;
            canvas.width = image.clientWidth;
            canvas.height = image.clientHeight;
            if (highlighterMask) {
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = highlighterMask;
            }
        }
    };
    const image = imgRef.current;
    if (image) {
        image.addEventListener('load', resizeCanvas);
    }
    resizeCanvas();
    return () => {
        if (image) {
            image.removeEventListener('load', resizeCanvas);
        }
    };
}, [isHighlightingActive, currentImageUrl, highlighterMask]);

  if (showSplashScreen) {
    return <SplashScreen />;
  }

  if (!currentImage) {
    return (
      <div className="min-h-screen text-main flex flex-col">
        <Header 
          theme={theme} 
          onToggleTheme={toggleTheme} 
          onUploadClick={handleUploadNewClick}
          onStartTutorial={startTutorial}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <input
          type="file"
          className="hidden"
          ref={mainFileInputRef}
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <main className={`flex-grow w-full max-w-lg mx-auto p-4 flex justify-center items-start`}>
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
                <div id="tabs-container" className="w-full bg-panel border rounded-lg p-1.5 overflow-x-auto">
                    <div className="flex flex-nowrap gap-1">
                      {(['generate', 'retouch', 'editor', 'text', 'adjust', 'filters', 'crop', 'collage', 'cutout'] as Tab[]).map(tab => (
                         <button
                            id={`tab-${tab}`}
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-shrink-0 capitalize font-semibold py-3 px-5 rounded-md transition-all duration-300 text-base ${
                                activeTab === tab 
                                ? 'btn-primary text-black shadow-lg shadow-yellow-500/30' 
                                : 'text-subtle hover:text-main hover:bg-white/10'
                            }`}
                        >
                            {tab}
                        </button>
                      ))}
                    </div>
                </div>
                <div className="w-full">
                  {activeTab === 'generate' 
                    ? <GeneratorPanel onImageGenerated={handleLoadGeneratedImage} isOnline={isOnline} /> 
                    : <StartScreen onFileSelect={handleFileSelect} onStartTutorial={startTutorial} />
                  }
                </div>
            </div>
        </main>
      </div>
    );
  }

  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-panel border p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-400">An Error Occurred</h2>
            <p className="text-md text-subtle">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return (
          <div className="flex w-full h-full items-center justify-center p-16">
              <Spinner />
          </div>
      );
    }
    
    const getCurrentImageStyle = () => {
      if (compareMode === 'off') return { opacity: 1 };
      if (compareMode === 'split') return { clipPath: 'inset(0 50% 0 0)' };
      if (compareMode === 'slider') return { clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` };
      return {};
    };

    const imageContainerClasses = [
        "relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20",
        activeTab === 'collage' ? '' : 'touch-none',
        isDragging ? 'cursor-grabbing' : '',
        !isDragging && !isHighlightingActive && scale > 1 && activeTab !== 'retouch' && activeTab !== 'collage' ? 'cursor-grab' : '',
    ].filter(Boolean).join(' ');
    
    const getCollageGridClass = () => {
        if (collageLayout.startsWith('2-')) return 'grid-cols-2';
        if (collageLayout === '3-vertical') return 'grid-cols-1';
        if (collageLayout === '2x2-grid') return 'grid-cols-2';
        return 'grid-cols-2';
    };
    
    const getCollageLayoutClass = (requiredImages: number) => {
        const classes = {
            '2-vertical': 'grid grid-cols-1 gap-2',
            '2-horizontal': 'grid grid-cols-2 gap-2',
            '3-vertical': 'grid grid-cols-1 gap-2',
            '2x2-grid': 'grid grid-cols-2 grid-rows-2 gap-2',
            'photo-strip': 'grid grid-cols-4 gap-2',
            '3x3-grid': 'grid grid-cols-3 grid-rows-3 gap-2',
            'freestyle': 'grid grid-cols-3 gap-2',
        }[collageLayout] || 'grid grid-cols-2 gap-2';

        return `${classes} w-full h-full max-h-[60vh] aspect-[4/3] p-2 bg-input rounded-xl`;
    };

    const layouts: { id: string, name: string, required: number }[] = [
        { id: '2-vertical', name: '2 Vertical', required: 2 },
        { id: '2-horizontal', name: '2 Horizontal', required: 2 },
        { id: '3-vertical', name: '3 Vertical', required: 3 },
        { id: '2x2-grid', name: '4 Grid', required: 4 },
        { id: 'photo-strip', name: 'Photo Strip', required: 4 },
        { id: '3x3-grid', name: '9 Grid', required: 9 },
        { id: 'freestyle', name: 'Freestyle', required: 5 },
    ];
    const requiredImages = layouts.find(l => l.id === collageLayout)?.required || 0;
    
    const renderCollagePreview = () => (
      <div className={getCollageLayoutClass(requiredImages)}>
        {Array.from({ length: requiredImages }).map((_, index) => (
          <div key={index} className="w-full h-full bg-panel/50 rounded-lg flex items-center justify-center overflow-hidden">
            {collageImageUrls[index] ? (
              <img
                src={collageImageUrls[index]}
                alt={`Collage image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <button
                onClick={() => collageFileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center text-subtle hover:text-main hover:bg-black/20 transition-colors"
              >
                <UploadIcon className="w-8 h-8 mb-2" />
                <span className="text-sm font-semibold">Add Image</span>
              </button>
            )}
          </div>
        ))}
        <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={collageFileInputRef}
            onChange={(e) => handleCollageImagesUpload(e.target.files)}
        />
      </div>
    );

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div 
            id="image-container"
            ref={imageContainerRef}
            className={imageContainerClasses}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-subtle">AI is working its magic...</p>
                </div>
            )}
            
            {activeTab === 'collage' ? (
                renderCollagePreview()
            ) : (
                <div
                  className="relative"
                  style={{
                    transform: `translate(${translation.x}px, ${translation.y}px) scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {activeTab === 'crop' ? (
                    <ReactCrop 
                      crop={crop} 
                      onChange={c => setCrop(c)} 
                      onComplete={c => setCompletedCrop(c)}
                      aspect={aspect}
                      className="max-h-[60vh]"
                      locked={isDragging}
                    >
                      <img 
                        ref={imgRef}
                        key={`crop-${currentImageUrl}`}
                        src={currentImageUrl} 
                        alt="Crop this image"
                        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
                      />
                    </ReactCrop>
                  ) : (
                      <>
                        {originalImageUrl && (
                            <img
                                key={originalImageUrl}
                                src={originalImageUrl}
                                alt="Original"
                                className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
                            />
                        )}
                        <img
                            ref={imgRef}
                            key={currentImageUrl}
                            src={currentImageUrl}
                            alt="Current"
                            onClick={handleImageClick}
                            style={getCurrentImageStyle()}
                            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl ${activeTab === 'retouch' ? 'cursor-crosshair' : 'cursor-default'}`}
                        />
                        
                        {compareMode === 'slider' && (
                            <div 
                                className="absolute top-0 bottom-0 w-1 bg-yellow-400 cursor-ew-resize z-20 shadow-lg"
                                style={{ left: `${sliderPosition}%` }}
                                onMouseDown={handleSliderMouseDown}
                                onTouchStart={handleSliderTouchStart}
                            >
                                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 bg-yellow-400 rounded-full border-2 border-panel flex items-center justify-center">
                                    <div className="w-4 h-4 text-black font-bold text-xs flex items-center justify-between">
                                        <span className="transform -translate-x-0.5">&larr;</span>
                                        <span className="transform translate-x-0.5">&rarr;</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {displayHotspot && (
                            <div
                                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/30 pointer-events-none z-10 animate-fade-in"
                                style={{
                                    left: `${displayHotspot.x}px`,
                                    top: `${displayHotspot.y}px`,
                                }}
                            />
                        )}
                        
                        {isHighlightingActive && (
                            <canvas
                                ref={maskCanvasRef}
                                className="absolute top-0 left-0 w-full h-full pointer-events-auto cursor-none z-20"
                                onMouseEnter={handleCanvasMouseEnter}
                                onMouseLeave={handleCanvasMouseLeave}
                                onMouseDown={handleHighlightStart}
                                onMouseMove={handleHighlightMove}
                                onMouseUp={handleHighlightEnd}
                                onTouchStart={handleHighlightStart}
                                onTouchMove={handleHighlightMove}
                                onTouchEnd={handleHighlightEnd}
                            />
                        )}
                      </>
                  )}
                </div>
            )}
             <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={resetZoom} scale={scale} onShowInfo={handleShowMetadata} />
        </div>
        
        <div id="controls-toolbar" className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <div id="history-controls" className="flex items-center gap-2">
                <button
                    onClick={handleUndo}
                    disabled={!canUndo || isLoading}
                    className="p-3 text-subtle hover:text-main rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Undo"
                >
                    <UndoIcon className="w-6 h-6" />
                </button>
                <button
                    onClick={handleRedo}
                    disabled={!canRedo || isLoading}
                    className="p-3 text-subtle hover:text-main rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Redo"
                >
                    <RedoIcon className="w-6 h-6" />
                </button>
                 <button
                    id="auto-enhance-button"
                    onClick={handleAutoEnhance}
                    disabled={isLoading || !isOnline}
                    className="flex items-center gap-2 btn-secondary font-semibold py-2.5 px-4 rounded-md transition-all duration-200 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <SparkleIcon className="w-5 h-5" />
                    Auto-Enhance
                </button>
            </div>
            
            <CompareControls 
              compareMode={compareMode}
              onSetCompareMode={handleSetCompareMode}
              disabled={!originalImage || activeTab === 'crop'}
            />

            <div className="flex items-center gap-2">
                <button
                    onClick={handleReset}
                    disabled={historyIndex === 0 || isLoading}
                    className="btn-secondary font-semibold py-2.5 px-4 rounded-md transition-colors text-base disabled:opacity-50"
                >
                    Reset
                </button>
                <button
                    id="download-button"
                    onClick={handleDownload}
                    className="btn-primary font-bold py-2.5 px-6 rounded-md transition-all duration-200 text-base shadow-md shadow-yellow-500/20"
                >
                    Download
                </button>
            </div>
        </div>

        <div id="tabs-container" className="w-full bg-panel border rounded-lg p-1.5 overflow-x-auto">
            <div className="flex flex-nowrap gap-1">
              {(['retouch', 'editor', 'text', 'adjust', 'filters', 'crop', 'collage', 'cutout'] as Tab[]).map(tab => (
                 <button
                    id={`tab-${tab}`}
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 capitalize font-semibold py-3 px-5 rounded-md transition-all duration-300 text-base ${
                        activeTab === tab 
                        ? 'btn-primary text-black shadow-lg shadow-yellow-500/30' 
                        : 'text-subtle hover:text-main hover:bg-white/10'
                    }`}
                >
                    {tab}
                </button>
              ))}
            </div>
        </div>
        
        <div id="controls" className="w-full">
            {activeTab === 'retouch' && (
                <div className="w-full bg-panel border rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                    <p className="text-subtle text-center sm:text-left">
                      {editHotspot 
                        ? 'Now, describe your edit in the box below.' 
                        : 'Click a point on the image to select an area for a localized edit.'
                      }
                    </p>
                    <input
                        id="retouch-prompt-input"
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'remove the person' or 'make the flower blue'"
                        className="flex-grow bg-input border text-main rounded-lg p-4 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
                        disabled={isLoading || !editHotspot || !isOnline}
                    />
                    <button
                        onClick={handleGenerate}
                        className="w-full sm:w-auto btn-primary font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                        disabled={isLoading || !prompt.trim() || !editHotspot || !isOnline}
                    >
                        Apply
                    </button>
                </div>
            )}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} isOnline={isOnline} searchQuery={searchQuery} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} isOnline={isOnline} searchQuery={searchQuery} />}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop} />}
            {activeTab === 'collage' && (
                <CollagePanel 
                    onLayoutChange={setCollageLayout} 
                    onCreateCollage={handleCreateCollage}
                    onAddImages={() => collageFileInputRef.current?.click()}
                    onClearImages={() => setCollageImages([currentImage])}
                    images={collageImages}
                    layout={collageLayout}
                    isLoading={isLoading}
                    layouts={layouts}
                    isOnline={isOnline}
                />
            )}
            {activeTab === 'cutout' && (
                <CutoutPanel 
                    onCreateCutout={handleCreateCutout} 
                    onCutoutFromHighlight={handleCreateCutoutFromHighlight}
                    onToggleHighlight={handleToggleHighlight}
                    onClearHighlight={handleClearHighlight}
                    isHighlightReady={!!highlighterMask}
                    isLoading={isLoading} 
                    isOnline={isOnline}
                    brushSize={highlighterBrushSize}
                    onSetBrushMode={setHighlighterBrushMode}
                    onSetBrushSize={setHighlighterBrushSize}
                />
            )}
            {activeTab === 'editor' && <EditorPanel onApplyEdit={handleApplyManualEdit} isLoading={isLoading} isOnline={isOnline} searchQuery={searchQuery} />}
            {activeTab === 'text' && <TextPanel onApplyText={handleApplyText} isLoading={isLoading} isOnline={isOnline} />}
        </div>
        {isTutorialActive && (
            <Tutorial 
                step={tutorialSteps[tutorialStepIndex]}
                currentStep={tutorialStepIndex + 1}
                totalSteps={tutorialSteps.length}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                onSkip={skipTutorial}
            />
        )}
        {isMetadataModalOpen && (
            <MetadataModal 
                isOpen={isMetadataModalOpen} 
                onClose={() => setIsMetadataModalOpen(false)} 
                metadata={imageMetadata}
            />
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-main flex flex-col">
        <Header 
          theme={theme} 
          onToggleTheme={toggleTheme} 
          onUploadClick={handleUploadNewClick}
          onStartTutorial={startTutorial}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <input
            type="file"
            className="hidden"
            ref={mainFileInputRef}
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
        />
        <main className={`flex-grow w-full max-w-7xl mx-auto p-4 flex justify-center items-start`}>
            {renderContent()}
        </main>
        {isHighlightingActive && brushPreview && (
            <div
                className={`rounded-full pointer-events-none transition-opacity duration-100 flex items-center justify-center ${
                    highlighterBrushMode === 'add' 
                        ? 'bg-yellow-400/50 border-2 border-white' 
                        : 'bg-red-500/50 border-2 border-white/80'
                }`}
                style={{
                    position: 'fixed',
                    left: brushPreview.x,
                    top: brushPreview.y,
                    width: highlighterBrushSize,
                    height: highlighterBrushSize,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9000,
                    opacity: brushPreview.visible ? 1 : 0,
                }}
            >
                {/* Center dot for pinpoint accuracy on larger brushes */}
                {highlighterBrushSize > 4 && (
                     <div className="w-px h-px bg-white ring-1 ring-black"></div>
                )}
            </div>
        )}
    </div>
  );
};

export default App;