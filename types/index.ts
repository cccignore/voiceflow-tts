/* ── Voice settings (ElevenLabs params) ───────────────── */
export interface VoiceSettings {
  stability:        number;  // 0–1
  similarity_boost: number;  // 0–1
  style:            number;  // 0–1
  speed:            number;  // 0.7–1.3
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability:        0.5,
  similarity_boost: 0.75,
  style:            0.3,
  speed:            1.0,
};

/* ── Voice preset quick-picks ─────────────────────────── */
export const VOICE_PRESETS = [
  { id: "standard",  label: "标准",  settings: { stability: 0.5,  similarity_boost: 0.75, style: 0.3,  speed: 1.0  } },
  { id: "lively",    label: "活泼",  settings: { stability: 0.3,  similarity_boost: 0.75, style: 0.75, speed: 1.1  } },
  { id: "calm",      label: "沉稳",  settings: { stability: 0.75, similarity_boost: 0.75, style: 0.1,  speed: 0.9  } },
  { id: "energetic", label: "激昂",  settings: { stability: 0.35, similarity_boost: 0.8,  style: 0.9,  speed: 1.15 } },
] as const;

/* ── History ──────────────────────────────────────────── */
export interface HistoryItem {
  id:             string;
  timestamp:      number;
  chineseText:    string;
  standardText:   string;
  shortVideoText: string;
  audioBase64:    string;
  voiceId:        string;
  duration:       number;
  pinned?:        boolean;
  style?:         "standard" | "shortVideo";
}

/* ── Translation ──────────────────────────────────────── */
export interface TranslationResult {
  standard:   string;
  shortVideo: string;
}

export type TranslationMode = "standard" | "shortVideo";

export type ProcessPhase =
  | { phase: "idle" }
  | { phase: "translating" }
  | { phase: "generating_audio" }
  | { phase: "done"; translation: TranslationResult; audioBase64: string }
  | { phase: "error"; message: string };

export interface BatchItem {
  id:            string;
  text:          string;
  status:        "pending" | "processing" | "done" | "error";
  translation?:  TranslationResult;
  audioBase64?:  string;
  errorMessage?: string;
}
