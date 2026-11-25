export type NavSection =
  | 'home'
  | 'photo-editor'
  | 'video-editor'
  | 'background-studio'
  | 'ai-filters'
  | 'clothing-studio'
  | 'ai-enhancer'
  | 'music-audio'
  | 'ai-suggestions'
  | 'my-projects'
  | 'model-manager'
  | 'settings';

export type ProcessingMode = 'lightweight' | 'standard' | 'high-quality';

export interface FaceAnchor {
  x: number; // normalized 0..1 center X
  y: number; // normalized 0..1 center Y
  rx: number; // normalized radius X
  ry: number; // normalized radius Y
  detected: boolean;
}

export interface EraseStroke {
  id: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  radius: number; // normalized 0.01..0.15
  mode: 'erase' | 'inpaint';
}

export interface LayerItem {
  id: string;
  name: string;
  type: 'subject' | 'identity-mask' | 'background' | 'color-grade' | 'clothing' | 'retouch';
  visible: boolean;
  opacity: number; // 0..100
  locked?: boolean;
}

export type FilterId =
  | 'none'
  | 'cinematic'
  | 'dslr-pro'
  | 'portrait-studio'
  | 'vintage-retro'
  | 'film-kodak'
  | 'moody-dark'
  | 'natural-skin'
  | 'street-photo'
  | 'luxury-fashion'
  | 'black-white'
  | 'neon-cyber'
  | 'anime-art'
  | 'studio-lighting'
  | 'golden-hour'
  | 'night-photo'
  | 'hdr-enhance';

export type BackgroundCategory =
  | 'All'
  | 'Professional Studio'
  | 'Luxury Apartments'
  | 'Modern Offices'
  | 'Mountains & Nature'
  | 'Beaches & Oceans'
  | 'City Streets'
  | 'Nightlife & Neon'
  | 'Cinematic Locations'
  | 'Historical'
  | 'Fantasy Worlds'
  | 'Minimalist'
  | 'Travel Destinations'
  | 'AI Generated';

export interface BackgroundPreset {
  id: string;
  name: string;
  category: Exclude<BackgroundCategory, 'All'>;
  imageUrl?: string;
  proceduralType?:
    | 'studio-cyclorama'
    | 'modern-office'
    | 'beach-sunset'
    | 'city-bokeh'
    | 'cinematic-mist'
    | 'historical-stone'
    | 'fantasy-aurora'
    | 'minimalist-warm'
    | 'travel-mediterranean'
    | 'ai-custom';
  palette: [string, string, string];
  ambientTemp: number; // -30 (cool) to +30 (warm)
  ambientExposure: number; // -20 to +20
  offlineReady: boolean;
  packId?: string;
}

export type ClothingCategory =
  | 'none'
  | 'tshirt'
  | 'shirt'
  | 'jacket'
  | 'hoodie'
  | 'suit'
  | 'traditional'
  | 'streetwear';

export interface ClothingState {
  category: ClothingCategory;
  styleName: string;
  colorHex: string;
  fabricTexture: 'matte' | 'denim' | 'wool' | 'silk' | 'cotton';
  intensity: number; // 0..100
  hairStyle: 'original' | 'textured-crop' | 'classic-part' | 'soft-waves' | 'slick-back';
  facialHair: 'original' | 'clean-trim' | 'light-stubble' | 'sculpted-beard';
  accessories: {
    sunglasses: boolean;
    watch: boolean;
    chain: boolean;
  };
}

export interface EnhancementState {
  upscaleFactor: 1 | 2 | 4 | 8;
  deblurRestore: number; // 0..100
  denoise: number; // 0..100
  sharpness: number; // 0..100
  exposure: number; // -50..50
  contrast: number; // -50..50
  saturation: number; // -50..50
  warmth: number; // -50..50
  oldPhotoRestore: number; // 0..100
  portraitQuality: number; // 0..100
  naturalSkin: number; // 0..100
  vignette: number; // 0..100
}

export interface BackgroundEditState {
  mode: 'original' | 'remove' | 'replace' | 'blur';
  presetId: string | null;
  customBgUrl: string | null;
  blurAmount: number; // 0..100
  edgeFeather: number; // 0..100
  subjectTolerance: number; // 10..90
  matchLighting: boolean;
  matchShadows: boolean;
  outpaintScale: 1 | 1.25 | 1.5;
  aiPromptSeed: string;
}

export interface PhotoEditState {
  sourceImageUrl: string;
  sourceName: string;
  sourceWidth: number;
  sourceHeight: number;
  identityLock: boolean;
  showFaceGuide: boolean;
  faceAnchor: FaceAnchor;
  aiIntensity: number; // 0..100
  activeFilter: FilterId;
  filterIntensity: number; // 0..100
  enhancement: EnhancementState;
  background: BackgroundEditState;
  clothing: ClothingState;
  eraseStrokes: EraseStroke[];
  layers: LayerItem[];
}

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
  state: PhotoEditState;
}

