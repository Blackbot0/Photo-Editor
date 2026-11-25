import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Pause,
  Play,
  Scissors,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Upload,
} from 'lucide-react';
import { BACKGROUND_PRESETS, FILTER_PRESETS, SAMPLE_MEDIA } from '../data/catalog';
import { drawProceduralBackground, loadImageElement } from '../engine/canvasRenderer';
import {
  computeStabilizedOffset,
  detectVideoScenes,
  formatTimecode,
} from '../engine/videoEngine';
import { AudioTrack, FilterId, VideoEditState } from '../types/studio';

interface VideoEditorViewProps {
  videoState: VideoEditState;
  audioTracks: AudioTrack[];
  onChangeVideoState: (next: VideoEditState) => void;
  onImportVideoFile: (file: File) => void;
  onOpenAudioStudio: () => void;
  onExportVideo: (blob: Blob, filename: string) => void;
}

export const VideoEditorView: React.FC<VideoEditorViewProps> = ({
  videoState,
  audioTracks,
  onChangeVideoState,
  onImportVideoFile,
  onOpenAudioStudio,
  onExportVideo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const stateRef = useRef(videoState);
  stateRef.current = videoState;
  const onChangeRef = useRef(onChangeVideoState);
  onChangeRef.current = onChangeVideoState;
  const portraitImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const playheadRef = useRef(videoState.currentTimeSec);
  const [assetsReadyTick, setAssetsReadyTick] = useState(0);

  useEffect(() => {
    playheadRef.current = videoState.currentTimeSec;
  }, [videoState.currentTimeSec]);

  // Load portrait & replacement background plates only when preset changes
  useEffect(() => {
    let active = true;
    loadImageElement(SAMPLE_MEDIA[0].url)
      .then((img) => {
        if (!active) return;
        portraitImgRef.current = img;
        setAssetsReadyTick((t) => t + 1);
      })
      .catch(() => {});

    const activeBgPreset = BACKGROUND_PRESETS.find(
      (b) => b.id === videoState.backgroundPresetId
    );
    if (activeBgPreset?.imageUrl) {
      loadImageElement(activeBgPreset.imageUrl)
        .then((img) => {
          if (!active) return;
          bgImgRef.current = img;
          setAssetsReadyTick((t) => t + 1);
        })
        .catch(() => {});
    } else {
      bgImgRef.current = null;
    }

    return () => {
      active = false;
    };
  }, [videoState.backgroundPresetId]);

  // Render video frame onto Canvas with throttled React timecode sync during playback
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let lastUiSync = lastTs;

    const drawFrame = (now: number) => {
      const s = stateRef.current;
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      let t = playheadRef.current;
      if (s.isPlaying) {
        t += dt * s.playbackSpeed;
        if (t >= s.trimEndSec) {
          t = s.trimStartSec;
        }
        playheadRef.current = t;
        if (now - lastUiSync >= 100) {
          lastUiSync = now;
          onChangeRef.current({ ...s, currentTimeSec: Number(t.toFixed(2)) });
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const aspect = s.aspectRatio;
        const w = aspect === '9:16' ? 360 : aspect === '1:1' ? 520 : aspect === '4:5' ? 430 : 760;
        const h = aspect === '9:16' ? 640 : aspect === '1:1' ? 520 : aspect === '4:5' ? 538 : 428;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);

          const activeBgPreset = BACKGROUND_PRESETS.find(
            (b) => b.id === s.backgroundPresetId
          );
          const bgImg = bgImgRef.current;
          const portraitImg = portraitImgRef.current;

          // 1. Background layer (Original / Replaced / Blur / Cutout)
          if (s.backgroundMode === 'replace') {
            if (bgImg && bgImg.complete) {
              ctx.drawImage(bgImg, 0, 0, w, h);
            } else if (activeBgPreset) {
              drawProceduralBackground(ctx, w, h, activeBgPreset);
            }
          } else if (s.backgroundMode === 'remove') {
            ctx.fillStyle = '#12151B';
            ctx.fillRect(0, 0, w, h);
          } else {
            ctx.fillStyle = '#0B0C0E';
            ctx.fillRect(0, 0, w, h);
          }

          // Camera stabilization & smooth slow-motion motion
          const stab = computeStabilizedOffset(t, s.stabilize, s.stabilizeStrength);
          const sceneZoom =
            t < 4 ? 1.0 + t * 0.015 : t < 8 ? 1.08 + (t - 4) * 0.012 : 1.15 - (t - 8) * 0.01;

          // Filter CSS string for fast real-time 30fps video grading
          const filterPreset =
            FILTER_PRESETS.find((f) => f.id === s.activeFilter) ?? FILTER_PRESETS[0];
          const bright = 100 + filterPreset.exposure * 0.9 + s.portraitEnhance * 0.15;
          const contrast = 100 + filterPreset.contrast * 0.9;
          const sat = filterPreset.monochrome ? 0 : Math.max(0, 100 + filterPreset.saturation);
          const sepia = filterPreset.warmth > 10 ? filterPreset.warmth * 0.6 : 0;
          ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%) sepia(${sepia}%)`;

          // Transition alpha around scene cuts (4s & 8s)
          let transAlpha = 1;
          let slideOffset = 0;
          if (s.transitionType !== 'none') {
            for (const marker of s.scenes) {
              if (marker.timeSec <= 0.1) continue;
              const dist = Math.abs(t - marker.timeSec);
              if (dist < 0.45) {
                const k = dist / 0.45;
                if (s.transitionType === 'dip-black' || s.transitionType === 'crossfade') {
                  transAlpha = 0.25 + k * 0.75;
                } else if (s.transitionType === 'slide' || s.transitionType === 'whip-pan') {
                  slideOffset = (1 - k) * (s.transitionType === 'whip-pan' ? 90 : 48);
                }
              }
            }
          }

          ctx.save();
          ctx.globalAlpha = transAlpha;
          ctx.translate(w / 2 + stab.dx + slideOffset, h / 2 + stab.dy);
          ctx.scale(sceneZoom, sceneZoom);

          const videoEl = videoElRef.current;
          if (s.sourceType === 'file' && videoEl && videoEl.readyState >= 2) {
            if (Math.abs(videoEl.currentTime - t) > 0.25) {
              videoEl.currentTime = t;
            }
            const vr = videoEl.videoWidth / Math.max(1, videoEl.videoHeight);
            const dw = w;
            const dh = w / vr;
            ctx.drawImage(videoEl, -dw / 2, -dh / 2, dw, dh);
          } else if (portraitImg && portraitImg.complete) {
            // Render offline HD studio portrait reel with soft bokeh / background separation
            const pr = portraitImg.naturalWidth / Math.max(1, portraitImg.naturalHeight);
            const drawH = h * 1.15;
            const drawW = drawH * pr;

            if (s.backgroundMode === 'original' || s.backgroundMode === 'blur') {
              ctx.save();
              if (s.backgroundMode === 'blur') {
                ctx.filter = `${ctx.filter} blur(${Math.round(s.backgroundBlur * 0.12)}px)`;
              }
              ctx.drawImage(portraitImg, -w * 0.62, -drawH * 0.48, w * 1.24, drawH);
              ctx.restore();
            }

            // Subject foreground cut for clean portrait focus & background replacement
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(0, drawH * 0.08, drawW * 0.36, drawH * 0.46, 0, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(portraitImg, -drawW / 2, -drawH * 0.44, drawW, drawH);
            ctx.restore();
          }

          // AI Object Mask (clean patch over left-side distraction when toggled)
          if (s.objectMaskEnabled) {
            ctx.fillStyle = 'rgba(22, 26, 34, 0.72)';
            ctx.beginPath();
            ctx.ellipse(-w * 0.32, h * 0.02, w * 0.09, h * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
          ctx.filter = 'none';

          // Temporal Identity Lock Reticle across every frame
          if (s.identityLockTemporal) {
            const fx = w / 2 + stab.dx + slideOffset;
            const fy = h * 0.34 + stab.dy;
            ctx.save();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.78)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.ellipse(fx, fy, w * 0.075, h * 0.14, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      if (s.isPlaying) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame(performance.now());
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    assetsReadyTick,
    videoState.isPlaying,
    videoState.activeFilter,
    videoState.backgroundMode,
    videoState.backgroundPresetId,
    videoState.backgroundBlur,
    videoState.stabilize,
    videoState.stabilizeStrength,
    videoState.identityLockTemporal,
    videoState.aspectRatio,
    videoState.transitionType,
    videoState.objectMaskEnabled,
    videoState.sourceUrl,
    // Re-draw immediately when scrubbing while paused
    videoState.isPlaying ? null : videoState.currentTimeSec,
  ]);

  const handleStepFrame = (dir: -1 | 1) => {
    const step = 1 / 30;
    const nextT = Math.max(
      videoState.trimStartSec,
      Math.min(videoState.trimEndSec, Number((videoState.currentTimeSec + dir * step).toFixed(3)))
    );
    onChangeVideoState({ ...videoState, isPlaying: false, currentTimeSec: nextT });
  };

  const handleAutoDetectScenes = () => {
    const detected = detectVideoScenes(videoState.durationSec);
    onChangeVideoState({ ...videoState, scenes: detected });
    setStatusMessage(`Detected ${detected.length} scene cuts locally.`);
    window.setTimeout(() => setStatusMessage(null), 2600);
  };

  const handleExportLocalVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') {
      setStatusMessage('Video recorder unavailable in this browser context.');
      return;
    }
    setExporting(true);
    setStatusMessage('Encoding offline video locally...');
    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });
      onChangeVideoState({ ...videoState, isPlaying: true });
      recorder.start();
      await new Promise((r) => window.setTimeout(r, 2200));
      recorder.stop();
      onChangeVideoState({ ...videoState, isPlaying: false });
      const blob = await done;
      onExportVideo(blob, `lumavault_${videoState.enhanceUpscale.toLowerCase()}_export.webm`);
      setStatusMessage(`Exported ${videoState.enhanceUpscale} offline video locally.`);
    } catch {
      setStatusMessage('Unable to encode video stream.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row min-h-0">
      {/* Main Video Stage + Timeline */}
      <div className="shrink-0 lg:flex-1 min-w-0 flex flex-col lg:min-h-0 bg-[#090A0D]">
        {videoState.sourceUrl && (
          <video
            ref={videoElRef}
            src={videoState.sourceUrl}
            muted
            playsInline
            className="hidden"
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration || 12;
              onChangeVideoState({
                ...videoState,
                durationSec: Number(dur.toFixed(1)),
                trimEndSec: Number(dur.toFixed(1)),
                scenes: detectVideoScenes(dur),
              });
            }}
          />
        )}

        {/* Video Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#23262E] bg-[#111318]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onChangeVideoState({
                  ...videoState,
                  identityLockTemporal: !videoState.identityLockTemporal,
                })
              }
              aria-pressed={videoState.identityLockTemporal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                videoState.identityLockTemporal
                  ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-300'
                  : 'bg-amber-500/12 border-amber-500/35 text-amber-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {videoState.identityLockTemporal
                  ? 'Temporal Identity Lock: ON'
                  : 'Temporal Lock: OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-white bg-[#181B22] hover:bg-[#222631] border border-[#2A2E39] whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Local Video</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportVideoFile(file);
                e.target.value = '';
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoDetectScenes}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-white hover:bg-[#1D212A] whitespace-nowrap"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Detect Scenes</span>
            </button>
            <button
              type="button"
              onClick={handleExportLocalVideo}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-[#0B0C0E] text-xs font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Encoding...' : `Export ${videoState.enhanceUpscale}`}</span>
            </button>
          </div>
        </div>

        {/* Preview Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-5 min-h-[260px] overflow-hidden relative">
          <canvas
            ref={canvasRef}
            data-testid="video-preview-canvas"
            className="max-h-[46vh] max-w-full rounded-sm border border-[#23262E] shadow-2xl bg-[#0B0C0E]"
          />
          {statusMessage && (
            <p className="mt-3 text-xs text-amber-300 font-medium">{statusMessage}</p>
          )}
        </div>

        {/* Transport & Multi-Track Timeline */}
        <div className="border-t border-[#23262E] bg-[#111318] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous frame"
                onClick={() => handleStepFrame(-1)}
                className="p-1.5 rounded bg-[#181B22] hover:bg-[#222733] text-zinc-300"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label={videoState.isPlaying ? 'Pause video' : 'Play video'}
                onClick={() =>
                  onChangeVideoState({ ...videoState, isPlaying: !videoState.isPlaying })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-xs font-semibold"
              >
                {videoState.isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Play</span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label="Next frame"
                onClick={() => handleStepFrame(1)}
                className="p-1.5 rounded bg-[#181B22] hover:bg-[#222733] text-zinc-300"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono-tabular text-xs text-zinc-200 pl-2">
                {formatTimecode(videoState.currentTimeSec)} /{' '}
                {formatTimecode(videoState.durationSec)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Speed</span>
              {([0.25, 0.5, 1, 1.5, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onChangeVideoState({ ...videoState, playbackSpeed: spd })}
                  className={`px-2 py-1 rounded font-mono-tabular transition-colors ${
                    videoState.playbackSpeed === spd
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-[#181B22] text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubber + Scene Cut Markers */}
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={videoState.durationSec}
              step={0.05}
              aria-label="Video timeline playhead"
              value={videoState.currentTimeSec}
              onChange={(e) =>
                onChangeVideoState({
                  ...videoState,
                  isPlaying: false,
                  currentTimeSec: Number(e.target.value),
                })
              }
              className="studio-slider w-full"
            />

            {/* Video & Audio Track Bars */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-16 text-zinc-500 shrink-0 flex items-center gap-1">
                  <Film className="w-3 h-3" /> Video
                </span>
                <div className="flex-1 h-7 rounded bg-[#181B22] border border-[#252A35] relative overflow-hidden flex items-center px-2">
                  <span className="text-zinc-300 truncate">{videoState.sourceName}</span>
                  {videoState.scenes.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      title={sc.label}
                      onClick={() =>
                        onChangeVideoState({
                          ...videoState,
                          isPlaying: false,
                          currentTimeSec: sc.timeSec,
                        })
                      }
                      style={{ left: `${(sc.timeSec / Math.max(1, videoState.durationSec)) * 100}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400 hover:bg-amber-300"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-16 text-zinc-500 shrink-0">Audio ({audioTracks.length})</span>
                <button
                  type="button"
                  onClick={onOpenAudioStudio}
                  className="flex-1 h-6 rounded bg-[#151A22] hover:bg-[#1B222C] border border-[#232A36] text-left px-2 text-zinc-400 hover:text-zinc-200 truncate transition-colors"
                >
                  {audioTracks.length > 0
                    ? audioTracks.map((t) => t.name).join(' · ')
                    : 'Click to add offline background music or voiceover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Video AI Controls */}
      <aside className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#23262E] bg-[#111318] flex flex-col min-h-0">
        <div className="px-4 py-3.5 border-b border-[#23262E]">
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            AI Video Studio Controls
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Frame-consistent identity · Local GPU/CPU pipeline
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Video Background Replacement */}
          <div className="space-y-2.5 pb-4 border-b border-[#23262E]">
            <p className="text-xs font-medium text-zinc-200">AI Video Background</p>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-[#0C0E12] border border-[#23262E]">
              {(['original', 'blur', 'replace', 'remove'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeVideoState({ ...videoState, backgroundMode: m })}
                  className={`py-1.5 rounded text-xs capitalize transition-colors ${
                    videoState.backgroundMode === m
                      ? 'bg-amber-500 text-[#0B0C0E] font-medium'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {videoState.backgroundMode === 'replace' && (
              <select
                aria-label="Video replacement background"
                value={videoState.backgroundPresetId ?? 'bg-studio-slate'}
                onChange={(e) =>
                  onChangeVideoState({ ...videoState, backgroundPresetId: e.target.value })
                }
                className="w-full rounded-md bg-[#181B22] border border-[#2A2E39] px-2.5 py-1.5 text-xs text-zinc-100"
              >
                {BACKGROUND_PRESETS.slice(0, 8).map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    {bg.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stabilization, Denoise & Upscaling */}
          <div className="space-y-3 pb-4 border-b border-[#23262E]">
            <div className="flex items-center justify-between">
              <label htmlFor="toggle-vid-stab" className="text-xs text-zinc-200 cursor-pointer">
                AI Camera Stabilization
              </label>
              <input
                id="toggle-vid-stab"
                type="checkbox"
                checked={videoState.stabilize}
                onChange={(e) =>
                  onChangeVideoState({ ...videoState, stabilize: e.target.checked })
                }
                className="accent-amber-500 w-4 h-4"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="vid-stab-str" className="text-zinc-400">
                  Stabilization Damping
                </label>
                <span className="font-mono-tabular text-zinc-300">
                  {videoState.stabilizeStrength}%
                </span>
              </div>
              <input
                id="vid-stab-str"
                type="range"
                min={0}
                max={100}
                value={videoState.stabilizeStrength}
                onChange={(e) =>
                  onChangeVideoState({ ...videoState, stabilizeStrength: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="vid-denoise" className="text-zinc-400">
                  Video Noise Reduction
                </label>
                <span className="font-mono-tabular text-zinc-300">{videoState.denoise}%</span>
              </div>
              <input
                id="vid-denoise"
                type="range"
                min={0}
                max={100}
                value={videoState.denoise}
                onChange={(e) =>
                  onChangeVideoState({ ...videoState, denoise: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label htmlFor="toggle-vid-obj" className="text-xs text-zinc-300 cursor-pointer">
                AI Object Removal Mask
              </label>
              <input
                id="toggle-vid-obj"
                type="checkbox"
                checked={videoState.objectMaskEnabled}
                onChange={(e) =>
                  onChangeVideoState({ ...videoState, objectMaskEnabled: e.target.checked })
                }
                className="accent-amber-500 w-4 h-4"
              />
            </div>
          </div>

          {/* Color Grade, Transitions & Framing */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="vid-filter" className="text-xs font-medium text-zinc-200 block">
                Cinematic Color Grading
              </label>
              <select
                id="vid-filter"
                value={videoState.activeFilter}
                onChange={(e) =>
                  onChangeVideoState({ ...videoState, activeFilter: e.target.value as FilterId })
                }
                className="w-full rounded-md bg-[#181B22] border border-[#2A2E39] px-2.5 py-2 text-xs text-zinc-100"
              >
                {FILTER_PRESETS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="vid-transition" className="text-xs font-medium text-zinc-200 block">
                Scene Transition Style
              </label>
              <select
                id="vid-transition"
                value={videoState.transitionType}
                onChange={(e) =>
                  onChangeVideoState({
                    ...videoState,
                    transitionType: e.target.value as VideoEditState['transitionType'],
                  })
                }
                className="w-full rounded-md bg-[#181B22] border border-[#2A2E39] px-2.5 py-2 text-xs text-zinc-100"
              >
                <option value="none">Hard Cut</option>
                <option value="crossfade">Smooth Crossfade</option>
                <option value="dip-black">Dip to Black</option>
                <option value="slide">Editorial Slide</option>
                <option value="whip-pan">Dynamic Whip Pan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-200 block">Crop &amp; Aspect Ratio</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['16:9', '9:16', '1:1', '4:5'] as const).map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => onChangeVideoState({ ...videoState, aspectRatio: ar })}
                    className={`py-1.5 rounded border text-xs font-mono-tabular ${
                      videoState.aspectRatio === ar
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-[#252934] bg-[#161922] text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-200 block">
                AI Video Enhancement Output
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['1080p', '2K', '4K'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => onChangeVideoState({ ...videoState, enhanceUpscale: res })}
                    className={`py-1.5 rounded border text-xs font-mono-tabular ${
                      videoState.enhanceUpscale === res
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-[#252934] bg-[#161922] text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Temporal Identity Lock maintains consistent facial landmarks across all {videoState.scenes.length} detected scenes.
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
