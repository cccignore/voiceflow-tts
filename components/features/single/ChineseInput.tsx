"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";
import { EXAMPLE_TEXT } from "@/config/voices";
import { cn } from "@/lib/utils";

const MAX_CHARS = 500;

interface ChineseInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  shake?: boolean;
}

export function ChineseInput({
  value,
  onChange,
  onSubmit,
  disabled,
  shake,
}: ChineseInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const pct = charCount / MAX_CHARS;

  /* 自动撑高 textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(148, el.scrollHeight) + "px";
  }, [value]);

  /* Cmd / Ctrl + Enter 快速提交（空内容也触发，由父组件决定是否处理） */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onSubmit();
    }
  };

  const charColorClass =
    pct >= 0.96
      ? "text-red-400"
      : pct >= 0.82
      ? "text-orange-400"
      : "text-[var(--text-muted)]";

  return (
    <div className="space-y-2.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          中文口播文案
        </label>

        <button
          type="button"
          onClick={() => {
            onChange(EXAMPLE_TEXT);
            textareaRef.current?.focus();
          }}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg",
            "text-[var(--text-muted)] hover:text-[var(--accent)]",
            "border border-transparent hover:border-[var(--accent)]/25",
            "hover:bg-[var(--accent-glow)] transition-all duration-200",
            disabled && "opacity-40 pointer-events-none"
          )}
        >
          <Sparkles className="w-3 h-3" />
          填入示例
        </button>
      </div>

      {/* Textarea */}
      <div className={cn("relative", shake && "animate-shake")}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="输入中文口播文案，按 ⌘/Ctrl + Enter 快速翻译…"
          className={cn(
            "w-full resize-none rounded-xl px-4 py-3.5 pr-20",
            "bg-[var(--surface-2)] text-[var(--text-primary)] text-sm leading-relaxed",
            "placeholder:text-[var(--text-muted)]",
            "border outline-none",
            "transition-all duration-200",
            shake
              ? "border-red-500/50 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
              : "border-[var(--border)] focus:border-[var(--accent)]/60 focus:shadow-[0_0_0_3px_var(--accent-glow)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "min-h-[148px]"
          )}
        />

        {/* Char counter — bottom right inside textarea */}
        <div
          className={cn(
            "absolute bottom-3 right-3 text-[11px] tabular-nums",
            "transition-colors duration-300 pointer-events-none select-none",
            charColorClass
          )}
        >
          {charCount}
          <span className="opacity-40"> / {MAX_CHARS}</span>
        </div>
      </div>

      {/* Keyboard hint / empty warning */}
      <p className={cn(
        "text-[10px] pl-0.5 transition-colors duration-200",
        shake ? "text-red-400 font-medium" : "text-[var(--text-muted)]"
      )}>
        {shake ? "请先输入中文口播文案再提交" : "提示：⌘ Cmd / Ctrl + Enter 快速触发翻译"}
      </p>
    </div>
  );
}
