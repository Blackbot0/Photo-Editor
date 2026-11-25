import React, { useRef } from 'react';
import {
  ArrowRight,
  FolderOpen,
  ImagePlus,
  Layers,
  ShieldCheck,
  Shirt,
  Sparkles,
  Upload,
  Video,
  Wand2,
} from 'lucide-react';
import { SAMPLE_MEDIA } from '../data/catalog';
import { LocalProject, NavSection } from '../types/studio';

interface HomeViewProps {
  onNavigate: (section: NavSection) => void;
  onImportPhotoFile: (file: File) => void;
  onImportVideoFile: (file: File) => void;
  onLoadSamplePhoto: (sampleIndex: number) => void;
  projects: LocalProject[];
  onOpenProject: (project: LocalProject) => void;
  installedModelCount: number;
  storageUsedMB: number;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onImportPhotoFile,
  onImportVideoFile,
  onLoadSamplePhoto,
  projects,
  onOpenProject,
  installedModelCount,
  storageUsedMB,
}) => {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'photo' | 'video'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'photo') {
      onImportPhotoFile(file);
    } else {
      onImportVideoFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-8">
      <div className="max-w-[1180px] mx-auto space-y-10">
        {/* Hero Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6 py-2">
            <div className="space-y-4">
              <p className="text-xs font-medium text-amber-400">
                Offline-First Photo &amp; Video Workstation · Zero Cloud Uploads
              </p>
              <h1 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight text-[#F4F5F7] leading-[1.15]">
                Professional AI editing that never leaves your device.
              </h1>
              <p className="text-sm lg:text-[15px] text-zinc-400 leading-relaxed max-w-xl">
                Edit portraits, swap backgrounds, test outfits, upscale to 4K, and grade video timelines completely offline. Identity Lock protects eyes, jawline, skin tone, and natural facial proportions through every operation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <ImagePlus className="w-4 h-4 shrink-0" />
                <span>Import Photo</span>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#181B22] hover:bg-[#222631] border border-[#2B303C] text-zinc-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Video className="w-4 h-4 shrink-0 text-zinc-400" />
                <span>Import Video</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('photo-editor')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Active Studio</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Import photo from device"
                onChange={(e) => handleFileChange(e, 'photo')}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                aria-label="Import video from device"
                onChange={(e) => handleFileChange(e, 'video')}
              />
            </div>
          </div>

          {/* Right Hero Featured Sample Studio Card */}
          <div className="lg:col-span-5 rounded-lg border border-[#23262E] bg-[#12141A] overflow-hidden flex flex-col">
            <div className="relative flex-1 min-h-[240px] bg-[#0B0C0E]">
              <img
                src={SAMPLE_MEDIA[0].url}
                alt="Editorial street portrait loaded in LumaVault Studio"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top lg:max-h-[310px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E]/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-emerald-300 flex items-center gap-1.5 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Identity Lock Ready</span>
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {SAMPLE_MEDIA[0].name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLoadSamplePhoto(0);
                    onNavigate('photo-editor');
                  }}
                  className="px-3.5 py-1.5 rounded-md bg-white text-[#0B0C0E] text-xs font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Edit Sample
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Full-Width Local Device Readiness Strip (below Hero Split) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-5 border-y border-[#23262E]">
          <div>
            <p className="text-xs text-zinc-500">Processing Mode</p>
            <p className="mt-1 text-base font-semibold text-zinc-100">100% On-Device</p>
            <p className="text-xs text-zinc-400 mt-0.5">No internet required</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Identity Protection</p>
            <p className="mt-1 text-base font-semibold text-emerald-400">Face Anchor Locked</p>
            <p className="text-xs text-zinc-400 mt-0.5">Photo &amp; video frames</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Local AI Models</p>
            <p className="mt-1 text-base font-semibold text-zinc-100 font-mono-tabular">
              {installedModelCount} Installed
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Cached in local vault</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Local Storage Footprint</p>
            <p className="mt-1 text-base font-semibold text-zinc-100 font-mono-tabular">
              {storageUsedMB} MB
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Clearable anytime</p>
          </div>
        </section>

        {/* Core Studios Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-zinc-100">
              Start an Offline Workflow
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('ai-suggestions')}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run AI Creative Assistant</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: 'background-studio' as NavSection,
                title: 'Background Studio',
                meta: '13 Categories · Lighting Match',
                desc: 'Isolate foreground subjects, blur depth, swap scenes, or expand frames with AI Outpainting.',
                icon: Layers,
              },
              {
                id: 'clothing-studio' as NavSection,
                title: 'Clothing & Style Studio',
                meta: 'Identity Locked · Virtual Wardrobe',
                desc: 'Test suits, jackets, hoodies, hairstyles, and accessories while keeping the person unchanged.',
                icon: Shirt,
              },
              {
                id: 'ai-enhancer' as NavSection,
                title: 'AI Enhancer & 4K Upscale',
                meta: '2x / 4x / 8x · Old Photo Repair',
                desc: 'Recover blurry captures, remove noise, restore vintage prints, and refine natural skin.',
                icon: Wand2,
              },
              {
                id: 'video-editor' as NavSection,
                title: 'AI Video & Audio Studio',
                meta: 'Temporal Lock · 4K Local Export',
                desc: 'Stabilize footage, replace video backgrounds, detect scenes, and mix offline music tracks.',
                icon: Video,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onNavigate(card.id)}
                  className="group text-left p-5 rounded-lg border border-[#23262E] bg-[#12141A] hover:border-[#373C49] hover:bg-[#161922] transition-colors flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Icon className="w-5 h-5 text-amber-400" />
                      <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-200 transition-colors" />
                    </div>
                    <h3 className="font-display text-base font-semibold text-zinc-100">
                      {card.title}
                    </h3>
                    <p className="text-xs text-zinc-500">{card.meta}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Bundled Offline Sample Photos + Recent Local Projects */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-zinc-100">
              Offline Practice Plates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SAMPLE_MEDIA.map((sample, idx) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    onLoadSamplePhoto(idx);
                    onNavigate(idx === 1 ? 'ai-enhancer' : 'photo-editor');
                  }}
                  className="text-left rounded-lg border border-[#23262E] bg-[#12141A] hover:border-[#383E4C] overflow-hidden transition-colors"
                >
                  <div className="aspect-[4/3] bg-[#0B0C0E] overflow-hidden">
                    <img
                      src={sample.url}
                      alt={sample.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="p-3.5 space-y-1">
                    <p className="text-sm font-medium text-zinc-100">{sample.name}</p>
                    <p className="text-xs text-zinc-400 line-clamp-2">{sample.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-zinc-100">
                Recent Local Projects
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('my-projects')}
                className="text-xs text-zinc-400 hover:text-zinc-100 whitespace-nowrap"
              >
                View All ({projects.length})
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-[#2A2E39] bg-[#111318] flex flex-col items-center justify-center text-center gap-3 min-h-[210px]">
                <FolderOpen className="w-6 h-6 text-zinc-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-200">No saved local projects yet</p>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Import any photo or edit a studio sample, then save it to your local device vault for non-destructive resuming.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#1D212A] hover:bg-[#272C38] text-xs font-medium text-zinc-100 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import From Device</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {projects.slice(0, 4).map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onOpenProject(project)}
                    className="w-full flex items-center gap-3.5 p-3 rounded-lg border border-[#23262E] bg-[#12141A] hover:border-[#383E4C] text-left transition-colors"
                  >
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-[#0B0C0E] shrink-0 border border-[#23262E]">
                      {project.thumbnailDataUrl ? (
                        <img
                          src={project.thumbnailDataUrl}
                          alt={project.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-100 truncate">{project.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5 font-mono-tabular">
                        {project.type === 'photo' ? 'Photo' : 'Video'} · {project.resolution} ·{' '}
                        {project.identityLocked ? 'Identity Locked' : 'Unlocked'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
