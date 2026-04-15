"use client";

export type MusicPreset = "none" | "calm" | "energetic" | "whitenoise";

export interface MusicPresetMeta {
  id:    MusicPreset;
  label: string;
  desc:  string;
  icon:  string;
}

export const MUSIC_PRESETS: MusicPresetMeta[] = [
  { id: "none",       label: "无背景音乐", desc: "纯人声输出",      icon: "🔇" },
  { id: "calm",       label: "轻松氛围",   desc: "柔和低频衬底",    icon: "🌿" },
  { id: "energetic",  label: "活力节拍",   desc: "120BPM 轻打击",  icon: "⚡" },
  { id: "whitenoise", label: "白噪声",     desc: "专注氛围降噪",    icon: "🌊" },
];

/* ── Background music generator ───────────────────────── */
async function generateBackground(
  preset:     MusicPreset,
  duration:   number,
  sampleRate: number,
): Promise<AudioBuffer | null> {
  if (preset === "none") return null;

  const numSamples = Math.ceil(duration * sampleRate);
  const ctx = new OfflineAudioContext(1, numSamples, sampleRate);

  /* Pink noise (Voss-McCartney algorithm) */
  if (preset === "whitenoise") {
    const buf  = ctx.createBuffer(1, numSamples, sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < numSamples; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5) * 0.11;
    }
    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    src.loop     = true;
    const filter = ctx.createBiquadFilter();
    filter.type  = "lowpass";
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    const fade = Math.min(2, duration * 0.1);
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.28, fade);
    gain.gain.setValueAtTime(0.28, Math.max(0, duration - fade));
    gain.gain.linearRampToValueAtTime(0, duration);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(0); src.stop(duration);
  }

  /* Layered ambient pad */
  if (preset === "calm") {
    const fade = Math.min(3, duration * 0.15);
    // A1 · E2 · A2 · E3 — a natural fifth-chord drone
    const harmonics = [1, 1.5, 2, 3];
    const volumes   = [0.14, 0.08, 0.06, 0.04];

    harmonics.forEach((mult, i) => {
      const osc     = ctx.createOscillator();
      osc.type      = "sine";
      osc.frequency.value = 55 * mult;
      osc.detune.value    = (i % 2 === 0 ? 1 : -1) * 4; // slight warmth

      // Slow LFO tremolo
      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.12 + i * 0.07;
      lfoGain.gain.value  = 0.018;
      lfo.connect(lfoGain);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(volumes[i], fade);
      gain.gain.setValueAtTime(volumes[i], Math.max(0, duration - fade));
      gain.gain.linearRampToValueAtTime(0, duration);
      lfoGain.connect(gain.gain);

      lfo.start(0); lfo.stop(duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(0); osc.stop(duration);
    });
  }

  /* Simple 120 BPM beat: kick + snare + hihat */
  if (preset === "energetic") {
    const bpm  = 120;
    const beat = 60 / bpm; // 0.5 s

    for (let i = 0; i * beat < duration; i++) {
      const t    = i * beat;
      const bar4 = i % 4;

      /* Kick on beat 1 & 3 */
      if (bar4 === 0 || bar4 === 2) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
        gain.gain.setValueAtTime(0.55, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.25);
      }

      /* Snare on beat 2 & 4 */
      if ((bar4 === 1 || bar4 === 3) && t + 0.14 <= duration) {
        const len  = Math.ceil(0.14 * sampleRate);
        const buf  = ctx.createBuffer(1, len, sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < len; j++) data[j] = Math.random() * 2 - 1;
        const src    = ctx.createBufferSource();
        src.buffer   = buf;
        const filter = ctx.createBiquadFilter();
        filter.type  = "bandpass";
        filter.frequency.value = 2200;
        filter.Q.value = 0.8;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        src.start(t);
      }

      /* Hi-hat every eighth note */
      const halfBeat = beat / 2;
      for (let h = 0; h < 2; h++) {
        const ht = t + h * halfBeat;
        if (ht + 0.05 <= duration) {
          const len  = Math.ceil(0.05 * sampleRate);
          const buf  = ctx.createBuffer(1, len, sampleRate);
          const data = buf.getChannelData(0);
          for (let j = 0; j < len; j++) data[j] = Math.random() * 2 - 1;
          const src    = ctx.createBufferSource();
          src.buffer   = buf;
          const filter = ctx.createBiquadFilter();
          filter.type  = "highpass";
          filter.frequency.value = 8000;
          const gain = ctx.createGain();
          // Off-beat hi-hats slightly quieter
          const vol = h === 0 ? 0.16 : 0.10;
          gain.gain.setValueAtTime(vol, ht);
          gain.gain.exponentialRampToValueAtTime(0.001, ht + 0.05);
          src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
          src.start(ht);
        }
      }
    }
  }

  return ctx.startRendering();
}

