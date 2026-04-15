"use client";

import { useCallback, useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import type { HistoryItem } from "@/types";
import {
  getHistory,
  getHistoryServerSnapshot,
  subscribeHistory,
  addHistoryItem,
  removeHistoryItem,
  updateHistoryItem,
  clearHistory as storageClear,
} from "@/lib/storage";

export function useHistory() {
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistory,
    getHistoryServerSnapshot
  );

  const add = useCallback(
    (item: Omit<HistoryItem, "id" | "timestamp">) => {
      const full: HistoryItem = {
        ...item,
        id:        nanoid(),
        timestamp: Date.now(),
      };
      addHistoryItem(full);
    },
    []
  );

  const remove = useCallback((id: string) => {
    removeHistoryItem(id);
  }, []);

  const clearAll = useCallback(() => {
    storageClear();
  }, []);

  const togglePin = useCallback((id: string) => {
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    updateHistoryItem(id, { pinned: !item.pinned });
  }, [history]);

  return { history, add, remove, clearAll, togglePin };
}
