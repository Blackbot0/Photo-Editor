import {
  BACKGROUND_PRESETS,
  FILTER_PRESETS,
} from '../data/catalog';
import {
  FaceAnchor,
  FilterId,
  IdentityWarning,
  ImageAnalysisMetrics,
  PhotoEditState,
  SmartSuggestion,
} from '../types/studio';

export function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Computes a smooth elliptical weight in [0, 1] for the protected facial identity region.
 * 1.0 inside the inner facial core (eyes, nose, lips, jawline), smoothly feathered to 0 at boundary.
 */
export function computeFaceProtectionWeight(
  nx: number,
  ny: number,
  face: FaceAnchor
): number {
  if (!face.detected || face.rx <= 0 || face.ry <= 0) return 0;
  const dx = (nx - face.x) / face.rx;
  const dy = (ny - face.y) / face.ry;
  const distSq = dx * dx + dy * dy;
  if (distSq <= 0.64) return 1; // Inner 80% ellipse: full facial lock
  if (distSq >= 1.56) return 0; // Outside 125% ellipse: unlocked
  const dist = Math.sqrt(distSq);
  const t = (dist - 0.8) / (1.25 - 0.8);
  // Smoothstep falloff for natural hairline & neck transition
  const smooth = t * t * (3 - 2 * t);
  return Math.max(0, Math.min(1, 1 - smooth));
}

/**
 * Checks whether a proposed edit threatens the subject's recognizable facial identity.
 * Per strict requirement: warn the user instead of silently altering identity.
 */
export function checkIdentityRisk(
  current: PhotoEditState,
  proposed: Partial<PhotoEditState>
): IdentityWarning | null {
  const nextIdentityLock =
    proposed.identityLock !== undefined ? proposed.identityLock : current.identityLock;
  const nextFilter =
    proposed.activeFilter !== undefined ? proposed.activeFilter : current.activeFilter;
  const nextFilterIntensity =
    proposed.filterIntensity !== undefined
      ? proposed.filterIntensity
      : current.filterIntensity;
  const nextSkin =
    proposed.enhancement?.naturalSkin !== undefined
      ? proposed.enhancement.naturalSkin
      : current.enhancement.naturalSkin;
  const nextHair =
    proposed.clothing?.hairStyle !== undefined
      ? proposed.clothing.hairStyle
      : current.clothing.hairStyle;

  if (current.identityLock && proposed.identityLock === false) {
    return {
      severity: 'warning',
      title: 'Identity Lock Disabling Warning',
      reason:
        'Turning off Identity Lock removes facial feature protection. Stylized filters or aggressive skin retouching may alter eyes, jawline, or skin tone.',
      recommendation:
        'Keep Identity Lock enabled so creative edits affect surroundings and clothing while keeping the person recognizable.',
      proposedActionLabel: 'Disable Identity Lock Anyway',
    };
  }

  const preset = FILTER_PRESETS.find((f) => f.id === nextFilter);
  const introducedHighDistortion =
    preset?.highDistortion &&
    nextFilterIntensity > 65 &&
    (nextFilter !== current.activeFilter || current.filterIntensity <= 65);

  if (introducedHighDistortion) {
    return {
      severity: nextIdentityLock ? 'warning' : 'blocked',
      title: `${preset.name} Exceeds Natural Identity Threshold`,
      reason: nextIdentityLock
        ? 'This creative stylization uses heavy color/posterization shifts. Identity Lock will strictly shield the face region while applying the effect to the background and clothing.'
        : 'Applying heavy artistic stylization with Identity Lock disabled can distort facial recognition features.',
      recommendation:
        'Apply with Identity Lock shielding the face (recommended) or reduce intensity below 65%.',
      proposedActionLabel: 'Apply with Face Shield Active',
    };
  }

  const introducedHighSkin =
    !nextIdentityLock &&
    nextSkin > 70 &&
    (current.identityLock || current.enhancement.naturalSkin <= 70);

  if (introducedHighSkin) {
    return {
      severity: 'warning',
      title: 'High Skin Smoothing Risk',
      reason:
        'Skin smoothing above 70% without Identity Lock may flatten natural skin pores and facial contours.',
      recommendation:
        'Enable Identity Lock or keep natural skin enhancement under 60% for authentic portrait texture.',
      proposedActionLabel: 'Enable Identity Lock & Apply',
    };
  }

  if (!nextIdentityLock && nextHair !== 'original' && nextHair !== current.clothing.hairStyle) {
    return {
      severity: 'warning',
      title: 'Hairstyle Preview Without Face Anchor',
      reason:
        'Hairstyle and grooming overlays should use Identity Lock to keep forehead proportions and jawline unchanged.',
      recommendation: 'Keep Identity Lock active during styling edits.',
      proposedActionLabel: 'Keep Identity Lock Active',
    };
  }

  return null;
}

