import { VOICES } from "@/config/voices";
import type { VoiceSettings } from "@/types";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export interface TTSOptions {
  text:           string;
  voiceId:        string;
  voiceSettings?: Partial<VoiceSettings>;
}

export interface TTSError {
  status:  string;
  message: string;
}

/** 验证 voiceId 是否在允许列表中 */
export function isValidVoiceId(voiceId: string): boolean {
  return VOICES.some((v) => v.id === voiceId);
}

/**
 * 调用 ElevenLabs TTS API，返回 MP3 ArrayBuffer
 * 失败时 throw Error（message 已本地化为中文）
 */
export async function generateSpeech(options: TTSOptions): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ElevenLabs API Key 未配置，请检查 .env.local");
  }

  const { text, voiceId, voiceSettings } = options;
  const vs = voiceSettings ?? {};

  const res = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      method:  "POST",
      headers: {
        "xi-api-key":   apiKey,
        "Content-Type": "application/json",
        Accept:         "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability:         vs.stability         ?? 0.5,
          similarity_boost:  vs.similarity_boost  ?? 0.75,
          style:             vs.style             ?? 0.3,
          use_speaker_boost: true,
          speed:             vs.speed             ?? 1.0,
        },
      }),
    }
  );

  if (!res.ok) {
    let errBody: { detail?: TTSError } = {};
    try { errBody = await res.json(); } catch { /* non-JSON response */ }

    const status = errBody.detail?.status ?? "";
    const msg    = errBody.detail?.message ?? "";

    if (status === "detected_unusual_activity") {
      throw new Error(
        "ElevenLabs 检测到异常活动，免费额度已被暂停。请关闭 VPN/代理后重试，或升级为付费套餐。"
      );
    }
    if (res.status === 401) {
      throw new Error("ElevenLabs API Key 无效或已过期，请检查配置。");
    }
    if (res.status === 429) {
      throw new Error("ElevenLabs 请求过于频繁，请稍后重试。");
    }
    if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("credit")) {
      throw new Error("ElevenLabs 免费额度已用完，请登录官网充值后继续使用。");
    }

    throw new Error(`语音生成失败（${res.status}），请稍后重试。`);
  }

  return res.arrayBuffer();
}
