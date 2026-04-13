"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import {
  Plus, Trash2, Loader2, PackageOpen, Zap, LayoutList,
} from "lucide-react";
import { toast } from "sonner";
import { BatchItemCard }           from "./BatchItemCard";
import { VOICES, DEFAULT_VOICE_ID } from "@/constants/voices";
import { bufferToBase64 }          from "@/lib/audio";
import type { BatchItem, TranslationResult } from "@/types";
import { cn } from "@/lib/utils";

const MAX_ITEMS = 10;

/* ── helpers ──────────────────────────────────────────── */
function createItem(): BatchItem {
  return { id: nanoid(), text: "", status: "pending" };
}

/* ── Style toggle (reused from SingleMode pattern) ─────── */
const STYLE_OPTS = [
  { id: "standard"   as const, label: "标准翻译" },
  { id: "shortVideo" as const, label: "短视频优化" },
];
function StyleToggle({
  value, onChange, disabled,
}: { value: "standard" | "shortVideo"; onChange: (v: "standard" | "shortVideo") => void; disabled?: boolean }) {
  return (
    <div className={cn("inline-flex items-center p-0.5 rounded-lg gap-0.5 bg-[var(--surface-2)] border border-[var(--border)]", disabled && "opacity-50 pointer-events-none")}>
      {STYLE_OPTS.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)}
          className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
            value === id ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
        >{label}</button>
      ))}
    </div>
  );
}

/* ── Types ────────────────────────────────────────────── */
export interface BatchItemCompletePayload {
  chineseText:    string;
  standardText:   string;
  shortVideoText: string;
  audioBase64:    string;
  voiceId:        string;
}

