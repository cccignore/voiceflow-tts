"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import {
  Loader2, Mic2, AlertCircle, RefreshCw, AudioLines,
  Sparkles, Check, AlignLeft, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { TranslationOutput, TranslationSkeleton } from "./TranslationOutput";
import { AudioPlayer, AudioPlayerSkeleton }        from "./AudioPlayer";
import { useTranslate }                            from "@/hooks/useTranslate";
import { useTTS }                                  from "@/hooks/useTTS";
import { VOICES, DEFAULT_VOICE_ID, EXAMPLE_TEXT } from "@/constants/voices";
import { cn }                                      from "@/lib/utils";
import type { TranslationResult }                  from "@/types";

type Phase = "idle" | "translating" | "generating" | "done";

const MAX_CHARS = 500;

/* ── Style toggle ──────────────────────────────────────── */
const STYLE_OPTIONS = [
  { id: "standard"   as const, label: "标准翻译",  Icon: AlignLeft },
  { id: "shortVideo" as const, label: "短视频优化", Icon: Zap },
];

function StyleToggle({
  value, onChange, disabled,
}: {
  value: "standard" | "shortVideo";
  onChange: (v: "standard" | "shortVideo") => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center p-0.5 rounded-xl gap-0.5 w-full",
      "bg-[var(--surface-2)] border border-[var(--border)]",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {STYLE_OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg",
            "text-xs font-medium transition-all duration-200",
            value === id
              ? "bg-white text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          <Icon className={cn(
            "w-3 h-3 flex-shrink-0",
            value === id && id === "shortVideo" && "text-[var(--accent)]"
          )} />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Voice select + preview card ───────────────────────── */
function VoiceSelect({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const voice = VOICES.find(v => v.id === value);
  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full h-[38px] px-3 rounded-xl text-sm font-medium",
          "bg-[var(--surface-2)] text-[var(--text-primary)]",
          "border border-[var(--border)] outline-none",
          "focus:border-[var(--accent)]/50 transition-colors cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {VOICES.map(v => (
          <option key={v.id} value={v.id}>{v.name} · {v.description}</option>
        ))}
      </select>

      {voice && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-[var(--border)] shadow-sm">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-gradient-to-br from-amber-50 to-orange-50",
            "border border-[var(--accent)]/15"
          )}>
            <Mic2 className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{voice.name}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{voice.description}</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-emerald-500" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Submit button ─────────────────────────────────────── */
const PHASE_LABELS: Record<Phase, string> = {
  idle:        "翻译并生成语音",
  translating: "正在翻译…",
  generating:  "正在生成语音…",
  done:        "重新生成",
};

function SubmitButton({ phase, disabled, onClick }: {
  phase: Phase; disabled: boolean; onClick: () => void;
}) {
  const isLoading = phase === "translating" || phase === "generating";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "btn-accent w-full h-12 rounded-xl text-sm font-semibold",
        "flex items-center justify-center gap-2.5 relative overflow-hidden",
        !isLoading && !disabled && [
          "before:absolute before:inset-0 before:translate-x-[-100%]",
          "before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
          "hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        ]
      )}
    >
      {isLoading
        ? <><Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /><span>{PHASE_LABELS[phase]}</span></>
        : <><Mic2   className="w-4 h-4 flex-shrink-0" /><span>{PHASE_LABELS[phase]}</span></>
      }
    </button>
  );
}

/* ── Phase status indicator ────────────────────────────── */
function PhaseHint({ phase }: { phase: Phase }) {
  if (phase === "idle" || phase === "done") return null;
  const dots = "…";
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span>{phase === "translating" ? "正在翻译" : "正在生成语音"}{dots}</span>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[180px] text-center px-6">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center",
        "bg-gradient-to-br from-amber-50 to-orange-50",
        "border border-[var(--accent)]/15"
      )}>
        <AudioLines className="w-5 h-5 text-[var(--accent)] opacity-60" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--text-secondary)]">结果将在这里显示</p>
        <p className="text-xs text-[var(--text-muted)] max-w-[180px] leading-relaxed">
          输入文案，点击按钮开始生成
        </p>
      </div>
    </div>
  );
}

/* ── Exports ───────────────────────────────────────────── */
export interface SingleModeResult {
  chineseText:    string;
  standardText:   string;
  shortVideoText: string;
  audioBase64:    string;
  voiceId:        string;
}

export interface SingleModeProps {
  onComplete?: (result: SingleModeResult) => void;
}

