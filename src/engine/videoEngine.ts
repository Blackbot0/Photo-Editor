import { AudioTrack, ExportConfig, VideoEditState, VideoSceneMarker } from '../types/studio';

export function createDefaultVideoState(): VideoEditState {
  return {
    sourceType: 'demo',
    sourceName: 'Studio Portrait Reel (Offline Demo)',
    sourceUrl: null,
    durationSec: 12,
    currentTimeSec: 0,
    isPlaying: false,
    trimStartSec: 0,
    trimEndSec: 12,
    playbackSpeed: 1,
    identityLockTemporal: true,
    backgroundMode: 'original',
    backgroundPresetId: 'bg-studio-slate',
    backgroundBlur: 35,
    stabilize: true,
    stabilizeStrength: 65,
    denoise: 20,
    enhanceUpscale: '4K',
    portraitEnhance: 30,
    activeFilter: 'cinematic',
    transitionType: 'crossfade',
    aspectRatio: '16:9',
    objectMaskEnabled: false,
    scenes: [
      { id: 'sc-1', timeSec: 0, label: 'Scene 1 · Key Light Portrait' },
      { id: 'sc-2', timeSec: 4.0, label: 'Scene 2 · Mid-Shot Pan' },
      { id: 'sc-3', timeSec: 8.0, label: 'Scene 3 · Golden Rim Close-Up' },
    ],
  };
}

export function detectVideoScenes(durationSec: number): VideoSceneMarker[] {
  const safeDur = Math.max(3, durationSec);
  const count = safeDur >= 10 ? 3 : 2;
  const labels = [
    'Scene 1 · Opening Subject Lock',
    'Scene 2 · Camera Motion Cut',
    'Scene 3 · Close Portrait Grade',
  ];
  const markers: VideoSceneMarker[] = [];
  for (let i = 0; i < count; i++) {
    markers.push({
      id: `detected-sc-${i + 1}`,
      timeSec: Number(((safeDur / count) * i).toFixed(2)),
      label: labels[i] ?? `Scene ${i + 1}`,
    });
  }
  return markers;
}

/**
 * Calculates effective gain [0..1] for an audio track at a given timeline timestamp,
 * accounting for mute, trim range, volume slider, fade-in, and fade-out envelopes.
 */
export function calculateAudioGainAtTime(track: AudioTrack, timeSec: number): number {
  if (track.muted || track.volume <= 0) return 0;
  const activeStart = track.startOffsetSec;
  const activeLength = Math.max(0.1, track.trimEndSec - track.trimStartSec);
  const activeEnd = activeStart + activeLength;
  if (timeSec < activeStart || timeSec > activeEnd) return 0;

  const rel = timeSec - activeStart;
  const baseGain = Math.max(0, Math.min(1, track.volume / 100));

  let env = 1;
  if (track.fadeInSec > 0 && rel < track.fadeInSec) {
    env = Math.min(env, rel / track.fadeInSec);
  }
  const remaining = activeEnd - timeSec;
  if (track.fadeOutSec > 0 && remaining < track.fadeOutSec) {
    env = Math.min(env, remaining / track.fadeOutSec);
  }
  return Number((baseGain * Math.max(0, Math.min(1, env))).toFixed(4));
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const frames = Math.floor((safe - Math.floor(safe)) * 30);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export function getExportDimensions(
  srcWidth: number,
  srcHeight: number,
  config: ExportConfig
): { width: number; height: number } {
  if (config.mediaType === 'video') {
    const heightMap: Record<ExportConfig['videoResolution'], number> = {
      '720p': 720,
      '1080p': 1080,
      '2K': 1440,
      '4K': 2160,
    };
    const baseH = heightMap[config.videoResolution];
    if (config.aspectRatio === '9:16') return { width: Math.round((baseH * 9) / 16), height: baseH };
    if (config.aspectRatio === '1:1') return { width: baseH, height: baseH };
    if (config.aspectRatio === '4:5') return { width: Math.round((baseH * 4) / 5), height: baseH };
    return { width: Math.round((baseH * 16) / 9), height: baseH };
  }

  // Photo export with upscale multiplier & aspect ratio crop
  const scaledW = srcWidth * config.upscaleMultiplier;
  const scaledH = srcHeight * config.upscaleMultiplier;

  if (config.aspectRatio === 'original') {
    return { width: Math.round(scaledW), height: Math.round(scaledH) };
  }

  const ratioMap: Record<Exclude<ExportConfig['aspectRatio'], 'original'>, number> = {
    '1:1': 1,
    '4:5': 4 / 5,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
  };
  const targetRatio = ratioMap[config.aspectRatio];
  const currentRatio = scaledW / Math.max(1, scaledH);

  if (currentRatio > targetRatio) {
    return { width: Math.round(scaledH * targetRatio), height: Math.round(scaledH) };
  }
  return { width: Math.round(scaledW), height: Math.round(scaledW / targetRatio) };
}

/**
 * Computes damped camera offset for AI Video Stabilization demo preview.
 */
export function computeStabilizedOffset(
  timeSec: number,
  stabilize: boolean,
  strength: number
): { dx: number; dy: number } {
  const rawDx = Math.sin(timeSec * 5.2) * 14 + Math.cos(timeSec * 2.7) * 6;
  const rawDy = Math.cos(timeSec * 4.4) * 10 + Math.sin(timeSec * 3.1) * 4;
  if (!stabilize) return { dx: rawDx, dy: rawDy };
  const damp = 1 - Math.max(0, Math.min(1, strength / 100)) * 0.92;
  return { dx: rawDx * damp, dy: rawDy * damp };
}
