import React, { useRef, useState } from 'react';
import {
  Check,
  Expand,
  ImagePlus,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import { BACKGROUND_PRESETS } from '../data/catalog';
import {
  BackgroundCategory,
  PhotoEditState,
} from '../types/studio';
import { PhotoCanvasViewport } from './PhotoCanvasViewport';

interface BackgroundStudioViewProps {
  state: PhotoEditState;
  maxPreviewDimension: number;
  onCommitEdit: (next: PhotoEditState, label: string) => void;
  onLiveChange: (next: PhotoEditState) => void;
  onToggleIdentityLock: () => void;
}

const CATEGORIES: BackgroundCategory[] = [
  'All',
  'Professional Studio',
  'Luxury Apartments',
  'Modern Offices',
  'Mountains & Nature',
  'Beaches & Oceans',
  'City Streets',
  'Nightlife & Neon',
  'Cinematic Locations',
  'Historical',
  'Fantasy Worlds',
  'Minimalist',
  'Travel Destinations',
  'AI Generated',
];

export const BackgroundStudioView: React.FC<BackgroundStudioViewProps> = ({
  state,
  maxPreviewDimension,
  onCommitEdit,
  onLiveChange,
  onToggleIdentityLock,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BackgroundCategory>('All');
  const [promptInput, setPromptInput] = useState(state.background.aiPromptSeed);
  const bgUploadRef = useRef<HTMLInputElement | null>(null);

  const filteredPresets =
    selectedCategory === 'All'
      ? BACKGROUND_PRESETS
      : BACKGROUND_PRESETS.filter((p) => p.category === selectedCategory);

  const handleUploadCustomBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onCommitEdit(
      {
        ...state,
        background: {
          ...state.background,
          mode: 'replace',
          customBgUrl: url,
          presetId: null,
        },
      },
      `Custom Background: ${file.name}`
    );
    e.target.value = '';
  };

  const handleGenerateLocalBg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    onCommitEdit(
      {
        ...state,
        background: {
          ...state.background,
          mode: 'replace',
          presetId: 'bg-ai-generated',
          customBgUrl: null,
          aiPromptSeed: promptInput.trim(),
        },
      },
      `Local AI Background: ${promptInput.trim().slice(0, 24)}`
    );
  };

  return (
    <div className="h-full overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row min-h-0">
      <div className="shrink-0 lg:flex-1 min-w-0 lg:min-h-0">
        <PhotoCanvasViewport
          state={state}
          maxPreviewDimension={maxPreviewDimension}
          onToggleIdentityLock={onToggleIdentityLock}
          onToggleFaceGuide={() =>
            onLiveChange({ ...state, showFaceGuide: !state.showFaceGuide })
          }
        />
      </div>

      <aside className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#23262E] bg-[#111318] flex flex-col lg:min-h-0">
        <div className="px-4 py-3.5 border-b border-[#23262E]">
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            Background Studio
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Automatic subject matting · Lighting harmonization · Offline synthesis
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Primary Mode Selector */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-[#0C0E12] border border-[#23262E]">
            {(
              [
                { id: 'original', label: 'Original' },
                { id: 'remove', label: 'Cutout' },
                { id: 'blur', label: 'Bokeh' },
                { id: 'replace', label: 'Replace' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() =>
                  onCommitEdit(
                    {
                      ...state,
                      background: { ...state.background, mode: mode.id },
                    },
                    `Background Mode: ${mode.label}`
                  )
                }
                className={`py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  state.background.mode === mode.id
                    ? 'bg-amber-500 text-[#0B0C0E]'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Matting, Depth Blur & Lighting Match Controls */}
          <div className="space-y-3 pb-4 border-b border-[#23262E]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="slider-bg-blur" className="text-zinc-300">
                  Portrait Depth Blur
                </label>
                <span className="font-mono-tabular text-zinc-400">
                  {state.background.blurAmount}%
                </span>
              </div>
              <input
                id="slider-bg-blur"
                type="range"
                min={0}
                max={100}
                value={state.background.blurAmount}
                onChange={(e) =>
                  onLiveChange({
                    ...state,
                    background: {
                      ...state.background,
                      mode: state.background.mode === 'original' ? 'blur' : state.background.mode,
                      blurAmount: Number(e.target.value),
                    },
                  })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="slider-edge-feather" className="text-zinc-300">
                  Subject Edge Feathering
                </label>
                <span className="font-mono-tabular text-zinc-400">
                  {state.background.edgeFeather}%
                </span>
              </div>
              <input
                id="slider-edge-feather"
                type="range"
                min={10}
                max={100}
                value={state.background.edgeFeather}
                onChange={(e) =>
                  onLiveChange({
                    ...state,
                    background: { ...state.background, edgeFeather: Number(e.target.value) },
                  })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label
                htmlFor="toggle-lighting-match"
                className="text-xs text-zinc-300 flex items-center gap-2 cursor-pointer"
              >
                <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto Match Subject Lighting &amp; Shadows</span>
              </label>
              <input
                id="toggle-lighting-match"
                type="checkbox"
                checked={state.background.matchLighting}
                onChange={(e) =>
                  onCommitEdit(
                    {
                      ...state,
                      background: {
                        ...state.background,
                        matchLighting: e.target.checked,
                        matchShadows: e.target.checked,
                      },
                    },
                    e.target.checked ? 'Enable Lighting Match' : 'Disable Lighting Match'
                  )
                }
                className="accent-amber-500 w-4 h-4"
              />
            </div>
          </div>

          {/* AI Outpainting Expansion */}
          <div className="space-y-2.5 pb-4 border-b border-[#23262E]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                <Expand className="w-3.5 h-3.5 text-amber-400" />
                AI Outpainting (Expand Frame)
              </span>
              <span className="font-mono-tabular text-xs text-zinc-400">
                {state.background.outpaintScale}x
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([1, 1.25, 1.5] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() =>
                    onCommitEdit(
                      {
                        ...state,
                        background: { ...state.background, outpaintScale: scale },
                      },
                      `AI Outpainting ${scale}x`
                    )
                  }
                  className={`py-1.5 rounded-md text-xs font-mono-tabular border transition-colors ${
                    state.background.outpaintScale === scale
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                      : 'border-[#252934] bg-[#161922] text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {scale === 1 ? 'Original' : `${scale}x Expand`}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Local Upload & Local AI Scene Generator */}
          <div className="space-y-3 pb-4 border-b border-[#23262E]">
            <button
              type="button"
              onClick={() => bgUploadRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#2B303C] bg-[#171A22] hover:bg-[#1F2430] text-xs font-medium text-zinc-200 transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Custom Background from Device</span>
            </button>
            <input
              ref={bgUploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadCustomBg}
            />

            <form onSubmit={handleGenerateLocalBg} className="space-y-2">
              <label htmlFor="local-bg-prompt" className="text-xs font-medium text-zinc-300 block">
                Local AI Background Synthesis
              </label>
              <div className="flex gap-2">
                <input
                  id="local-bg-prompt"
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Describe lighting & environment..."
                  className="flex-1 min-w-0 rounded-md bg-[#181B22] border border-[#2A2E39] px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </button>
              </div>
            </form>
          </div>

          {/* 13 Intelligent Background Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                Offline Background Scenes ({filteredPresets.length})
              </span>
              <select
                aria-label="Filter background category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as BackgroundCategory)}
                className="rounded bg-[#181B22] border border-[#2A2E39] px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {filteredPresets.map((preset) => {
                const isSelected =
                  state.background.mode === 'replace' &&
                  state.background.presetId === preset.id &&
                  !state.background.customBgUrl;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onCommitEdit(
                        {
                          ...state,
                          background: {
                            ...state.background,
                            mode: 'replace',
                            presetId: preset.id,
                            customBgUrl: null,
                          },
                        },
                        `Background: ${preset.name}`
                      )
                    }
                    className={`group text-left rounded-md overflow-hidden border transition-colors ${
                      isSelected
                        ? 'border-amber-500 bg-[#1B1F29]'
                        : 'border-[#23262E] bg-[#151820] hover:border-[#3A404F]'
                    }`}
                  >
                    <div
                      className="relative aspect-[16/10] w-full overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${preset.palette[0]}, ${preset.palette[1]}, ${preset.palette[2]})`,
                      }}
                    >
                      {preset.imageUrl && (
                        <img
                          src={preset.imageUrl}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 text-[#0B0C0E] flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-zinc-200 truncate">{preset.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{preset.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
