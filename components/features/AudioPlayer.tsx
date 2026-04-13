"use client";

import {
  useRef, useEffect, useState, useCallback,
  type PointerEvent,
} from "react";
import { Play, Pause, Download, Mic2 } from "lucide-react";
import { VOICES } from "@/constants/voices";
import { cn } from "@/lib/utils";

/* ── helpers ──────────────────────────────────────────── */
function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ── Animated mini waveform (while playing) ─────────── */
function PlayingBars() {
  return (
    <span className="inline-flex items-end gap-[2px] h-3" aria-hidden>
      {[0.5, 1, 0.65, 0.85, 0.45].map((h, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-[var(--accent)] origin-bottom"
          style={{
            height: `${h * 100}%`,
            animation: `waveBar 0.9s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}

/* ── Props ────────────────────────────────────────────── */
interface AudioPlayerProps {
  audioBase64:     string;
  voiceId:         string;
  filenamePrefix?: string;
}

/* ── Component ────────────────────────────────────────── */
export function AudioPlayer({
  audioBase64,
  voiceId,
  filenamePrefix = "voiceflow",
}: AudioPlayerProps) {
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const rafRef        = useRef<number>(0);
  const trackRef      = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [isPlaying,  setIsPlaying]  = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubPct,   setScrubPct]   = useState(0);

  const stopTracking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  const syncFromAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isDraggingRef.current) {
      setCurrentTime(audio.currentTime);
    }
    if (isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  }, []);

  const startTracking = useCallback(() => {
    stopTracking();

    const tick = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!isDraggingRef.current) {
        setCurrentTime(audio.currentTime);
      }

      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }

      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopTracking]);

  /* ── Init ──────────────────────────────────────────── */
  useEffect(() => {
    const audio = new Audio(audioBase64);
    audio.preload = "metadata";
    audioRef.current = audio;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const onLoaded = () => syncFromAudio();
    const onPlay = () => {
      setIsPlaying(true);
      startTracking();
    };
    const onPause = () => {
      setIsPlaying(false);
      syncFromAudio();
      stopTracking();
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      stopTracking();
    };
    const onTime = () => syncFromAudio();

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("canplay", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("canplay", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.src = "";
      audioRef.current = null;
      stopTracking();
    };
  }, [audioBase64, startTracking, stopTracking, syncFromAudio]);

  /* ── Play / Pause ──────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  /* ── Scrub ─────────────────────────────────────────── */
  const pctFromEvent = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const { left, width } = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - left) / width));
  }, []);

  const seekTo = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(duration)) return;
    const t = pct * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  }, [duration]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    setScrubPct(pctFromEvent(e.clientX));
  }, [pctFromEvent]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    setScrubPct(pctFromEvent(e.clientX));
  }, [pctFromEvent]);

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    seekTo(pctFromEvent(e.clientX));
    isDraggingRef.current = false;
    setIsDragging(false);
    syncFromAudio();
  }, [pctFromEvent, seekTo, syncFromAudio]);

  const onPointerCancel = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    syncFromAudio();
  }, [syncFromAudio]);

  /* ── Download ──────────────────────────────────────── */
  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = audioBase64;
    a.download = `${filenamePrefix}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [audioBase64, filenamePrefix]);

  /* ── Derived ───────────────────────────────────────── */
  const displayTime = isDragging ? scrubPct * duration : currentTime;
  const fillPct     = duration > 0
    ? ((isDragging ? scrubPct * duration : currentTime) / duration) * 100
    : 0;
  const voice = VOICES.find(v => v.id === voiceId);

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="animate-fade-in-up">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          生成音频
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Player card */}
      <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-[0_16px_34px_rgba(29,33,56,0.10)]">

        {/* Voice info + download */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-gradient-to-br from-amber-50 to-orange-50",
            "border border-[var(--accent)]/15"
          )}>
            {isPlaying
              ? <PlayingBars />
              : <Mic2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              {voice?.name ?? "语音"}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
              {isPlaying ? "正在播放…" : (voice?.description ?? "已生成")}
            </p>
          </div>
          <button
            onClick={handleDownload}
            aria-label="下载 MP3"
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              "text-[var(--text-muted)] border border-[var(--border)]",
              "hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-amber-50",
              "transition-all duration-200"
            )}
          >
            <Download className="w-3 h-3" />
          </button>
        </div>

        {/* Progress track */}
        <div className="px-4 pb-1.5">
          <div
            ref={trackRef}
            role="slider"
            aria-valuenow={Math.round(displayTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className="relative h-1.5 rounded-full bg-[var(--surface-2)] cursor-pointer select-none group overflow-hidden"
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                "bg-gradient-to-r from-[var(--accent)] via-[var(--accent-2)] to-[var(--accent)] bg-[length:200%_100%]",
                isPlaying ? "animate-audio-progress" : "transition-[width] duration-150"
              )}
              style={{ width: `${fillPct}%` }}
            />
            {/* Thumb */}
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
                "w-3 h-3 rounded-full bg-white border-2 border-[var(--accent)]",
                "shadow-sm transition-opacity duration-100",
                "opacity-0 group-hover:opacity-100",
                (isDragging || isPlaying) && "opacity-100 scale-110"
              )}
              style={{ left: `${fillPct}%` }}
            />
          </div>
          {/* Time stamps */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] tabular-nums text-[var(--text-muted)]">{fmt(displayTime)}</span>
            <span className="text-[10px] tabular-nums text-[var(--text-muted)]">{fmt(duration)}</span>
          </div>
        </div>

        {/* Play / Pause button */}
        <div className="flex items-center justify-center pb-3">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "暂停" : "播放"}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              "bg-[var(--accent)] text-white",
              "shadow-[0_4px_16px_rgba(201,126,10,0.30)]",
              "hover:brightness-110 active:scale-95",
              "transition-all duration-200",
              isPlaying && "animate-[pulse-glow_1.8s_ease-in-out_infinite]"
            )}
          >
            {isPlaying
              ? <Pause className="w-3.5 h-3.5" />
              : <Play  className="w-3.5 h-3.5 translate-x-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────── */
export function AudioPlayerSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          生成音频
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm p-3.5 space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-16 rounded-full bg-[var(--surface-2)] animate-pulse" />
            <div className="h-2.5 w-24 rounded-full bg-[var(--surface-2)] animate-pulse" />
          </div>
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] animate-pulse" />
        </div>
        <div className="h-1.5 rounded-full bg-[var(--surface-2)] animate-pulse" />
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
