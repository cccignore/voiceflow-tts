"use client";

import { useState, useCallback } from "react";
import { Music2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  MUSIC_PRESETS,
  mixWithBackground,
  type MusicPreset,
} from "@/lib/audioMixer";
import { cn } from "@/lib/utils";

interface Props {
  voiceBase64: string;
}

export function MusicMixerPanel({ voiceBase64 }: Props) {
  const [preset,   setPreset]   = useState<MusicPreset>("none");
  const [volume,   setVolume]   = useState(0.25);
  const [mixing,   setMixing]   = useState(false);

  const handleMix = useCallback(async () => {
    if (preset === "none") {
      // Download original mp3 directly
      const a    = document.createElement("a");
      a.href     = voiceBase64;
      a.download = `voiceflow-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setMixing(true);
    try {
      const result = await mixWithBackground(voiceBase64, preset, volume);
      const a      = document.createElement("a");
      a.href       = result;
      a.download   = `voiceflow-mixed-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("混合完成，已开始下载");
    } catch (e) {
      console.error(e);
      toast.error("音频混合失败，请重试");
    } finally {
      setMixing(false);
    }
  }, [voiceBase64, preset, volume]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
          <Music2 className="w-3 h-3 text-[var(--accent)]" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          背景音乐混合
        </span>
      </div>

      {/* Preset selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {MUSIC_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            disabled={mixing}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center transition-all duration-200",
              "border text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed",
              preset === p.id
                ? "bg-[var(--accent)]/12 border-[var(--accent)]/40 text-[var(--accent)] shadow-sm"
                : "border-[var(--border)] bg-white/60 text-[var(--text-secondary)] hover:border-[var(--accent)]/25 hover:bg-[var(--accent-glow)]"
            )}
          >
            <span className="text-base leading-none">{p.icon}</span>
            <span className="leading-tight">{p.label}</span>
            <span className={cn(
              "text-[9px] leading-tight",
              preset === p.id ? "text-[var(--accent)]/70" : "text-[var(--text-muted)]"
            )}>
              {p.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Volume slider — only when mixing */}
      {preset !== "none" && (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              背景音量
            </span>
            <span className="text-[10px] tabular-nums font-medium text-[var(--text-secondary)]">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.6}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            disabled={mixing}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-50"
          />
          <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
            <span>轻柔</span>
            <span>均衡</span>
            <span>突出</span>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleMix}
        disabled={mixing}
        className={cn(
          "w-full h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold",
          "border transition-all duration-200",
          "border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/8",
          "hover:bg-[var(--accent)]/15 disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {mixing ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" />混合中，请稍候…</>
        ) : (
          <><Download className="w-3.5 h-3.5" />{preset === "none" ? "下载原始音频 (.mp3)" : "混合并下载 (.wav)"}</>
        )}
      </button>

      {mixing && (
        <p className="text-[10px] text-center text-[var(--text-muted)] animate-pulse">
          正在用 Web Audio API 渲染，较长音频可能需要几秒钟
        </p>
      )}
    </div>
  );
}