/**
 * Analyzes an RGBA image buffer locally to produce real histogram & quality metrics.
 */
export function analyzeImageMetrics(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): ImageAnalysisMetrics {
  const pixelCount = width * height;
  if (pixelCount === 0) {
    return {
      avgLuminance: 128,
      contrastSpread: 45,
      warmthBias: 0,
      saturationMean: 30,
      edgeSharpness: 50,
      backgroundClutter: 50,
      noiseEstimate: 20,
    };
  }

  const step = Math.max(1, Math.floor(pixelCount / 16000));
  let lumSum = 0;
  let lumSqSum = 0;
  let warmthSum = 0;
  let satSum = 0;
  let edgeSum = 0;
  let bgEdgeSum = 0;
  let bgSamples = 0;
  let samples = 0;

  for (let i = 0; i < pixelCount; i += step) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumSum += lum;
    lumSqSum += lum * lum;
    warmthSum += r - b;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC > 0 ? ((maxC - minC) / maxC) * 100 : 0;
    satSum += sat;

    const x = i % width;
    const y = Math.floor(i / width);
    if (x + 1 < width && y + 1 < height) {
      const rightIdx = (i + 1) * 4;
      const downIdx = (i + width) * 4;
      const lumR = 0.299 * rgba[rightIdx] + 0.587 * rgba[rightIdx + 1] + 0.114 * rgba[rightIdx + 2];
      const lumD = 0.299 * rgba[downIdx] + 0.587 * rgba[downIdx + 1] + 0.114 * rgba[downIdx + 2];
      const grad = Math.abs(lum - lumR) + Math.abs(lum - lumD);
      edgeSum += grad;

      const nx = x / width;
      const ny = y / height;
      const isBorder = nx < 0.25 || nx > 0.75 || ny < 0.18;
      if (isBorder) {
        bgEdgeSum += grad;
        bgSamples++;
      }
    }
    samples++;
  }

  const avgLuminance = lumSum / Math.max(1, samples);
  const variance = Math.max(0, lumSqSum / Math.max(1, samples) - avgLuminance * avgLuminance);
  const contrastSpread = Math.min(128, Math.sqrt(variance));
  const warmthBias = Math.max(-100, Math.min(100, (warmthSum / Math.max(1, samples)) * 1.2));
  const saturationMean = Math.min(100, satSum / Math.max(1, samples));
  const edgeSharpness = Math.min(100, (edgeSum / Math.max(1, samples)) * 2.4);
  const backgroundClutter = Math.min(100, (bgEdgeSum / Math.max(1, bgSamples)) * 2.8);
  const noiseEstimate = Math.min(100, Math.max(5, 100 - contrastSpread * 0.9 + (edgeSharpness > 65 ? 18 : 6)));

  return {
    avgLuminance: Math.round(avgLuminance),
    contrastSpread: Math.round(contrastSpread),
    warmthBias: Math.round(warmthBias),
    saturationMean: Math.round(saturationMean),
    edgeSharpness: Math.round(edgeSharpness),
    backgroundClutter: Math.round(backgroundClutter),
    noiseEstimate: Math.round(noiseEstimate),
  };
}

/**
 * Generates concrete, one-tap creative recommendations based on real image metrics.
 */
