"use client";

import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import type { HistoryItem } from "@/types";
import {
  getHistory,
  addHistoryItem,
  removeHistoryItem,
  clearHistory as storageClear,
} from "@/lib/storage";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const add = useCallback(
    (item: Omit<HistoryItem, "id" | "timestamp">) => {
      const full: HistoryItem = {
        ...item,
        id:        nanoid(),
        timestamp: Date.now(),
      };
      setHistory(addHistoryItem(full));
    },
    []
  );

  const remove = useCallback((id: string) => {
    setHistory(removeHistoryItem(id));
  }, []);

  const clearAll = useCallback(() => {
    storageClear();
    setHistory([]);
  }, []);

  return { history, add, remove, clearAll };
}
