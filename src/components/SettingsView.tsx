import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { StudioSettings } from '../types/studio';
import { PWAInstallButton } from './PWAInstallModal';

interface SettingsViewProps {
  settings: StudioSettings;
  storageSummary: { modelsMB: number; projectsMB: number; totalMB: number };
  onUpdateSettings: (next: StudioSettings) => void;
  onClearLocalData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  storageSummary,
  onUpdateSettings,
  onClearLocalData,
}) => {
  const [confirmWipe, setConfirmWipe] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-7">
      <div className="max-w-[920px] mx-auto space-y-8 pb-8">
        <div className="pb-5 border-b border-[#23262E]">
          <h1 className="font-display text-2xl font-semibold text-zinc-100">
            Studio Settings &amp; Privacy
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure identity protection defaults, Android offline installation, hardware acceleration, and local storage.
          </p>
        </div>

        {/* Android & Offline App Installation */}
        <section className="space-y-4 pb-6 border-b border-[#23262E]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-base font-semibold text-zinc-100">
              Android App Installation
            </h2>
          </div>
          <div className="p-4 rounded-lg border border-[#23262E] bg-[#12141A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-100">
                Install LumaVault Studio on Android
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                Runs full-screen from your Android home screen with offline Service Worker caching, maskable launcher icons, and local IndexedDB project storage. Includes <span className="font-mono-tabular text-zinc-200">capacitor.config.json</span> for Android Studio APK builds.
              </p>
            </div>
            <div className="shrink-0">
              <PWAInstallButton variant="card" />
            </div>
          </div>
        </section>

        {/* Privacy & Identity Protection */}
        <section className="space-y-4 pb-6 border-b border-[#23262E]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display text-base font-semibold text-zinc-100">
              Privacy &amp; Identity Preservation
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Enable Identity Lock by Default
                </p>
                <p className="text-xs text-zinc-400">
                  Automatically locks facial structure, eyes, nose, lips, and skin tone whenever importing new photos or videos.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Enable Identity Lock by Default"
                checked={settings.identityLockDefault}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, identityLockDefault: e.target.checked })
                }
                className="accent-emerald-500 w-4 h-4 shrink-0"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Strict Identity Safety Warnings
                </p>
                <p className="text-xs text-zinc-400">
                  Prompt with a confirmation warning before applying heavy artistic stylization or disabling facial protection.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Strict Identity Safety Warnings"
                checked={settings.strictIdentityWarnings}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, strictIdentityWarnings: e.target.checked })
                }
                className="accent-amber-500 w-4 h-4 shrink-0"
              />
            </div>

            <div className="p-4 rounded-md border border-[#23262E] bg-[#12141A] text-xs text-zinc-300 space-y-1">
              <p className="font-medium text-emerald-400">Local-Only Privacy Architecture</p>
              <p className="text-zinc-400 leading-relaxed">
                Original photos, videos, audio stems, and saved projects never leave this browser or device. No cloud uploads, no account sign-in, and zero external model training.
              </p>
            </div>
          </div>
        </section>

        {/* Performance & Export Defaults */}
        <section className="space-y-4 pb-6 border-b border-[#23262E]">
          <h2 className="font-display text-base font-semibold text-zinc-100">
            Performance &amp; Export Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="set-hw" className="text-xs font-medium text-zinc-300 block">
                Hardware Acceleration Engine
              </label>
              <select
                id="set-hw"
                value={settings.hardwareAcceleration}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    hardwareAcceleration: e.target.value as StudioSettings['hardwareAcceleration'],
                  })
                }
                className="w-full rounded-md bg-[#161922] border border-[#282D3A] px-3 py-2 text-sm text-zinc-100"
              >
                <option value="auto">Auto (GPU / NPU / CPU)</option>
                <option value="webgl">WebGL / GPU Priority</option>
                <option value="cpu">CPU Deterministic Mode</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-preview" className="text-xs font-medium text-zinc-300 block">
                Live Canvas Preview Cap
              </label>
              <select
                id="set-preview"
                value={settings.maxPreviewDimension}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    maxPreviewDimension: Number(e.target.value) as 720 | 1080 | 1440,
                  })
                }
                className="w-full rounded-md bg-[#161922] border border-[#282D3A] px-3 py-2 text-sm text-zinc-100"
              >
                <option value={720}>720p (Fastest / Low Battery)</option>
                <option value={1080}>1080p (Balanced Studio)</option>
                <option value={1440}>1440p (High-Resolution Preview)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-img-fmt" className="text-xs font-medium text-zinc-300 block">
                Default Photo Export Format
              </label>
              <select
                id="set-img-fmt"
                value={settings.defaultImageFormat}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    defaultImageFormat: e.target.value as StudioSettings['defaultImageFormat'],
                  })
                }
                className="w-full rounded-md bg-[#161922] border border-[#282D3A] px-3 py-2 text-sm text-zinc-100"
              >
                <option value="image/jpeg">JPEG (High Compatibility)</option>
                <option value="image/png">PNG (Lossless / Transparent Cutouts)</option>
                <option value="image/webp">WebP (Compact High Quality)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-vid-res" className="text-xs font-medium text-zinc-300 block">
                Default Video Export Resolution
              </label>
              <select
                id="set-vid-res"
                value={settings.defaultVideoResolution}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    defaultVideoResolution: e.target.value as StudioSettings['defaultVideoResolution'],
                  })
                }
                className="w-full rounded-md bg-[#161922] border border-[#282D3A] px-3 py-2 text-sm text-zinc-100"
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
                <option value="2K">2K Cinema</option>
                <option value="4K">4K Ultra HD</option>
              </select>
            </div>
          </div>
        </section>

        {/* Local Storage & Cache Wipe */}
        <section className="space-y-4">
          <h2 className="font-display text-base font-semibold text-zinc-100">
            Local Storage &amp; Data Deletion
          </h2>
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border border-[#23262E] bg-[#12141A] text-xs">
            <div>
              <p className="text-zinc-500">Cached AI Models</p>
              <p className="font-mono-tabular text-base font-semibold text-zinc-100 mt-0.5">
                {storageSummary.modelsMB} MB
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Saved Local Projects</p>
              <p className="font-mono-tabular text-base font-semibold text-zinc-100 mt-0.5">
                {storageSummary.projectsMB} MB
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Total On-Device</p>
              <p className="font-mono-tabular text-base font-semibold text-amber-400 mt-0.5">
                {storageSummary.totalMB} MB
              </p>
            </div>
          </div>

          {!confirmWipe ? (
            <button
              type="button"
              onClick={() => setConfirmWipe(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-500/35 bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Local Projects &amp; Cached Packs</span>
            </button>
          ) : (
            <div className="p-4 rounded-md border border-red-500/40 bg-red-500/10 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-red-200">
                Permanently delete all saved local projects, cached optional packs, and reset preferences?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmWipe(false)}
                  className="px-3 py-1.5 rounded bg-[#181B22] text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearLocalData();
                    setConfirmWipe(false);
                  }}
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
