import React from 'react';
import { Check, ShieldCheck, Sparkles } from 'lucide-react';
import { OUTFIT_CATALOG, OUTFIT_COLORS } from '../data/catalog';
import { ClothingState, PhotoEditState } from '../types/studio';
import { PhotoCanvasViewport } from './PhotoCanvasViewport';

interface ClothingStudioViewProps {
  state: PhotoEditState;
  maxPreviewDimension: number;
  onCommitEdit: (next: PhotoEditState, label: string) => void;
  onLiveChange: (next: PhotoEditState) => void;
  onToggleIdentityLock: () => void;
}

const HAIR_OPTIONS: Array<{ id: ClothingState['hairStyle']; label: string }> = [
  { id: 'original', label: 'Original Hair' },
  { id: 'textured-crop', label: 'Textured Crop' },
  { id: 'classic-part', label: 'Classic Side Part' },
  { id: 'soft-waves', label: 'Soft Editorial Waves' },
  { id: 'slick-back', label: 'Slick Back' },
];

const FACIAL_HAIR_OPTIONS: Array<{ id: ClothingState['facialHair']; label: string }> = [
  { id: 'original', label: 'Original' },
  { id: 'clean-trim', label: 'Clean Trim' },
  { id: 'light-stubble', label: 'Light Stubble' },
  { id: 'sculpted-beard', label: 'Sculpted Beard' },
];

const OUTFIT_COMBOS = [
  {
    name: 'Executive Tailored',
    category: 'suit' as const,
    styleName: 'Tailored Wool Suit',
    colorHex: '#1B2845',
    fabricTexture: 'wool' as const,
    accessories: { sunglasses: false, watch: true, chain: false },
  },
  {
    name: 'Parisian Streetwear',
    category: 'jacket' as const,
    styleName: 'Architectural Jacket',
    colorHex: '#3B4A3B',
    fabricTexture: 'denim' as const,
    accessories: { sunglasses: true, watch: false, chain: true },
  },
  {
    name: 'Minimalist Monochrome',
    category: 'hoodie' as const,
    styleName: 'Minimalist Hoodie',
    colorHex: '#17191E',
    fabricTexture: 'matte' as const,
    accessories: { sunglasses: false, watch: true, chain: true },
  },
  {
    name: 'Warm Editorial Linen',
    category: 'shirt' as const,
    styleName: 'Oxford Dress Shirt',
    colorHex: '#C8B8A2',
    fabricTexture: 'cotton' as const,
    accessories: { sunglasses: true, watch: true, chain: false },
  },
  {
    name: 'Evening Heritage',
    category: 'traditional' as const,
    styleName: 'Embroidered Heritage Coat',
    colorHex: '#5C2230',
    fabricTexture: 'silk' as const,
    accessories: { sunglasses: false, watch: true, chain: false },
  },
];

