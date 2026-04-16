/**
 * VoiceFlow · 飞书批量处理脚本
 *
 * 功能：读取飞书多维表格中的「中文脚本」，逐条翻译成英文、生成 TTS 语音，
 *       再将翻译结果写回「英文脚本」字段、音频上传至「音频」附件字段。
 *
 * 运行：npm run feishu-batch
 * 特性：跳过已有英文脚本的行（支持断点续跑）；本地备份 MP3 到 output/feishu-batch/
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { translate } from "@vitalets/google-translate-api";
import { shortVideoOptimize } from "../../lib/translate.js";
import { generateSpeech } from "../../lib/elevenlabs.js";

// ── 加载 .env.local ──────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

// ── 配置 ─────────────────────────────────────────────────────────────────────
const FEISHU_BASE     = "https://open.feishu.cn/open-apis";
const APP_TOKEN       = "QGQDbefy9aiEPCs6AOIcQ4xlnob";
const TABLE_ID        = "tblHVq8jt59t56wE";
const DEFAULT_VOICE   = "EXAVITQu4vr4xnSDxMaL"; // Sarah · 女声 · 自然清晰
const OUTPUT_DIR      = path.join(__dirname, "../../output/feishu-batch");
const RECORD_DELAY_MS = 600; // 两条记录之间的间隔，避免 API 限速

// ── Token 缓存 ────────────────────────────────────────────────────────────────
let _token       = "";
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const res  = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id:     process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });
  const data = (await res.json()) as { tenant_access_token: string; expire: number; code: number; msg: string };
  if (data.code !== 0) throw new Error(`获取 Token 失败: ${data.msg}`);

  _token       = data.tenant_access_token;
  _tokenExpiry = Date.now() + (data.expire - 120) * 1000; // 提前 2 分钟刷新
  return _token;
}

// ── 类型 ─────────────────────────────────────────────────────────────────────
interface FeishuRecord {
  record_id: string;
  fields: {
    中文脚本?: string;
    英文脚本?: string;
    音频?: unknown;
  };
}

// ── 读取所有记录（自动分页）────────────────────────────────────────────────────
async function getAllRecords(): Promise<FeishuRecord[]> {
  const token = await getToken();
  const all: FeishuRecord[] = [];
  let pageToken = "";

  while (true) {
    const url = new URL(`${FEISHU_BASE}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`);
    url.searchParams.set("page_size", "100");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const res  = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json()) as {
      code: number; msg: string;
      data: { items: FeishuRecord[]; has_more: boolean; page_token: string };
    };
    if (data.code !== 0) throw new Error(`读取记录失败: ${data.msg}`);

    all.push(...data.data.items);
    if (!data.data.has_more) break;
    pageToken = data.data.page_token;
  }
  return all;
}

// ── 上传音频到飞书云端（附件字段）────────────────────────────────────────────
async function uploadAudio(buffer: ArrayBuffer, fileName: string): Promise<string> {
  const token = await getToken();
  const bytes = Buffer.from(buffer);

  const formData = new FormData();
  formData.append("file_name",   fileName);
  formData.append("parent_type", "bitable_file");
  formData.append("parent_node", APP_TOKEN);
  formData.append("size",        String(bytes.length));
  formData.append("file", new Blob([bytes], { type: "audio/mpeg" }), fileName);

  const res  = await fetch(`${FEISHU_BASE}/drive/v1/medias/upload_all`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
    body:    formData,
  });
  const data = (await res.json()) as { code: number; msg: string; data?: { file_token: string } };
  if (data.code !== 0) throw new Error(`上传音频失败 (${data.code}): ${data.msg}`);
  return data.data!.file_token;
}

// ── 写回飞书记录 ──────────────────────────────────────────────────────────────
async function updateRecord(
  recordId:    string,
  englishText: string,
  fileToken:   string,
  fileName:    string,
): Promise<void> {
  const token = await getToken();
  const res   = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
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
  const data = (await res.json()) as { code: number; msg: string };
  if (data.code !== 0) throw new Error(`写回记录失败 (${data.code}): ${data.msg}`);
}

// ── 工具 ─────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function log(msg: string) { process.stdout.write(msg); }
function logln(msg = "")  { console.log(msg); }

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  // ── 环境变量校验 ───────────────────────────────────────
  const required = ["FEISHU_APP_ID", "FEISHU_APP_SECRET", "ELEVENLABS_API_KEY"] as const;
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌  缺少环境变量 ${key}，请检查 .env.local`);
      process.exit(1);
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  logln("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  logln("  VoiceFlow · 飞书批量翻译 + 语音生成脚本");
  logln("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── 读取记录 ───────────────────────────────────────────
  log("🔍  读取飞书表格...");
  const allRecords  = await getAllRecords();
  const toProcess   = allRecords.filter(
    (r) => r.fields["中文脚本"]?.trim() && !r.fields["英文脚本"]?.trim()
  );
  const alreadyDone = allRecords.length - toProcess.length;
  logln(" ✓");
  logln(`📋  共 ${allRecords.length} 条 · 待处理 ${toProcess.length} 条 · 已跳过 ${alreadyDone} 条\n`);

  if (toProcess.length === 0) {
    logln("✅  全部记录已处理，无需操作。");
    return;
  }

  let success = 0;
  let failed  = 0;
  const errors: string[] = [];

  // ── 逐条处理 ───────────────────────────────────────────
  for (let i = 0; i < toProcess.length; i++) {
    const rec     = toProcess[i];
    const cnText  = rec.fields["中文脚本"]!.trim();
    const tag     = `[${String(i + 1).padStart(2)}/${toProcess.length}]`;
    const preview = cnText.slice(0, 24) + (cnText.length > 24 ? "…" : "");

    logln(`${tag} ${preview}`);

    try {
      // ① 翻译
      log("      ① 翻译     ");
      const { text: standard } = await translate(cnText, { from: "zh-CN", to: "en" });
      const shortVideo = shortVideoOptimize(standard);
      logln("✓");

      // ② 生成语音
      log("      ② 生成语音  ");
      const audioBuffer = await generateSpeech({
        text:    shortVideo,
        voiceId: DEFAULT_VOICE,
        voiceSettings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, speed: 1.0 },
      });
      logln("✓");

      // 本地备份
      const fileName = `${String(i + 1).padStart(3, "0")}-${rec.record_id}.mp3`;
      fs.writeFileSync(path.join(OUTPUT_DIR, fileName), Buffer.from(audioBuffer));

      // ③ 上传飞书
      log("      ③ 上传飞书  ");
      const fileToken = await uploadAudio(audioBuffer, fileName);
      logln("✓");

      // ④ 写回表格
      log("      ④ 写回表格  ");
      await updateRecord(rec.record_id, shortVideo, fileToken, fileName);
      logln("✓\n");

      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logln(`❌`);
      logln(`      错误: ${msg}\n`);
      errors.push(`[${i + 1}] ${preview} → ${msg}`);
      failed++;
    }

    if (i < toProcess.length - 1) await sleep(RECORD_DELAY_MS);
  }

  // ── 汇总 ───────────────────────────────────────────────
  logln("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  logln(`  ✅  完成！成功 ${success} 条 · 失败 ${failed} 条`);
  logln(`  📁  音频备份: output/feishu-batch/`);
  if (errors.length > 0) {
    logln("\n  ❌  失败明细：");
    errors.forEach((e) => logln(`     · ${e}`));
  }
  logln("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err);
  process.exit(1);
});
