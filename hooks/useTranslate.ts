"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TranslationResult } from "@/types";

export type TranslateState =
  | { status: "idle" }
  | { status: "translating" }
  | { status: "done"; result: TranslationResult }
  | { status: "error"; message: string };

export function useTranslate() {
  const [state, setState] = useState<TranslateState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // 组件卸载时取消进行中的请求
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const translate = useCallback(
    async (text: string): Promise<TranslationResult | null> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setState({ status: "translating" });
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: ac.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: data.error ?? "翻译失败，请重试" });
          return null;
        }
        const result = data as TranslationResult;
        setState({ status: "done", result });
        return result;
      } catch (e) {
        if ((e as Error).name === "AbortError") return null;
        setState({ status: "error", message: "网络错误，请检查连接后重试" });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, translate, reset };
}
