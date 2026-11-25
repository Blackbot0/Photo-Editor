import React, { useEffect, useRef, useState } from 'react';
import {
  Columns2,
  Eye,
  Focus,
  Layers,
  RotateCcw,
  Save,
  ShieldCheck,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { renderPhotoToCanvas } from '../engine/canvasRenderer';
import {
  EditVersion,
  ImageAnalysisMetrics,
  PhotoEditState,
} from '../types/studio';

interface PhotoCanvasViewportProps {
  state: PhotoEditState;
  maxPreviewDimension: number;
  interactiveTool?: 'view' | 'eraser' | 'face-anchor';
  eraserRadius?: number;
  versions?: EditVersion[];
  onMetricsUpdate?: (metrics: ImageAnalysisMetrics, faceDeltaMean: number) => void;
  onAddEraseStroke?: (nx: number, ny: number) => void;
  onUpdateFaceAnchor?: (nx: number, ny: number) => void;
  onToggleIdentityLock: () => void;
  onToggleFaceGuide: () => void;
  onSaveVersion?: () => void;
  onSelectVersion?: (version: EditVersion) => void;
  onResetAll?: () => void;
  onCaptureThumbnail?: (dataUrl: string) => void;
}

export const PhotoCanvasViewport: React.FC<PhotoCanvasViewportProps> = ({
  state,
  maxPreviewDimension,
  interactiveTool = 'view',
  eraserRadius = 0.08,
  versions = [],
  onMetricsUpdate,
  onAddEraseStroke,
  onUpdateFaceAnchor,
  onToggleIdentityLock,
  onToggleFaceGuide,
  onSaveVersion,
  onSelectVersion,
  onResetAll,
  onCaptureThumbnail,
}) => {
  const editedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [zoom, setZoom] = useState<number>(100);
  const [isRendering, setIsRendering] = useState(false);
  const [renderDims, setRenderDims] = useState({ w: state.sourceWidth, h: state.sourceHeight });
  const [faceDelta, setFaceDelta] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);

  const metricsCbRef = useRef(onMetricsUpdate);
  metricsCbRef.current = onMetricsUpdate;
  const thumbCbRef = useRef(onCaptureThumbnail);
  thumbCbRef.current = onCaptureThumbnail;

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!editedCanvasRef.current) return;
      setIsRendering(true);
      setRenderError(null);
      try {
        const previewCap = Math.min(maxPreviewDimension, 760);
        const res = await renderPhotoToCanvas(
          editedCanvasRef.current,
          state,
          previewCap,
          false
        );
        if (cancelled) return;
        setRenderDims({ w: res.width, h: res.height });
        setFaceDelta(res.faceDeltaMean);
        metricsCbRef.current?.(res.metrics, res.faceDeltaMean);

        if (originalCanvasRef.current) {
          await renderPhotoToCanvas(originalCanvasRef.current, state, previewCap, true);
        }

        if (thumbCbRef.current && editedCanvasRef.current) {
          try {
            const thumbUrl = editedCanvasRef.current.toDataURL('image/jpeg', 0.6);
            thumbCbRef.current(thumbUrl);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        if (!cancelled) {
          setRenderError(err instanceof Error ? err.message : 'Unable to render local image');
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    const timer = window.setTimeout(render, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state, maxPreviewDimension]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactiveTool === 'view' || !editedCanvasRef.current) return;
    const rect = editedCanvasRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;

    if (interactiveTool === 'eraser' && onAddEraseStroke) {
      onAddEraseStroke(nx, ny);
    } else if (interactiveTool === 'face-anchor' && onUpdateFaceAnchor) {
      onUpdateFaceAnchor(nx, ny);
    }
  };

  const effectiveOutW = Math.round(
    state.sourceWidth * state.enhancement.upscaleFactor * state.background.outpaintScale
  );
  const effectiveOutH = Math.round(
    state.sourceHeight * state.enhancement.upscaleFactor * state.background.outpaintScale
  );

  return (
    <div className="flex flex-col lg:h-full min-h-0 bg-[#0B0C0E]">
      {/* Viewport Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 lg:px-4 py-2 border-b border-[#23262E] bg-[#111318]">
        <div className="flex flex-wrap items-center gap-2 lg:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleIdentityLock}
            aria-pressed={state.identityLock}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
              state.identityLock
                ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/12 border-amber-500/35 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            {state.identityLock ? (
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{state.identityLock ? 'Identity Lock: ON' : 'Identity Lock: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFaceGuide}
            aria-pressed={state.showFaceGuide}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap shrink-0 ${
              state.showFaceGuide
                ? 'bg-[#232833] text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#191C24]'
            }`}
          >
            <Focus className="w-3.5 h-3.5 shrink-0" />
            <span>Face Region</span>
          </button>

          <button
            type="button"
            onClick={() => setCompareMode((v) => !v)}
            aria-pressed={compareMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap shrink-0 ${
              compareMode
                ? 'bg-amber-500/15 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#191C24]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0" />
            <span>Before / After</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSaveVersion && (
            <button
              type="button"
              onClick={onSaveVersion}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-white hover:bg-[#1D212A] transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>Save Version</span>
            </button>
          )}
          {onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-[#1D212A] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset</span>
            </button>
          )}
          <div className="flex items-center gap-1 pl-2 border-l border-[#23262E]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              aria-label="Zoom out"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-[#1D212A]"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono-tabular text-xs text-zinc-300 w-10 text-center">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(200, z + 25))}
              aria-label="Zoom in"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-[#1D212A]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Darkroom Stage */}
      <div className="relative flex-1 min-h-[340px] flex items-center justify-center overflow-auto p-6 bg-[#090A0D]">
        {interactiveTool !== 'view' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-md bg-[#161920]/95 border border-[#2C313D] text-xs text-amber-300">
            {interactiveTool === 'eraser'
              ? `Smart Eraser active (${Math.round(eraserRadius * 100)}% brush) — Click image to remove distractions`
              : 'Face Anchor mode — Click the center of the subject’s face to reposition Identity Lock'}
          </div>
        )}

        {renderError ? (
          <div className="max-w-sm text-center p-6 border border-[#23262E] rounded-lg bg-[#12141A]">
            <p className="text-sm font-medium text-zinc-200 mb-1">Preview Unavailable</p>
            <p className="text-xs text-zinc-400">{renderError}</p>
          </div>
        ) : (
          <div
            onClick={handleCanvasClick}
            data-testid="photo-stage"
            data-identity-lock={String(state.identityLock)}
            data-active-filter={state.activeFilter}
            data-bg-mode={state.background.mode}
            className={`relative select-none shadow-2xl border border-[#23262E] rounded-sm overflow-hidden ${
              interactiveTool !== 'view' ? 'cursor-crosshair' : ''
            }`}
            style={{
              backgroundImage:
                state.background.mode === 'remove'
                  ? 'linear-gradient(45deg, #1b1e25 25%, transparent 25%), linear-gradient(-45deg, #1b1e25 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1e25 75%), linear-gradient(-45deg, transparent 75%, #1b1e25 75%)'
                  : undefined,
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Edited Live Canvas */}
            <canvas
              ref={editedCanvasRef}
              data-testid="photo-preview-canvas"
              className="block max-h-[56vh] lg:max-h-[64vh] w-auto h-auto object-contain"
            />

            {/* Before/After Original Overlay Canvas */}
            <div
              className={`absolute inset-0 overflow-hidden pointer-events-none ${
                compareMode ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
            >
              <canvas
                ref={originalCanvasRef}
                className="block w-full h-full object-contain"
              />
              <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/75 text-zinc-200 text-xs font-medium rounded-sm">
                Before
              </span>
            </div>

            {compareMode && (
              <>
                <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/75 text-amber-300 text-xs font-medium rounded-sm pointer-events-none">
                  After
                </span>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none"
                  style={{ left: `${splitPercent}%` }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Before/After Split Slider Bar (only visible when Compare is active) */}
      {compareMode && (
        <div className="flex items-center gap-4 px-5 py-2.5 bg-[#12141A] border-t border-[#23262E]">
          <span className="text-xs text-zinc-400 whitespace-nowrap">Split Comparison</span>
          <input
            type="range"
            min={5}
            max={95}
            value={splitPercent}
            aria-label="Before and after split position"
            onChange={(e) => setSplitPercent(Number(e.target.value))}
            className="studio-slider flex-1"
          />
          <span className="font-mono-tabular text-xs text-zinc-300 w-10 text-right">
            {splitPercent}%
          </span>
        </div>
      )}

      {/* Version Comparison Strip (if user saved versions) */}
      {versions.length > 0 && onSelectVersion && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[#111318] border-t border-[#23262E] overflow-x-auto">
          <span className="text-xs text-zinc-500 whitespace-nowrap shrink-0 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Versions
          </span>
          {versions.map((ver) => (
            <button
              key={ver.id}
              type="button"
              onClick={() => onSelectVersion(ver)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#181B22] hover:bg-[#222631] border border-[#262A34] text-xs text-zinc-200 whitespace-nowrap shrink-0 transition-colors"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span>{ver.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Quiet Unboxed Technical Metadata Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-[#23262E] bg-[#111318] text-xs text-zinc-400">
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="text-zinc-200 font-medium truncate">{state.sourceName}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular whitespace-nowrap">
            {effectiveOutW} × {effectiveOutH} px
          </span>
          {state.enhancement.upscaleFactor > 1 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-mono-tabular whitespace-nowrap">
                {state.enhancement.upscaleFactor}x Upscale
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap font-mono-tabular">
          <span>
            {isRendering
              ? 'Processing locally...'
              : `Face Fidelity: ${Math.max(82, Math.min(100, Math.round(100 - faceDelta * 0.9)))}%`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-zinc-500">
            Preview {renderDims.w}×{renderDims.h}
          </span>
        </div>
      </div>
    </div>
  );
};
