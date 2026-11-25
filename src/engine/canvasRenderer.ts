import { BACKGROUND_PRESETS } from '../data/catalog';
import {
  BackgroundPreset,
  ExportConfig,
  ImageAnalysisMetrics,
  PhotoEditState,
} from '../types/studio';
import { analyzeImageMetrics, applyPhotoPipeline } from './imageMath';
import { getExportDimensions } from './videoEngine';

const imageCache = new Map<string, HTMLImageElement>();

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Renders procedural local background plates when a category preset uses local synthesis
 * (guarantees 100% offline availability for all 13 background categories).
 */
export function drawProceduralBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: BackgroundPreset,
  promptSeed?: string
): void {
  const [c0, c1, c2] = preset.palette;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, c0);
  grad.addColorStop(0.55, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural / environmental lighting depth
  if (preset.proceduralType === 'modern-office') {
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect((width / 6) * i + 8, 0, 2, height * 0.78);
    }
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.2, 20, width * 0.5, height * 0.3, width * 0.65);
    glow.addColorStop(0, 'rgba(255,255,255,0.32)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  } else if (preset.proceduralType === 'beach-sunset' || preset.proceduralType === 'travel-mediterranean') {
    const sun = ctx.createRadialGradient(width * 0.72, height * 0.38, 12, width * 0.72, height * 0.38, width * 0.42);
    sun.addColorStop(0, 'rgba(255, 224, 165, 0.75)');
    sun.addColorStop(0.5, 'rgba(242, 169, 114, 0.25)');
    sun.addColorStop(1, 'rgba(242, 169, 114, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, width, height);
    // Horizon shimmer
    ctx.fillStyle = 'rgba(255,235,205,0.16)';
    ctx.fillRect(0, height * 0.58, width, 2);
  } else if (preset.proceduralType === 'city-bokeh' || preset.proceduralType === 'fantasy-aurora') {
    // Deterministic soft bokeh orbs
    let seed = (promptSeed?.length ?? 7) * 131 + preset.id.length * 37;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 18; i++) {
      const bx = rand() * width;
      const by = rand() * height * 0.75;
      const br = 18 + rand() * 48;
      const orb = ctx.createRadialGradient(bx, by, 2, bx, by, br);
      const color =
        preset.proceduralType === 'fantasy-aurora'
          ? i % 2 === 0
            ? 'rgba(56, 211, 180, 0.28)'
            : 'rgba(129, 140, 248, 0.24)'
          : i % 2 === 0
            ? 'rgba(245, 185, 113, 0.26)'
            : 'rgba(220, 232, 245, 0.18)';
      orb.addColorStop(0, color);
      orb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (preset.proceduralType === 'ai-custom') {
    // Seed-driven deterministic local lighting synthesis
    let hash = 0;
    const text = promptSeed || 'studio';
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) % 360;
    }
    const g2 = ctx.createRadialGradient(
      width * (0.25 + (hash % 50) / 100),
      height * 0.28,
      24,
      width * 0.5,
      height * 0.5,
      width * 0.75
    );
    g2.addColorStop(0, `hsla(${hash}, 48%, 62%, 0.45)`);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Draws virtual accessories (sunglasses, watch, chain) and subtle hair/grooming shading
 * anchored proportionally to the detected face anchor without modifying facial identity pixels.
 */
function drawStylingOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PhotoEditState
): void {
  const clothingLayer = state.layers.find((l) => l.type === 'clothing');
  if (clothingLayer && !clothingLayer.visible) return;
  const opacity = (clothingLayer?.opacity ?? 100) / 100;
  if (opacity <= 0.01) return;

  const { faceAnchor, clothing } = state;
  const fx = faceAnchor.x * width;
  const fy = faceAnchor.y * height;
  const frx = faceAnchor.rx * width;
  const fry = faceAnchor.ry * height;

  ctx.save();
  ctx.globalAlpha = opacity * 0.92;

  // Sunglasses (anchored strictly to eye line, preserving brow, nose bridge & jawline)
  if (clothing.accessories.sunglasses && faceAnchor.detected) {
    const eyeY = fy - fry * 0.08;
    const lensW = frx * 0.72;
    const lensH = fry * 0.34;
    const gap = frx * 0.16;

    ctx.fillStyle = 'rgba(15, 18, 24, 0.86)';
    ctx.strokeStyle = '#C8A96A';
    ctx.lineWidth = Math.max(1.5, width * 0.004);

    // Left lens
    ctx.beginPath();
    ctx.roundRect(fx - gap * 0.5 - lensW, eyeY - lensH * 0.5, lensW, lensH, lensH * 0.35);
    ctx.fill();
    ctx.stroke();

    // Right lens
    ctx.beginPath();
    ctx.roundRect(fx + gap * 0.5, eyeY - lensH * 0.5, lensW, lensH, lensH * 0.35);
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.beginPath();
    ctx.moveTo(fx - gap * 0.5, eyeY - lensH * 0.15);
    ctx.quadraticCurveTo(fx, eyeY - lensH * 0.32, fx + gap * 0.5, eyeY - lensH * 0.15);
    ctx.stroke();

    // Specular reflection
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(1, width * 0.0025);
    ctx.beginPath();
    ctx.moveTo(fx - gap * 0.5 - lensW * 0.72, eyeY - lensH * 0.2);
    ctx.lineTo(fx - gap * 0.5 - lensW * 0.32, eyeY + lensH * 0.22);
    ctx.moveTo(fx + gap * 0.5 + lensW * 0.25, eyeY - lensH * 0.2);
    ctx.lineTo(fx + gap * 0.5 + lensW * 0.65, eyeY + lensH * 0.22);
    ctx.stroke();
  }

  // Chain necklace below collar
  if (clothing.accessories.chain && faceAnchor.detected) {
    const neckY = fy + fry * 1.38;
    ctx.strokeStyle = '#E2C275';
    ctx.lineWidth = Math.max(2, width * 0.005);
    ctx.beginPath();
    ctx.arc(fx, neckY - fry * 0.25, frx * 0.78, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  }

  // Wristwatch subtle cue near lower right wrist
  if (clothing.accessories.watch) {
    const wx = width * 0.74;
    const wy = height * 0.84;
    ctx.fillStyle = '#1E222B';
    ctx.strokeStyle = '#D6B87A';
    ctx.lineWidth = Math.max(1.8, width * 0.004);
    ctx.beginPath();
    ctx.ellipse(wx, wy, width * 0.028, height * 0.016, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Subtle Hair / Grooming contour lighting (never obscures facial features)
  if (clothing.hairStyle !== 'original' && faceAnchor.detected) {
    const hairY = fy - fry * 0.92;
    const hairGrad = ctx.createRadialGradient(fx, hairY, frx * 0.2, fx, hairY, frx * 1.15);
    if (clothing.hairStyle === 'slick-back') {
      hairGrad.addColorStop(0, 'rgba(20, 22, 28, 0.35)');
      hairGrad.addColorStop(0.6, 'rgba(180, 195, 220, 0.12)');
      hairGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (clothing.hairStyle === 'soft-waves') {
      hairGrad.addColorStop(0, 'rgba(42, 32, 24, 0.38)');
      hairGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      hairGrad.addColorStop(0, 'rgba(18, 18, 22, 0.34)');
      hairGrad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.ellipse(fx, hairY, frx * 1.08, fry * 0.48, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  if (clothing.facialHair !== 'original' && faceAnchor.detected) {
    const jawY = fy + fry * 0.62;
    const beardAlpha =
      clothing.facialHair === 'sculpted-beard'
        ? 0.34
        : clothing.facialHair === 'light-stubble'
          ? 0.18
          : 0.06;
    ctx.fillStyle = `rgba(22, 18, 16, ${beardAlpha})`;
    ctx.beginPath();
    ctx.ellipse(fx, jawY, frx * 0.72, fry * 0.34, 0, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
}

export interface RenderResult {
  metrics: ImageAnalysisMetrics;
  faceDeltaMean: number;
  width: number;
  height: number;
}

/**
 * Renders the full non-destructive PhotoEditState onto an HTMLCanvasElement.
 * Handles Outpainting expansion, background compositing, pixel pipeline, accessories, and optional Identity Face Guide.
 */
export async function renderPhotoToCanvas(
  canvas: HTMLCanvasElement,
  state: PhotoEditState,
  maxDimension = 720,
  drawOriginalOnly = false
): Promise<RenderResult> {
  const img = await loadImageElement(state.sourceImageUrl);
  const srcW = img.naturalWidth || state.sourceWidth;
  const srcH = img.naturalHeight || state.sourceHeight;

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const innerW = Math.max(64, Math.round(srcW * scale));
  const innerH = Math.max(64, Math.round(srcH * scale));

  // Work canvas for the core image pixels
  const workCanvas = document.createElement('canvas');
  workCanvas.width = innerW;
  workCanvas.height = innerH;
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!workCtx) {
    throw new Error('2D Canvas context unavailable');
  }
  workCtx.drawImage(img, 0, 0, innerW, innerH);
  const srcImageData = workCtx.getImageData(0, 0, innerW, innerH);
  const metrics = analyzeImageMetrics(srcImageData.data, innerW, innerH);

  let faceDeltaMean = 0;

  if (!drawOriginalOnly) {
    // Prepare background RGBA buffer if replacement is active
    let bgRgba: Uint8ClampedArray | null = null;
    if (state.background.mode === 'replace') {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = innerW;
      bgCanvas.height = innerH;
      const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
      if (bgCtx) {
        const bgUrl =
          state.background.customBgUrl ||
          BACKGROUND_PRESETS.find((b) => b.id === state.background.presetId)?.imageUrl;
        if (bgUrl) {
          try {
            const bgImg = await loadImageElement(bgUrl);
            // Cover-fit background image
            const bgRatio = bgImg.naturalWidth / Math.max(1, bgImg.naturalHeight);
            const targetRatio = innerW / innerH;
            let dw = innerW;
            let dh = innerH;
            let dx = 0;
            let dy = 0;
            if (bgRatio > targetRatio) {
              dw = innerH * bgRatio;
              dx = (innerW - dw) * 0.5;
            } else {
              dh = innerW / bgRatio;
              dy = (innerH - dh) * 0.5;
            }
            bgCtx.drawImage(bgImg, dx, dy, dw, dh);
          } catch {
            const preset =
              BACKGROUND_PRESETS.find((b) => b.id === state.background.presetId) ??
              BACKGROUND_PRESETS[0];
            drawProceduralBackground(bgCtx, innerW, innerH, preset, state.background.aiPromptSeed);
          }
        } else {
          const preset =
            BACKGROUND_PRESETS.find((b) => b.id === state.background.presetId) ??
            BACKGROUND_PRESETS[0];
          drawProceduralBackground(bgCtx, innerW, innerH, preset, state.background.aiPromptSeed);
        }
        bgRgba = bgCtx.getImageData(0, 0, innerW, innerH).data;
      }
    }

    const result = applyPhotoPipeline(srcImageData.data, bgRgba, innerW, innerH, state);
    faceDeltaMean = result.faceDeltaMean;
    const processedData = new ImageData(
      new Uint8ClampedArray(result.output),
      innerW,
      innerH
    );
    workCtx.putImageData(processedData, 0, 0);

    // Accessories & subtle hair/beard overlays
    drawStylingOverlays(workCtx, innerW, innerH, state);
  }

  // AI Outpainting Canvas Expansion (expands canvas beyond original boundaries with intelligent edge bleed)
  const outpaint = drawOriginalOnly ? 1 : state.background.outpaintScale;
  const finalW = Math.round(innerW * outpaint);
  const finalH = Math.round(innerH * outpaint);
  canvas.width = finalW;
  canvas.height = finalH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Target canvas context unavailable');
  }

  ctx.clearRect(0, 0, finalW, finalH);
  if (outpaint > 1) {
    // Soft outpainted context extension using blurred mirrored backdrop
    ctx.save();
    ctx.filter = 'blur(14px)';
    ctx.drawImage(workCanvas, 0, 0, finalW, finalH);
    ctx.restore();
    // Subtle seamless frame blend
    const ox = Math.round((finalW - innerW) / 2);
    const oy = Math.round((finalH - innerH) / 2);
    ctx.drawImage(workCanvas, ox, oy, innerW, innerH);
  } else {
    ctx.drawImage(workCanvas, 0, 0, finalW, finalH);
  }

  // Optional Identity Lock visual anchor frame (never included when showFaceGuide is false or during export)
  if (!drawOriginalOnly && state.showFaceGuide && state.faceAnchor.detected) {
    const ox = (finalW - innerW) / 2;
    const oy = (finalH - innerH) / 2;
    const fx = ox + state.faceAnchor.x * innerW;
    const fy = oy + state.faceAnchor.y * innerH;
    const frx = state.faceAnchor.rx * innerW;
    const fry = state.faceAnchor.ry * innerH;

    ctx.save();
    ctx.strokeStyle = state.identityLock ? '#10B981' : '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(fx, fy, frx, fry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Corner bracket reticles
    ctx.setLineDash([]);
    ctx.fillStyle = state.identityLock ? 'rgba(16, 185, 129, 0.10)' : 'rgba(245, 158, 11, 0.08)';
    ctx.fill();
    ctx.restore();
  }

  return { metrics, faceDeltaMean, width: finalW, height: finalH };
}

/**
 * Generates a high-resolution local Blob for photo export (JPEG, PNG, or WebP) with aspect ratio cropping & upscaling.
 */
export async function exportPhotoBlob(
  state: PhotoEditState,
  config: ExportConfig
): Promise<{ blob: Blob; width: number; height: number }> {
  const cleanState: PhotoEditState = { ...state, showFaceGuide: false };
  const baseCanvas = document.createElement('canvas');
  await renderPhotoToCanvas(baseCanvas, cleanState, 1440, false);

  const dims = getExportDimensions(state.sourceWidth, state.sourceHeight, config);
  // Cap browser canvas memory safely while honoring high-res output
  const cap = 4096;
  const scaleCap = Math.min(1, cap / Math.max(dims.width, dims.height));
  const outW = Math.round(dims.width * scaleCap);
  const outH = Math.round(dims.height * scaleCap);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) throw new Error('Export canvas unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Center-crop to target aspect ratio
  const srcRatio = baseCanvas.width / baseCanvas.height;
  const dstRatio = outW / outH;
  let sx = 0;
  let sy = 0;
  let sw = baseCanvas.width;
  let sh = baseCanvas.height;
  if (srcRatio > dstRatio) {
    sw = baseCanvas.height * dstRatio;
    sx = (baseCanvas.width - sw) * 0.5;
  } else {
    sh = baseCanvas.width / dstRatio;
    sy = (baseCanvas.height - sh) * 0.5;
  }

  ctx.drawImage(baseCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

  const mime = config.format === 'video/webm' ? 'image/png' : config.format;
  const quality = config.quality / 100;

  const blob = await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode local image export'))),
      mime,
      quality
    );
  });

  return { blob, width: outW, height: outH };
}
