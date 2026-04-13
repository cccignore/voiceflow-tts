"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Play, Pause, Download, Trash2,
  ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { VOICES } from "@/constants/voices";
import type { HistoryItem } from "@/types";
import { cn } from "@/lib/utils";

/* ── Time formatter ───────────────────────────────────── */
function fmtTimestamp(ts: number): string {
  const d    = new Date(ts);
  const now  = new Date();
  const time = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return `今天 ${time}`;

  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (sameDay(d, yest)) return `昨天 ${time}`;

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}  ${time}`;
}

/* ── Mini audio player (play / pause only) ────────────── */
function MiniPlayer({ audioBase64 }: { audioBase64: string }) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // 组件卸载时释放音频资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(audioBase64);
      a.addEventListener("ended", () => setPlaying(false));
      audioRef.current = a;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [audioBase64, playing]);

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "暂停" : "播放"}
      className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
        "border transition-all duration-200 text-xs",
        playing
          ? "bg-[var(--accent)] text-white border-transparent shadow-[0_0_8px_var(--accent-glow)]"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30"
      )}
    >
      {playing
        ? <Pause className="w-3 h-3" />
        : <Play  className="w-3 h-3 translate-x-px" />}
    </button>
  );
}

/* ── Mini copy button ─────────────────────────────────── */
function MiniCopy({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    toast.success(`已复制${label}`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      aria-label={`复制${label}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

/* ── HistoryItemCard ──────────────────────────────────── */
interface Props {
  item: HistoryItem;
  onRemove: (id: string) => void;
}

export function HistoryItemCard({ item, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);

  const voice = VOICES.find((v) => v.id === item.voiceId);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = item.audioBase64;
    a.download = `voiceflow-${item.timestamp}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = () => {
    onRemove(item.id);
    toast.success("已删除该记录");
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] overflow-hidden",
        "bg-[var(--surface-2)] transition-all duration-200",
        "hover:border-[var(--border-strong)]"
      )}
    >
      {/* ── Card header ──────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-3 space-y-2">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
            {fmtTimestamp(item.timestamp)}
          </span>
          {voice && (
            <span className="text-[10px] text-[var(--text-muted)]">
              {voice.name}
            </span>
          )}
        </div>

        {/* Chinese preview */}
        <p className="text-sm text-[var(--text-primary)] leading-snug line-clamp-2">
          {item.chineseText}
        </p>

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* Play */}
          <MiniPlayer audioBase64={item.audioBase64} />

          {/* Download */}
          <button
            onClick={handleDownload}
            aria-label="下载音频"
            className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center
                       text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30
                       transition-all duration-200"
          >
            <Download className="w-3 h-3" />
          </button>

          {/* Expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "收起详情" : "展开详情"}
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-2 h-7 rounded-lg",
              "border transition-all duration-200",
              expanded
                ? "border-[var(--accent)]/30 text-[var(--accent)] bg-[var(--accent-glow)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "收起" : "详情"}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Delete */}
          <button
            onClick={handleDelete}
            aria-label="删除"
            className="w-7 h-7 rounded-full flex items-center justify-center
                       text-[var(--text-muted)] hover:text-red-400
                       hover:bg-red-500/10 transition-all duration-200"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Expanded detail ───────────────────────────── */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3.5 space-y-3 animate-fade-in">
          {/* Standard */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                标准翻译
              </span>
              <MiniCopy text={item.standardText} label="标准翻译" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {item.standardText}
            </p>
          </div>

          {/* Short video */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                短视频优化版
              </span>
              <MiniCopy text={item.shortVideoText} label="短视频版" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {item.shortVideoText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
