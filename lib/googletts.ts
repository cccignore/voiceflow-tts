/**
 * Google Translate TTS 非官方端点
 * 无需 API Key，通过 VPN 可正常访问
 * 单次请求上限约 200 字符，超长文本自动分句拼接
 */

const GTTS_URL = "https://translate.googleapis.com/translate_tts";
const MAX_CHARS = 180; // 留一点余量

/** 将文本按句子拆分，每段不超过 MAX_CHARS */
function splitText(text: string): string[] {
  // 先按句子边界切分
  const sentences = text.match(/[^.!?,;]+[.!?,;]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    const seg = s.trim();
    if (!seg) continue;
    if ((current + " " + seg).trim().length <= MAX_CHARS) {
      current = (current + " " + seg).trim();
    } else {
      if (current) chunks.push(current);
      // 单句超长则按词切
      if (seg.length > MAX_CHARS) {
        const words = seg.split(/\s+/);
        let wordChunk = "";
        for (const w of words) {
          if ((wordChunk + " " + w).trim().length <= MAX_CHARS) {
            wordChunk = (wordChunk + " " + w).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        if (wordChunk) current = wordChunk;
        else current = "";
      } else {
        current = seg;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

/** 获取单段 TTS audio */
async function fetchChunk(text: string): Promise<ArrayBuffer> {
  const url =
    `${GTTS_URL}?ie=UTF-8&tl=en&client=tw-ob&ttsspeed=0.9` +
    `&q=${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
  });

  if (!res.ok) {
    throw new Error(`Google TTS 请求失败（${res.status}）`);
  }
  return res.arrayBuffer();
}

/** 合并多个 MP3 ArrayBuffer（直接拼接，浏览器可连续播放） */
function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    out.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return out.buffer;
}

/** 主函数：文本 → MP3 ArrayBuffer */
export async function googleTTS(text: string): Promise<ArrayBuffer> {
  const chunks = splitText(text.trim());
  if (chunks.length === 0) throw new Error("文案内容为空");

  const buffers = await Promise.all(chunks.map(fetchChunk));
  return concatBuffers(buffers);
}