/* ── SingleMode ────────────────────────────────────────── */
export function SingleMode({ onComplete }: SingleModeProps = {}) {
  const [inputText,   setInputText]   = useState("");
  const [style,       setStyle]       = useState<"standard" | "shortVideo">("shortVideo");
  const [voiceId,     setVoiceId]     = useState(DEFAULT_VOICE_ID);
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [shaking,     setShaking]     = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [usedStyle,   setUsedStyle]   = useState<"standard" | "shortVideo">("shortVideo");

  const { translate } = useTranslate();
  const { generate  } = useTTS();

  const isLoading = phase === "translating" || phase === "generating";
  const hasResult = translation || phase === "translating" || phase === "generating";

  const charCount      = inputText.length;
  const charPct        = charCount / MAX_CHARS;
  const charColorClass = charPct >= 0.96 ? "text-red-500"
                       : charPct >= 0.82 ? "text-orange-500"
                       : "text-[var(--text-muted)]";
  const barColorClass  = charPct >= 0.96 ? "bg-red-400"
                       : charPct >= 0.82 ? "bg-orange-400"
                       : "bg-[var(--accent)]";

  /* ── Submit ──────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    const text = inputText.trim();
    if (isLoading) return;
    if (!text) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      toast.error("请先输入中文口播文案");
      return;
    }

    setErrorMsg("");
    setTranslation(null);
    setAudioBase64(null);
    setUsedStyle(style);
    setPhase("translating");

    const result = await translate(text);
    if (!result) {
      setPhase("idle");
      setErrorMsg("翻译失败，请检查网络后重试");
      return;
    }
    setTranslation(result);

    setPhase("generating");
    const ttsText = style === "shortVideo" ? result.shortVideo : result.standard;
    const audio   = await generate(ttsText, voiceId);
    if (!audio) {
      setPhase("done");
      setErrorMsg("语音生成失败，翻译结果仍可复制使用");
      return;
    }
    setAudioBase64(audio);
    setPhase("done");
    setErrorMsg("");

    onComplete?.({
      chineseText:    text,
      standardText:   result.standard,
      shortVideoText: result.shortVideo,
      audioBase64:    audio,
      voiceId,
    });
  }, [inputText, isLoading, style, voiceId, translate, generate, onComplete]);

  const handleInputChange = (v: string) => {
    const sliced = v.slice(0, MAX_CHARS);
    setInputText(sliced);
    if (phase === "done" || errorMsg) {
      setPhase("idle");
      setErrorMsg("");
      setTranslation(null);
      setAudioBase64(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isLoading) handleSubmit();
    }
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] lg:h-full">

      {/* ══ LEFT: Writing surface ════════════════════════ */}
      <div className="flex flex-col bg-white lg:overflow-hidden">

        {/* Label bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-7 py-4 border-b border-[var(--border)]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            中文口播文案
          </span>
          <button
            type="button"
            onClick={() => handleInputChange(EXAMPLE_TEXT)}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg",
              "text-[var(--text-muted)] hover:text-[var(--accent)]",
              "border border-transparent hover:border-[var(--accent)]/20",
              "hover:bg-[var(--accent-glow)] transition-all duration-200",
              isLoading && "opacity-40 pointer-events-none"
            )}
          >
            <Sparkles className="w-3 h-3" />
            填入示例
          </button>
        </div>

        {/* Textarea — fills remaining height on desktop */}
        <div className={cn("flex-1 relative", shaking && "animate-shake")}>
          <textarea
            value={inputText}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="在这里输入中文口播文案…"
            className={cn(
              "w-full resize-none",
              "min-h-[240px] lg:absolute lg:inset-0 lg:h-full",
              "px-7 py-6 text-[15px] leading-8",
              "bg-transparent text-[var(--text-primary)]",
              "placeholder:text-[var(--text-muted)]/60",
              "outline-none border-0 focus:ring-0",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
        </div>

        {/* Footer: char progress + hint */}
        <div className="flex-shrink-0 border-t border-[var(--border)]">
          {/* Amber progress bar at very top of footer */}
          <div className="h-[2px] bg-[var(--surface-2)]">
            <div
              className={cn("h-full transition-all duration-500", barColorClass)}
              style={{ width: `${Math.min(charPct * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-7 py-3">
            <p className={cn(
              "text-[10px] transition-colors duration-200",
              shaking ? "text-red-500 font-medium" : "text-[var(--text-muted)]"
            )}>
              {shaking ? "请先输入文案再提交" : "⌘ Cmd / Ctrl + Enter 快速触发翻译"}
            </p>
            <span className={cn("text-[11px] tabular-nums font-medium transition-colors", charColorClass)}>
              {charCount} <span className="opacity-40 font-normal">/ {MAX_CHARS}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Settings + Results ════════════════════ */}
      <div className={cn(
        "border-l border-[var(--border)] flex flex-col",
        "bg-[var(--bg)] lg:overflow-hidden"
      )}>

        {/* ── Settings section (fixed top) ─────────────── */}
        <div className="flex-shrink-0 p-6 space-y-5 bg-white border-b border-[var(--border)]">

          {/* Style toggle */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              翻译风格
            </label>
            <StyleToggle value={style} onChange={setStyle} disabled={isLoading} />
          </div>

          {/* Voice */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              声音
            </label>
            <VoiceSelect value={voiceId} onChange={setVoiceId} disabled={isLoading} />
          </div>

          {/* Generate button */}
          <SubmitButton
            phase={phase}
            disabled={!inputText.trim() || isLoading}
            onClick={handleSubmit}
          />

          {/* Phase hint */}
          <PhaseHint phase={phase} />

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl p-3.5 bg-red-50 border border-red-200 text-red-600">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p className="flex-1 text-xs leading-relaxed">{errorMsg}</p>
              {phase !== "done" && (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-1 text-xs font-medium border border-red-200
                             rounded-lg px-2 py-1 hover:bg-red-100 transition-colors flex-shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />重试
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Results section (scrollable) ─────────────── */}
        <div className="flex-1 lg:overflow-y-auto">
          {!hasResult ? (
            <EmptyState />
          ) : (
            <div className="p-6 space-y-5 animate-fade-in">
              {/* Audio */}
              {phase === "generating" && <AudioPlayerSkeleton />}
              {audioBase64 && phase === "done" && (
                <AudioPlayer
                  audioBase64={audioBase64}
                  voiceId={voiceId}
                  filenamePrefix="voiceflow"
                />
              )}

              {/* Translation */}
              {phase === "translating" && <TranslationSkeleton />}
              {translation && (
                <TranslationOutput result={translation} defaultTab={usedStyle} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
