import { NextRequest, NextResponse } from "next/server";
import { generateSpeech, isValidVoiceId } from "@/lib/elevenlabs";
import { DEFAULT_VOICE_ID } from "@/constants/voices";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── 1. 解析请求体 ────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { text, voiceId: rawVoiceId } = body as {
    text?: unknown;
    voiceId?: unknown;
  };

  // ── 2. 输入校验 ──────────────────────────────────────────────
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "请提供英文文案" }, { status: 400 });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "文案内容不能为空" }, { status: 400 });
  }
  if (trimmed.length > 5000) {
    return NextResponse.json(
      { error: "文案长度不能超过 5000 个字符" },
      { status: 400 }
    );
  }

  const voiceId =
    typeof rawVoiceId === "string" && isValidVoiceId(rawVoiceId)
      ? rawVoiceId
      : DEFAULT_VOICE_ID;

  // ── 3. 调用 ElevenLabs ───────────────────────────────────────
  try {
    const audioBuffer = await generateSpeech({ text: trimmed, voiceId });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "audio/mpeg",
        "Content-Length":      String(audioBuffer.byteLength),
        "Content-Disposition": 'inline; filename="voiceflow.mp3"',
        "Cache-Control":       "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("[/api/tts] error:", err);
    const message =
      err instanceof Error ? err.message : "语音生成失败，请稍后重试";

    if (
      message.includes("异常活动") ||
      message.includes("额度已用完") ||
      message.includes("付费套餐")
    ) {
      return NextResponse.json({ error: message }, { status: 402 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
