import React, { useState } from 'react';
import { Download, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { exportPhotoBlob } from '../engine/canvasRenderer';
import { getExportDimensions } from '../engine/videoEngine';
import {
  ExportConfig,
  IdentityWarning,
  PhotoEditState,
  StudioSettings,
} from '../types/studio';

interface ExportModalProps {
  open: boolean;
  photoState: PhotoEditState;
  settings: StudioSettings;
  onClose: () => void;
}

const SOCIAL_PRESETS: Array<{
  name: string;
  aspectRatio: ExportConfig['aspectRatio'];
  hint: string;
}> = [
  { name: 'Original Full Frame', aspectRatio: 'original', hint: 'Preserves sensor ratio' },
  { name: 'Instagram Portrait', aspectRatio: '4:5', hint: '4:5 Feed' },
  { name: 'Square Editorial', aspectRatio: '1:1', hint: '1:1 Avatar / Post' },
  { name: 'YouTube / Cinema', aspectRatio: '16:9', hint: '16:9 Landscape' },
  { name: 'Reels / TikTok / Story', aspectRatio: '9:16', hint: '9:16 Vertical' },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  photoState,
  settings,
  onClose,
}) => {
  const [config, setConfig] = useState<ExportConfig>({
    mediaType: 'photo',
    format:
      photoState.background.mode === 'remove'
        ? 'image/png'
        : settings.defaultImageFormat,
    quality: settings.defaultImageQuality,
    aspectRatio: 'original',
    upscaleMultiplier: photoState.enhancement.upscaleFactor,
    videoResolution: settings.defaultVideoResolution,
    presetName: 'Original Full Frame',
  });
  const [exporting, setExporting] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  if (!open) return null;

  const dims = getExportDimensions(photoState.sourceWidth, photoState.sourceHeight, config);

  const handleDownload = async () => {
    setExporting(true);
    setDoneMsg(null);
    try {
      const { blob, width, height } = await exportPhotoBlob(photoState, config);
      const ext =
        config.format === 'image/png'
          ? 'png'
          : config.format === 'image/webp'
            ? 'webp'
            : 'jpg';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumavault_${photoState.sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${width}x${height}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDoneMsg(`Exported ${width} × ${height} ${ext.toUpperCase()} directly to your device.`);
    } catch {
      setDoneMsg('Export failed. Try lowering upscale resolution.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-lg rounded-lg border border-[#282D3A] bg-[#12141A] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23262E]">
          <div>
            <h2 id="export-modal-title" className="font-display text-base font-semibold text-zinc-100">
              Export High-Resolution Media
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              100% local encoding · Zero cloud upload
            </p>
          </div>
          <button
            type="button"
            aria-label="Close export modal"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#1D212A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Format Selection */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-300 block">Output Format</span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'image/jpeg', label: 'JPEG', note: 'Best for sharing' },
                  { id: 'image/png', label: 'PNG', note: 'Lossless / Alpha' },
                  { id: 'image/webp', label: 'WebP', note: 'Modern compact' },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setConfig({ ...config, format: fmt.id })}
                  className={`p-2.5 rounded-md border text-left transition-colors ${
                    config.format === fmt.id
                      ? 'border-amber-500 bg-amber-500/12 text-amber-200'
                      : 'border-[#252934] bg-[#171A22] text-zinc-300 hover:border-[#3A404F]'
                  }`}
                >
                  <p className="text-xs font-semibold">{fmt.label}</p>
                  <p className="text-[11px] text-zinc-500">{fmt.note}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio / Social Presets */}
          <div className="space-y-2">
            <label htmlFor="export-social-preset" className="text-xs font-medium text-zinc-300 block">
              Aspect Ratio &amp; Social Media Preset
            </label>
            <select
              id="export-social-preset"
              value={config.aspectRatio}
              onChange={(e) => {
                const ar = e.target.value as ExportConfig['aspectRatio'];
                const preset = SOCIAL_PRESETS.find((p) => p.aspectRatio === ar);
                setConfig({
                  ...config,
                  aspectRatio: ar,
                  presetName: preset?.name ?? 'Custom',
                });
              }}
              className="w-full rounded-md bg-[#181B22] border border-[#2A2E39] px-3 py-2 text-sm text-zinc-100"
            >
              {SOCIAL_PRESETS.map((p) => (
                <option key={p.aspectRatio} value={p.aspectRatio}>
                  {p.name} — {p.hint}
                </option>
              ))}
            </select>
          </div>

          {/* Upscale Resolution & Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300 block">Resolution Scale</span>
              <div className="grid grid-cols-4 gap-1">
                {([1, 2, 4, 8] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConfig({ ...config, upscaleMultiplier: m })}
                    className={`py-1.5 rounded border text-xs font-mono-tabular ${
                      config.upscaleMultiplier === m
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-[#252934] bg-[#171A22] text-zinc-400'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="export-quality" className="text-zinc-300 font-medium">
                  Compression Quality
                </label>
                <span className="font-mono-tabular text-amber-400">{config.quality}%</span>
              </div>
              <input
                id="export-quality"
                type="range"
                min={60}
                max={100}
                value={config.quality}
                onChange={(e) => setConfig({ ...config, quality: Number(e.target.value) })}
                className="studio-slider w-full mt-2"
              />
            </div>
          </div>

          {/* Summary Readout */}
          <div className="p-3.5 rounded-md border border-[#23262E] bg-[#0F1116] flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="text-zinc-400">Final Output Dimensions</p>
              <p className="font-mono-tabular text-sm font-semibold text-zinc-100">
                {dims.width} × {dims.height} px
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-emerald-400 inline-flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{photoState.identityLock ? 'Identity Preserved' : 'Unlocked'}</span>
              </p>
              <p className="text-zinc-500">{config.presetName}</p>
            </div>
          </div>

          {doneMsg && <p className="text-xs text-emerald-400 font-medium">{doneMsg}</p>}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#23262E] bg-[#0F1116]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-medium text-zinc-300 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-[#0B0C0E] text-xs font-semibold whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Rendering Locally...' : 'Download to Device'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface IdentityWarningModalProps {
  warning: IdentityWarning | null;
  onCancel: () => void;
  onKeepProtected: () => void;
  onProceedAnyway: () => void;
}

export const IdentityWarningModal: React.FC<IdentityWarningModalProps> = ({
  warning,
  onCancel,
  onKeepProtected,
  onProceedAnyway,
}) => {
  if (!warning) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-warning-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-md rounded-lg border border-amber-500/40 bg-[#12141A] overflow-hidden shadow-2xl">
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <h2 id="identity-warning-title" className="font-display text-base font-semibold text-zinc-100">
              {warning.title}
            </h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{warning.reason}</p>
          <p className="text-xs text-emerald-300 leading-relaxed">
            Recommendation: {warning.recommendation}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3.5 border-t border-[#23262E] bg-[#0F1116]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-md text-xs text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onKeepProtected}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#0B0C0E] text-xs font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Keep Face Shield Active</span>
          </button>
          <button
            type="button"
            onClick={onProceedAnyway}
            className="px-3.5 py-2 rounded-md border border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-xs font-medium"
          >
            {warning.proposedActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
