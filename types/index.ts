export interface HistoryItem {
  id: string;
  timestamp: number;
  chineseText: string;
  standardText: string;
  shortVideoText: string;
  audioBase64: string;
  voiceId: string;
  duration: number;
}

export interface TranslationResult {
  standard: string;
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
  id: string;
  text: string;
  status: "pending" | "processing" | "done" | "error";
  translation?: TranslationResult;
  audioBase64?: string;
  errorMessage?: string;
}
