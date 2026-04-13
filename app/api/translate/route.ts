import { NextRequest, NextResponse } from "next/server";
import { translate } from "@vitalets/google-translate-api";
import { shortVideoOptimize } from "@/lib/translate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── 1. 解析并校验请求体 ──────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { text } = body as { text?: unknown };

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "请输入中文文案" }, { status: 400 });
  }

  const trimmed = text.trim();

  if (!trimmed) {
    return NextResponse.json({ error: "文案内容不能为空" }, { status: 400 });
  }

  if (trimmed.length > 1000) {
    return NextResponse.json(
      { error: "文案长度不能超过 1000 个字符" },
      { status: 400 }
    );
  }

  // ── 2. 调用 Google Translate ─────────────────────────────────
  try {
    const { text: standard } = await translate(trimmed, {
      from: "zh-CN",
      to: "en",
    });

    const shortVideo = shortVideoOptimize(standard);

    return NextResponse.json({ standard, shortVideo });
  } catch (err: unknown) {
    console.error("[/api/translate] error:", err);

    // 限速或网络错误
    const message =
      err instanceof Error ? err.message : String(err);

    if (message.includes("429") || message.toLowerCase().includes("too many")) {
      return NextResponse.json(
        { error: "翻译请求过于频繁，请稍等几秒后重试" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "翻译服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
