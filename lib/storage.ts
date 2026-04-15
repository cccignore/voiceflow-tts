import type { HistoryItem } from "@/types";

const KEY      = "voiceflow_history";
const MAX_ITEMS = 30;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const listeners = new Set<() => void>();
const EMPTY_HISTORY: HistoryItem[] = [];

let cachedHistory: HistoryItem[] = EMPTY_HISTORY;
let cachedRaw: string | null = null;

function isClient() {
  return typeof window !== "undefined";
}

function emitHistoryChange() {
  listeners.forEach((listener) => listener());
}

export function getHistory(): HistoryItem[] {
  if (!isClient()) return EMPTY_HISTORY;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) {
      return cachedHistory;
    }

    cachedRaw = raw;
    cachedHistory = raw ? (JSON.parse(raw) as HistoryItem[]) : EMPTY_HISTORY;
    return cachedHistory;
  } catch {
    cachedRaw = null;
    cachedHistory = EMPTY_HISTORY;
    return cachedHistory;
  }
}

export function getHistoryServerSnapshot(): HistoryItem[] {
  return EMPTY_HISTORY;
}

function estimateSize(items: HistoryItem[]): number {
  return JSON.stringify(items).length;
}

function trimToBudget(items: HistoryItem[]): HistoryItem[] {
  let next = [...items];
  while (next.length > 1 && estimateSize(next) > MAX_BYTES) {
    next = next.slice(0, -1);
  }
  return next;
}

function persistHistory(items: HistoryItem[]): HistoryItem[] {
  if (!isClient()) return items;
  let candidate = trimToBudget(items);

  try {
    const serialized = JSON.stringify(candidate);
    localStorage.setItem(KEY, serialized);
    cachedRaw = serialized;
    cachedHistory = candidate;
    emitHistoryChange();
    return candidate;
  } catch {
    // QuotaExceededError: keep dropping oldest until write succeeds or nothing meaningful remains
    while (candidate.length > 1) {
      candidate = candidate.slice(0, -1);
      try {
        const serialized = JSON.stringify(candidate);
        localStorage.setItem(KEY, serialized);
        cachedRaw = serialized;
        cachedHistory = candidate;
        emitHistoryChange();
        return candidate;
      } catch {
        // keep trimming
      }
    }

    try {
      const serialized = JSON.stringify(candidate);
      localStorage.setItem(KEY, serialized);
      cachedRaw = serialized;
      cachedHistory = candidate;
      emitHistoryChange();
      return candidate;
    } catch {
      return getHistory();
    }
  }
}

export function addHistoryItem(newItem: HistoryItem): HistoryItem[] {
  // Prepend + cap at MAX_ITEMS
  const items = [newItem, ...getHistory()].slice(0, MAX_ITEMS);

  return persistHistory(items);
}

export function removeHistoryItem(id: string): HistoryItem[] {
  const items = getHistory().filter((h) => h.id !== id);
  return persistHistory(items);
}

export function updateHistoryItem(id: string, patch: Partial<import("@/types").HistoryItem>): import("@/types").HistoryItem[] {
  const items = getHistory().map(h => h.id === id ? { ...h, ...patch } : h);
  return persistHistory(items);
}

export function clearHistory(): void {
  if (!isClient()) return;
  localStorage.removeItem(KEY);
  cachedRaw = null;
  cachedHistory = EMPTY_HISTORY;
  emitHistoryChange();
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);

  if (!isClient()) {
    return () => {
      listeners.delete(listener);
    };
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cachedRaw = event.newValue;
      cachedHistory = event.newValue
        ? (JSON.parse(event.newValue) as HistoryItem[])
        : EMPTY_HISTORY;
      listener();
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
