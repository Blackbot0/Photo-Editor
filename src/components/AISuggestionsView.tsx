import React from 'react';
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { generateSmartSuggestions } from '../engine/imageMath';
import {
  ImageAnalysisMetrics,
  NavSection,
  PhotoEditState,
  SmartSuggestion,
} from '../types/studio';
import { PhotoCanvasViewport } from './PhotoCanvasViewport';

interface AISuggestionsViewProps {
  state: PhotoEditState;
  metrics: ImageAnalysisMetrics;
  maxPreviewDimension: number;
  appliedIds: string[];
  onApplySuggestion: (suggestion: SmartSuggestion) => void;
  onLiveChange: (next: PhotoEditState) => void;
  onToggleIdentityLock: () => void;
  onNavigate: (section: NavSection) => void;
}

export const AISuggestionsView: React.FC<AISuggestionsViewProps> = ({
  state,
  metrics,
  maxPreviewDimension,
  appliedIds,
  onApplySuggestion,
  onLiveChange,
  onToggleIdentityLock,
  onNavigate,
}) => {
  const suggestions = generateSmartSuggestions(metrics);

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

      <aside className="w-full lg:w-[410px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#23262E] bg-[#111318] flex flex-col lg:min-h-0">
        <div className="px-4 py-3.5 border-b border-[#23262E]">
          <h2 className="font-display text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Creative Assistant</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            On-device visual diagnosis · Explains every edit before applying
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Live On-Device Image Diagnostics */}
          <div className="grid grid-cols-3 gap-2 pb-4 border-b border-[#23262E] text-xs">
            <div className="p-2.5 rounded-md bg-[#161922] border border-[#23262E]">
              <p className="text-zinc-500">Exposure</p>
              <p className="font-mono-tabular text-zinc-100 font-medium mt-0.5">
                {metrics.avgLuminance}/255
              </p>
            </div>
            <div className="p-2.5 rounded-md bg-[#161922] border border-[#23262E]">
              <p className="text-zinc-500">Contrast</p>
              <p className="font-mono-tabular text-zinc-100 font-medium mt-0.5">
                {metrics.contrastSpread} σ
              </p>
            </div>
            <div className="p-2.5 rounded-md bg-[#161922] border border-[#23262E]">
              <p className="text-zinc-500">BG Clutter</p>
              <p className="font-mono-tabular text-zinc-100 font-medium mt-0.5">
                {metrics.backgroundClutter}%
              </p>
            </div>
          </div>

          {/* Actionable One-Tap Suggestions */}
          <div className="space-y-3">
            {suggestions.map((sug) => {
              const applied = appliedIds.includes(sug.id);
              return (
                <div
                  key={sug.id}
                  className="p-4 rounded-lg border border-[#23262E] bg-[#151820] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-amber-400 font-medium">{sug.category}</span>
                    <span className="text-emerald-400 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Identity Safe</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100">{sug.title}</h3>
                  <p className="text-xs text-zinc-200 leading-relaxed">{sug.headline}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <span className="text-zinc-300 font-medium">What changes: </span>
                    {sug.explanation}
                  </p>

                  <div className="pt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(sug)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        applied
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500 hover:bg-amber-400 text-[#0B0C0E]'
                      }`}
                    >
                      {applied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <span>Apply Edit</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          sug.category === 'Background'
                            ? 'background-studio'
                            : sug.category === 'Clothing'
                              ? 'clothing-studio'
                              : sug.category === 'Enhancement'
                                ? 'ai-enhancer'
                                : 'ai-filters'
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 whitespace-nowrap"
                    >
                      <span>Fine-tune</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};
