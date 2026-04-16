import { NextRequest, NextResponse } from "next/server";
import { translate } from "@vitalets/google-translate-api";
import { shortVideoOptimize } from "@/lib/translate";
import { generateSpeech } from "@/lib/elevenlabs";

export const runtime = "nodejs";

const FEISHU_BASE    = "https://open.feishu.cn/open-apis";
const DEFAULT_VOICE  = "EXAVITQu4vr4xnSDxMaL";
const DELAY_MS       = 1500; // 两条间隔，避免 Google Translate 限速

// ── Token 缓存（模块级，请求间复用）────────────────────────────────
let _token       = "";
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const res  = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id:     process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });
  const d = await res.json() as { code: number; msg: string; tenant_access_token: string; expire: number };
  if (d.code !== 0) throw new Error(`Token 获取失败: ${d.msg}`);
  _token       = d.tenant_access_token;
  _tokenExpiry = Date.now() + (d.expire - 120) * 1000;
  return _token;
}

// ── 读取所有记录 ───────────────────────────────────────────────────
interface FeishuRecord {
  record_id: string;
  fields: { 中文脚本?: string; 英文脚本?: string; 音频?: unknown };
}

async function getAllRecords(appToken: string, tableId: string): Promise<FeishuRecord[]> {
  const token = await getToken();
  const all: FeishuRecord[] = [];
  let pageToken = "";
  while (true) {
    const url = new URL(`${FEISHU_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    url.searchParams.set("page_size", "100");
    if (pageToken) url.searchParams.set("page_token", pageToken);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const d   = await res.json() as { code: number; msg: string; data: { items: FeishuRecord[]; has_more: boolean; page_token: string } };
    if (d.code !== 0) throw new Error(`读取记录失败: ${d.msg}`);
    all.push(...d.data.items);
    if (!d.data.has_more) break;
    pageToken = d.data.page_token;
  }
  return all;
}

// ── 上传音频附件 ───────────────────────────────────────────────────
async function uploadAudio(appToken: string, buffer: ArrayBuffer, fileName: string): Promise<string> {
  const token = await getToken();
  const bytes = Buffer.from(buffer);
  const form  = new FormData();
  form.append("file_name",   fileName);
  form.append("parent_type", "bitable_file");
  form.append("parent_node", appToken);
  form.append("size",        String(bytes.length));
  form.append("file", new Blob([bytes], { type: "audio/mpeg" }), fileName);
  const res = await fetch(`${FEISHU_BASE}/drive/v1/medias/upload_all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const d = await res.json() as { code: number; msg: string; data?: { file_token: string } };
  if (d.code !== 0) throw new Error(`上传失败 (${d.code}): ${d.msg}`);
  return d.data!.file_token;
}

// ── 写回记录 ───────────────────────────────────────────────────────
async function updateRecord(
  appToken: string, tableId: string,
  recordId: string, englishText: string,
  fileToken: string, fileName: string,
): Promise<void> {
  const token = await getToken();
  const res   = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method:  "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        fields: {
          英文脚本: englishText,
          音频:    [{ file_token: fileToken, name: fileName }],
        },
      }),
    }
  );
  const d = await res.json() as { code: number; msg: string };
  if (d.code !== 0) throw new Error(`写回失败 (${d.code}): ${d.msg}`);
}

// ── SSE 流式接口 ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { appToken, tableId } = await req.json() as { appToken: string; tableId: string };

  if (!appToken || !tableId) {
    return NextResponse.json({ error: "缺少 appToken 或 tableId" }, { status: 400 });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (data: object) =>
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // 1. 读取记录
        send({ type: "status", message: "正在读取飞书表格…" });
        const all       = await getAllRecords(appToken, tableId);
        const pending   = all.filter(r => r.fields["中文脚本"]?.trim() && !r.fields["英文脚本"]?.trim());
        const skipped   = all.length - pending.length;
        send({ type: "info", total: pending.length, skipped, all: all.length });

        if (pending.length === 0) {
          send({ type: "complete", success: 0, failed: 0 });
          ctrl.close();
          return;
        }

        let success = 0, failed = 0;

        // 2. 逐条处理
        for (let i = 0; i < pending.length; i++) {
          const rec    = pending[i];
          const cnText = rec.fields["中文脚本"]!.trim();
          const base   = { type: "progress", index: i, total: pending.length, recordId: rec.record_id, preview: cnText.slice(0, 24) };

          try {
            // 翻译（含限速重试：最多 3 次，每次等待翻倍）
            send({ ...base, step: "translating" });
            let standard = "";
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                ({ text: standard } = await translate(cnText, { from: "zh-CN", to: "en" }));
                break;
              } catch (e) {
                const msg = e instanceof Error ? e.message : "";
                if (attempt < 3 && (msg.includes("429") || msg.toLowerCase().includes("too many"))) {
                  await new Promise(r => setTimeout(r, attempt * 3000)); // 3s / 6s
                } else {
                  throw e;
                }
              }
            }
            const shortVideo = shortVideoOptimize(standard);

            // TTS
            send({ ...base, step: "tts" });
            const audioBuffer = await generateSpeech({
              text: shortVideo, voiceId: DEFAULT_VOICE,
              voiceSettings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, speed: 1.0 },
            });

            // 上传
            send({ ...base, step: "uploading" });
            const fileName  = `${String(i + 1).padStart(3, "0")}-${rec.record_id}.mp3`;
            const fileToken = await uploadAudio(appToken, audioBuffer, fileName);

            // 写回
            send({ ...base, step: "saving" });
            await updateRecord(appToken, tableId, rec.record_id, shortVideo, fileToken, fileName);

            send({ ...base, step: "done" });
            success++;
          } catch (err) {
            send({ ...base, step: "error", error: err instanceof Error ? err.message : String(err) });
            failed++;
          }

          if (i < pending.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
        }

        send({ type: "complete", success, failed });
      } catch (err) {
        send({ type: "fatal", error: err instanceof Error ? err.message : String(err) });
      } finally {
        ctrl.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type":     "text/event-stream",
      "Cache-Control":    "no-cache",
      "X-Accel-Buffering":"no",
    },
  });
}
