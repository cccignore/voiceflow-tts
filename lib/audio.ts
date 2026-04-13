/** ArrayBuffer（来自 fetch response）→ data:audio/mpeg;base64,…
 *  用 32 KB 分块处理，避免大音频在主线程上长时间阻塞
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32 KB
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
}

/** 触发浏览器下载一个 base64 音频文件 */
export function downloadAudio(base64: string, filename: string) {
  const a = document.createElement("a");
  a.href = base64;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
