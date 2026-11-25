import React, { useEffect, useState } from 'react';
import {
  Download,
  Menu,
  Redo2,
  Save,
  Undo2,
} from 'lucide-react';
import { AUDIO_LIBRARY } from './data/catalog';
import {
  createCustomPhotoState,
  createDefaultPhotoState,
  createHistoryStack,
  createVersionSnapshot,
  HistoryStack,
  pushHistory,
  redoHistory,
  undoHistory,
} from './engine/editState';
import { checkIdentityRisk } from './engine/imageMath';
import {
  clearAllLocalStudioData,
  deleteLocalProject,
  estimateLocalStorageMB,
  loadLocalProjects,
  loadModelPacks,
  loadStudioSettings,
  saveLocalProject,
  saveModelPacks,
  saveStudioSettings,
} from './engine/localStore';
import { createDefaultVideoState } from './engine/videoEngine';
import {
  AIModelPack,
  AudioTrack,
  EditVersion,
  IdentityWarning,
  ImageAnalysisMetrics,
  LocalProject,
  NavSection,
  PhotoEditState,
  ProcessingMode,
  SmartSuggestion,
  StudioSettings,
  VideoEditState,
} from './types/studio';
import { AIEnhancerView } from './components/AIEnhancerView';
import { AIFiltersView } from './components/AIFiltersView';
import { AISuggestionsView } from './components/AISuggestionsView';
import { BackgroundStudioView } from './components/BackgroundStudioView';
import { ClothingStudioView } from './components/ClothingStudioView';
import { ExportModal, IdentityWarningModal } from './components/ExportModal';
import { HomeView } from './components/HomeView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ModelManagerView } from './components/ModelManagerView';
import { MusicAudioView } from './components/MusicAudioView';
import { MyProjectsView } from './components/MyProjectsView';
import { PhotoEditorView } from './components/PhotoEditorView';
import { OfflineStatusBanner, PWAInstallButton } from './components/PWAInstallModal';
import { SettingsView } from './components/SettingsView';
import { SidebarNav } from './components/SidebarNav';
import { VideoEditorView } from './components/VideoEditorView';

