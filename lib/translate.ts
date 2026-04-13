/**
 * 在不接 LLM 的前提下，尽量把机器翻译结果整理成更适合
 * 短视频字幕 / 口播 TTS 的英文版本。
 *
 * 核心原则：
 * 1. 优先保留原意，不过度重写
 * 2. 优先按自然停顿拆句，而不是机械地硬切
 * 3. 只做保守的口语化处理，避免“优化过头”
 */

const MAX_WORDS_PER_LINE = 12;
const SOFT_BREAK_AFTER = 7;
const MIN_WORDS_PER_LINE = 3;
const MAX_LINES = 16;

const STRONG_BREAK_WORDS = new Set([
  "and", "but", "so", "yet", "then", "plus", "although", "though",
]);

const DROPPABLE_BREAK_WORDS = new Set(["and", "then", "plus"]);
const DEPENDENT_OPENERS = /^(when|if|while|after|before|unless)\b/i;

function normalizeText(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowercaseLeadingWord(text: string): string {
  if (!text) return text;
  if (/^I(\b|')/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function stripTrailingPunctuation(text: string): string {
  return text.replace(/[,:;.\s]+$/g, "").trim();
}

function ensureEnding(text: string, ending: "." | "!" | "?"): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}${ending}`;
}

function splitIntoSentences(text: string): string[] {
  return normalizeText(text).match(/[^.!?]+[.!?]*/g) ?? [];
}

function getSentenceEnding(sentence: string): "." | "!" | "?" {
  const match = sentence.trim().match(/[.!?]$/);
  if (!match) return ".";
  const ending = match[0];
  return ending === "!" || ending === "?" ? ending : ".";
}

function applyContractions(text: string): string {
  return text
    .replace(/\byou are\b/gi, "you're")
    .replace(/\bit is\b/gi, "it's")
    .replace(/\bthey are\b/gi, "they're")
    .replace(/\bwe are\b/gi, "we're")
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bdoes not\b/gi, "doesn't")
    .replace(/\bcannot\b/gi, "can't")
    .replace(/\bwill not\b/gi, "won't")
    .replace(/\bis not\b/gi, "isn't")
    .replace(/\bare not\b/gi, "aren't")
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bthat is\b/gi, "that's")
    .replace(/\bthere is\b/gi, "there's");
}

function applyPhraseTweaks(sentence: string): string {
  let out = sentence.trim();

  // 常见广告口播开头：减少翻译腔
  out = out.replace(/^Are you still\s+/i, "Still ");

  // 更短、更自然的“无需……”
  out = out.replace(/\bthere is no need to\b/gi, "No need to");
  out = out.replace(/\byou do not need to\b/gi, "You don't need to");
  out = out.replace(/\byou don't need to\b/gi, "No need to");
  out = out.replace(/\byou do not have to\b/gi, "You don't have to");

  // “让我给你推荐” 这类表达更口播化一点
  out = out.replace(/\blet me recommend (you )?(this|a)\b/gi, "Meet $2");
  out = out.replace(/\bi recommend (this|a)\b/gi, "Meet $1");

  return out;
}

function splitByNaturalPause(sentence: string): string[] {
  const core = stripTrailingPunctuation(sentence)
    .replace(/\s*[—-]\s*/g, ", ")
    .replace(/[;:]/g, ",");

  return core
    .split(/\s*,\s*/g)
    .map((part) => part.trim().replace(/^(and|plus|then)\s+/i, ""))
    .filter(Boolean);
}

function mergeDependentClauses(clauses: string[]): string[] {
  const merged: string[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const current = clauses[i];
    const next = clauses[i + 1];

    if (
      next &&
      DEPENDENT_OPENERS.test(current) &&
      wordCount(current) <= 6
    ) {
      merged.push(`${stripTrailingPunctuation(current)}, ${lowercaseLeadingWord(next)}`.trim());
      i++;
      continue;
    }

    merged.push(current);
  }

  return merged;
}

function packClauses(clauses: string[]): string[] {
  const packed: string[] = [];
  let current = "";

  for (const clause of clauses) {
    if (!current) {
      current = capitalize(clause);
      continue;
    }

    const candidate = `${current} ${lowercaseLeadingWord(clause)}`.trim();
    if (wordCount(candidate) <= MAX_WORDS_PER_LINE) {
      current = candidate;
    } else {
      packed.push(current);
      current = capitalize(clause);
    }
  }

  if (current) packed.push(current);
  return packed;
}

function hardSplit(words: string[]): string[] {
  const lines: string[] = [];

  for (let i = 0; i < words.length; i += MAX_WORDS_PER_LINE) {
    const chunk = words.slice(i, i + MAX_WORDS_PER_LINE).join(" ");
    if (chunk) lines.push(capitalize(chunk));
  }

  return lines;
}

function splitLongLine(line: string): string[] {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length <= MAX_WORDS_PER_LINE) return [capitalize(line.trim())];

  const lines: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const bare = word.toLowerCase().replace(/[^a-z]/g, "");
    const remainingWords = words.length - i - 1;

    const canBreak =
      current.length >= SOFT_BREAK_AFTER &&
      remainingWords >= MIN_WORDS_PER_LINE &&
      STRONG_BREAK_WORDS.has(bare);

    if (canBreak) {
      lines.push(capitalize(current.join(" ").trim()));
      current = [];

      if (!DROPPABLE_BREAK_WORDS.has(bare)) {
        current.push(capitalize(word));
      }
      continue;
    }

    current.push(current.length === 0 ? capitalize(word) : word);
  }

  if (current.length > 0) {
    lines.push(capitalize(current.join(" ").trim()));
  }

  const stillTooLong = lines.some((item) => wordCount(item) > MAX_WORDS_PER_LINE + 1);
  return stillTooLong ? hardSplit(words) : lines;
}

function mergeTinyLines(lines: string[]): string[] {
  const merged: string[] = [];

  for (const line of lines) {
    const cleaned = stripTrailingPunctuation(line);
    if (!cleaned) continue;

    if (wordCount(cleaned) < MIN_WORDS_PER_LINE && merged.length > 0) {
      const previous = stripTrailingPunctuation(merged[merged.length - 1]);
      merged[merged.length - 1] = `${previous} ${lowercaseLeadingWord(cleaned)}`.trim();
      continue;
    }

    merged.push(capitalize(cleaned));
  }

  return merged;
}

function finalizeLines(lines: string[], sentenceEnding: "." | "!" | "?"): string[] {
  const merged = mergeTinyLines(lines);

  return merged.map((line, index) => {
    const ending = index === merged.length - 1 ? sentenceEnding : ".";
    return ensureEnding(stripTrailingPunctuation(line), ending);
  });
}

function buildNaturalSubtitleLines(sentence: string): string[] {
  const ending = getSentenceEnding(sentence);
  const clauses = mergeDependentClauses(splitByNaturalPause(sentence));
  const baseLines =
    clauses.length > 1 ? clauses.map((item) => capitalize(item)) : packClauses(clauses);
  const expanded = baseLines.flatMap((item) => splitLongLine(item));
  return finalizeLines(expanded, ending);
}

function buildGentleFallback(text: string): string {
  const lines = splitIntoSentences(text)
    .flatMap((sentence) => {
      const ending = getSentenceEnding(sentence);
      const cleaned = stripTrailingPunctuation(sentence);
      if (!cleaned) return [];

      const packed = packClauses([cleaned]);
      return finalizeLines(packed, ending);
    })
    .filter(Boolean);

  return lines.join("\n").trim();
}

function isUsableShortVideo(text: string): boolean {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0 || lines.length > MAX_LINES) return false;
  if (lines.some((line) => wordCount(line) > MAX_WORDS_PER_LINE + 2)) return false;
  if (lines.some((line) => wordCount(line) <= 1)) return false;
  return true;
}

/** 主函数：短视频优化 */
export function shortVideoOptimize(text: string): string {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  const sentences = splitIntoSentences(normalized).map((sentence) =>
    applyPhraseTweaks(applyContractions(sentence))
  );

  const lines = sentences
    .flatMap((sentence) => buildNaturalSubtitleLines(sentence))
    .filter(Boolean);

  const candidate = lines.join("\n").trim();
  if (isUsableShortVideo(candidate)) {
    return candidate;
  }

  const softened = sentences.join(" ").trim();
  const fallback = buildGentleFallback(softened);
  return fallback || softened;
}
