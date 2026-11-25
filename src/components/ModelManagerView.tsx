import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { AIModelPack, ProcessingMode } from '../types/studio';

interface ModelManagerViewProps {
  packs: AIModelPack[];
  processingMode: ProcessingMode;
  onToggleInstallPack: (packId: string) => void;
  onChangeProcessingMode: (mode: ProcessingMode) => void;
}

export const ModelManagerView: React.FC<ModelManagerViewProps> = ({
  packs,
  processingMode,
  onToggleInstallPack,
  onChangeProcessingMode,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const builtInPacks = packs.filter((p) => p.builtIn);
  const optionalPacks = packs.filter((p) => !p.builtIn);
  const installedMB = packs
    .filter((p) => p.installed)
    .reduce((acc, p) => acc + p.sizeMB, 0);

  const handleInstallClick = (pack: AIModelPack) => {
    if (pack.installed) {
      onToggleInstallPack(pack.id);
      return;
    }
    setDownloadingId(pack.id);
    window.setTimeout(() => {
      onToggleInstallPack(pack.id);
      setDownloadingId(null);
    }, 650);
  };

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-7">
      <div className="max-w-[1180px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#23262E]">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-100">
              AI Model Manager
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage on-device AI engines and optional offline expansion packs. Once downloaded, every pack works 100% without internet access.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-mono-tabular">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>{installedMB} MB cached locally</span>
          </div>
        </div>

        {/* Performance / Hardware Mode Selector */}
        <section className="p-5 rounded-lg border border-[#23262E] bg-[#12141A] space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-base font-semibold text-zinc-100">
              Local Compute &amp; Memory Mode
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(
              [
                {
                  id: 'lightweight',
                  title: 'Lightweight (Battery Saver)',
                  meta: '720p Live Preview · Low RAM',
                  desc: 'Optimized for laptops and mobile browsers on battery power.',
                },
                {
                  id: 'standard',
                  title: 'Standard (Balanced)',
                  meta: '1080p Live Preview · GPU/CPU Auto',
                  desc: 'Recommended balance of fast matte rendering and accurate color science.',
                },
                {
                  id: 'high-quality',
                  title: 'High-Quality (Studio Precision)',
                  meta: '1440p Live Preview · Full Precision',
                  desc: 'Maximum detail for high-resolution portraits, 4K/8x upscaling, and fine hair edges.',
                },
              ] as const
            ).map((mode) => {
              const active = processingMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeProcessingMode(mode.id)}
                  className={`p-4 rounded-md border text-left transition-colors space-y-1.5 ${
                    active
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-[#252934] bg-[#161922] hover:border-[#3A404F]'
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-100">{mode.title}</p>
                  <p className="text-xs font-mono-tabular text-amber-400">{mode.meta}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{mode.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Built-in Core Offline Models */}
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-100">
              Built-In Offline Core Models ({builtInPacks.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pre-bundled directly inside the application. Always available with zero downloads.
            </p>
          </div>
          <div className="divide-y divide-[#23262E] rounded-lg border border-[#23262E] bg-[#12141A]">
            {builtInPacks.map((pack) => (
              <div
                key={pack.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{pack.name}</span>
                    <span className="text-xs text-zinc-500 font-mono-tabular">
                      v{pack.version} · {pack.runtime} · {pack.sizeMB} MB
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{pack.description}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Built-In Offline</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Optional Downloadable Offline Packs */}
        <section className="space-y-3 pb-6">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-100">
              Optional Downloadable Expansion Packs ({optionalPacks.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Download once when online to cache locally for permanent offline access, or remove anytime to reclaim device storage.
            </p>
          </div>
          <div className="divide-y divide-[#23262E] rounded-lg border border-[#23262E] bg-[#12141A]">
            {optionalPacks.map((pack) => {
              const isBusy = downloadingId === pack.id;
              return (
                <div
                  key={pack.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">{pack.name}</span>
                      <span className="text-xs text-zinc-500 font-mono-tabular">
                        {pack.category} · {pack.runtime} · {pack.sizeMB} MB
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{pack.description}</p>
                  </div>

                  <div className="shrink-0">
                    {pack.installed ? (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-400 font-medium whitespace-nowrap">
                          Ready Offline
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInstallClick(pack)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#2C313E] bg-[#181B22] hover:text-red-400 text-xs text-zinc-300 whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleInstallClick(pack)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-[#0B0C0E] text-xs font-semibold whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isBusy ? 'Caching Locally...' : `Download (${pack.sizeMB} MB)`}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