const SECTION_TITLES: Record<NavSection, string> = {
  home: 'Home',
  'photo-editor': 'AI Photo Editor',
  'video-editor': 'AI Video Editor',
  'background-studio': 'Background Studio',
  'ai-filters': 'AI Filters',
  'clothing-studio': 'Clothing & Style Studio',
  'ai-enhancer': 'AI Enhancer',
  'music-audio': 'Music & Audio',
  'ai-suggestions': 'AI Suggestions',
  'my-projects': 'My Projects',
  'model-manager': 'AI Model Manager',
  settings: 'Settings',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Non-destructive Photo state & History
  const [photoState, setPhotoState] = useState<PhotoEditState>(() => createDefaultPhotoState(0));
  const [history, setHistory] = useState<HistoryStack>(() =>
    createHistoryStack(createDefaultPhotoState(0), 'Original Capture')
  );
  const [versions, setVersions] = useState<EditVersion[]>([]);
  const [latestThumb, setLatestThumb] = useState<string>('');
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<string[]>([]);
  const [imageMetrics, setImageMetrics] = useState<ImageAnalysisMetrics>({
    avgLuminance: 132,
    contrastSpread: 54,
    warmthBias: 8,
    saturationMean: 28,
    edgeSharpness: 46,
    backgroundClutter: 44,
    noiseEstimate: 22,
  });

  // Video & Audio State
  const [videoState, setVideoState] = useState<VideoEditState>(() => createDefaultVideoState());
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(() => [AUDIO_LIBRARY[0]]);

  // Local Persistence (Projects, Models, Settings)
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [modelPacks, setModelPacks] = useState<AIModelPack[]>(() => loadModelPacks());
  const [settings, setSettings] = useState<StudioSettings>(() => loadStudioSettings());

  // Modals & Warnings
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingWarning, setPendingWarning] = useState<{
    warning: IdentityWarning;
    proposedState: PhotoEditState;
    label: string;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadLocalProjects().then((loaded) => setProjects(loaded));
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Commit non-destructive photo edit with Identity Safety check
  const commitPhotoEdit = (nextState: PhotoEditState, label: string, bypassWarning = false) => {
    if (!bypassWarning && settings.strictIdentityWarnings) {
      const risk = checkIdentityRisk(photoState, nextState);
      if (risk) {
        setPendingWarning({ warning: risk, proposedState: nextState, label });
        return;
      }
    }
    setPhotoState(nextState);
    setHistory((prev) => pushHistory(prev, nextState, label));
  };

  const handleToggleIdentityLock = () => {
    const nextLocked = !photoState.identityLock;
    commitPhotoEdit(
      { ...photoState, identityLock: nextLocked },
      nextLocked ? 'Enable Identity Lock' : 'Disable Identity Lock'
    );
  };

  const handleUndo = () => {
    const res = undoHistory(history);
    setHistory(res.stack);
    setPhotoState(res.state);
  };

  const handleRedo = () => {
    const res = redoHistory(history);
    setHistory(res.stack);
    setPhotoState(res.state);
  };

  const handleJumpHistory = (index: number) => {
    if (index < 0 || index >= history.entries.length) return;
    setHistory({ ...history, index });
    setPhotoState(structuredClone(history.entries[index].state));
  };

  const handleImportPhotoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const next = createCustomPhotoState(
        url,
        file.name.replace(/\.[^.]+$/, ''),
        img.naturalWidth || 1080,
        img.naturalHeight || 1350
      );
      next.identityLock = settings.identityLockDefault;
      setPhotoState(next);
      setHistory(createHistoryStack(next, `Imported ${file.name}`));
      setVersions([]);
      setAppliedSuggestionIds([]);
      setActiveSection('photo-editor');
      showToast(`Loaded "${file.name}" locally — 100% offline.`);
    };
    img.src = url;
  };

  const handleImportVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoState((prev) => ({
      ...prev,
      sourceType: 'file',
      sourceName: file.name,
      sourceUrl: url,
      currentTimeSec: 0,
      isPlaying: false,
      identityLockTemporal: settings.identityLockDefault,
    }));
    setActiveSection('video-editor');
    showToast(`Loaded local video "${file.name}".`);
  };

  const handleLoadSamplePhoto = (index: number) => {
    const next = createDefaultPhotoState(index);
    next.identityLock = settings.identityLockDefault;
    setPhotoState(next);
    setHistory(createHistoryStack(next, `Loaded ${next.sourceName}`));
    setVersions([]);
    setAppliedSuggestionIds([]);
  };

  const handleSaveVersion = () => {
    const ver = createVersionSnapshot(
      photoState,
      `Version ${versions.length + 1}`,
      latestThumb
    );
    setVersions((prev) => [...prev, ver]);
    showToast(`Saved "${ver.name}" for comparison.`);
  };

  const handleSaveProject = async (name: string, type: 'photo' | 'video') => {
    const project: LocalProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type,
      updatedAt: Date.now(),
      resolution:
        type === 'photo'
          ? `${photoState.sourceWidth * photoState.enhancement.upscaleFactor}×${photoState.sourceHeight * photoState.enhancement.upscaleFactor}`
          : videoState.enhanceUpscale,
      editCount: history.entries.length,
      identityLocked:
        type === 'photo' ? photoState.identityLock : videoState.identityLockTemporal,
      thumbnailDataUrl: latestThumb || photoState.sourceImageUrl,
      photoState: type === 'photo' ? structuredClone(photoState) : undefined,
      videoState: type === 'video' ? structuredClone(videoState) : undefined,
    };
    await saveLocalProject(project);
    const updated = await loadLocalProjects();
    setProjects(updated);
    showToast(`Saved "${name}" to local device vault.`);
  };

  const handleOpenProject = (project: LocalProject) => {
    if (project.type === 'photo' && project.photoState) {
      setPhotoState(structuredClone(project.photoState));
      setHistory(createHistoryStack(project.photoState, `Opened ${project.name}`));
      setActiveSection('photo-editor');
    } else if (project.type === 'video' && project.videoState) {
      setVideoState(structuredClone(project.videoState));
      setActiveSection('video-editor');
    }
    showToast(`Opened "${project.name}".`);
  };

  const handleDuplicateProject = async (project: LocalProject) => {
    const dup: LocalProject = {
      ...structuredClone(project),
      id: `proj-${Date.now()}-dup`,
      name: `${project.name} Copy`,
      updatedAt: Date.now(),
    };
    await saveLocalProject(dup);
    setProjects(await loadLocalProjects());
    showToast(`Duplicated "${project.name}".`);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteLocalProject(id);
    setProjects(await loadLocalProjects());
    showToast('Deleted project from local storage.');
  };

  const handleToggleInstallPack = (packId: string) => {
    const next = modelPacks.map((p) =>
      p.id === packId && !p.builtIn ? { ...p, installed: !p.installed } : p
    );
    setModelPacks(next);
    saveModelPacks(next);
    const toggled = next.find((p) => p.id === packId);
    if (toggled) {
      showToast(
        toggled.installed
          ? `Cached "${toggled.name}" for offline use.`
          : `Removed "${toggled.name}" from local cache.`
      );
    }
  };

  const handleUpdateSettings = (next: StudioSettings) => {
    setSettings(next);
    saveStudioSettings(next);
  };

  const handleChangeProcessingMode = (mode: ProcessingMode) => {
    const previewCap: 720 | 1080 | 1440 =
      mode === 'lightweight' ? 720 : mode === 'high-quality' ? 1440 : 1080;
    handleUpdateSettings({
      ...settings,
      processingMode: mode,
      maxPreviewDimension: previewCap,
    });
  };

  const handleApplySuggestion = (sug: SmartSuggestion) => {
    const next = sug.applyPatch(photoState);
    commitPhotoEdit(next, `AI Suggestion: ${sug.title}`, true);
    setAppliedSuggestionIds((prev) => (prev.includes(sug.id) ? prev : [...prev, sug.id]));
    showToast(`Applied "${sug.title}" with Identity Lock active.`);
  };

  const handleExportVideoBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const storageSummary = estimateLocalStorageMB(projects, modelPacks);
  const installedModelCount = modelPacks.filter((p) => p.installed).length;
  const has8xPack = Boolean(modelPacks.find((p) => p.id === 'pack-upscale-8x')?.installed);

  const canUndo = history.index > 0;
  const canRedo = history.index < history.entries.length - 1;

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-[#0B0C0E] text-[#F4F5F7]">
      <SidebarNav
        activeSection={activeSection}
        onSelect={setActiveSection}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        identityLock={photoState.identityLock}
        installedModelCount={installedModelCount}
        projectCount={projects.length}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Clean 3-Zone Workspace Top Bar */}
        <header className="h-[52px] lg:h-14 shrink-0 px-4 lg:px-6 border-b border-[#23262E] bg-[#111318] flex items-center justify-between gap-4">
          {/* Zone 1: Mobile Menu Trigger + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-zinc-300 hover:bg-[#1C2029]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-zinc-500 hidden sm:inline whitespace-nowrap">
                LumaVault Studio
              </span>
              <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-display font-semibold text-zinc-100 truncate">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>
          </div>

          {/* Zone 2: Undo / Redo / Quick Save */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="Undo edit"
              title="Undo"
              className="p-2 rounded-md text-zinc-300 hover:text-white hover:bg-[#1C2029] disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              aria-label="Redo edit"
              title="Redo"
              className="p-2 rounded-md text-zinc-300 hover:text-white hover:bg-[#1C2029] disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                handleSaveProject(
                  activeSection === 'video-editor'
                    ? videoState.sourceName
                    : `${photoState.sourceName} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                  activeSection === 'video-editor' ? 'video' : 'photo'
                )
              }
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-200 hover:bg-[#1C2029] border border-[#262A35] transition-colors whitespace-nowrap shrink-0 ml-1"
            >
              <Save className="w-3.5 h-3.5 text-zinc-400" />
              <span>Save Local</span>
            </button>
          </div>

          {/* Zone 3: Install App + Primary Export Action */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton variant="header" />
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export</span>
            </button>
          </div>
        </header>

        <OfflineStatusBanner />

        {/* Active Toast Banner (quiet inline feedback) */}
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="px-4 py-2 bg-[#171B24] border-b border-amber-500/30 text-xs text-amber-200 flex items-center justify-between"
          >
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-zinc-400 hover:text-zinc-100 text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Active Workspace View */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {activeSection === 'home' && (
            <HomeView
              onNavigate={setActiveSection}
              onImportPhotoFile={handleImportPhotoFile}
              onImportVideoFile={handleImportVideoFile}
              onLoadSamplePhoto={handleLoadSamplePhoto}
              projects={projects}
              onOpenProject={handleOpenProject}
              installedModelCount={installedModelCount}
              storageUsedMB={storageSummary.totalMB}
            />
          )}

          {activeSection === 'photo-editor' && (
            <PhotoEditorView
              state={photoState}
              maxPreviewDimension={settings.maxPreviewDimension}
              historyEntries={history.entries}
              historyIndex={history.index}
              versions={versions}
              onCommitEdit={commitPhotoEdit}
              onLiveChange={setPhotoState}
              onToggleIdentityLock={handleToggleIdentityLock}
              onJumpHistory={handleJumpHistory}
              onSaveVersion={handleSaveVersion}
              onSelectVersion={(ver) => {
                setPhotoState(structuredClone(ver.state));
                showToast(`Loaded "${ver.name}".`);
              }}
              onResetAll={() => {
                const fresh = createDefaultPhotoState(0);
                fresh.sourceImageUrl = photoState.sourceImageUrl;
                fresh.sourceName = photoState.sourceName;
                fresh.sourceWidth = photoState.sourceWidth;
                fresh.sourceHeight = photoState.sourceHeight;
                fresh.faceAnchor = { ...photoState.faceAnchor };
                commitPhotoEdit(fresh, 'Reset All Edits', true);
              }}
              onMetricsUpdate={(m) => setImageMetrics(m)}
              onCaptureThumbnail={setLatestThumb}
            />
          )}

          {activeSection === 'background-studio' && (
            <BackgroundStudioView
              state={photoState}
              maxPreviewDimension={settings.maxPreviewDimension}
              onCommitEdit={commitPhotoEdit}
              onLiveChange={setPhotoState}
              onToggleIdentityLock={handleToggleIdentityLock}
            />
          )}

          {activeSection === 'ai-filters' && (
            <AIFiltersView
              state={photoState}
              metrics={imageMetrics}
              maxPreviewDimension={settings.maxPreviewDimension}
              onCommitEdit={commitPhotoEdit}
              onLiveChange={setPhotoState}
              onToggleIdentityLock={handleToggleIdentityLock}
            />
          )}

          {activeSection === 'clothing-studio' && (
            <ClothingStudioView
              state={photoState}
              maxPreviewDimension={settings.maxPreviewDimension}
              onCommitEdit={commitPhotoEdit}
              onLiveChange={setPhotoState}
              onToggleIdentityLock={handleToggleIdentityLock}
            />
          )}

          {activeSection === 'ai-enhancer' && (
            <AIEnhancerView
              state={photoState}
              maxPreviewDimension={settings.maxPreviewDimension}
              has8xPackInstalled={has8xPack}
              onCommitEdit={commitPhotoEdit}
              onLiveChange={setPhotoState}
              onToggleIdentityLock={handleToggleIdentityLock}
              onLoadSamplePhoto={handleLoadSamplePhoto}
              onOpenModelManager={() => setActiveSection('model-manager')}
            />
          )}

          {activeSection === 'video-editor' && (
            <VideoEditorView
              videoState={videoState}
              audioTracks={audioTracks}
              onChangeVideoState={setVideoState}
              onImportVideoFile={handleImportVideoFile}
              onOpenAudioStudio={() => setActiveSection('music-audio')}
              onExportVideo={handleExportVideoBlob}
            />
          )}

          {activeSection === 'music-audio' && (
            <MusicAudioView tracks={audioTracks} onChangeTracks={setAudioTracks} />
          )}

          {activeSection === 'ai-suggestions' && (
            <AISuggestionsView
              state={photoState}
              metrics={imageMetrics}
              maxPreviewDimension={settings.maxPreviewDimension}
              appliedIds={appliedSuggestionIds}
              onApplySuggestion={handleApplySuggestion}
              onLiveChange={setPhotoState}
              onToggleIdentityLock={handleToggleIdentityLock}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'my-projects' && (
            <MyProjectsView
              projects={projects}
              currentPhotoName={photoState.sourceName}
              onSaveCurrentProject={handleSaveProject}
              onOpenProject={handleOpenProject}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {activeSection === 'model-manager' && (
            <ModelManagerView
              packs={modelPacks}
              processingMode={settings.processingMode}
              onToggleInstallPack={handleToggleInstallPack}
              onChangeProcessingMode={handleChangeProcessingMode}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              settings={settings}
              storageSummary={storageSummary}
              onUpdateSettings={handleUpdateSettings}
              onClearLocalData={async () => {
                await clearAllLocalStudioData();
                setProjects([]);
                setModelPacks(loadModelPacks());
                setSettings(loadStudioSettings());
                showToast('Cleared all local projects and cached expansion packs.');
              }}
            />
          )}
        </main>

        {/* Android Thumb-Friendly Bottom Navigation Bar */}
        <MobileBottomNav
          activeSection={activeSection}
          onSelect={setActiveSection}
        />
      </div>

      {/* High-Resolution Offline Export Modal */}
      <ExportModal
        open={exportOpen}
        photoState={photoState}
        settings={settings}
        onClose={() => setExportOpen(false)}
      />

      {/* Identity Preservation Safety Dialog */}
      <IdentityWarningModal
        warning={pendingWarning?.warning ?? null}
        onCancel={() => setPendingWarning(null)}
        onKeepProtected={() => {
          if (!pendingWarning) return;
          const shielded: PhotoEditState = {
            ...pendingWarning.proposedState,
            identityLock: true,
          };
          commitPhotoEdit(shielded, `${pendingWarning.label} (Identity Shielded)`, true);
          setPendingWarning(null);
          showToast('Applied with Identity Lock protecting original facial features.');
        }}
        onProceedAnyway={() => {
          if (!pendingWarning) return;
          commitPhotoEdit(pendingWarning.proposedState, pendingWarning.label, true);
          setPendingWarning(null);
        }}
      />
    </div>
  );
}