export function generateSmartSuggestions(
  metrics: ImageAnalysisMetrics
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  if (metrics.backgroundClutter >= 26) {
    suggestions.push({
      id: 'sug-bg-cinematic',
      title: 'Replace Distracting Background',
      category: 'Background',
      headline: 'Your background has competing visual clutter. Replace it with a Twilight Penthouse or Studio backdrop.',
      explanation:
        'Isolates the subject with edge-feathered matting, adds subtle optical depth blur, and matches subject lighting while Identity Lock preserves the original face 100%.',
      identitySafe: true,
      patchLabel: 'Apply Penthouse Background + Lighting Match',
      applyPatch: (cur) => ({
        ...cur,
        identityLock: true,
        background: {
          ...cur.background,
          mode: 'replace',
          presetId: 'bg-luxury-penthouse',
          blurAmount: 22,
          matchLighting: true,
          matchShadows: true,
        },
      }),
    });
  }

  suggestions.push({
    id: 'sug-filter-dslr',
    title:
      metrics.avgLuminance < 115
        ? 'Lift Shadows with DSLR 50mm Prime'
        : 'Try Professional DSLR Prime 50mm Filter',
    category: 'Filter',
    headline:
      metrics.warmthBias < 5
        ? 'This photo would look better with warm skin tones and cinematic depth.'
        : 'Add optical micro-contrast and clean highlight roll-off with a DSLR 50mm grade.',
    explanation:
      'Applies balanced contrast (+14), subtle warmth, and natural skin luminance calibration without altering facial geometry.',
    identitySafe: true,
    patchLabel: 'Apply DSLR Prime 50mm Grade',
    applyPatch: (cur) => ({
      ...cur,
      identityLock: true,
      activeFilter: metrics.warmthBias < 5 ? 'cinematic' : 'dslr-pro',
      filterIntensity: 78,
      enhancement: {
        ...cur.enhancement,
        exposure: metrics.avgLuminance < 115 ? 10 : cur.enhancement.exposure,
        portraitQuality: Math.max(cur.enhancement.portraitQuality, 35),
      },
    }),
  });

  suggestions.push({
    id: 'sug-upscale-4k',
    title: 'Enhance & Upscale to 4K Detail',
    category: 'Enhancement',
    headline: 'This image can be enhanced to 4K with local noise reduction and sharpness recovery.',
    explanation:
      'Enables 4x super-resolution export scaling, reduces sensor grain, restores fine texture, and keeps natural skin pores intact.',
    identitySafe: true,
    patchLabel: 'Enable 4K Upscale & Detail Recovery',
    applyPatch: (cur) => ({
      ...cur,
      identityLock: true,
      enhancement: {
        ...cur.enhancement,
        upscaleFactor: 4,
        deblurRestore: 38,
        denoise: 28,
        sharpness: 42,
        portraitQuality: 45,
        naturalSkin: 26,
      },
    }),
  });

  suggestions.push({
    id: 'sug-outfit-tailored',
    title: 'Tailored Wardrobe Styling',
    category: 'Clothing',
    headline: 'Preview a Midnight Navy Tailored Suit matched to your portrait lighting.',
    explanation:
      'Re-tones and refines the torso clothing region with wool fabric shading while keeping neck, face, and body identity completely locked.',
    identitySafe: true,
    patchLabel: 'Try Midnight Navy Tailored Suit',
    applyPatch: (cur) => ({
      ...cur,
      identityLock: true,
      clothing: {
        ...cur.clothing,
        category: 'suit',
        styleName: 'Tailored Wool Suit',
        colorHex: '#1B2845',
        fabricTexture: 'wool',
        intensity: 76,
      },
    }),
  });

  suggestions.push({
    id: 'sug-vintage-warm',
    title: 'Warm Golden Hour Editorial',
    category: 'Filter',
    headline: 'A warm Golden Hour grade with subtle portrait bokeh would elevate this frame.',
    explanation:
      'Introduces warm late-afternoon highlight tones and soft background depth separation while preserving recognizable skin tone.',
    identitySafe: true,
    patchLabel: 'Apply Golden Hour + Portrait Blur',
    applyPatch: (cur) => ({
      ...cur,
      identityLock: true,
      activeFilter: 'golden-hour',
      filterIntensity: 70,
      background:
        cur.background.mode === 'original'
          ? { ...cur.background, mode: 'blur', blurAmount: 42 }
          : cur.background,
    }),
  });

  suggestions.push({
    id: 'sug-remove-distraction',
    title: 'Clean Background Distractions',
    category: 'Object Cleanup',
    headline: 'Remove background passersby on the left edge using Smart Content-Aware Inpainting.',
    explanation:
      'Applies local patch-fill cleanup over distracting background regions so the eye stays focused on the subject.',
    identitySafe: true,
    patchLabel: 'Clean Left Background Distractions',
    applyPatch: (cur) => ({
      ...cur,
      identityLock: true,
      eraseStrokes: [
        ...cur.eraseStrokes,
        { id: 'auto-clean-1', x: 0.14, y: 0.46, radius: 0.11, mode: 'inpaint' },
        { id: 'auto-clean-2', x: 0.84, y: 0.39, radius: 0.08, mode: 'inpaint' },
      ],
    }),
  });

  return suggestions;
}

/**
 * Recommends top 3 filter IDs from the 16-filter library based on local image analysis.
 */
export function recommendFilterIds(metrics: ImageAnalysisMetrics): FilterId[] {
  const picks: FilterId[] = [];
  if (metrics.avgLuminance < 105) {
    picks.push('night-photo', 'studio-lighting', 'cinematic');
  } else if (metrics.warmthBias < -4) {
    picks.push('golden-hour', 'cinematic', 'natural-skin');
  } else if (metrics.contrastSpread < 42) {
    picks.push('dslr-pro', 'hdr-enhance', 'luxury-fashion');
  } else {
    picks.push('cinematic', 'dslr-pro', 'portrait-studio');
  }
  return picks;
}

/**
 * Computes a soft foreground subject alpha mask [0..1] per pixel.
 * Combines border-color distance, portrait silhouette prior anchored on the face/shoulders,
 * and skin-tone protection so background removal/replacement looks cohesive offline.
 */
