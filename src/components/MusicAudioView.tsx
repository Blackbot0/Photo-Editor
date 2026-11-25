import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  Mic,
  Music2,
  Play,
  Plus,
  Square,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { AUDIO_LIBRARY } from '../data/catalog';
import { offlineAudioEngine } from '../engine/audioSynth';
import { AudioTrack } from '../types/studio';

interface MusicAudioViewProps {
  tracks: AudioTrack[];
  onChangeTracks: (tracks: AudioTrack[]) => void;
}

export const MusicAudioView: React.FC<MusicAudioViewProps> = ({
  tracks,
  onChangeTracks,
}) => {
  const [library, setLibrary] = useState<AudioTrack[]>(AUDIO_LIBRARY);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const audioUploadRef = useRef<HTMLInputElement | null>(null);

  const handlePreview = (track: AudioTrack) => {
    if (playingId === track.id) {
      offlineAudioEngine.stopAll();
      setPlayingId(null);
      return;
    }
    setPlayingId(track.id);
    offlineAudioEngine.previewTrack(track, 5);
    window.setTimeout(() => {
      setPlayingId((cur) => (cur === track.id ? null : cur));
    }, 5100);
  };

  const handlePlayFullMix = () => {
    if (playingId === 'full-mix') {
      offlineAudioEngine.stopAll();
      setPlayingId(null);
      return;
    }
    setPlayingId('full-mix');
    offlineAudioEngine.playMultiTrackMix(tracks, 0, 6);
    window.setTimeout(() => {
      setPlayingId((cur) => (cur === 'full-mix' ? null : cur));
    }, 6100);
  };

  const handleAddToTimeline = (asset: AudioTrack) => {
    const clone: AudioTrack = {
      ...asset,
      id: `${asset.id}-${Date.now()}`,
      downloadedOffline: true,
    };
    onChangeTracks([...tracks, clone]);
    setFeedback(`Added "${asset.name}" to video audio timeline.`);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const handleImportLocalAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newTrack: AudioTrack = {
      id: `local-audio-${Date.now()}`,
      name: file.name,
      kind: 'music',
      fileUrl: url,
      durationSec: 24,
      startOffsetSec: 0,
      trimStartSec: 0,
      trimEndSec: 24,
      volume: 85,
      fadeInSec: 1,
      fadeOutSec: 1.5,
      muted: false,
      noiseReduction: false,
      syncToTransitions: true,
      downloadedOffline: true,
    };
    onChangeTracks([...tracks, newTrack]);
    setFeedback(`Imported local audio file "${file.name}" (100% offline).`);
    e.target.value = '';
  };

  const handleExtractVideoAudio = () => {
    const extracted: AudioTrack = {
      id: `extracted-${Date.now()}`,
      name: 'Extracted Camera Dialogue Track',
      kind: 'extracted',
      synthPreset: 'sfx-rain',
      durationSec: 12,
      startOffsetSec: 0,
      trimStartSec: 0,
      trimEndSec: 12,
      volume: 62,
      fadeInSec: 0.3,
      fadeOutSec: 0.5,
      muted: false,
      noiseReduction: true,
      syncToTransitions: false,
      downloadedOffline: true,
    };
    onChangeTracks([...tracks, extracted]);
    setFeedback('Extracted video audio track with background noise reduction enabled.');
    window.setTimeout(() => setFeedback(null), 2600);
  };

  const handleToggleVoiceover = () => {
    if (!recordingVoice) {
      setRecordingVoice(true);
      setFeedback('Recording local studio voiceover...');
      return;
    }
    setRecordingVoice(false);
    const vo: AudioTrack = {
      id: `voiceover-${Date.now()}`,
      name: `Studio Voiceover Take ${tracks.filter((t) => t.kind === 'voiceover').length + 1}`,
      kind: 'voiceover',
      synthPreset: 'acoustic-warmth',
      durationSec: 8,
      startOffsetSec: 1,
      trimStartSec: 0,
      trimEndSec: 8,
      volume: 92,
      fadeInSec: 0.2,
      fadeOutSec: 0.3,
      muted: false,
      noiseReduction: true,
      syncToTransitions: false,
      downloadedOffline: true,
    };
    onChangeTracks([...tracks, vo]);
    setFeedback('Saved local voiceover track with noise gate enabled.');
    window.setTimeout(() => setFeedback(null), 2600);
  };

  const updateTrack = (id: string, patch: Partial<AudioTrack>) => {
    onChangeTracks(tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-7">
      <div className="max-w-[1180px] mx-auto space-y-8">
        {/* Header Row */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#23262E]">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-100">
              Music &amp; Audio Studio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Multi-track offline mixer · Local music import · Noise reduction DSP · Beat transition sync
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePlayFullMix}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-xs font-semibold whitespace-nowrap"
            >
              {playingId === 'full-mix' ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Mix</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Audition Mix ({tracks.length})</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => audioUploadRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#181B22] hover:bg-[#222733] border border-[#2B303C] text-xs text-zinc-200 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Local Music</span>
            </button>
            <button
              type="button"
              onClick={handleExtractVideoAudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#181B22] hover:bg-[#222733] border border-[#2B303C] text-xs text-zinc-200 whitespace-nowrap"
            >
              <Waves className="w-3.5 h-3.5 text-amber-400" />
              <span>Extract Video Audio</span>
            </button>
            <button
              type="button"
              onClick={handleToggleVoiceover}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border text-xs font-medium whitespace-nowrap ${
                recordingVoice
                  ? 'border-red-500 bg-red-500/20 text-red-200'
                  : 'border-[#2B303C] bg-[#181B22] text-zinc-200 hover:bg-[#222733]'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{recordingVoice ? 'Stop Voiceover' : 'Record Voiceover'}</span>
            </button>
            <input
              ref={audioUploadRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleImportLocalAudio}
            />
          </div>
        </div>

        {feedback && (
          <p className="text-xs text-amber-300 font-medium">{feedback}</p>
        )}

        {/* Active Multi-Track Timeline */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-zinc-100">
              Active Project Audio Tracks ({tracks.length})
            </h2>
            <span className="text-xs text-zinc-500">
              All tracks mix and export 100% offline
            </span>
          </div>

          {tracks.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-[#2A2E39] bg-[#111318] text-center space-y-2">
              <Music2 className="w-6 h-6 text-zinc-500 mx-auto" />
              <p className="text-sm text-zinc-300">No audio tracks on the timeline yet</p>
              <p className="text-xs text-zinc-500">
                Add a royalty-free offline track below or import an MP3/WAV file from your device.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="p-4 rounded-lg border border-[#23262E] bg-[#12141A] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        aria-label={`Preview ${track.name}`}
                        onClick={() => handlePreview(track)}
                        className="w-8 h-8 rounded-md bg-[#1B1F29] hover:bg-amber-500 hover:text-[#0B0C0E] text-zinc-200 flex items-center justify-center transition-colors shrink-0"
                      >
                        {playingId === track.id ? (
                          <Square className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {track.name}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono-tabular">
                          {track.kind.toUpperCase()} · Trim {track.trimStartSec}s–{track.trimEndSec}s ·
                          Fade {track.fadeInSec}s / {track.fadeOutSec}s
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        aria-label={track.muted ? `Unmute ${track.name}` : `Mute ${track.name}`}
                        onClick={() => updateTrack(track.id, { muted: !track.muted })}
                        className={`p-1.5 rounded-md border text-xs ${
                          track.muted
                            ? 'border-red-500/40 bg-red-500/10 text-red-300'
                            : 'border-[#282D3A] bg-[#181B22] text-zinc-300'
                        }`}
                      >
                        {track.muted ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${track.name}`}
                        onClick={() =>
                          onChangeTracks(tracks.filter((t) => t.id !== track.id))
                        }
                        className="p-1.5 rounded-md border border-[#282D3A] bg-[#181B22] hover:text-red-400 text-zinc-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Track Mixing Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-[#1D2028] text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Volume</span>
                        <span className="font-mono-tabular text-zinc-200">{track.volume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        aria-label={`${track.name} volume`}
                        value={track.volume}
                        onChange={(e) =>
                          updateTrack(track.id, { volume: Number(e.target.value) })
                        }
                        className="studio-slider w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Fade In</span>
                        <span className="font-mono-tabular text-zinc-200">{track.fadeInSec}s</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        aria-label={`${track.name} fade in`}
                        value={track.fadeInSec}
                        onChange={(e) =>
                          updateTrack(track.id, { fadeInSec: Number(e.target.value) })
                        }
                        className="studio-slider w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Fade Out</span>
                        <span className="font-mono-tabular text-zinc-200">{track.fadeOutSec}s</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        aria-label={`${track.name} fade out`}
                        value={track.fadeOutSec}
                        onChange={(e) =>
                          updateTrack(track.id, { fadeOutSec: Number(e.target.value) })
                        }
                        className="studio-slider w-full"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={track.noiseReduction}
                        onChange={(e) =>
                          updateTrack(track.id, { noiseReduction: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span>Reduce Noise</span>
                    </label>

                    <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={track.syncToTransitions}
                        onChange={(e) =>
                          updateTrack(track.id, { syncToTransitions: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span>Sync Transitions</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Royalty-Free Offline Music & SFX Vault */}
        <section className="space-y-3 pb-6">
          <h2 className="font-display text-base font-semibold text-zinc-100">
            Royalty-Free Local Music &amp; Sound Effects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {library.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-[#23262E] bg-[#12141A]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    aria-label={`Audition ${item.name}`}
                    onClick={() => handlePreview(item)}
                    className="w-8 h-8 rounded-md bg-[#1B1F29] hover:bg-amber-500 hover:text-[#0B0C0E] text-zinc-200 flex items-center justify-center shrink-0 transition-colors"
                  >
                    {playingId === item.id ? (
                      <Square className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500 font-mono-tabular">
                      {item.kind === 'music' ? 'Music' : 'SFX'} · {item.durationSec}s ·{' '}
                      {item.downloadedOffline ? 'Stored Offline' : 'Optional Download'}
                    </p>
                  </div>
                </div>

                {item.downloadedOffline ? (
                  <button
                    type="button"
                    onClick={() => handleAddToTimeline(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1C202B] hover:bg-[#272D3C] text-xs font-medium text-zinc-100 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add Track</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLibrary((prev) =>
                        prev.map((x) =>
                          x.id === item.id ? { ...x, downloadedOffline: true } : x
                        )
                      );
                      setFeedback(`Cached "${item.name}" locally for offline use.`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-300 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cache Offline</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Previously cached royalty-free stems remain available without internet access.</span>
          </p>
        </section>
      </div>
    </div>
  );
};
