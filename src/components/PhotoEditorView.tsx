import React, { useState } from 'react';
import {
  Eraser,
  Eye,
  EyeOff,
  Focus,
  History,
  Layers,
  Lock,
  Sliders,
  Trash2,
} from 'lucide-react';
import { FILTER_PRESETS } from '../data/catalog';
import {
  EditVersion,
  HistoryEntry,
  ImageAnalysisMetrics,
  PhotoEditState,
} from '../types/studio';
import { PhotoCanvasViewport } from './PhotoCanvasViewport';

interface PhotoEditorViewProps {
  state: PhotoEditState;
  maxPreviewDimension: number;
  historyEntries: HistoryEntry[];
  historyIndex: number;
  versions: EditVersion[];
  onCommitEdit: (next: PhotoEditState, label: string) => void;
  onLiveChange: (next: PhotoEditState) => void;
  onToggleIdentityLock: () => void;
  onJumpHistory: (index: number) => void;
  onSaveVersion: () => void;
  onSelectVersion: (ver: EditVersion) => void;
  onResetAll: () => void;
  onMetricsUpdate: (metrics: ImageAnalysisMetrics, faceDeltaMean: number) => void;
  onCaptureThumbnail: (dataUrl: string) => void;
}

type InspectorTab = 'adjust' | 'layers' | 'objects' | 'history';

