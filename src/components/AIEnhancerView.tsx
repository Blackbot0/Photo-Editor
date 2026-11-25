import React from 'react';
import { History, ShieldCheck, Sparkles } from 'lucide-react';
import { SAMPLE_MEDIA } from '../data/catalog';
import { EnhancementState, PhotoEditState } from '../types/studio';
import { PhotoCanvasViewport } from './PhotoCanvasViewport';

interface AIEnhancerViewProps {
  state: PhotoEditState;
  maxPreviewDimension: number;
  has8xPackInstalled: boolean;
  onCommitEdit: (next: PhotoEditState, label: string) => void;
  onLiveChange: (next: PhotoEditState) => void;
  onToggleIdentityLock: () => void;
  onLoadSamplePhoto: (index: number) => void;
  onOpenModelManager: () => void;
}

export const AIEnhancerView: React.FC<AIEnhancerViewProps> = ({
  state,
  maxPreviewDimension,
  has8xPackInstalled,
  onCommitEdit,
  onLiveChange,
  onToggleIdentityLock,
  onLoadSamplePhoto,
  onOpenModelManager,
}) => {
  const updateEnhancement = (patch: Partial<EnhancementState>, label: string) => {
    onCommitEdit(
      {
        ...state,
        enhancement: { ...state.enhancement, ...patch },
      },
      label
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

      <aside className="w-full lg:w-[370px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#23262E] bg-[#111318] flex flex-col lg:min-h-0">
        <div className="px-4 py-3.5 border-b border-[#23262E]">
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            AI Image Enhancer &amp; Restoration
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Local Super-Resolution · Denoise · Archival Repair
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Upscale Resolution Selector (2x, 4x, 8x) */}
          <div className="space-y-2.5 pb-4 border-b border-[#23262E]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">AI Super-Resolution Upscaling</span>
              <span className="font-mono-tabular text-amber-400">
                {state.sourceWidth * state.enhancement.upscaleFactor} ×{' '}
                {state.sourceHeight * state.enhancement.upscaleFactor}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 4, 8] as const).map((mult) => {
                const active = state.enhancement.upscaleFactor === mult;
                const locked8x = mult === 8 && !has8xPackInstalled;
                return (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => {
                      if (locked8x) {
                        onOpenModelManager();
                        return;
                      }
                      updateEnhancement(
                        {
                          upscaleFactor: mult,
                          sharpness: Math.max(state.enhancement.sharpness, mult > 1 ? 35 : 10),
                        },
                        `AI Upscale ${mult}x`
                      );
                    }}
                    className={`py-2 rounded-md border text-xs font-mono-tabular font-medium transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : locked8x
                          ? 'border-[#252934] bg-[#141720] text-zinc-500 hover:text-zinc-300'
                          : 'border-[#252934] bg-[#161922] text-zinc-200 hover:border-[#3A404F]'
                    }`}
                  >
                    {mult === 1 ? '1x' : locked8x ? '8x Pack' : `${mult}x`}
                  </button>
                );
              })}
            </div>
            {!has8xPackInstalled && (
              <p className="text-[11px] text-zinc-500">
                2x and 4x are built-in offline. Download the optional 8x Archival Pack in AI Model Manager for print-wall exports.
              </p>
            )}
          </div>

          {/* One-Tap Restoration Recipes */}
          <div className="space-y-2 pb-4 border-b border-[#23262E]">
            <p className="text-xs font-medium text-zinc-200">One-Tap Offline Restoration</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() =>
                  updateEnhancement(
                    {
                      upscaleFactor: 4,
                      deblurRestore: 55,
                      denoise: 35,
                      sharpness: 48,
                      portraitQuality: 50,
                      naturalSkin: 28,
                    },
                    'Auto Portrait 4K Restore'
                  )
                }
                className="flex items-center justify-between px-3 py-2.5 rounded-md bg-[#181B22] hover:bg-[#222733] border border-[#292E3A] text-xs text-zinc-100 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restore Blurry Portrait to 4K</span>
                </span>
                <span className="text-zinc-400">Apply</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateEnhancement(
                    {
                      upscaleFactor: 2,
                      oldPhotoRestore: 78,
                      denoise: 45,
                      deblurRestore: 40,
                      contrast: 14,
                      exposure: 8,
                    },
                    'Old & Damaged Photo Recovery'
                  )
                }
                className="flex items-center justify-between px-3 py-2.5 rounded-md bg-[#181B22] hover:bg-[#222733] border border-[#292E3A] text-xs text-zinc-100 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recover Old &amp; Faded Photograph</span>
                </span>
                <span className="text-zinc-400">Apply</span>
              </button>
            </div>
          </div>

          {/* Precision Restoration Sliders */}
          <div className="space-y-3.5 pb-4 border-b border-[#23262E]">
            {(
              [
                { key: 'deblurRestore', label: 'Deblur & Focus Recovery' },
                { key: 'denoise', label: 'Noise & Grain Reduction' },
                { key: 'sharpness', label: 'Micro-Detail Sharpness' },
                { key: 'oldPhotoRestore', label: 'Archival Fade & Contrast Recovery' },
                { key: 'portraitQuality', label: 'Portrait Clarity & Eye Pop' },
                { key: 'naturalSkin', label: 'Natural Skin Enhancement (No Plastic)' },
              ] as const
            ).map((ctrl) => (
              <div key={ctrl.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={`enh-${ctrl.key}`} className="text-zinc-300">
                    {ctrl.label}
                  </label>
                  <span className="font-mono-tabular text-zinc-400">
                    {state.enhancement[ctrl.key]}%
                  </span>
                </div>
                <input
                  id={`enh-${ctrl.key}`}
                  type="range"
                  min={0}
                  max={100}
                  value={state.enhancement[ctrl.key]}
                  onChange={(e) =>
                    onLiveChange({
                      ...state,
                      enhancement: {
                        ...state.enhancement,
                        [ctrl.key]: Number(e.target.value),
                      },
                    })
                  }
                  onMouseUp={() =>
                    onCommitEdit(state, `${ctrl.label} ${state.enhancement[ctrl.key]}%`)
                  }
                  className="studio-slider w-full"
                />
              </div>
            ))}
          </div>

          {/* Sample Archival Plate Quick Switcher */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">Test with bundled archival sample</p>
            <div className="flex items-center gap-2">
              {SAMPLE_MEDIA.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onLoadSamplePhoto(idx)}
                  className={`flex-1 py-1.5 px-2.5 rounded-md border text-xs truncate transition-colors ${
                    state.sourceImageUrl === s.url
                      ? 'border-amber-500 text-amber-300 bg-[#1B1F29]'
                      : 'border-[#252934] bg-[#151820] text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Natural facial pores, freckles, and identity remain preserved.</span>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};
