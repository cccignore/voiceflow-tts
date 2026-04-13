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
      "flex items-center p-1 rounded-2xl gap-1 w-full",
      "bg-[var(--surface-2)] border border-[var(--border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {STYLE_OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl",
            "text-[13px] font-medium transition-all duration-200",
            value === id
              ? "bg-white text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/55"
          )}
        >
          <Icon className={cn(
            "w-3.5 h-3.5 flex-shrink-0",
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
  return (
    <div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full h-[40px] px-3.5 rounded-xl text-[13px] font-medium",
          "bg-[var(--surface-2)] text-[var(--text-primary)]",
          "border border-[var(--border)] outline-none",
          "focus:border-[var(--accent)]/50 focus:bg-white transition-colors cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {VOICES.map(v => (
          <option key={v.id} value={v.id}>{v.name} · {v.description}</option>
        ))}
      </select>
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
        "btn-accent w-full h-11 rounded-xl text-[14px] font-semibold tracking-[0.01em]",
        "flex items-center justify-center gap-2.5 relative overflow-hidden",
        !isLoading && !disabled && [
          "before:absolute before:inset-0 before:translate-x-[-100%]",
          "before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
          "hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        ]
      )}
    >
      {isLoading
        ? <><Loader2 className="w-[18px] h-[18px] animate-spin flex-shrink-0" /><span>{PHASE_LABELS[phase]}</span></>
        : <><Mic2   className="w-[18px] h-[18px] flex-shrink-0" /><span>{PHASE_LABELS[phase]}</span></>
      }
    </button>
  );
}

