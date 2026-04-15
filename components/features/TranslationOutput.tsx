"use client";

import { useState, useRef, useEffect } from "react";
import {
  Copy, Check, Zap, AlignLeft,
  FileText, FileDown, Pencil, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { TranslationResult } from "@/types";
import { cn } from "@/lib/utils";

/* ── SRT helpers ─────────────────────────────────────────── */
function toSrtTime(sec: number): string {
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":") + "," + String(ms).padStart(3, "0");
}

function buildSrt(lines: string[], secPerLine = 3.5): string {
  let srt = "";
  let t = 0;
  lines.forEach((line, i) => {
    const start = toSrtTime(t);
    t += secPerLine;
    const end = toSrtTime(t);
    srt += `${i + 1}\n${start} --> ${end}\n${line.trim()}\n\n`;
  });
  return srt;
}

function downloadText(content: string, filename: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Copy button ─────────────────────────────────────────── */
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
        "flex items-center gap-1 text-[11px] font-medium",
        "px-2 py-1.5 rounded-lg border transition-all duration-200 flex-shrink-0",
        copied
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-600"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-glow)]"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

/* ── Export buttons (TXT + SRT) ──────────────────────────── */
function ExportBtns({ text, isShortVideo }: { text: string; isShortVideo: boolean }) {
  const exportTxt = () => {
    downloadText(text, isShortVideo ? "subtitles.txt" : "translation.txt");
    toast.success("TXT 已下载");
  };
  const exportSrt = () => {
    const lines = isShortVideo
      ? text.split("\n").filter(Boolean)
      : text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(Boolean) ?? [text];
    downloadText(buildSrt(lines), "subtitles.srt");
    toast.success("SRT 字幕已下载");
  };
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={exportTxt}
        title="导出 TXT"
        className={cn(
          "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-1 rounded-md",
          "border border-[var(--border)] text-[var(--text-muted)]",
          "hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-glow)]",
          "transition-all duration-200"
        )}
      >
        <FileText className="w-2.5 h-2.5" />TXT
      </button>
      <button
        onClick={exportSrt}
        title="导出 SRT 字幕"
        className={cn(
          "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-1 rounded-md",
          "border border-[var(--border)] text-[var(--text-muted)]",
          "hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-glow)]",
          "transition-all duration-200"
        )}
      >
        <FileDown className="w-2.5 h-2.5" />SRT
      </button>
    </div>
  );
}

/* ── Auto-resizing editable textarea ─────────────────────── */
function EditableText({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={cn(
        "w-full resize-none rounded-xl px-4 py-3 text-[13px] leading-6 overflow-hidden",
        "bg-white border border-[var(--accent)]/30",
        "text-[var(--text-primary)] outline-none",
        "focus:border-[var(--accent)]/60 focus:shadow-[0_0_0_3px_var(--accent-glow)]",
        "transition-all duration-200"
      )}
    />
  );
}

