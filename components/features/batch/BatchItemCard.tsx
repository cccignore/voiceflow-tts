"use client";

import { useRef, useState, useEffect } from "react";
import {
  Trash2, Play, Pause, Download,
  Loader2, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { downloadAudio } from "@/lib/audio";
import type { BatchItem } from "@/types";
import { cn } from "@/lib/utils";

/* ── Status badge ──────────────────────────────────────── */
const STATUS_CONFIG = {
  pending:    { label: "待处理", Icon: Clock,         cls: "text-[var(--text-muted)]   bg-[var(--surface-2)] border-[var(--border)]" },
  processing: { label: "处理中", Icon: Loader2,       cls: "text-[var(--accent)]       bg-[var(--accent-glow)] border-[var(--accent)]/20", spin: true },
  done:       { label: "完成",   Icon: CheckCircle2,  cls: "text-emerald-400           bg-emerald-500/10 border-emerald-500/20" },
  error:      { label: "失败",   Icon: AlertCircle,   cls: "text-red-400               bg-red-500/8 border-red-500/20" },
} as const;

function StatusBadge({ status }: { status: BatchItem["status"] }) {
  const { label, Icon, cls, spin } = STATUS_CONFIG[status] as typeof STATUS_CONFIG[typeof status] & { spin?: boolean };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cls)}>
      <Icon className={cn("w-2.5 h-2.5", spin && "animate-spin")} />
      {label}
    </span>
  );
}

/* ── Mini play button ──────────────────────────────────── */
function MiniPlay({ audioBase64 }: { audioBase64: string }) {
  const ref    = useRef<HTMLAudioElement | null>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    return () => {
      if (ref.current) {
        ref.current.pause();
        ref.current.src = "";
        ref.current = null;
      }
    };
  }, []);

  const toggle = () => {
    if (!ref.current) {
      const a = new Audio(audioBase64);
      a.onended = () => setPlay(false);
      ref.current = a;
    }
    if (play) { ref.current.pause(); setPlay(false); }
    else       { ref.current.play().then(() => setPlay(true)).catch(() => {}); }
  };

  return (
    <button
      onClick={toggle}
      aria-label={play ? "暂停" : "播放"}
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
        "border transition-all duration-200",
        play
          ? "bg-[var(--accent)] text-white border-transparent shadow-[0_0_6px_var(--accent-glow)]"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30"
      )}
    >
      {play ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 translate-x-px" />}
    </button>
  );
}

/* ── BatchItemCard ─────────────────────────────────────── */
interface Props {
  item:        BatchItem;
  index:       number;
  disabled:    boolean;   // true while batch is processing
  onTextChange:(id: string, text: string) => void;
  onRemove:    (id: string) => void;
}

const MAX_CHARS = 500;

export function BatchItemCard({ item, index, disabled, onTextChange, onRemove }: Props) {
  const charCount = item.text.length;
  const pct       = charCount / MAX_CHARS;
  const charCls   = pct >= 0.96 ? "text-red-400" : pct >= 0.82 ? "text-orange-400" : "text-[var(--text-muted)]";
  const isDone    = item.status === "done";
  const isError   = item.status === "error";
  const isProc    = item.status === "processing";

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-200",
        isProc  && "border-[var(--accent)]/30 shadow-[0_0_0_1px_var(--accent-glow)]",
        isDone  && "border-emerald-500/20",
        isError && "border-red-500/20",
        !isProc && !isDone && !isError && "border-[var(--border)]",
        "bg-[var(--surface-2)]"
      )}
    >
      {/* ── Header row ─────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Index bubble */}
          <span className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
            isDone  ? "bg-emerald-500/20 text-emerald-400"
            : isError ? "bg-red-500/15 text-red-400"
            : isProc  ? "bg-[var(--accent-glow)] text-[var(--accent)]"
            : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]"
          )}>
            {index + 1}
          </span>
          <StatusBadge status={item.status} />
        </div>

        {/* Delete */}
        <button
          onClick={() => onRemove(item.id)}
          disabled={disabled}
          aria-label="删除此条"
          className="w-6 h-6 rounded-lg flex items-center justify-center
                     text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10
                     transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* ── Textarea ───────────────────────────────── */}
      <div className="relative px-3.5 pb-3">
        <textarea
          value={item.text}
          onChange={e => onTextChange(item.id, e.target.value.slice(0, MAX_CHARS))}
          disabled={disabled || isProc}
          placeholder={`文案 ${index + 1}：输入中文口播文案…`}
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg px-3 py-2.5 pr-14 text-xs leading-relaxed",
            "bg-[var(--surface)] text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]",
            "border border-[var(--border)] outline-none",
            "focus:border-[var(--accent)]/50 focus:shadow-[0_0_0_2px_var(--accent-glow)]",
            "transition-all duration-200",
            (disabled || isProc) && "opacity-60 cursor-not-allowed"
          )}
        />
        <span className={cn("absolute bottom-5 right-6 text-[10px] tabular-nums pointer-events-none", charCls)}>
          {charCount}<span className="opacity-40">/{MAX_CHARS}</span>
        </span>
      </div>

      {/* ── Done: result bar ───────────────────────── */}
      {isDone && item.translation && item.audioBase64 && (
        <div className="px-3.5 pb-3.5 border-t border-[var(--border)] pt-3 space-y-2">
          {/* Translation preview */}
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {item.translation.shortVideo || item.translation.standard}
          </p>
          {/* Audio controls */}
          <div className="flex items-center gap-2">
            <MiniPlay audioBase64={item.audioBase64} />
            <button
              onClick={() => downloadAudio(item.audioBase64!, `voiceflow-${index + 1}.mp3`)}
              className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center
                         text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30
                         transition-all duration-200"
              aria-label="下载音频"
            >
              <Download className="w-2.5 h-2.5" />
            </button>
            <span className="text-[10px] text-emerald-400 font-medium">音频已生成</span>
          </div>
        </div>
      )}

      {/* ── Error: message ─────────────────────────── */}
      {isError && item.errorMessage && (
        <div className="px-3.5 pb-3.5 border-t border-red-500/20 pt-2">
          <p className="text-[11px] text-red-400 leading-relaxed">{item.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