/* ── Phase status indicator ────────────────────────────── */
function PhaseHint({ phase }: { phase: Phase }) {
  if (phase === "idle" || phase === "done") return null;
  const dots = "…";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/75 px-3 py-2 text-[11px] text-[var(--text-secondary)] shadow-sm">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="font-medium">{phase === "translating" ? "正在翻译" : "正在生成语音"}{dots}</span>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-8">
      <div className="relative w-full max-w-[560px] text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,190,83,0.18),rgba(242,190,83,0.05)_42%,transparent_72%)] blur-2xl" />
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(251,247,239,0.94))] px-8 py-9 shadow-[0_24px_54px_rgba(29,33,56,0.10)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(242,190,83,0.26),transparent_72%)]" />
          <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(185,109,12,0.18),transparent)]" />

          <div className="relative mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,rgba(255,246,227,1),rgba(255,231,204,1))] shadow-[0_16px_38px_rgba(185,109,12,0.16)] ring-1 ring-[rgba(185,109,12,0.12)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
              <AudioLines className="h-6 w-6 text-[var(--accent)]" />
            </div>
          </div>

          <div className="relative space-y-2.5">
            <p className="font-syne text-[24px] font-extrabold tracking-tight text-[var(--text-primary)]">
            结果会在这里生成
            </p>
            <p className="mx-auto max-w-[380px] text-[13px] leading-6 text-[var(--text-secondary)]">
              这里会显示英文翻译、语音播放器和下载入口。输入文案后，即可开始生成。
            </p>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
            {["英文翻译", "音频试听", "一键下载"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--border)] bg-white/82 px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(250px,0.58fr)_minmax(700px,1.42fr)] lg:h-full">

      {/* ══ LEFT: Writing surface ════════════════════════ */}
      <div className="relative flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(252,248,241,0.96))] lg:overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,190,83,0.12),transparent_32%)]" />

        {/* Label bar */}
        <div className="relative z-10 flex-shrink-0 flex items-start justify-between gap-3 px-5 py-4 xl:px-6 border-b border-[var(--border)]">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              中文口播文案
            </span>
            <p className="text-[13px] text-[var(--text-secondary)]">
              输入中文原稿，系统会自动翻译并生成英文口播音频
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleInputChange(EXAMPLE_TEXT)}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap flex-shrink-0",
              "text-[var(--text-secondary)] hover:text-[var(--accent)]",
              "border border-[var(--border)] hover:border-[var(--accent)]/24 bg-white/70",
              "hover:bg-[var(--accent-glow)] transition-all duration-200",
              isLoading && "opacity-40 pointer-events-none"
            )}
          >
            <Sparkles className="w-3 h-3" />
            填入示例
          </button>
        </div>

        {/* Textarea — fills remaining height on desktop */}
        <div className={cn("relative z-10 flex-1", shaking && "animate-shake")}>
          <textarea
            value={inputText}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="在这里输入中文口播文案…"
            className={cn(
              "w-full resize-none",
              "min-h-[240px] lg:absolute lg:inset-0 lg:h-full",
              "px-5 py-5 xl:px-6 xl:py-6 text-[15px] leading-[1.95]",
              "bg-transparent text-[var(--text-primary)]",
              "placeholder:text-[var(--text-muted)]/78",
              "outline-none border-0 focus:ring-0",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
        </div>

        {/* Footer: char progress + hint */}
        <div className="relative z-10 flex-shrink-0 border-t border-[var(--border)] bg-white/65 backdrop-blur-sm">
          {/* Amber progress bar at very top of footer */}
          <div className="h-[3px] bg-[var(--surface-3)]">
            <div
              className={cn("h-full transition-all duration-500", barColorClass)}
              style={{ width: `${Math.min(charPct * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-5 py-2.5 xl:px-6">
            <p className={cn(
              "text-[11px] transition-colors duration-200",
              shaking ? "text-red-500 font-medium" : "text-[var(--text-muted)]"
            )}>
              {shaking ? "请先输入文案再提交" : "⌘ Cmd / Ctrl + Enter 快速触发翻译"}
            </p>
            <span className={cn("text-[12px] tabular-nums font-semibold transition-colors", charColorClass)}>
              {charCount} <span className="opacity-40 font-normal">/ {MAX_CHARS}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Settings + Results ════════════════════ */}
      <div className={cn(
        "border-l border-[var(--border)] flex flex-col",
        "bg-[linear-gradient(180deg,rgba(249,247,241,0.9),rgba(244,239,231,0.95))] lg:overflow-hidden"
      )}>

        {/* ── Settings section (fixed top) ─────────────── */}
        <div className="flex-shrink-0 p-3.5 xl:p-4 border-b border-[var(--border)]">
          <div className="rounded-[22px] border border-[var(--border)] bg-white/82 p-3.5 shadow-[0_12px_32px_rgba(29,33,56,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  输出设置
                </span>
                <p className="mt-1 text-[13px] font-medium text-[var(--text-secondary)]">
                  选择翻译风格与声音
                </p>
              </div>
              <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                实时生成
              </div>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  翻译风格
                </label>
                <StyleToggle value={style} onChange={setStyle} disabled={isLoading} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  声音
                </label>
                <VoiceSelect value={voiceId} onChange={setVoiceId} disabled={isLoading} />
              </div>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end">
              <div className="space-y-2">
                <p className="text-[11px] leading-5 text-[var(--text-muted)]">
                  先翻译，再生成英文音频。短视频优化版更适合口播和字幕节奏。
                </p>
                <PhaseHint phase={phase} />
              </div>

              <SubmitButton
                phase={phase}
                disabled={!inputText.trim() || isLoading}
                onClick={handleSubmit}
              />
            </div>

            {errorMsg && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl p-3 bg-red-50 border border-red-200 text-red-700 shadow-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="flex-1 text-[12px] leading-5">{errorMsg}</p>
                {phase !== "done" && (
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-red-200
                               rounded-xl px-2.5 py-1.5 hover:bg-red-100 transition-colors flex-shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />重试
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Results section (scrollable) ─────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 xl:p-4">
          {!hasResult ? (
            <div className="flex min-h-full items-center justify-center rounded-[26px] border border-[var(--border)] bg-[radial-gradient(circle_at_center,rgba(242,190,83,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(250,246,238,0.72))] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <EmptyState />
            </div>
          ) : (
            <div className="rounded-[26px] border border-[var(--border)] bg-white/72 p-4 space-y-3 shadow-[0_16px_38px_rgba(29,33,56,0.10)] backdrop-blur-sm animate-fade-in xl:p-4">
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