export interface EditVersion {
  id: string;
  name: string;
  createdAt: number;
  thumbnailUrl?: string;
  state: PhotoEditState;
}

export interface IdentityWarning {
  severity: 'warning' | 'blocked';
  title: string;
  reason: string;
  recommendation: string;
  proposedActionLabel: string;
}

export interface ImageAnalysisMetrics {
  avgLuminance: number; // 0..255
  contrastSpread: number; // 0..128
  warmthBias: number; // -100..100
  saturationMean: number; // 0..100
  edgeSharpness: number; // 0..100
  backgroundClutter: number; // 0..100
  noiseEstimate: number; // 0..100
}

export interface SmartSuggestion {
  id: string;
  title: string;
  category: 'Enhancement' | 'Background' | 'Filter' | 'Clothing' | 'Object Cleanup';
  headline: string;
  explanation: string;
  identitySafe: boolean;
  patchLabel: string;
  applyPatch: (current: PhotoEditState) => PhotoEditState;
}

export interface FilterPreset {
  id: FilterId;
  name: string;
  category: string;
  description: string;
  identitySafe: boolean;
  highDistortion?: boolean;
  offlineReady: boolean;
  packId?: string;
  // Color grading transform parameters
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  fade: number;
  vignette: number;
  splitToneShadow?: [number, number, number];
  splitToneHighlight?: [number, number, number];
  monochrome?: boolean;
  stylize?: 'none' | 'neon' | 'anime' | 'hdr';
}

export interface VideoSceneMarker {
  id: string;
  timeSec: number;
  label: string;
}

export interface VideoEditState {
  sourceType: 'demo' | 'file';
  sourceName: string;
  sourceUrl: string | null;
  durationSec: number;
  currentTimeSec: number;
  isPlaying: boolean;
  trimStartSec: number;
  trimEndSec: number;
  playbackSpeed: 0.25 | 0.5 | 1 | 1.5 | 2;
  identityLockTemporal: boolean;
  backgroundMode: 'original' | 'blur' | 'replace' | 'remove';
  backgroundPresetId: string | null;
  backgroundBlur: number;
  stabilize: boolean;
  stabilizeStrength: number;
  denoise: number;
  enhanceUpscale: '1080p' | '2K' | '4K';
  portraitEnhance: number;
  activeFilter: FilterId;
  transitionType: 'none' | 'crossfade' | 'dip-black' | 'slide' | 'whip-pan';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  objectMaskEnabled: boolean;
  scenes: VideoSceneMarker[];
}

export interface AudioTrack {
  id: string;
  name: string;
  kind: 'music' | 'voiceover' | 'sfx' | 'extracted';
  synthPreset?: 'ambient-cinema' | 'lofi-focus' | 'acoustic-warmth' | 'modern-pulse' | 'piano-drama' | 'sfx-whoosh' | 'sfx-shutter' | 'sfx-rain';
  fileUrl?: string;
  durationSec: number;
  startOffsetSec: number;
  trimStartSec: number;
  trimEndSec: number;
  volume: number; // 0..100
  fadeInSec: number;
  fadeOutSec: number;
  muted: boolean;
  noiseReduction: boolean;
  syncToTransitions: boolean;
  downloadedOffline: boolean;
}

export interface LocalProject {
  id: string;
  name: string;
  type: 'photo' | 'video';
  updatedAt: number;
  resolution: string;
  editCount: number;
  identityLocked: boolean;
  thumbnailDataUrl: string;
  photoState?: PhotoEditState;
  videoState?: VideoEditState;
}

export interface AIModelPack {
  id: string;
  name: string;
  category: 'Core Offline' | 'Enhancement Pack' | 'Background Pack' | 'Style Pack' | 'Audio Pack';
  runtime: 'ONNX Runtime' | 'MediaPipe' | 'WebGL / NCNN' | 'Local Diffusion' | 'DSP Audio';
  sizeMB: number;
  description: string;
  builtIn: boolean;
  installed: boolean;
  version: string;
}

export interface StudioSettings {
  processingMode: ProcessingMode;
  identityLockDefault: boolean;
  strictIdentityWarnings: boolean;
  hardwareAcceleration: 'auto' | 'webgl' | 'cpu';
  defaultImageFormat: 'image/jpeg' | 'image/png' | 'image/webp';
  defaultImageQuality: number; // 60..100
  defaultVideoResolution: '720p' | '1080p' | '2K' | '4K';
  autoSaveProjects: boolean;
  maxPreviewDimension: 720 | 1080 | 1440;
}

export interface ExportConfig {
  mediaType: 'photo' | 'video';
  format: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/webm';
  quality: number; // 60..100
  aspectRatio: 'original' | '1:1' | '4:5' | '16:9' | '9:16';
  upscaleMultiplier: 1 | 2 | 4 | 8;
  videoResolution: '720p' | '1080p' | '2K' | '4K';
  presetName: string;
}