/* ── Standard block ──────────────────────────────────────── */
function StandardBlock({
  text, editable, onChange, onReset, isDirty,
}: {
  text: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  onReset?: () => void;
  isDirty?: boolean;
}) {
  return (
    <div className="animate-fade-in-up space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            标准翻译
          </span>
          {isDirty && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/20">
              已编辑
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isDirty && onReset && (
            <button
              onClick={onReset}
              title="还原原始翻译"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <ExportBtns text={text} isShortVideo={false} />
          <CopyBtn text={text} />
        </div>
      </div>

      {editable && onChange ? (
        <>
          <EditableText value={text} onChange={onChange} />
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 pl-0.5">
            <Pencil className="w-2.5 h-2.5 opacity-40" />
            可直接编辑文案，修改后点击「重新生成语音」
          </p>
        </>
      ) : (
        <div className={cn(
          "rounded-xl px-4 py-3 text-[13px] leading-6 select-text cursor-text",
          "bg-[var(--surface-2)] border border-[var(--border)]",
          "text-[var(--text-primary)]"
        )}>
          {text}
        </div>
      )}
    </div>
  );
}

/* ── Short video block ───────────────────────────────────── */
function ShortVideoBlock({
  text, editable, onChange, onReset, isDirty,
}: {
  text: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  onReset?: () => void;
  isDirty?: boolean;
}) {
  return (
    <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            短视频优化版
          </span>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            "bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/25"
          )}>
            推荐
          </span>
          {isDirty && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/20">
              已编辑
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isDirty && onReset && (
            <button
              onClick={onReset}
              title="还原原始翻译"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <ExportBtns text={text} isShortVideo />
          <CopyBtn text={text} />
        </div>
      </div>

      {editable && onChange ? (
        <>
          <EditableText value={text} onChange={onChange} />
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 pl-0.5">
            <Pencil className="w-2.5 h-2.5 opacity-40" />
            每行对应一个字幕短句，修改后点击「重新生成语音」
          </p>
        </>
      ) : (
        <>
          <div className={cn(
            "rounded-xl overflow-hidden border border-[var(--accent)]/20",
            "bg-gradient-to-br from-[var(--accent-glow)] to-[var(--surface-2)]"
          )}>
            <div className="h-0.5 bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/60 to-transparent" />
            <div className="px-4 py-3 space-y-0.5">
              {text.split("\n").filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-2 w-1 h-1 rounded-full flex-shrink-0 bg-[var(--accent)] opacity-60" />
                  <p className="text-[13px] leading-6 text-[var(--text-primary)] select-text cursor-text flex-1">{line}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] pl-0.5 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-[var(--accent)] opacity-60" />
            已优化为短句节奏，适合字幕/口播直接使用
          </p>
        </>
      )}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────── */
export function TranslationSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">翻译结果</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded-full bg-[var(--border)] animate-pulse" />
          <div className="h-6 w-20 rounded-lg bg-[var(--border)] animate-pulse" />
        </div>
        <div className="rounded-xl px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
          <div className="h-3 w-full rounded-full bg-[var(--border)] animate-pulse" />
          <div className="h-3 w-4/5 rounded-full bg-[var(--border)] animate-pulse" />
          <div className="h-3 w-2/3 rounded-full bg-[var(--border)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────── */
export function TranslationOutput({
  result,
  defaultTab,
  activeTab: controlledActiveTab,
  onActiveTabChange,
  editedTexts,
  onTextChange,
}: {
  result: TranslationResult;
  defaultTab?: "standard" | "shortVideo";
  activeTab?: "standard" | "shortVideo";
  onActiveTabChange?: (tab: "standard" | "shortVideo") => void;
  editedTexts?: { standard?: string; shortVideo?: string };
  onTextChange?: (tab: "standard" | "shortVideo", text: string) => void;
}) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<"standard" | "shortVideo">(
    defaultTab ?? "shortVideo"
  );
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab;

  const setActiveTab = (tab: "standard" | "shortVideo") => {
    if (controlledActiveTab === undefined) {
      setUncontrolledActiveTab(tab);
    }
    onActiveTabChange?.(tab);
  };

  const displayStandard  = editedTexts?.standard  ?? result.standard;
  const displayShortVideo = editedTexts?.shortVideo ?? result.shortVideo;
  const isDirtyStandard   = editedTexts?.standard  !== undefined;
  const isDirtyShortVideo = editedTexts?.shortVideo !== undefined;

  return (
    <div className="space-y-3">
      {/* Tab header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <div className="inline-flex items-center p-0.5 rounded-lg gap-0.5 bg-[var(--surface-2)] border border-[var(--border)]">
          <button
            onClick={() => setActiveTab("standard")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200",
              activeTab === "standard"
                ? "bg-white text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <AlignLeft className="w-3 h-3" />
            标准翻译
            {isDirtyStandard && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
          </button>
          <button
            onClick={() => setActiveTab("shortVideo")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200",
              activeTab === "shortVideo"
                ? "bg-white text-[var(--text-primary)] shadow-sm border border-[var(--accent)]/20"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Zap className="w-3 h-3 text-[var(--accent)]" />
            短视频优化
            {isDirtyShortVideo && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
          </button>
        </div>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Tab content */}
      {activeTab === "standard" ? (
        <StandardBlock
          text={displayStandard}
          editable={!!onTextChange}
          onChange={onTextChange ? v => onTextChange("standard", v) : undefined}
          onReset={onTextChange ? () => onTextChange("standard", result.standard) : undefined}
          isDirty={isDirtyStandard}
        />
      ) : (
        <ShortVideoBlock
          text={displayShortVideo}
          editable={!!onTextChange}
          onChange={onTextChange ? v => onTextChange("shortVideo", v) : undefined}
          onReset={onTextChange ? () => onTextChange("shortVideo", result.shortVideo) : undefined}
          isDirty={isDirtyShortVideo}
        />
      )}
    </div>
  );
}
