import React from 'react';
import { Check, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import { FILTER_PRESETS } from '../data/catalog';
import { recommendFilterIds } from '../engine/imageMath';
import {
  FilterPreset,
  ImageAnalysisMetrics,
  PhotoEditState,
} from '../types/studio';
import { PhotoCanvasViewport } from './PhotoCanvasViewport';

interface AIFiltersViewProps {
  state: PhotoEditState;
  metrics: ImageAnalysisMetrics;
  maxPreviewDimension: number;
  onCommitEdit: (next: PhotoEditState, label: string) => void;
  onLiveChange: (next: PhotoEditState) => void;
  onToggleIdentityLock: () => void;
}

export const AIFiltersView: React.FC<AIFiltersViewProps> = ({
  state,
  metrics,
  maxPreviewDimension,
  onCommitEdit,
  onLiveChange,
  onToggleIdentityLock,
}) => {
  const recommendedIds = recommendFilterIds(metrics);
  const recommendedPresets = recommendedIds
    .map((id) => FILTER_PRESETS.find((f) => f.id === id))
    .filter((f): f is FilterPreset => Boolean(f));

  const applyFilter = (preset: FilterPreset) => {
    onCommitEdit(
      {
        ...state,
        activeFilter: preset.id,
        filterIntensity: preset.id === 'none' ? 0 : Math.max(60, state.filterIntensity || 75),
      },
      `AI Filter: ${preset.name}`
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
            AI Filters &amp; Creative Effects
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            16 offline color grades · Automatic photo analysis
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Intensity Slider */}
          <div className="space-y-1.5 pb-4 border-b border-[#23262E]">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-filter-strength" className="font-medium text-zinc-200">
                Filter Intensity
              </label>
              <span className="font-mono-tabular text-amber-400">{state.filterIntensity}%</span>
            </div>
            <input
              id="slider-filter-strength"
              type="range"
              min={0}
              max={100}
              value={state.filterIntensity}
              onChange={(e) =>
                onLiveChange({ ...state, filterIntensity: Number(e.target.value) })
              }
              onMouseUp={() =>
                onCommitEdit(state, `Filter Intensity ${state.filterIntensity}%`)
              }
              className="studio-slider w-full"
            />
          </div>

          {/* Smart AI Filter Recommendations */}
          <div className="space-y-2.5 pb-4 border-b border-[#23262E]">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended for This Photo</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {metrics.avgLuminance < 110
                ? 'Detected low-key exposure. Studio lighting and cinematic curves will lift shadows while keeping skin tones accurate.'
                : metrics.warmthBias < 0
                  ? 'Cool ambient tone detected. Warm golden-hour or cinematic amber balance complements facial tones.'
                  : 'Balanced daylight capture detected. DSLR prime contrast and portrait soft key enhance depth naturally.'}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {recommendedPresets.map((preset) => {
                const active = state.activeFilter === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyFilter(preset)}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-md border text-left transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-[#252934] bg-[#161922] hover:border-[#3A404F]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-100">{preset.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{preset.description}</p>
                    </div>
                    <span className="text-xs font-medium text-amber-400 shrink-0">
                      {active ? 'Active' : 'Preview'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complete 16-Filter Offline Library */}
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-zinc-300">
              All Offline Color Grades ({FILTER_PRESETS.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FILTER_PRESETS.map((preset) => {
                const active = state.activeFilter === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyFilter(preset)}
                    className={`p-3 rounded-md border text-left transition-colors space-y-1.5 ${
                      active
                        ? 'border-amber-500 bg-[#1B1F29]'
                        : 'border-[#23262E] bg-[#151820] hover:border-[#3A404F]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-zinc-100 truncate">
                        {preset.name}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <span className="truncate">{preset.category}</span>
                      <span aria-hidden="true">·</span>
                      {preset.identitySafe ? (
                        <span className="text-emerald-400 inline-flex items-center gap-0.5 shrink-0">
                          <ShieldCheck className="w-3 h-3" />
                          Safe
                        </span>
                      ) : (
                        <span className="text-amber-400 inline-flex items-center gap-0.5 shrink-0">
                          <ShieldAlert className="w-3 h-3" />
                          Shielded
                        </span>
                      )}
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
