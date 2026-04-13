"use client";

import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./ModeToggle";

interface HeaderProps {
  onHistoryClick?: () => void;
  historyCount?:   number;
}

/** 微型波形装饰 SVG */
function WaveformIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {[
        { x: 0,  h: 4,  y: 6  },
        { x: 4,  h: 10, y: 3  },
        { x: 8,  h: 16, y: 0  },
        { x: 12, h: 10, y: 3  },
        { x: 16, h: 6,  y: 5  },
        { x: 20, h: 12, y: 2  },
        { x: 24, h: 6,  y: 5  },
      ].map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width="3"
          height={bar.h}
          rx="1.5"
          fill="currentColor"
          style={{
            animation: `logoWaveBar 1.4s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes logoWaveBar {
          from { transform: scaleY(0.4); transform-origin: center; }
          to   { transform: scaleY(1);   transform-origin: center; }
        }
      `}</style>
    </svg>
  );
}

export function Header({ onHistoryClick, historyCount = 0 }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 glass-header">
      <div className="w-full h-full px-5 sm:px-7 flex items-center justify-between gap-4">

        {/* ── Logo ──────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 select-none flex-shrink-0">
          <WaveformIcon className="w-7 h-4 logo-gradient opacity-90" />
          <span
            className="font-syne text-base tracking-tight logo-gradient"
            style={{ fontWeight: 800 }}
          >
            VoiceFlow
          </span>
        </div>

        {/* ── Mode toggle — center ──────────────────────── */}
        <div className="flex-1 flex justify-center">
          <ModeToggle />
        </div>

        {/* ── History ───────────────────────────────────── */}
        <button
          onClick={onHistoryClick}
          className={cn(
            "relative flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium flex-shrink-0",
            "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            "hover:bg-[var(--surface-2)] border border-transparent",
            "hover:border-[var(--border)] transition-all duration-200"
          )}
          aria-label="查看历史记录"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">历史</span>
          {historyCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 min-w-[16px] h-4 px-1",
              "rounded-full text-[9px] font-bold flex items-center justify-center",
              "bg-[var(--accent)] text-white leading-none"
            )}>
              {historyCount > 99 ? "99+" : historyCount}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