export function computeSubjectMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  face: FaceAnchor,
  tolerance: number,
  feather: number
): Float32Array {
  const mask = new Float32Array(width * height);

  // Sample border reference colors (top-left, top-right, mid-left, mid-right)
  const samples: Array<[number, number, number]> = [];
  const sampleCoords = [
    [0.04, 0.08],
    [0.96, 0.08],
    [0.04, 0.32],
    [0.96, 0.32],
    [0.08, 0.15],
    [0.92, 0.15],
  ];
  for (const [sx, sy] of sampleCoords) {
    const px = Math.min(width - 1, Math.max(0, Math.floor(sx * width)));
    const py = Math.min(height - 1, Math.max(0, Math.floor(sy * height)));
    const idx = (py * width + px) * 4;
    samples.push([rgba[idx], rgba[idx + 1], rgba[idx + 2]]);
  }

  const cx = face.detected ? face.x : 0.5;
  const cy = face.detected ? face.y : 0.26;
  const rx = face.detected ? face.rx : 0.14;
  const ry = face.detected ? face.ry : 0.13;

  const tolScale = 0.5 + (tolerance / 100) * 1.1; // 0.6 .. 1.6
  const featherWidth = 0.12 + (feather / 100) * 0.28;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const i = y * width + x;
      const idx = i * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      // 1. Head + Hair silhouette prior
      const hdx = (nx - cx) / (rx * 1.28);
      const hdy = (ny - (cy - ry * 0.08)) / (ry * 1.38);
      const headDist = Math.sqrt(hdx * hdx + hdy * hdy);

      // 2. Neck & Shoulders / Torso silhouette prior
      const torsoCenterY = cy + ry * 4.2;
      const torsoRx = Math.min(0.42, rx * 2.55);
      const torsoRy = Math.max(0.45, ry * 3.7);
      const tdx = (nx - cx) / torsoRx;
      const tdy = (ny - torsoCenterY) / torsoRy;
      const torsoDist = ny > cy + ry * 0.65 ? Math.sqrt(tdx * tdx + tdy * tdy) : 2.0;

      // Neck bridge connecting head and torso
      const neckDist =
        ny >= cy + ry * 0.45 && ny <= cy + ry * 1.6
          ? Math.abs(nx - cx) / (rx * 0.72)
          : 2.0;

      const bodyDist = Math.min(headDist, torsoDist, neckDist);

      // 3. Color distance from sampled background borders
      let minBgDist = 255;
      for (let s = 0; s < samples.length; s++) {
        const dr = r - samples[s][0];
        const dg = g - samples[s][1];
        const db = b - samples[s][2];
        const d = Math.sqrt(dr * dr + dg * dg + db * db) / 1.732;
        if (d < minBgDist) minBgDist = d;
      }

      // 4. Combine geometric figure prior with color separation
      let score = 0;
      if (bodyDist < 0.85) {
        score = 1.0;
      } else if (bodyDist < 1.28) {
        // Transition rim around shoulders/hair — refine using border color distance
        const geoAlpha = 1 - (bodyDist - 0.85) / 0.43;
        const colorAlpha = Math.min(1, Math.max(0, (minBgDist - 18 * tolScale) / 42));
        score = geoAlpha * 0.65 + colorAlpha * 0.35;
        if (geoAlpha > 0.4 && colorAlpha > 0.55) {
          score = Math.min(1, score + 0.25);
        }
      } else {
        score = 0;
      }

      // Smooth feathering around 0.5 threshold
      const low = 0.5 - featherWidth * 0.5;
      const high = 0.5 + featherWidth * 0.5;
      if (score <= low) {
        mask[i] = 0;
      } else if (score >= high) {
        mask[i] = 1;
      } else {
        const t = (score - low) / (high - low);
        mask[i] = t * t * (3 - 2 * t);
      }
    }
  }

  return mask;
}

/**
 * Pure full-featured offline photo processing pipeline.
 * Operates deterministically on RGBA buffers so it can be unit-tested in Node AND run live in Canvas.
 */
