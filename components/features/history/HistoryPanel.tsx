"use client";

import { useState, useMemo } from "react";
import { History, Trash2, ClockIcon, Search, X, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HistoryItemCard } from "./HistoryItemCard";
import { VOICES } from "@/config/voices";
import type { HistoryItem } from "@/types";
import { cn } from "@/lib/utils";

/* ── Empty state ──────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
        <ClockIcon className="w-5 h-5 text-[var(--text-muted)]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          暂无历史记录
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          翻译并生成语音后，记录将自动保存在这里
        </p>
      </div>
    </div>
  );
}

/* ── Clear confirm button ─────────────────────────────── */
function ClearButton({ onClear }: { onClear: () => void }) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[var(--text-muted)]">确认清空？</span>
        <button
          onClick={() => { onClear(); setConfirm(false); }}
          className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
        >
          确认
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg",
        "text-[var(--text-muted)] hover:text-red-400",
        "border border-[var(--border)] hover:border-red-500/20 hover:bg-red-500/8",
        "transition-all duration-200"
      )}
    >
      <Trash2 className="w-3 h-3" />
      清空全部
    </button>
  );
}

/* ── HistoryPanel ─────────────────────────────────────── */
interface HistoryPanelProps {
  open:          boolean;
  onClose:       () => void;
  history:       HistoryItem[];
  onRemove:      (id: string) => void;
  onClear:       () => void;
  onTogglePin?:  (id: string) => void;
  onClone?:      (item: HistoryItem) => void;
}

export function HistoryPanel({
  open,
  onClose,
  history,
  onRemove,
  onClear,
  onTogglePin,
  onClone,
}: HistoryPanelProps) {
  const [search,      setSearch]      = useState("");
  const [voiceFilter, setVoiceFilter] = useState("all");

  /* Filtered + sorted list: pinned items first, then by timestamp */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history
      .filter(item => {
        const matchVoice = voiceFilter === "all" || item.voiceId === voiceFilter;
        const matchText  = !q ||
          item.chineseText.toLowerCase().includes(q) ||
          item.standardText.toLowerCase().includes(q) ||
          item.shortVideoText.toLowerCase().includes(q);
        return matchVoice && matchText;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.timestamp - a.timestamp;
      });
  }, [history, search, voiceFilter]);

  const pinnedCount = history.filter(h => h.pinned).length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:w-[420px] sm:max-w-[420px] flex flex-col gap-0 p-0",
          "bg-[var(--bg)] border-l border-[var(--border)]"
        )}
      >
        {/* ── Header ─────────────────────────────────── */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle asChild>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent)]/20 flex items-center justify-center">
                  <History className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] font-syne">
                    历史记录
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    共 {history.length} 条
                    {pinnedCount > 0 && ` · ${pinnedCount} 已收藏`}
                  </p>
                </div>
              </div>
            </SheetTitle>

            {history.length > 0 && (
              <ClearButton onClear={onClear} />
            )}
          </div>

          {/* ── Search + Filter ─────────────────────── */}
          {history.length > 0 && (
            <div className="flex gap-2 mt-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索文案…"
                  className={cn(
                    "w-full h-8 pl-7 pr-7 text-xs rounded-lg",
                    "bg-[var(--surface-2)] border border-[var(--border)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "outline-none focus:border-[var(--accent)]/50 transition-colors"
                  )}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Voice filter */}
              <div className="relative">
                <select
                  value={voiceFilter}
                  onChange={e => setVoiceFilter(e.target.value)}
                  className={cn(
                    "h-8 pl-2.5 pr-6 text-xs rounded-lg appearance-none",
                    "bg-[var(--surface-2)] border border-[var(--border)]",
                    "text-[var(--text-primary)] outline-none cursor-pointer",
                    "focus:border-[var(--accent)]/50 transition-colors"
                  )}
                >
                  <option value="all">全部声音</option>
                  {VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          )}
        </SheetHeader>

        {/* ── List ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {history.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Search className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-secondary)]">没有匹配的记录</p>
              <button
                onClick={() => { setSearch(""); setVoiceFilter("all"); }}
                className="text-xs text-[var(--accent)] hover:underline mt-1"
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <HistoryItemCard
                  key={item.id}
                  item={item}
                  onRemove={onRemove}
                  onTogglePin={onTogglePin}
                  onClone={onClone}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer hint ────────────────────────────── */}
        {history.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              音频以 base64 格式保存在浏览器本地，最多保留 30 条
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
