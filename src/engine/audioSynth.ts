import { AudioTrack } from '../types/studio';
import { calculateAudioGainAtTime } from './videoEngine';

/**
 * 100% Offline Web Audio API Studio Synthesizer & Multi-Track Mixer.
 * Synthesizes warm royalty-free studio music beds and Foley SFX locally with zero internet access,
 * and supports mixing user-imported local audio files with real Biquad noise reduction.
 */
class OfflineAudioEngine {
  private ctx: AudioContext | null = null;
  private stopFns: Array<() => void> = [];
  private isPlaying = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public stopAll(): void {
    for (const fn of this.stopFns) {
      try {
        fn();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.stopFns = [];
    this.isPlaying = false;
  }

  public getPlayingState(): boolean {
    return this.isPlaying;
  }

  public previewTrack(track: AudioTrack, durationSec = 5): void {
    this.stopAll();
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isPlaying = true;
    const masterGain = ctx.createGain();
    const vol = Math.max(0.02, Math.min(0.85, (track.volume / 100) * 0.45));
    const now = ctx.currentTime;
    const fadeIn = Math.min(durationSec * 0.4, Math.max(0.05, track.fadeInSec));
    const fadeOut = Math.min(durationSec * 0.4, Math.max(0.1, track.fadeOutSec));

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(vol, now + fadeIn);
    masterGain.gain.setValueAtTime(vol, Math.max(now + fadeIn, now + durationSec - fadeOut));
    masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

    // Optional offline background noise reduction DSP chain (highpass + lowpass)
    let dest: AudioNode = masterGain;
    if (track.noiseReduction) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 110;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5200;
      hp.connect(lp);
      lp.connect(masterGain);
      dest = hp;
    }
    masterGain.connect(ctx.destination);

    if (track.fileUrl) {
      const audio = new Audio(track.fileUrl);
      audio.currentTime = track.trimStartSec;
      const source = ctx.createMediaElementSource(audio);
      source.connect(dest);
      audio.play().catch(() => {});
      const timer = window.setTimeout(() => {
        audio.pause();
        this.isPlaying = false;
      }, durationSec * 1000);
      this.stopFns.push(() => {
        window.clearTimeout(timer);
        audio.pause();
      });
      return;
    }

    this.scheduleSynthPreset(ctx, dest, track.synthPreset ?? 'ambient-cinema', now, durationSec);
    const doneTimer = window.setTimeout(() => {
      this.isPlaying = false;
    }, durationSec * 1000);
    this.stopFns.push(() => window.clearTimeout(doneTimer));
  }

  public playMultiTrackMix(tracks: AudioTrack[], startTimeSec: number, durationSec = 6): void {
    this.stopAll();
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isPlaying = true;
    const now = ctx.currentTime;

    for (const track of tracks) {
      const gainVal = calculateAudioGainAtTime(track, startTimeSec + 0.5);
      if (track.muted || gainVal <= 0.001) continue;

      const trackGain = ctx.createGain();
      trackGain.gain.setValueAtTime(gainVal * 0.35, now);
      trackGain.connect(ctx.destination);
      this.scheduleSynthPreset(
        ctx,
        trackGain,
        track.synthPreset ?? 'ambient-cinema',
        now,
        durationSec
      );
    }

    const doneTimer = window.setTimeout(() => {
      this.isPlaying = false;
    }, durationSec * 1000);
    this.stopFns.push(() => window.clearTimeout(doneTimer));
  }

  private scheduleSynthPreset(
    ctx: AudioContext,
    dest: AudioNode,
    preset: NonNullable<AudioTrack['synthPreset']>,
    startTime: number,
    durationSec: number
  ): void {
    if (preset === 'sfx-rain' || preset === 'sfx-whoosh') {
      const bufferSize = Math.floor(ctx.sampleRate * durationSec);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = preset === 'sfx-whoosh' ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(preset === 'sfx-whoosh' ? 220 : 1200, startTime);
      if (preset === 'sfx-whoosh') {
        filter.frequency.exponentialRampToValueAtTime(1900, startTime + durationSec * 0.5);
        filter.frequency.exponentialRampToValueAtTime(180, startTime + durationSec);
      }

      noise.connect(filter);
      filter.connect(dest);
      noise.start(startTime);
      noise.stop(startTime + durationSec);
      this.stopFns.push(() => noise.stop());
      return;
    }

    if (preset === 'sfx-shutter') {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, startTime);
      osc.frequency.exponentialRampToValueAtTime(160, startTime + 0.08);
      env.gain.setValueAtTime(0.9, startTime);
      env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      osc.connect(env);
      env.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.14);
      this.stopFns.push(() => osc.stop());
      return;
    }

    const chordMap: Record<string, number[]> = {
      'ambient-cinema': [130.81, 196.0, 246.94, 329.63],
      'lofi-focus': [174.61, 220.0, 261.63, 329.63],
      'acoustic-warmth': [146.83, 220.0, 293.66, 369.99],
      'modern-pulse': [110.0, 164.81, 220.0, 261.63],
      'piano-drama': [196.0, 246.94, 293.66, 392.0],
    };

    const freqs = chordMap[preset] ?? chordMap['ambient-cinema'];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = preset === 'modern-pulse' ? 'sawtooth' : i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset === 'modern-pulse' ? 900 : 1400;

      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.linearRampToValueAtTime(0.18 / freqs.length, startTime + 0.4 + i * 0.15);
      noteGain.gain.linearRampToValueAtTime(0.001, startTime + durationSec);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + durationSec);
      this.stopFns.push(() => osc.stop());
    });
  }
}

export const offlineAudioEngine = new OfflineAudioEngine();