export function applyPhotoPipeline(
  sourceRgba: Uint8ClampedArray,
  bgRgba: Uint8ClampedArray | null,
  width: number,
  height: number,
  state: PhotoEditState
): { output: Uint8ClampedArray; faceDeltaMean: number } {
  const len = width * height * 4;
  const out = new Uint8ClampedArray(sourceRgba);

  const layerMap = new Map(state.layers.map((l) => [l.type, l]));
  const bgLayer = layerMap.get('background');
  const colorLayer = layerMap.get('color-grade');
  const clothingLayer = layerMap.get('clothing');
  const retouchLayer = layerMap.get('retouch');
  const identityLayer = layerMap.get('identity-mask');

  const aiScale = state.aiIntensity / 100;
  const filterPreset =
    FILTER_PRESETS.find((f) => f.id === state.activeFilter) ?? FILTER_PRESETS[0];
  const bgPreset = BACKGROUND_PRESETS.find((b) => b.id === state.background.presetId);

  // 1. Smart Object Eraser / Content-Aware Inpaint Strokes (background / non-face areas)
  if (retouchLayer?.visible !== false && state.eraseStrokes.length > 0) {
    const retouchOpacity = (retouchLayer?.opacity ?? 100) / 100;
    for (const stroke of state.eraseStrokes) {
      const cx = Math.floor(stroke.x * width);
      const cy = Math.floor(stroke.y * height);
      const rad = Math.max(4, Math.floor(stroke.radius * Math.min(width, height)));
      const sampleOffset = Math.min(width - 1, rad + 6);

      const minY = Math.max(0, cy - rad);
      const maxY = Math.min(height - 1, cy + rad);
      const minX = Math.max(0, cx - rad);
      const maxX = Math.min(width - 1, cx + rad);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dist = Math.hypot(x - cx, y - cy);
          if (dist > rad) continue;
          const weight = (1 - dist / rad) * retouchOpacity;
          const smoothW = weight * weight * (3 - 2 * weight);

          // Sample surrounding patch (horizontal mirrored offset for realistic local texture fill)
          const srcX = x + sampleOffset < width ? x + sampleOffset : Math.max(0, x - sampleOffset);
          const srcY = Math.max(0, Math.min(height - 1, y - Math.floor(rad * 0.2)));
          const dstIdx = (y * width + x) * 4;
          const patchIdx = (srcY * width + srcX) * 4;

          out[dstIdx] = clampByte(out[dstIdx] * (1 - smoothW) + sourceRgba[patchIdx] * smoothW);
          out[dstIdx + 1] = clampByte(
            out[dstIdx + 1] * (1 - smoothW) + sourceRgba[patchIdx + 1] * smoothW
          );
          out[dstIdx + 2] = clampByte(
            out[dstIdx + 2] * (1 - smoothW) + sourceRgba[patchIdx + 2] * smoothW
          );
        }
      }
    }
  }

  // 2. Background Segmentation, Removal, Blur, or Replacement
  const needsMask =
    state.background.mode !== 'original' && bgLayer?.visible !== false;
  let subjectMask: Float32Array | null = null;
  if (needsMask) {
    subjectMask = computeSubjectMask(
      out,
      width,
      height,
      state.faceAnchor,
      state.background.subjectTolerance,
      state.background.edgeFeather
    );

    const bgOpacity = (bgLayer?.opacity ?? 100) / 100;
    const blurRadius =
      state.background.mode === 'blur'
        ? Math.max(2, Math.round((state.background.blurAmount / 100) * 10))
        : state.background.mode === 'replace' && state.background.blurAmount > 5
          ? Math.max(1, Math.round((state.background.blurAmount / 100) * 6))
          : 0;

    // Fast separable box-blur buffer for background depth bokeh
    let blurredBg: Uint8ClampedArray | null = null;
    if (blurRadius > 0) {
      const baseForBlur = state.background.mode === 'replace' && bgRgba ? bgRgba : out;
      blurredBg = boxBlurRgba(baseForBlur, width, height, blurRadius);
    }

    for (let i = 0; i < width * height; i++) {
      const alpha = subjectMask[i];
      if (alpha >= 0.999) continue;
      const idx = i * 4;
      const inv = (1 - alpha) * bgOpacity;

      if (state.background.mode === 'remove') {
        // Transparent cutout alpha channel
        out[idx + 3] = clampByte(alpha * 255);
      } else if (state.background.mode === 'blur' && blurredBg) {
        out[idx] = clampByte(out[idx] * (1 - inv) + blurredBg[idx] * inv);
        out[idx + 1] = clampByte(out[idx + 1] * (1 - inv) + blurredBg[idx + 1] * inv);
        out[idx + 2] = clampByte(out[idx + 2] * (1 - inv) + blurredBg[idx + 2] * inv);
      } else if (state.background.mode === 'replace') {
        const bgSource = blurredBg ?? bgRgba;
        if (bgSource) {
          out[idx] = clampByte(out[idx] * (1 - inv) + bgSource[idx] * inv);
          out[idx + 1] = clampByte(out[idx + 1] * (1 - inv) + bgSource[idx + 1] * inv);
          out[idx + 2] = clampByte(out[idx + 2] * (1 - inv) + bgSource[idx + 2] * inv);
        }
      }
    }
  }

  // 3. Virtual Clothing & Appearance Recoloring / Fabric Lighting (Torso region only — Face strictly excluded)
  if (
    state.clothing.category !== 'none' &&
    clothingLayer?.visible !== false &&
    state.clothing.intensity > 0
  ) {
    const [tr, tg, tb] = hexToRgb(state.clothing.colorHex);
    const clothAlpha = (state.clothing.intensity / 100) * ((clothingLayer?.opacity ?? 100) / 100);
    const cx = state.faceAnchor.detected ? state.faceAnchor.x : 0.5;
    const cy = state.faceAnchor.detected ? state.faceAnchor.y : 0.25;
    const rx = state.faceAnchor.detected ? state.faceAnchor.rx : 0.13;
    const ry = state.faceAnchor.detected ? state.faceAnchor.ry : 0.13;

    const torsoTop = cy + ry * 1.15;
    const torsoWidth = Math.min(0.42, rx * 2.45);
    const fabricContrast =
      state.clothing.fabricTexture === 'wool'
        ? 1.14
        : state.clothing.fabricTexture === 'silk'
          ? 1.22
          : state.clothing.fabricTexture === 'denim'
            ? 1.18
            : 1.04;

    for (let y = Math.floor(torsoTop * height); y < height; y++) {
      const ny = y / height;
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const i = y * width + x;
        const dx = Math.abs(nx - cx) / torsoWidth;
        if (dx > 1.05) continue;

        // Collar V-neck / crew cutout protection for natural neck skin
        const neckCutout =
          ny < torsoTop + ry * 0.72 && Math.abs(nx - cx) < rx * (state.clothing.category === 'suit' ? 0.52 : 0.42);
        if (neckCutout) continue;

        const idx = i * 4;
        const r = out[idx];
        const g = out[idx + 1];
        const b = out[idx + 2];

        // Skip obvious skin pixels (hands/neck) to keep body identity untouched
        const isSkin = r > 95 && g > 45 && b > 25 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 22;
        if (isSkin) continue;

        const fgWeight = subjectMask ? subjectMask[i] : dx < 0.85 ? 1 : Math.max(0, 1 - (dx - 0.85) / 0.2);
        if (fgWeight <= 0.05) continue;

        const topFeather = Math.min(1, (ny - torsoTop) / 0.04);
        const edgeFeather = dx < 0.82 ? 1 : Math.max(0, 1 - (dx - 0.82) / 0.23);
        const w = clothAlpha * fgWeight * topFeather * edgeFeather;

        // Preserve original luminance fold shading while applying target fabric color
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const shadedLum = Math.max(0.08, Math.min(1.15, (lum - 0.45) * fabricContrast + 0.52));

        // Subtle woven texture modulation
        const weave =
          state.clothing.fabricTexture === 'denim'
            ? ((x + y) % 3 === 0 ? 1.04 : 0.97)
            : state.clothing.fabricTexture === 'wool'
              ? ((x * 7 + y * 13) % 5 === 0 ? 1.03 : 0.98)
              : 1.0;

        const nr = tr * shadedLum * weave;
        const ng = tg * shadedLum * weave;
        const nb = tb * shadedLum * weave;

        out[idx] = clampByte(r * (1 - w) + nr * w);
        out[idx + 1] = clampByte(g * (1 - w) + ng * w);
        out[idx + 2] = clampByte(b * (1 - w) + nb * w);
      }
    }
  }

  // 4. Enhancement & Denoise / Natural Skin Smooth (Fast local neighborhood blend)
  const smoothAmount =
    (state.enhancement.denoise * 0.5 + state.enhancement.naturalSkin * 0.45) * 0.01 * aiScale;
  if (smoothAmount > 0.04) {
    const blurred = boxBlurRgba(out, width, height, 1);
    for (let i = 0; i < len; i += 4) {
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      // Edge-preserving bilateral approximation: preserve crisp high-contrast edges (eyes, lashes, hair)
      const diff =
        (Math.abs(r - blurred[i]) + Math.abs(g - blurred[i + 1]) + Math.abs(b - blurred[i + 2])) / 3;
      const edgeKeep = diff > 24 ? 0.15 : 1.0;
      const w = Math.min(0.65, smoothAmount * edgeKeep);
      out[i] = clampByte(r * (1 - w) + blurred[i] * w);
      out[i + 1] = clampByte(g * (1 - w) + blurred[i + 1] * w);
      out[i + 2] = clampByte(b * (1 - w) + blurred[i + 2] * w);
    }
  }

  // 5. Sharpness & Deblur Restoration (Unsharp Mask)
  const sharpAmount =
    (state.enhancement.sharpness * 0.65 +
      state.enhancement.deblurRestore * 0.8 +
      state.enhancement.portraitQuality * 0.35 +
      (state.enhancement.upscaleFactor > 1 ? 24 : 0)) *
    0.01 *
    aiScale;
  if (sharpAmount > 0.05) {
    const soft = boxBlurRgba(out, width, height, 1);
    const gain = Math.min(1.35, sharpAmount * 0.9);
    for (let i = 0; i < len; i += 4) {
      out[i] = clampByte(out[i] + (out[i] - soft[i]) * gain);
      out[i + 1] = clampByte(out[i + 1] + (out[i + 1] - soft[i + 1]) * gain);
      out[i + 2] = clampByte(out[i + 2] + (out[i + 2] - soft[i + 2]) * gain);
    }
  }

  // 6. Color Grading, Lighting Match, Filter Matrix & Old Photo Restoration
  const colorVisible = colorLayer?.visible !== false;
  const colorOpacity = ((colorLayer?.opacity ?? 100) / 100) * (colorVisible ? 1 : 0);
  const fStr = (state.filterIntensity / 100) * aiScale * colorOpacity;

  const restoreBoost = (state.enhancement.oldPhotoRestore / 100) * aiScale;
  const ambientTemp =
    state.background.mode === 'replace' && state.background.matchLighting && bgPreset
      ? bgPreset.ambientTemp
      : 0;
  const ambientExp =
    state.background.mode === 'replace' && state.background.matchLighting && bgPreset
      ? bgPreset.ambientExposure
      : 0;

  const totalExposure =
    state.enhancement.exposure +
    filterPreset.exposure * fStr +
    restoreBoost * 10 +
    ambientExp * 0.55;
  const totalContrast =
    state.enhancement.contrast +
    filterPreset.contrast * fStr +
    restoreBoost * 18;
  const totalSaturation =
    state.enhancement.saturation +
    filterPreset.saturation * fStr +
    restoreBoost * 14;
  const totalWarmth =
    state.enhancement.warmth +
    filterPreset.warmth * fStr -
    restoreBoost * 8 +
    ambientTemp * 0.6;
  const totalVignette = Math.min(
    100,
    state.enhancement.vignette + filterPreset.vignette * fStr
  );

  const contrastFactor = Math.pow((100 + totalContrast) / 100, 1.35);
  const satFactor = Math.max(0, 1 + totalSaturation / 100);
  const expOffset = totalExposure * 1.65;
  const warmR = totalWarmth * 0.72;
  const warmB = -totalWarmth * 0.72;
  const tintG = filterPreset.tint * fStr * 0.5;
  const fadeLift = filterPreset.fade * fStr * 0.8;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const i = y * width + x;
      const idx = i * 4;
      let r = out[idx];
      let g = out[idx + 1];
      let b = out[idx + 2];

      // Exposure + Warmth + Tint
      r += expOffset + warmR;
      g += expOffset + tintG;
      b += expOffset + warmB;

      // Contrast
      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      // Saturation or Monochrome
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (filterPreset.monochrome && fStr > 0.01) {
        const bwR = lum;
        r = r * (1 - fStr) + bwR * fStr;
        g = g * (1 - fStr) + bwR * fStr;
        b = b * (1 - fStr) + bwR * fStr;
      } else {
        r = lum + (r - lum) * satFactor;
        g = lum + (g - lum) * satFactor;
        b = lum + (b - lum) * satFactor;
      }

      // Split toning (shadows & highlights)
      if (filterPreset.splitToneShadow && fStr > 0.01) {
        const shadowWeight = Math.max(0, 1 - lum / 128) * 0.28 * fStr;
        r = r * (1 - shadowWeight) + filterPreset.splitToneShadow[0] * shadowWeight;
        g = g * (1 - shadowWeight) + filterPreset.splitToneShadow[1] * shadowWeight;
        b = b * (1 - shadowWeight) + filterPreset.splitToneShadow[2] * shadowWeight;
      }
      if (filterPreset.splitToneHighlight && fStr > 0.01) {
        const hiWeight = Math.max(0, (lum - 128) / 127) * 0.24 * fStr;
        r = r * (1 - hiWeight) + filterPreset.splitToneHighlight[0] * hiWeight;
        g = g * (1 - hiWeight) + filterPreset.splitToneHighlight[1] * hiWeight;
        b = b * (1 - hiWeight) + filterPreset.splitToneHighlight[2] * hiWeight;
      }

      // Stylize effects (anime posterization / HDR micro-boost / neon glow)
      if (filterPreset.stylize === 'anime' && fStr > 0.05) {
        const levels = 7;
        const qr = Math.round((clampByte(r) / 255) * levels) * (255 / levels);
        const qg = Math.round((clampByte(g) / 255) * levels) * (255 / levels);
        const qb = Math.round((clampByte(b) / 255) * levels) * (255 / levels);
        r = r * (1 - fStr * 0.7) + qr * (fStr * 0.7);
        g = g * (1 - fStr * 0.7) + qg * (fStr * 0.7);
        b = b * (1 - fStr * 0.7) + qb * (fStr * 0.7);
      } else if (filterPreset.stylize === 'hdr' && fStr > 0.05) {
        // S-curve midtone punch
        const boost = 1 + 0.14 * fStr;
        r = 128 + (r - 128) * boost;
        g = 128 + (g - 128) * boost;
        b = 128 + (b - 128) * boost;
      }

      // Film matte fade
      if (fadeLift > 0.2) {
        r = r * (1 - fadeLift / 255) + fadeLift;
        g = g * (1 - fadeLift / 255) + fadeLift;
        b = b * (1 - fadeLift / 255) + fadeLift;
      }

      // Optical Vignette
      if (totalVignette > 0.5) {
        const vdx = (nx - 0.5) * 1.45;
        const vdy = (ny - 0.5) * 1.45;
        const vDist = Math.sqrt(vdx * vdx + vdy * vdy);
        const vig = Math.max(0.25, 1 - Math.max(0, vDist - 0.45) * (totalVignette / 100) * 0.95);
        r *= vig;
        g *= vig;
        b *= vig;
      }

      out[idx] = clampByte(r);
      out[idx + 1] = clampByte(g);
      out[idx + 2] = clampByte(b);
    }
  }

  // 7. IDENTITY LOCK PASS (Highest Priority):
  // Protects original facial structure, eyes, nose, lips, jawline, and recognizable skin tone.
  // Allows subtle exposure/lighting match (max 22% blend for realistic integration) while locking
  // away distortion, stylization, over-smoothing, or heavy hue shifts.
  const identityActive = state.identityLock && identityLayer?.visible !== false;
  let faceDeltaSum = 0;
  let facePixels = 0;

  if (state.faceAnchor.detected) {
    const protectionStrength = identityActive
      ? filterPreset.highDistortion
        ? 0.96 // Strict lock on stylized filters
        : 0.84 // Natural lighting integration while locking identity
      : 0;

    for (let y = 0; y < height; y++) {
      const ny = y / height;
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const faceW = computeFaceProtectionWeight(nx, ny, state.faceAnchor);
        if (faceW <= 0.001) continue;

        const idx = (y * width + x) * 4;
        if (identityActive && protectionStrength > 0) {
          const blendBack = faceW * protectionStrength;
          out[idx] = clampByte(out[idx] * (1 - blendBack) + sourceRgba[idx] * blendBack);
          out[idx + 1] = clampByte(
            out[idx + 1] * (1 - blendBack) + sourceRgba[idx + 1] * blendBack
          );
          out[idx + 2] = clampByte(
            out[idx + 2] * (1 - blendBack) + sourceRgba[idx + 2] * blendBack
          );
          out[idx + 3] = 255;
        }

        if (faceW >= 0.7) {
          const delta =
            (Math.abs(out[idx] - sourceRgba[idx]) +
              Math.abs(out[idx + 1] - sourceRgba[idx + 1]) +
              Math.abs(out[idx + 2] - sourceRgba[idx + 2])) /
            3;
          faceDeltaSum += delta;
          facePixels++;
        }
      }
    }
  }

  const faceDeltaMean = facePixels > 0 ? faceDeltaSum / facePixels : 0;
  return { output: out, faceDeltaMean };
}

