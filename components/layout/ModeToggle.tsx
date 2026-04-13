"use client";

import { useMode } from "@/contexts/mode-context";
import { Sparkles, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "single" as const, label: "单条模式", Icon: Sparkles },
  { id: "batch"  as const, label: "批量模式", Icon: LayoutList },
];

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-xl gap-0.5",
        "bg-[var(--surface-2)] border border-[var(--border)]",
        "shadow-sm"
      )}
      role="tablist"
      aria-label="操作模式"
    >
      {MODES.map(({ id, label, Icon }) => {
        const isActive = mode === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setMode(id)}
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-2 rounded-lg",
              "text-sm font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              isActive
                ? [
                    "text-white shadow-sm",
                    "before:absolute before:inset-0 before:rounded-lg before:z-0",
                    "before:bg-gradient-to-r before:from-[var(--accent)] before:to-[var(--accent-2)]",
                  ]
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
            )}
          >
            <Icon
              className={cn(
                "relative z-10 w-3.5 h-3.5 transition-transform duration-200",
                isActive && "scale-110"
              )}
            />
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