export const PhotoEditorView: React.FC<PhotoEditorViewProps> = ({
  state,
  maxPreviewDimension,
  historyEntries,
  historyIndex,
  versions,
  onCommitEdit,
  onLiveChange,
  onToggleIdentityLock,
  onJumpHistory,
  onSaveVersion,
  onSelectVersion,
  onResetAll,
  onMetricsUpdate,
  onCaptureThumbnail,
}) => {
  const [tab, setTab] = useState<InspectorTab>('adjust');
  const [canvasTool, setCanvasTool] = useState<'view' | 'eraser' | 'face-anchor'>('view');
  const [eraserRadius, setEraserRadius] = useState(0.08);

  const handleAddEraseStroke = (nx: number, ny: number) => {
    const next: PhotoEditState = {
      ...state,
      eraseStrokes: [
        ...state.eraseStrokes,
        {
          id: `stroke-${Date.now()}`,
          x: nx,
          y: ny,
          radius: eraserRadius,
          mode: 'inpaint',
        },
      ],
    };
    onCommitEdit(next, 'Smart Object Erase / Inpaint');
  };

  const handleUpdateFaceAnchor = (nx: number, ny: number) => {
    const next: PhotoEditState = {
      ...state,
      showFaceGuide: true,
      faceAnchor: { ...state.faceAnchor, x: nx, y: ny, detected: true },
    };
    onCommitEdit(next, 'Reposition Identity Face Anchor');
    setCanvasTool('view');
  };

  return (
    <div className="h-full overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row min-h-0">
      {/* Main Canvas Area */}
      <div className="shrink-0 lg:flex-1 min-w-0 lg:min-h-0">
        <PhotoCanvasViewport
          state={state}
          maxPreviewDimension={maxPreviewDimension}
          interactiveTool={canvasTool}
          eraserRadius={eraserRadius}
          versions={versions}
          onMetricsUpdate={onMetricsUpdate}
          onAddEraseStroke={handleAddEraseStroke}
          onUpdateFaceAnchor={handleUpdateFaceAnchor}
          onToggleIdentityLock={onToggleIdentityLock}
          onToggleFaceGuide={() =>
            onLiveChange({ ...state, showFaceGuide: !state.showFaceGuide })
          }
          onSaveVersion={onSaveVersion}
          onSelectVersion={onSelectVersion}
          onResetAll={onResetAll}
          onCaptureThumbnail={onCaptureThumbnail}
        />
      </div>

      {/* Right Precision Inspector */}
      <aside className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#23262E] bg-[#111318] flex flex-col lg:min-h-0">
        {/* Inspector Segmented Tabs */}
        <div
          role="tablist"
          aria-label="Photo editor tools"
          className="grid grid-cols-4 border-b border-[#23262E] bg-[#0F1116]"
        >
          {[
            { id: 'adjust' as InspectorTab, label: 'Adjust', icon: Sliders },
            { id: 'layers' as InspectorTab, label: 'Layers', icon: Layers },
            { id: 'objects' as InspectorTab, label: 'Objects', icon: Eraser },
            { id: 'history' as InspectorTab, label: 'History', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => {
                  setTab(item.id);
                  if (item.id !== 'objects') setCanvasTool('view');
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors border-b-2 ${
                  active
                    ? 'border-amber-500 text-zinc-100 bg-[#151820] font-medium'
                    : 'border-transparent text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {tab === 'adjust' && (
            <>
              {/* Master AI Intensity */}
              <div className="space-y-2 pb-4 border-b border-[#23262E]">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-ai-intensity" className="font-medium text-zinc-200">
                    Global AI Intensity
                  </label>
                  <span className="font-mono-tabular text-amber-400">{state.aiIntensity}%</span>
                </div>
                <input
                  id="slider-ai-intensity"
                  type="range"
                  min={0}
                  max={100}
                  value={state.aiIntensity}
                  onChange={(e) =>
                    onLiveChange({ ...state, aiIntensity: Number(e.target.value) })
                  }
                  onMouseUp={() => onCommitEdit(state, `AI Intensity ${state.aiIntensity}%`)}
                  className="studio-slider w-full"
                />
              </div>

              {/* Quick Filter Selector */}
              <div className="space-y-2 pb-4 border-b border-[#23262E]">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="select-quick-filter" className="font-medium text-zinc-200">
                    Active AI Look
                  </label>
                  <span className="font-mono-tabular text-zinc-400">{state.filterIntensity}%</span>
                </div>
                <select
                  id="select-quick-filter"
                  value={state.activeFilter}
                  onChange={(e) =>
                    onCommitEdit(
                      { ...state, activeFilter: e.target.value as PhotoEditState['activeFilter'] },
                      `Filter: ${e.target.value}`
                    )
                  }
                  className="w-full rounded-md bg-[#181B22] border border-[#2A2E39] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {FILTER_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.category})
                    </option>
                  ))}
                </select>
                <input
                  type="range"
                  min={0}
                  max={100}
                  aria-label="Filter intensity"
                  value={state.filterIntensity}
                  onChange={(e) =>
                    onLiveChange({ ...state, filterIntensity: Number(e.target.value) })
                  }
                  onMouseUp={() =>
                    onCommitEdit(state, `Filter Strength ${state.filterIntensity}%`)
                  }
                  className="studio-slider w-full"
                />
              </div>

              {/* Manual Light & Color Controls */}
              <div className="space-y-3.5">
                <p className="text-xs font-medium text-zinc-400">Manual Tone &amp; Color</p>
                {(
                  [
                    { key: 'exposure', label: 'Exposure', min: -50, max: 50 },
                    { key: 'contrast', label: 'Contrast', min: -50, max: 50 },
                    { key: 'warmth', label: 'Color Temperature', min: -50, max: 50 },
                    { key: 'saturation', label: 'Saturation', min: -50, max: 50 },
                    { key: 'sharpness', label: 'Optical Sharpness', min: 0, max: 100 },
                    { key: 'naturalSkin', label: 'Natural Skin Detail', min: 0, max: 100 },
                    { key: 'vignette', label: 'Lens Vignette', min: 0, max: 100 },
                  ] as const
                ).map((ctrl) => (
                  <div key={ctrl.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor={`slider-${ctrl.key}`} className="text-zinc-300">
                        {ctrl.label}
                      </label>
                      <span className="font-mono-tabular text-zinc-400">
                        {state.enhancement[ctrl.key] > 0 && ctrl.min < 0 ? '+' : ''}
                        {state.enhancement[ctrl.key]}
                      </span>
                    </div>
                    <input
                      id={`slider-${ctrl.key}`}
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
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
                        onCommitEdit(state, `Adjust ${ctrl.label} (${state.enhancement[ctrl.key]})`)
                      }
                      className="studio-slider w-full"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'layers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-300">Non-Destructive Layer Stack</p>
                <span className="text-xs text-zinc-500 font-mono-tabular">
                  {state.layers.filter((l) => l.visible).length}/{state.layers.length} Active
                </span>
              </div>
              <div className="space-y-2">
                {state.layers.map((layer) => (
                  <div
                    key={layer.id}
                    className="p-3 rounded-md border border-[#23262E] bg-[#161922] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          aria-label={`Toggle ${layer.name} visibility`}
                          onClick={() =>
                            onCommitEdit(
                              {
                                ...state,
                                layers: state.layers.map((l) =>
                                  l.id === layer.id ? { ...l, visible: !l.visible } : l
                                ),
                              },
                              `${layer.visible ? 'Hide' : 'Show'} ${layer.name}`
                            )
                          }
                          className="text-zinc-400 hover:text-zinc-100"
                        >
                          {layer.visible ? (
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                          )}
                        </button>
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {layer.name}
                        </span>
                      </div>
                      {layer.locked && (
                        <Lock
                          className="w-3 h-3 text-emerald-400 shrink-0"
                          aria-label="Protected layer"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-zinc-500">Opacity</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={layer.opacity}
                        aria-label={`${layer.name} opacity`}
                        onChange={(e) =>
                          onLiveChange({
                            ...state,
                            layers: state.layers.map((l) =>
                              l.id === layer.id
                                ? { ...l, opacity: Number(e.target.value) }
                                : l
                            ),
                          })
                        }
                        className="studio-slider flex-1"
                      />
                      <span className="font-mono-tabular text-[11px] text-zinc-400 w-8 text-right">
                        {layer.opacity}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'objects' && (
            <div className="space-y-5">
              {/* Smart Object Eraser & Inpainting */}
              <div className="space-y-3 pb-4 border-b border-[#23262E]">
                <p className="text-xs font-medium text-zinc-200">
                  AI Smart Eraser &amp; Object Removal
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Click any unwanted distraction, text, or passerby on the photo to cleanly patch-inpaint it locally. Facial pixels remain shielded by Identity Lock.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCanvasTool((t) => (t === 'eraser' ? 'view' : 'eraser'))
                    }
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      canvasTool === 'eraser'
                        ? 'bg-amber-500 text-[#0B0C0E]'
                        : 'bg-[#1B1F29] text-zinc-200 hover:bg-[#242936]'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>
                      {canvasTool === 'eraser' ? 'Eraser Brush Active' : 'Activate Smart Eraser'}
                    </span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="slider-eraser-size" className="text-zinc-400">
                      Brush Radius
                    </label>
                    <span className="font-mono-tabular text-zinc-300">
                      {Math.round(eraserRadius * 100)}%
                    </span>
                  </div>
                  <input
                    id="slider-eraser-size"
                    type="range"
                    min={3}
                    max={16}
                    value={Math.round(eraserRadius * 100)}
                    onChange={(e) => setEraserRadius(Number(e.target.value) / 100)}
                    className="studio-slider w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-400 font-mono-tabular">
                    {state.eraseStrokes.length} active patch{state.eraseStrokes.length === 1 ? '' : 'es'}
                  </span>
                  {state.eraseStrokes.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onCommitEdit({ ...state, eraseStrokes: [] }, 'Clear Object Patches')
                      }
                      className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Patches</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Face Identity Anchor Positioning */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-200">
                  Identity Lock Face Anchor
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Calibrate the protected facial embedding region if you imported a group shot or off-center portrait.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onLiveChange({ ...state, showFaceGuide: true });
                    setCanvasTool((t) => (t === 'face-anchor' ? 'view' : 'face-anchor'));
                  }}
                  className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    canvasTool === 'face-anchor'
                      ? 'bg-emerald-500 text-[#0B0C0E]'
                      : 'bg-[#1B1F29] text-zinc-200 hover:bg-[#242936]'
                  }`}
                >
                  <Focus className="w-3.5 h-3.5" />
                  <span>
                    {canvasTool === 'face-anchor'
                      ? 'Click Subject Face on Canvas'
                      : 'Reposition Face Anchor'}
                  </span>
                </button>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="slider-face-radius" className="text-zinc-400">
                      Protected Face Radius
                    </label>
                    <span className="font-mono-tabular text-zinc-300">
                      {Math.round(state.faceAnchor.rx * 100)}%
                    </span>
                  </div>
                  <input
                    id="slider-face-radius"
                    type="range"
                    min={8}
                    max={28}
                    value={Math.round(state.faceAnchor.rx * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100;
                      onLiveChange({
                        ...state,
                        showFaceGuide: true,
                        faceAnchor: { ...state.faceAnchor, rx: val, ry: val * 1.05 },
                      });
                    }}
                    className="studio-slider w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-300">Non-Destructive Edit History</p>
                <span className="font-mono-tabular text-xs text-zinc-500">
                  {historyEntries.length} states
                </span>
              </div>
              <ul className="space-y-1">
                {historyEntries.map((entry, idx) => {
                  const isCurrent = idx === historyIndex;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => onJumpHistory(idx)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs text-left transition-colors ${
                          isCurrent
                            ? 'bg-amber-500/15 text-amber-300 font-medium'
                            : idx > historyIndex
                              ? 'text-zinc-600 hover:text-zinc-400 hover:bg-[#161922]'
                              : 'text-zinc-300 hover:bg-[#161922]'
                        }`}
                      >
                        <span className="truncate">
                          {idx + 1}. {entry.label}
                        </span>
                        <span className="font-mono-tabular text-[11px] text-zinc-500 shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