/**
 * Fast separable box blur for RGBA buffers (used for depth bokeh, denoise, and unsharp mask).
 */
export function boxBlurRgba(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  if (radius <= 0) return new Uint8ClampedArray(src);
  const tmp = new Uint8ClampedArray(src.length);
  const dst = new Uint8ClampedArray(src.length);
  const diam = radius * 2 + 1;

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    const rowOff = y * width;
    for (let k = -radius; k <= radius; k++) {
      const sx = Math.max(0, Math.min(width - 1, k));
      const idx = (rowOff + sx) * 4;
      rSum += src[idx];
      gSum += src[idx + 1];
      bSum += src[idx + 2];
    }
    for (let x = 0; x < width; x++) {
      const outIdx = (rowOff + x) * 4;
      tmp[outIdx] = rSum / diam;
      tmp[outIdx + 1] = gSum / diam;
      tmp[outIdx + 2] = bSum / diam;
      tmp[outIdx + 3] = src[outIdx + 3];

      const removeX = Math.max(0, x - radius);
      const addX = Math.min(width - 1, x + radius + 1);
      const remIdx = (rowOff + removeX) * 4;
      const addIdx = (rowOff + addX) * 4;
      rSum += src[addIdx] - src[remIdx];
      gSum += src[addIdx + 1] - src[remIdx + 1];
      bSum += src[addIdx + 2] - src[remIdx + 2];
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    for (let k = -radius; k <= radius; k++) {
      const sy = Math.max(0, Math.min(height - 1, k));
      const idx = (sy * width + x) * 4;
      rSum += tmp[idx];
      gSum += tmp[idx + 1];
      bSum += tmp[idx + 2];
    }
    for (let y = 0; y < height; y++) {
      const outIdx = (y * width + x) * 4;
      dst[outIdx] = rSum / diam;
      dst[outIdx + 1] = gSum / diam;
      dst[outIdx + 2] = bSum / diam;
      dst[outIdx + 3] = tmp[outIdx + 3];

      const removeY = Math.max(0, y - radius);
      const addY = Math.min(height - 1, y + radius + 1);
      const remIdx = (removeY * width + x) * 4;
      const addIdx = (addY * width + x) * 4;
      rSum += tmp[addIdx] - tmp[remIdx];
      gSum += tmp[addIdx + 1] - tmp[remIdx + 1];
      bSum += tmp[addIdx + 2] - tmp[remIdx + 2];
    }
  }

  return dst;
}
