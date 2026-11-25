import { SAMPLE_MEDIA } from '../data/catalog';
import {
  EditVersion,
  FaceAnchor,
  HistoryEntry,
  LayerItem,
  PhotoEditState,
} from '../types/studio';

export function createDefaultLayers(): LayerItem[] {
  return [
    { id: 'layer-identity', name: 'Identity Lock Face Shield', type: 'identity-mask', visible: true, opacity: 100, locked: true },
    { id: 'layer-color', name: 'Color Grade & AI Filter', type: 'color-grade', visible: true, opacity: 100 },
    { id: 'layer-clothing', name: 'Clothing & Accessories', type: 'clothing', visible: true, opacity: 100 },
    { id: 'layer-retouch', name: 'Smart Eraser & Inpaint', type: 'retouch', visible: true, opacity: 100 },
    { id: 'layer-bg', name: 'Background & Depth Blur', type: 'background', visible: true, opacity: 100 },
    { id: 'layer-subject', name: 'Original Subject Base', type: 'subject', visible: true, opacity: 100, locked: true },
  ];
}

export function createDefaultPhotoState(sampleIndex = 0): PhotoEditState {
  const sample = SAMPLE_MEDIA[sampleIndex] ?? SAMPLE_MEDIA[0];
  return {
    sourceImageUrl: sample.url,
    sourceName: sample.name,
    sourceWidth: sample.width,
    sourceHeight: sample.height,
    identityLock: true,
    showFaceGuide: false,
    faceAnchor: { ...sample.faceAnchor },
    aiIntensity: 85,
    activeFilter: 'none',
    filterIntensity: 75,
    enhancement: {
      upscaleFactor: 1,
      deblurRestore: 0,
      denoise: 0,
      sharpness: 10,
      exposure: 0,
      contrast: 0,
      saturation: 0,
      warmth: 0,
      oldPhotoRestore: 0,
      portraitQuality: 15,
      naturalSkin: 10,
      vignette: 0,
    },
    background: {
      mode: 'original',
      presetId: 'bg-studio-slate',
      customBgUrl: null,
      blurAmount: 30,
      edgeFeather: 45,
      subjectTolerance: 48,
      matchLighting: true,
      matchShadows: true,
      outpaintScale: 1,
      aiPromptSeed: 'Minimalist architectural sunlit concrete loft',
    },
    clothing: {
      category: 'none',
      styleName: 'Original Outfit',
      colorHex: '#2B313B',
      fabricTexture: 'cotton',
      intensity: 75,
      hairStyle: 'original',
      facialHair: 'original',
      accessories: {
        sunglasses: false,
        watch: false,
        chain: false,
      },
    },
    eraseStrokes: [],
    layers: createDefaultLayers(),
  };
}

export function createCustomPhotoState(
  url: string,
  name: string,
  width: number,
  height: number,
  faceAnchor?: FaceAnchor
): PhotoEditState {
  const base = createDefaultPhotoState(0);
  return {
    ...base,
    sourceImageUrl: url,
    sourceName: name,
    sourceWidth: width,
    sourceHeight: height,
    faceAnchor: faceAnchor ?? { x: 0.5, y: 0.28, rx: 0.14, ry: 0.15, detected: true },
  };
}

export interface HistoryStack {
  entries: HistoryEntry[];
  index: number;
}

export function createHistoryStack(initial: PhotoEditState, label = 'Original Capture'): HistoryStack {
  return {
    entries: [
      {
        id: `hist-${Date.now()}-0`,
        label,
        timestamp: Date.now(),
        state: structuredClone(initial),
      },
    ],
    index: 0,
  };
}

export function pushHistory(
  stack: HistoryStack,
  nextState: PhotoEditState,
  label: string,
  maxEntries = 40
): HistoryStack {
  const truncated = stack.entries.slice(0, stack.index + 1);
  const entry: HistoryEntry = {
    id: `hist-${Date.now()}-${truncated.length}`,
    label,
    timestamp: Date.now(),
    state: structuredClone(nextState),
  };
  const updated = [...truncated, entry].slice(-maxEntries);
  return {
    entries: updated,
    index: updated.length - 1,
  };
}

export function undoHistory(stack: HistoryStack): { stack: HistoryStack; state: PhotoEditState } {
  if (stack.index <= 0) {
    return { stack, state: stack.entries[0].state };
  }
  const nextIndex = stack.index - 1;
  return {
    stack: { ...stack, index: nextIndex },
    state: structuredClone(stack.entries[nextIndex].state),
  };
}

export function redoHistory(stack: HistoryStack): { stack: HistoryStack; state: PhotoEditState } {
  if (stack.index >= stack.entries.length - 1) {
    return { stack, state: stack.entries[stack.index].state };
  }
  const nextIndex = stack.index + 1;
  return {
    stack: { ...stack, index: nextIndex },
    state: structuredClone(stack.entries[nextIndex].state),
  };
}

export function toggleLayerVisibility(
  state: PhotoEditState,
  layerId: string
): PhotoEditState {
  return {
    ...state,
    layers: state.layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ),
  };
}

export function setLayerOpacity(
  state: PhotoEditState,
  layerId: string,
  opacity: number
): PhotoEditState {
  const clamped = Math.max(0, Math.min(100, Math.round(opacity)));
  return {
    ...state,
    layers: state.layers.map((l) =>
      l.id === layerId ? { ...l, opacity: clamped } : l
    ),
  };
}

export function createVersionSnapshot(
  state: PhotoEditState,
  name: string,
  thumbnailUrl?: string
): EditVersion {
  return {
    id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    createdAt: Date.now(),
    thumbnailUrl,
    state: structuredClone(state),
  };
}
