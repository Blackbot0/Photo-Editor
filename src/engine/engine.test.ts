import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeImageMetrics,
  applyPhotoPipeline,
  checkIdentityRisk,
  computeFaceProtectionWeight,
  generateSmartSuggestions,
} from './imageMath';
import {
  createDefaultPhotoState,
  createHistoryStack,
  pushHistory,
  redoHistory,
  setLayerOpacity,
  toggleLayerVisibility,
  undoHistory,
} from './editState';
import {
  calculateAudioGainAtTime,
  computeStabilizedOffset,
  detectVideoScenes,
  formatTimecode,
  getExportDimensions,
} from './videoEngine';
import { AUDIO_LIBRARY } from '../data/catalog';

function makeSyntheticPortraitBuffer(width: number, height: number, brightness = 110): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;
      const inFace = Math.hypot((nx - 0.5) / 0.13, (ny - 0.25) / 0.13) < 1;
      if (inFace) {
        buf[idx] = 205;
        buf[idx + 1] = 152;
        buf[idx + 2] = 122;
        buf[idx + 3] = 255;
      } else {
        const clutter = ((x * 11 + y * 7) % 60) - 30;
        buf[idx] = Math.max(0, Math.min(255, brightness + clutter));
        buf[idx + 1] = Math.max(0, Math.min(255, brightness + 4 - clutter));
        buf[idx + 2] = Math.max(0, Math.min(255, brightness + 10));
        buf[idx + 3] = 255;
      }
    }
  }
  return buf;
}

test('computeFaceProtectionWeight locks inner face core and feathers smoothly outside', () => {
  const face = { x: 0.5, y: 0.25, rx: 0.12, ry: 0.12, detected: true };
  assert.equal(computeFaceProtectionWeight(0.5, 0.25, face), 1);
  assert.equal(computeFaceProtectionWeight(0.05, 0.9, face), 0);
  const edge = computeFaceProtectionWeight(0.62, 0.25, face);
  assert.ok(edge > 0 && edge < 1, `Expected feathered edge weight, got ${edge}`);
});

test('Identity Lock significantly preserves original facial pixels under heavy stylization', () => {
  const w = 64;
  const h = 64;
  const src = makeSyntheticPortraitBuffer(w, h, 90);
  const base = createDefaultPhotoState(0);
  base.faceAnchor = { x: 0.5, y: 0.25, rx: 0.13, ry: 0.13, detected: true };
  base.activeFilter = 'neon-cyber';
  base.filterIntensity = 100;

  const unlockedRes = applyPhotoPipeline(src, null, w, h, { ...base, identityLock: false });
  const lockedRes = applyPhotoPipeline(src, null, w, h, { ...base, identityLock: true });

  assert.ok(
    lockedRes.faceDeltaMean < unlockedRes.faceDeltaMean * 0.35,
    `Expected Identity Lock face delta (${lockedRes.faceDeltaMean}) to be much smaller than unlocked (${unlockedRes.faceDeltaMean})`
  );
});

test('checkIdentityRisk warns when disabling Identity Lock or applying heavy anime stylization', () => {
  const base = createDefaultPhotoState(0);
  const disableWarning = checkIdentityRisk(base, { identityLock: false });
  assert.ok(disableWarning !== null);
  assert.equal(disableWarning?.severity, 'warning');

  const animeWarning = checkIdentityRisk(base, { activeFilter: 'anime-art', filterIntensity: 90 });
  assert.ok(animeWarning !== null);
  assert.ok(animeWarning?.title.includes('Artistic Cel Studio'));

  // Subsequent unrelated background edit after acknowledging anime-art must NOT re-trigger warning
  const afterAnime = { ...base, activeFilter: 'anime-art' as const, filterIntensity: 90 };
  const bgEditWarning = checkIdentityRisk(afterAnime, {
    ...afterAnime,
    background: { ...afterAnime.background, mode: 'replace', presetId: 'bg-alpine-golden' },
  });
  assert.equal(bgEditWarning, null);
});

test('analyzeImageMetrics & generateSmartSuggestions return actionable one-tap recommendations', () => {
  const buf = makeSyntheticPortraitBuffer(64, 64, 85);
  const metrics = analyzeImageMetrics(buf, 64, 64);
  assert.ok(metrics.avgLuminance > 40 && metrics.avgLuminance < 160);
  const suggestions = generateSmartSuggestions(metrics);
  assert.ok(suggestions.length >= 4);
  const base = createDefaultPhotoState(0);
  const updated = suggestions[0].applyPatch(base);
  assert.equal(updated.identityLock, true);
});

test('non-destructive history stack supports undo, redo, and layer edits', () => {
  const initial = createDefaultPhotoState(0);
  let stack = createHistoryStack(initial, 'Init');
  const edited = { ...initial, activeFilter: 'cinematic' as const };
  stack = pushHistory(stack, edited, 'Apply Cinematic');
  assert.equal(stack.index, 1);

  const undone = undoHistory(stack);
  assert.equal(undone.state.activeFilter, 'none');
  assert.equal(undone.stack.index, 0);

  const redone = redoHistory(undone.stack);
  assert.equal(redone.state.activeFilter, 'cinematic');

  const hidden = toggleLayerVisibility(edited, 'layer-color');
  assert.equal(hidden.layers.find((l) => l.id === 'layer-color')?.visible, false);

  const faded = setLayerOpacity(edited, 'layer-color', 60);
  assert.equal(faded.layers.find((l) => l.id === 'layer-color')?.opacity, 60);
});

test('video engine computes scene markers, audio fade envelopes, stabilization, and 4K export dimensions', () => {
  const scenes = detectVideoScenes(12);
  assert.equal(scenes.length, 3);
  assert.equal(scenes[0].timeSec, 0);

  const track = { ...AUDIO_LIBRARY[0], volume: 100, fadeInSec: 2, fadeOutSec: 2, startOffsetSec: 0, trimStartSec: 0, trimEndSec: 10 };
  assert.equal(calculateAudioGainAtTime(track, 0), 0);
  assert.equal(calculateAudioGainAtTime(track, 1), 0.5);
  assert.equal(calculateAudioGainAtTime(track, 5), 1);
  assert.equal(calculateAudioGainAtTime(track, 9), 0.5);
  assert.equal(calculateAudioGainAtTime(track, 11), 0);

  const raw = computeStabilizedOffset(1.2, false, 80);
  const stab = computeStabilizedOffset(1.2, true, 80);
  assert.ok(Math.abs(stab.dx) < Math.abs(raw.dx));

  assert.equal(formatTimecode(65.5), '01:05:15');

  const photo4k = getExportDimensions(960, 1280, {
    mediaType: 'photo',
    format: 'image/jpeg',
    quality: 92,
    aspectRatio: 'original',
    upscaleMultiplier: 4,
    videoResolution: '4K',
    presetName: '4K Print',
  });
  assert.deepEqual(photo4k, { width: 3840, height: 5120 });

  const reelsVideo = getExportDimensions(1920, 1080, {
    mediaType: 'video',
    format: 'video/webm',
    quality: 90,
    aspectRatio: '9:16',
    upscaleMultiplier: 1,
    videoResolution: '1080p',
    presetName: 'Reels',
  });
  assert.deepEqual(reelsVideo, { width: 608, height: 1080 });
});
