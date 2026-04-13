"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { bufferToBase64 } from "@/lib/audio";

export type TTSState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; audioBase64: string }
  | { status: "error"; message: string };

export function useTTS() {
  const [state, setState] = useState<TTSState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // 组件卸载时取消进行中的请求
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const generate = useCallback(
    async (text: string, voiceId: string): Promise<string | null> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setState({ status: "generating" });
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId }),
          signal: ac.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setState({
            status: "error",
            message: (data as { error?: string }).error ?? "语音生成失败，请稍后重试",
          });
          return null;
        }

        const buffer = await res.arrayBuffer();
        const base64 = bufferToBase64(buffer);
        setState({ status: "done", audioBase64: base64 });
        return base64;
      } catch (e) {
        if ((e as Error).name === "AbortError") return null;
        setState({ status: "error", message: "网络错误，语音生成失败" });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, generate, reset };
}