/* ── BatchMode ────────────────────────────────────────── */
export function BatchMode({ onItemComplete }: { onItemComplete?: (p: BatchItemCompletePayload) => void } = {}) {
  const [items,       setItems]       = useState<BatchItem[]>([createItem(), createItem()]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [style,       setStyle]       = useState<"standard" | "shortVideo">("shortVideo");
  const [voiceId,     setVoiceId]     = useState(DEFAULT_VOICE_ID);

  /* ── Item CRUD ────────────────────────────────────── */
  const addItem = () => {
    if (items.length >= MAX_ITEMS) return;
    setItems(prev => [...prev, createItem()]);
  };

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.length <= 1 ? [createItem()] : prev.filter(i => i.id !== id));
  }, []);

  const updateText = useCallback((id: string, text: string) => {
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, text, status: i.status === "error" ? "pending" : i.status }
      : i));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<BatchItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }, []);

  const clearAll = () => {
    setItems([createItem(), createItem()]);
    toast.success("已清空全部文案");
  };

  /* ── Derived stats ────────────────────────────────── */
  const doneItems     = items.filter(i => i.status === "done" && i.audioBase64);
  const toProcess     = items.filter(i => i.text.trim() && i.status !== "done");
  const canProcess    = !isProcessing && toProcess.length > 0;
  const canDownload   = doneItems.length > 0;
  const doneCount     = doneItems.length;
  const totalFilled   = items.filter(i => i.text.trim()).length;

  /* ── Sequential processing ────────────────────────── */
  const processAll = useCallback(async () => {
    if (!canProcess) return;
    setIsProcessing(true);

    const snapshot = items.filter(i => i.text.trim() && i.status !== "done");
    let newSuccessCount = 0;

    for (const item of snapshot) {
      updateItem(item.id, { status: "processing", errorMessage: undefined });

      try {
        /* Step 1: translate */
        const tRes = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: item.text.trim() }),
        });
        const tData = await tRes.json();
        if (!tRes.ok) {
          updateItem(item.id, { status: "error", errorMessage: tData.error ?? "翻译失败" });
          continue;
        }
        const translation = tData as TranslationResult;

        /* Step 2: TTS */
        const ttsText = style === "shortVideo" ? translation.shortVideo : translation.standard;
        const aRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: ttsText, voiceId }),
        });

        if (!aRes.ok) {
          const aData = await aRes.json().catch(() => ({}));
          updateItem(item.id, {
            status: "error",
            errorMessage: aData.error ?? "语音生成失败",
            translation,
          });
          continue;
        }

        const buffer      = await aRes.arrayBuffer();
        const audioBase64 = bufferToBase64(buffer);
        updateItem(item.id, { status: "done", translation, audioBase64 });
        newSuccessCount++;

        // 保存到历史记录
        onItemComplete?.({
          chineseText:    item.text.trim(),
          standardText:   translation.standard,
          shortVideoText: translation.shortVideo,
          audioBase64,
          voiceId,
        });

      } catch {
        updateItem(item.id, { status: "error", errorMessage: "网络错误，请重试" });
      }
    }

    setIsProcessing(false);
    const total = doneCount + newSuccessCount;
    if (total > 0) {
      toast.success(`批量处理完成，共 ${total} 条成功`);
    } else {
      toast.error("全部条目处理失败，请检查后重试");
    }
  }, [canProcess, items, style, voiceId, updateItem, doneCount]);

  /* ── ZIP download ─────────────────────────────────── */
  const downloadZip = useCallback(async () => {
    if (!canDownload) return;
    try {
      const JSZip = (await import("jszip")).default;
      const zip   = new JSZip();
      doneItems.forEach((item, idx) => {
        const b64 = item.audioBase64!.split(",")[1];
        zip.file(`voiceflow-${String(idx + 1).padStart(2, "0")}.mp3`, b64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `voiceflow-batch-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`已打包 ${doneItems.length} 个音频文件`);
    } catch {
      toast.error("打包失败，请重试");
    }
  }, [canDownload, doneItems]);

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-4xl mx-auto px-5 py-5 space-y-4 animate-fade-in-up">

      {/* ── Control bar ──────────────────────────────── */}
      <div className="glass rounded-2xl border border-[var(--border)] p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Style toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">翻译风格</span>
            <StyleToggle value={style} onChange={setStyle} disabled={isProcessing} />
          </div>

          {/* Voice select */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">声音选择</span>
            <select
              value={voiceId}
              onChange={e => setVoiceId(e.target.value)}
              disabled={isProcessing}
              className={cn(
                "h-[34px] px-3 rounded-lg text-xs font-medium",
                "bg-[var(--surface-2)] text-[var(--text-primary)]",
                "border border-[var(--border)] outline-none",
                "focus:border-[var(--accent)]/60 transition-all duration-200 cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {VOICES.map(v => (
                <option key={v.id} value={v.id}>{v.name} · {v.description}</option>
              ))}
            </select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add + Clear */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              disabled={isProcessing}
              className={cn(
                "flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-xs font-medium",
                "border border-[var(--border)] text-[var(--text-secondary)]",
                "hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/8",
                "transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
              )}
            >
              <Trash2 className="w-3 h-3" />
              清空
            </button>

            <button
              onClick={addItem}
              disabled={isProcessing || items.length >= MAX_ITEMS}
              className={cn(
                "flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-xs font-medium",
                "border border-[var(--border)] text-[var(--text-secondary)]",
                "hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-glow)]",
                "transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
              )}
            >
              <Plus className="w-3 h-3" />
              添加文案
              <span className="text-[10px] opacity-50">({items.length}/{MAX_ITEMS})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Items list ───────────────────────────────── */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <BatchItemCard
            key={item.id}
            item={item}
            index={idx}
            disabled={isProcessing}
            onTextChange={updateText}
            onRemove={removeItem}
          />
        ))}
      </div>

      {/* ── Footer action bar ────────────────────────── */}
      <div className="glass rounded-2xl border border-[var(--border)] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <LayoutList className="w-3.5 h-3.5" />
              共 <strong className="text-[var(--text-primary)]">{items.length}</strong> 条
              · 已填写 <strong className="text-[var(--text-primary)]">{totalFilled}</strong> 条
            </span>
            {doneCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Zap className="w-3 h-3" />
                {doneCount} 条完成
              </span>
            )}
          </div>

          <div className="flex-1" />

          {/* Download ZIP */}
          {canDownload && (
            <button
              onClick={downloadZip}
              className={cn(
                "flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-medium",
                "border border-emerald-500/30 text-emerald-400",
                "hover:bg-emerald-500/10 transition-all duration-200"
              )}
            >
              <PackageOpen className="w-4 h-4" />
              打包下载 ({doneCount} 个 .mp3)
            </button>
          )}

          {/* Process button */}
          <button
            onClick={processAll}
            disabled={!canProcess}
            className={cn(
              "btn-accent flex items-center justify-center gap-2.5",
              "h-10 px-5 rounded-xl text-sm font-semibold",
              "relative overflow-hidden",
              !isProcessing && canProcess && [
                "before:absolute before:inset-0 before:translate-x-[-100%]",
                "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
                "hover:before:translate-x-[100%] before:transition-transform before:duration-700",
              ]
            )}
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />批量处理中…</>
            ) : (
              <><Zap className="w-4 h-4 flex-shrink-0" />开始批量处理</>
            )}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
