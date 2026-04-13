import type { HistoryItem } from "@/types";

const KEY      = "voiceflow_history";
const MAX_ITEMS = 30;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

function isClient() {
  return typeof window !== "undefined";
}

export function getHistory(): HistoryItem[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function persistHistory(items: HistoryItem[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // QuotaExceededError: drop oldest and retry once
    const shorter = items.slice(0, Math.max(1, items.length - 3));
    try { localStorage.setItem(KEY, JSON.stringify(shorter)); } catch { /* give up */ }
  }
}

export function addHistoryItem(newItem: HistoryItem): HistoryItem[] {
  // Prepend + cap at MAX_ITEMS
  let items = [newItem, ...getHistory()].slice(0, MAX_ITEMS);

  // Trim until under MAX_BYTES (audio base64 can be large)
  while (items.length > 1 && JSON.stringify(items).length > MAX_BYTES) {
    items = items.slice(0, -1);
  }

  persistHistory(items);
  return items;
}

export function removeHistoryItem(id: string): HistoryItem[] {
  const items = getHistory().filter((h) => h.id !== id);
  persistHistory(items);
  return items;
}

export function clearHistory(): void {
  if (!isClient()) return;
  localStorage.removeItem(KEY);
}
