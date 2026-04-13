"use client";

import { useState } from "react";
import { Copy, Check, Zap, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import type { TranslationResult } from "@/types";
import { cn } from "@/lib/utils";

/* ── Copy button ────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已复制到剪贴板", { duration: 1800 });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };
  return (
    <button
      onClick={handle}
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium",
        "px-2.5 py-1.5 rounded-lg border transition-all duration-200 flex-shrink-0",
        copied
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-glow)]"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

/* ── Standard translation block ─────────────────────────── */
function StandardBlock({ text }: { text: string }) {
  return (
    <div className="animate-fade-in-up space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            标准翻译
          </span>
        </div>
        <CopyBtn text={text} />
      </div>
      <div className={cn(
        "rounded-xl px-4 py-4 text-sm leading-relaxed select-text cursor-text",
        "bg-[var(--surface-2)] border border-[var(--border)]",
        "text-[var(--text-primary)]"
      )}>
        {text}
      </div>
    </div>
  );
}

/* ── Short video block ───────────────────────────────────── */
function ShortVideoBlock({ text }: { text: string }) {
  return (
    <div className="animate-fade-in-up space-y-2.5" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            短视频优化版
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
            "bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/25"
          )}>
            推荐
          </span>
        </div>
        <CopyBtn text={text} />
      </div>

      {/* Card with amber left border */}
      <div className={cn(
        "rounded-xl overflow-hidden border border-[var(--accent)]/20",
        "bg-gradient-to-br from-[var(--accent-glow)] to-[var(--surface-2)]"
      )}>
        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/60 to-transparent" />
        <div className="px-4 py-4 space-y-1">
          {text.split("\n").filter(Boolean).map((line, i) => (
            <div key={i} className="flex items-start gap-2.5 group">
              <span className={cn(
                "mt-1.5 w-1 h-1 rounded-full flex-shrink-0",
                "bg-[var(--accent)] opacity-60"
              )} />
              <p className="text-sm leading-relaxed text-[var(--text-primary)] select-text cursor-text flex-1">
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)] pl-0.5 flex items-center gap-1">
        <Zap className="w-2.5 h-2.5 text-[var(--accent)] opacity-60" />
        已优化为短句节奏，适合字幕/口播直接使用
      </p>
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────── */
export function TranslationSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">翻译结果</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>
      {[0, 80].map((delay) => (
        <div key={delay} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 rounded-full bg-[var(--border)] animate-pulse" />
            <div className="h-6 w-12 rounded-lg bg-[var(--border)] animate-pulse" />
          </div>
          <div className="rounded-xl px-4 py-4 bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
            <div className="h-3 w-full rounded-full bg-[var(--border)] animate-pulse" />
            <div className="h-3 w-4/5 rounded-full bg-[var(--border)] animate-pulse" />
            <div className="h-3 w-2/3 rounded-full bg-[var(--border)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────── */
export function TranslationOutput({
  result,
  defaultTab,
}: {
  result: TranslationResult;
  defaultTab?: "standard" | "shortVideo";
}) {
  const [activeTab, setActiveTab] = useState<"standard" | "shortVideo">(
    defaultTab ?? "shortVideo"
  );

  return (
    <div className="space-y-4">
      {/* Tab header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <div className="inline-flex items-center p-0.5 rounded-lg gap-0.5 bg-[var(--surface-2)] border border-[var(--border)]">
          <button
            onClick={() => setActiveTab("standard")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
              activeTab === "standard"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <AlignLeft className="w-3 h-3" />
            标准翻译
          </button>
          <button
            onClick={() => setActiveTab("shortVideo")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
              activeTab === "shortVideo"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--accent)]/20"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Zap className="w-3 h-3 text-[var(--accent)]" />
            短视频优化
          </button>
        </div>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Tab content */}
      {activeTab === "standard"
        ? <StandardBlock text={result.standard} />
        : <ShortVideoBlock text={result.shortVideo} />
      }
    </div>
  );
}