export const ClothingStudioView: React.FC<ClothingStudioViewProps> = ({
  state,
  maxPreviewDimension,
  onCommitEdit,
  onLiveChange,
  onToggleIdentityLock,
}) => {
  const updateClothing = (patch: Partial<ClothingState>, label: string) => {
    onCommitEdit(
      {
        ...state,
        clothing: { ...state.clothing, ...patch },
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

      <aside className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#23262E] bg-[#111318] flex flex-col lg:min-h-0">
        <div className="px-4 py-3.5 border-b border-[#23262E]">
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            Clothing &amp; Style Studio
          </h2>
          <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Face &amp; body proportions strictly preserved</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Curated 5 Outfit Combinations */}
          <div className="space-y-2 pb-4 border-b border-[#23262E]">
            <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Suggested Outfit Combinations</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {OUTFIT_COMBOS.map((combo) => (
                <button
                  key={combo.name}
                  type="button"
                  onClick={() =>
                    updateClothing(
                      {
                        category: combo.category,
                        styleName: combo.styleName,
                        colorHex: combo.colorHex,
                        fabricTexture: combo.fabricTexture,
                        intensity: 78,
                        accessories: combo.accessories,
                      },
                      `Outfit Combo: ${combo.name}`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-md bg-[#181B22] hover:bg-[#222733] border border-[#282D3A] text-xs text-zinc-200 transition-colors whitespace-nowrap"
                >
                  {combo.name}
                </button>
              ))}
            </div>
          </div>

          {/* Clothing Garment Categories */}
          <div className="space-y-2.5 pb-4 border-b border-[#23262E]">
            <p className="text-xs font-medium text-zinc-200">Garment Style</p>
            <div className="grid grid-cols-2 gap-2">
              {OUTFIT_CATALOG.map((item) => {
                const active = state.clothing.category === item.category;
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() =>
                      updateClothing(
                        {
                          category: item.category,
                          styleName: item.label,
                          colorHex:
                            item.category === 'none'
                              ? state.clothing.colorHex
                              : state.clothing.category === 'none'
                                ? item.defaultColor
                                : state.clothing.colorHex,
                          fabricTexture: item.fabricTexture,
                        },
                        `Clothing: ${item.label}`
                      )
                    }
                    className={`p-2.5 rounded-md border text-left transition-colors ${
                      active
                        ? 'border-amber-500 bg-[#1B1F29]'
                        : 'border-[#23262E] bg-[#151820] hover:border-[#3A404F]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-zinc-100 truncate">
                        {item.label}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">
                      {item.fabricTexture} finish
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fabric Color Swatches & Blend Intensity */}
          <div className="space-y-3 pb-4 border-b border-[#23262E]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">Fabric Color</span>
              <span className="font-mono-tabular text-xs text-zinc-400">
                {state.clothing.colorHex}
              </span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {OUTFIT_COLORS.map((swatch) => {
                const active = state.clothing.colorHex === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    aria-label={`Fabric color ${swatch.name}`}
                    title={swatch.name}
                    onClick={() =>
                      updateClothing(
                        {
                          colorHex: swatch.hex,
                          category:
                            state.clothing.category === 'none'
                              ? 'jacket'
                              : state.clothing.category,
                        },
                        `Fabric Color: ${swatch.name}`
                      )
                    }
                    className={`w-8 h-8 rounded-md border-2 transition-transform ${
                      active
                        ? 'border-amber-400 scale-105'
                        : 'border-[#2E3340] hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                  />
                );
              })}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="slider-fabric-blend" className="text-zinc-300">
                  Fabric Texture &amp; Fold Blend
                </label>
                <span className="font-mono-tabular text-zinc-400">
                  {state.clothing.intensity}%
                </span>
              </div>
              <input
                id="slider-fabric-blend"
                type="range"
                min={0}
                max={100}
                value={state.clothing.intensity}
                onChange={(e) =>
                  onLiveChange({
                    ...state,
                    clothing: { ...state.clothing, intensity: Number(e.target.value) },
                  })
                }
                className="studio-slider w-full"
              />
            </div>
          </div>

          {/* Accessories */}
          <div className="space-y-2.5 pb-4 border-b border-[#23262E]">
            <p className="text-xs font-medium text-zinc-200">Studio Accessories</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'sunglasses', label: 'Sunglasses' },
                  { key: 'watch', label: 'Watch' },
                  { key: 'chain', label: 'Gold Chain' },
                ] as const
              ).map((acc) => {
                const enabled = state.clothing.accessories[acc.key];
                return (
                  <button
                    key={acc.key}
                    type="button"
                    aria-pressed={enabled}
                    onClick={() =>
                      updateClothing(
                        {
                          accessories: {
                            ...state.clothing.accessories,
                            [acc.key]: !enabled,
                          },
                        },
                        `${enabled ? 'Remove' : 'Add'} ${acc.label}`
                      )
                    }
                    className={`py-2 px-2.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
                      enabled
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-[#23262E] bg-[#151820] text-zinc-300 hover:border-[#3A404F]'
                    }`}
                  >
                    {acc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hairstyle & Facial Hair Preview */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="select-hairstyle" className="text-xs font-medium text-zinc-200 block">
                Hairstyle Contour (Identity Preserved)
              </label>
              <select
                id="select-hairstyle"
                value={state.clothing.hairStyle}
                onChange={(e) =>
                  updateClothing(
                    { hairStyle: e.target.value as ClothingState['hairStyle'] },
                    `Hairstyle: ${e.target.value}`
                  )
                }
                className="w-full rounded-md bg-[#181B22] border border-[#2A2E39] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {HAIR_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-facial-hair" className="text-xs font-medium text-zinc-200 block">
                Facial Hair Grooming
              </label>
              <select
                id="select-facial-hair"
                value={state.clothing.facialHair}
                onChange={(e) =>
                  updateClothing(
                    { facialHair: e.target.value as ClothingState['facialHair'] },
                    `Facial Hair: ${e.target.value}`
                  )
                }
                className="w-full rounded-md bg-[#181B22] border border-[#2A2E39] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {FACIAL_HAIR_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