/* ── WAV encoder ──────────────────────────────────────── */
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh   = buffer.numberOfChannels;
  const sr      = buffer.sampleRate;
  const bps     = 2; // 16-bit
  const align   = numCh * bps;
  const dataLen = buffer.length * align;
  const out     = new ArrayBuffer(44 + dataLen);
  const view    = new DataView(out);

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  str(0, "RIFF"); view.setUint32(4, 36 + dataLen, true);
  str(8, "WAVE"); str(12, "fmt ");
  view.setUint32(16, 16,      true);
  view.setUint16(20, 1,       true); // PCM
  view.setUint16(22, numCh,   true);
  view.setUint32(24, sr,      true);
  view.setUint32(28, sr * align, true);
  view.setUint16(32, align,   true);
  view.setUint16(34, 16,      true);
  str(36, "data"); view.setUint32(40, dataLen, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return out;
}

/* ── Public mix API ───────────────────────────────────── */
/**
 * Mix voice audio (base64 data URI) with generated background music.
 * Returns a WAV base64 data URI, or the original voice base64 if preset is "none".
 */
export async function mixWithBackground(
  voiceBase64: string,
  preset:      MusicPreset,
  bgVolume     = 0.25,
): Promise<string> {
  if (preset === "none") return voiceBase64;

  // Decode voice MP3 via AudioContext
  const tmpCtx  = new AudioContext();
  const b64     = voiceBase64.includes(",") ? voiceBase64.split(",")[1] : voiceBase64;
  const bytes   = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  let voiceBuf: AudioBuffer;
  try {
    voiceBuf = await tmpCtx.decodeAudioData(bytes.buffer.slice(0));
  } finally {
    await tmpCtx.close();
  }

  const duration   = voiceBuf.duration;
  const sampleRate = voiceBuf.sampleRate;

  // Generate background music at voice duration + sample rate
  const bgBuf = await generateBackground(preset, duration, sampleRate);
  if (!bgBuf) return voiceBase64;

  // Mix via OfflineAudioContext (stereo output)
  const total  = Math.ceil(duration * sampleRate);
  const offCtx = new OfflineAudioContext(2, total, sampleRate);

  const voiceSrc  = offCtx.createBufferSource();
  voiceSrc.buffer = voiceBuf;
  const vGain     = offCtx.createGain();
  vGain.gain.value = 1.0;
  voiceSrc.connect(vGain); vGain.connect(offCtx.destination);
  voiceSrc.start(0);

  const bgSrc    = offCtx.createBufferSource();
  bgSrc.buffer   = bgBuf;
  const bGain    = offCtx.createGain();
  bGain.gain.value = bgVolume;
  bgSrc.connect(bGain); bGain.connect(offCtx.destination);
  bgSrc.start(0);

  const mixed  = await offCtx.startRendering();
  const wavBuf = encodeWav(mixed);

  // Convert ArrayBuffer → base64 in chunks to avoid call-stack overflow
  const arr    = new Uint8Array(wavBuf);
  let binary   = "";
  const CHUNK  = 8192;
  for (let i = 0; i < arr.length; i += CHUNK) {
    binary += String.fromCharCode(...arr.subarray(i, i + CHUNK));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}
