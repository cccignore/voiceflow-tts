/**
 * 短视频口播优化：将标准英文翻译处理为适合短视频字幕/TTS 的风格
 * 规则：
 *  1. 每个语义单元 ≤ 15 个词
 *  2. 在连词/介词处断长句
 *  3. 展开常见缩写 → 更口语化（are not → aren't 等）
 */

const BREAK_CONJUNCTIONS = new Set([
  "and", "but", "so", "because", "when", "while",
  "which", "that", "if", "then", "plus", "with",
  "as", "or", "yet", "nor", "although", "though",
]);

const MAX_WORDS = 15;
const BREAK_AFTER = 10; // 超过这个词数后遇到连词就断

/** 将常见非缩写形式改为缩写，增加口语化程度 */
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
    .replace(/\bthat is\b/gi, "that's");
}

/** 将一个长句在连词处拆分为短句列表 */
function breakLongSentence(sentence: string): string[] {
  const words = sentence.trim().split(/\s+/);
  if (words.length <= MAX_WORDS) return [sentence.trim()];

  const chunks: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const bare = word.toLowerCase().replace(/[^a-z]/g, "");

    if (current.length >= BREAK_AFTER && BREAK_CONJUNCTIONS.has(bare)) {
      // 结束当前块（确保以句点结尾）
      const last = current[current.length - 1];
      if (!/[.!?]$/.test(last)) current[current.length - 1] += ".";
      chunks.push(current.join(" "));
      // 新块首词大写
      current = [word.charAt(0).toUpperCase() + word.slice(1)];
    } else {
      current.push(word);
    }
  }

  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}

/** 主函数：短视频优化 */
export function shortVideoOptimize(text: string): string {
  // 先做缩写替换
  const contracted = applyContractions(text);

  // 按句子拆分（. ! ? 结尾）
  const sentenceRegex = /[^.!?]+[.!?]*/g;
  const sentences = contracted.match(sentenceRegex) ?? [contracted];

  const result: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const chunks = breakLongSentence(trimmed);
    result.push(...chunks);
  }

  // 每句独占一行，形成短视频字幕/口播节奏感
  return result.join("\n").trim();
}
