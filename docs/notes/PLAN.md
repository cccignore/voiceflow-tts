# 中文口播文案翻译 + 英文语音生成工具 —— 完整开发方案

> 目标：从 0 到 1 构建一个可运行、可演示、功能完善的 Web 工具，涵盖所有基础功能和全部加分项。

---

## 一、技术选型与理由

### 前端框架：Next.js 14 (App Router) + TypeScript

- **为什么 Next.js**：同时提供前端 UI 与后端 API Routes，无需额外搭建服务器；API 密钥只存在服务端，安全性有保障；天然支持 Vercel 一键部署。
- **为什么 TypeScript**：类型安全，与多个 API 交互时能显著减少运行时错误。

### 样式：Tailwind CSS + shadcn/ui

- **为什么 shadcn/ui**：组件美观、可定制、内置暗色模式支持，避免从零写 UI，节省大量时间。
- **为什么 Tailwind**：原子化 CSS，配合 shadcn 使用，快速实现精细布局。

### 翻译 API：`@vitalets/google-translate-api`（已安装 ✅）

- **方案**：非官方 Google Translate 封装库，零配置、无需 API Key、完全免费。
- **包名**：`@vitalets/google-translate-api@^9.2.1`，已安装到项目。
- **用法**：在 Next.js API Route（Node.js 环境）中直接调用，无需任何密钥。
- **限速风险**：单次/低频调用不会被限速，笔试 demo 完全够用。
- **短视频优化版**：使用规则后处理实现 —— 翻译后按标点分句，超过 15 词的句子在连词处断开，拼接为短句风格，不依赖 LLM。

### 语音合成 API：ElevenLabs API

- 题目指定，有免费额度。
- 选用 `eleven_turbo_v2_5` 模型：延迟低（<400ms），适合实时生成。
- 默认声音：`Rachel`（女声，商业感强，适合产品推广），同时提供多个声音供用户切换。

### 状态管理：React Context + useReducer

- 项目规模适中，无需 Redux。Context 管理全局历史记录与配置。

### 历史记录持久化：localStorage

- 无需数据库，零部署依赖。音频以 **base64** 格式存储（而非 Blob URL），保证跨页面刷新后仍可播放。
- 限制最多保存 **30 条**，超出自动删除最旧的，避免 localStorage 溢出（通常 5-10MB 上限）。

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────┐
│                     浏览器（Client）                  │
│  ┌─────────────────────────────────────────────────┐ │
│  │           Next.js React App (TypeScript)        │ │
│  │  - 单条模式 UI                                  │ │
│  │  - 批量模式 UI                                  │ │
│  │  - 音频播放器                                   │ │
│  │  - 历史记录面板                                  │ │
│  │  - 暗色 / 亮色模式切换                           │ │
│  └───────────────────────┬─────────────────────────┘ │
└──────────────────────────┼──────────────────────────┘
                           │ HTTP (内部 API 调用)
┌──────────────────────────┼──────────────────────────┐
│  Next.js API Routes（服务端，密钥不暴露给客户端）      │
│  ┌──────────────────────────────────────────────┐   │
│  │  POST /api/translate  →  Anthropic Claude API │   │
│  │  POST /api/tts        →  ElevenLabs API       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**安全原则**：Claude API Key 和 ElevenLabs API Key 全部存在 `.env.local`，通过 Next.js API Routes 代理请求，**前端永远看不到密钥**。

---

## 三、功能清单（基础 + 全部加分项）

### 3.1 基础功能

| 功能 | 实现方式 |
|------|----------|
| 中文文本输入框 | 支持多行，字数实时统计 |
| 翻译结果展示 | 调用 Claude API，显示英文翻译 |
| 一键复制翻译结果 | Clipboard API，复制后有 Toast 提示 |
| 音频播放 | 自定义 Audio Player（进度条、时长显示） |
| 音频下载 | 生成 `.mp3` 文件，自定义文件名（含时间戳） |

### 3.2 加分项 ①：短视频场景优化翻译

提供 **两种翻译模式**，用户可切换：

- **标准翻译**：忠实原文，完整表达。
- **短视频优化版**：
  - 每句不超过 15 个单词，适合字幕显示。
  - 使用口语化表达（缩写、强调语气词）。
  - 保留营销语气（感叹句、疑问句引导注意力）。
  - 适合 TTS 朗读节奏（标点符号引导自然停顿）。

Claude Prompt 策略（单次调用返回两个版本，用 JSON 格式解析）：

```
你是专业的短视频营销文案翻译专家。将下面的中文口播文案翻译成英文。
请同时输出两个版本，以 JSON 格式返回：

{
  "standard": "...",         // 忠实原文的完整翻译
  "shortVideo": "..."        // 短视频优化版：每句≤15词，口语化，营销感强，
                             // 适合 TTS 朗读节奏
}

中文文案：{userInput}
```

### 3.3 加分项 ②：历史记录功能

- 每次成功生成后自动保存到历史记录。
- 历史记录展示：原始中文文案前 40 字 + 生成时间。
- 每条历史记录支持：
  - **重新播放**：直接播放已保存的音频（base64）。
  - **下载音频**：重新触发下载。
  - **查看详情**：展开显示完整英文翻译。
  - **删除单条**：从历史中移除。
- 支持**清空全部**历史。
- localStorage 存储格式：
  ```typescript
  interface HistoryItem {
    id: string;           // nanoid 生成
    timestamp: number;    // Date.now()
    chineseText: string;
    standardText: string;
    shortVideoText: string;
    audioBase64: string;  // "data:audio/mpeg;base64,..."
    voiceId: string;
    duration: number;     // 音频时长（秒）
  }
  ```

### 3.4 加分项 ③：批量模式

- 界面切换到批量模式后，支持动态添加多条文案输入框（最多 10 条）。
- 批量处理策略：
  - **顺序处理**（而非并行），避免 ElevenLabs API 速率限制。
  - 每条文案独立显示处理状态：待处理 / 处理中 / 完成 / 失败。
  - 全部完成后，提供**打包下载**（JSZip 打包所有音频为 `.zip`）。
- 支持一键清空所有批量输入。

### 3.5 其他额外优化

| 功能 | 说明 |
|------|------|
| 暗色/亮色模式 | `next-themes`，记忆用户偏好 |
| 多声音选择 | Rachel / Adam / Aria / Josh，附试听说明 |
| 加载状态 | 翻译中 / 生成语音中，分阶段显示进度（Skeleton + 进度文字） |
| 错误处理 | API 失败时展示具体错误信息，支持重试 |
| 响应式布局 | 移动端友好，单列布局 |
| 键盘快捷键 | `Ctrl/Cmd + Enter` 触发翻译 + 生成 |
| 示例文本 | 一键填入 README 提供的示例文案，方便快速演示 |

---

## 四、UI 布局设计

### 单条模式（默认）

```
┌──────────────────────────────────────────────────────────────┐
│  🎙️ VoiceFlow                          [历史] [🌙 暗色模式]  │
├──────────────────────────────────────────────────────────────┤
│                 [● 单条模式]    [  批量模式  ]                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  中文口播文案                                 [填入示例]      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  还在为割草头疼吗？太阳底下忙活大半天...              │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│  0 / 500 字                                                  │
│                                                              │
│  翻译模式                          声音选择                  │
│  [● 标准翻译] [  短视频优化  ]      [Rachel (女声) ▼]        │
│                                                              │
│               [  ✨ 翻译并生成语音  ]    ← 主按钮            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  英文翻译结果                                    [📋 复制]   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Are you still struggling with lawn mowing? Spending  │ │
│  │  half a day under the scorching sun...                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  音频                                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ▶  ████████████░░░░░░░░░░  0:12 / 0:28   [⬇ 下载]   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  历史记录（3 条）                              [清空全部]    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 04-13 14:30  还在为割草头疼吗？太阳底下忙...  ▶ ⬇ 🗑  │ │
│  │ 04-13 13:15  春季护肤新品上市，限时特惠...    ▶ ⬇ 🗑  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 批量模式

```
┌──────────────────────────────────────────────────────────────┐
│  批量模式                              [+ 添加] [清空全部]   │
│                                                              │
│  文案 1  [✓ 完成]                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 还在为割草头疼吗？...                          [⬇] [🗑] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  文案 2  [⏳ 处理中...]                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 春季护肤新品上市...                                [🗑] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  文案 3  [待处理]                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 输入第三条文案...                                  [🗑] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [  开始批量处理  ]              [⬇ 打包下载全部 (.zip)]    │
└──────────────────────────────────────────────────────────────┘
```

---

## 五、项目目录结构

```
chinese-voiceflow/
├── app/
│   ├── layout.tsx                # 全局布局，主题 Provider
│   ├── page.tsx                  # 首页：模式切换、主入口
│   ├── globals.css
│   └── api/
│       ├── translate/
│       │   └── route.ts          # POST /api/translate → Claude API
│       └── tts/
│           └── route.ts          # POST /api/tts → ElevenLabs API
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # 顶部导航：标题、历史按钮、主题切换
│   │   └── ModeToggle.tsx        # 单条/批量模式切换 Tab
│   ├── features/
│   │   ├── SingleMode.tsx        # 单条模式主面板（组合以下子组件）
│   │   ├── BatchMode.tsx         # 批量模式主面板
│   │   ├── BatchItem.tsx         # 批量模式单条文案卡片
│   │   ├── ChineseInput.tsx      # 中文输入框（含字数统计、示例按钮）
│   │   ├── TranslationOutput.tsx # 英文翻译展示 + 复制按钮
│   │   ├── AudioPlayer.tsx       # 自定义音频播放器（进度条、时长、下载）
│   │   ├── HistoryPanel.tsx      # 历史记录面板（抽屉/内嵌）
│   │   └── HistoryItem.tsx       # 历史记录单条
│   └── ui/                       # shadcn/ui 组件（自动生成）
│
├── hooks/
│   ├── useTranslate.ts           # 翻译逻辑（状态机：idle/loading/success/error）
│   ├── useTTS.ts                 # 语音生成逻辑
│   └── useHistory.ts             # localStorage 历史记录 CRUD
│
├── lib/
│   ├── claude.ts                 # Claude API 调用封装
│   ├── elevenlabs.ts             # ElevenLabs API 调用封装
│   └── storage.ts                # localStorage 工具函数（含容量保护）
│
├── types/
│   └── index.ts                  # 全局类型定义
│
├── constants/
│   └── voices.ts                 # ElevenLabs 声音列表配置
│
├── .env.local                    # 本地密钥（不提交 git）
├── .env.example                  # 密钥模板（提交 git）
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 六、核心 API 设计

### 6.1 `POST /api/translate`

**请求：**
```typescript
{
  text: string;        // 中文文案
  mode: "standard" | "shortVideo";  // 翻译模式
}
```

**响应：**
```typescript
{
  standard: string;    // 标准翻译
  shortVideo: string;  // 短视频优化版
}
```

**Claude Prompt（系统提示词）：**
```
你是专业的短视频营销文案翻译专家，熟悉北美英语口播习惯。

将用户提供的中文口播文案翻译成英文，同时输出两个版本，严格以 JSON 格式返回：

{
  "standard": "完整忠实的英文翻译，保留原文结构",
  "shortVideo": "短视频优化版，要求：
    1. 每个语义单元不超过 15 个单词
    2. 使用口语化表达（Can't, Don't, It's 等缩写）
    3. 保留营销感：疑问句开头引发共鸣，强调产品核心卖点
    4. 适合 TTS 朗读节奏：逗号、句号引导自然停顿
    5. 避免中式英语，使用地道英语表达"
}

只输出 JSON，不要有其他文字。
```

### 6.2 `POST /api/tts`

**请求：**
```typescript
{
  text: string;          // 英文文案
  voiceId: string;       // ElevenLabs 声音 ID
}
```

**响应：**`audio/mpeg` 二进制流（前端用 Blob 接收，转为 base64）。

**ElevenLabs 配置：**
```typescript
{
  model_id: "eleven_turbo_v2_5",  // 最新快速模型
  voice_settings: {
    stability: 0.50,              // 表达自然感
    similarity_boost: 0.75,       // 接近原声音
    style: 0.30,                  // 有一定表现力
    use_speaker_boost: true
  }
}
```

---

## 七、关键实现细节

### 7.1 音频 Player 实现

不使用原生 `<audio>` 标签（样式不可控），而是自实现：
- `useRef` 管理 `Audio` 对象
- `requestAnimationFrame` 更新进度条
- 支持：播放/暂停、进度拖拽、音量控制（可选）、时长显示

### 7.2 历史记录容量保护

```typescript
const MAX_HISTORY = 30;
const MAX_STORAGE_BYTES = 4 * 1024 * 1024; // 4MB 安全阈值

function saveHistory(item: HistoryItem, existing: HistoryItem[]) {
  const updated = [item, ...existing].slice(0, MAX_HISTORY);
  const json = JSON.stringify(updated);
  if (json.length > MAX_STORAGE_BYTES) {
    // 丢弃最旧的直到满足容量
    return saveHistory(item, existing.slice(0, -1));
  }
  localStorage.setItem("history", json);
  return updated;
}
```

### 7.3 批量处理队列

```typescript
// 顺序处理，避免并发请求打爆 API 限额
async function processBatch(items: BatchItem[]) {
  for (const item of items) {
    setItemStatus(item.id, "processing");
    try {
      const translation = await translate(item.text);
      const audio = await generateTTS(translation.shortVideo);
      setItemResult(item.id, { translation, audio });
      setItemStatus(item.id, "done");
    } catch (e) {
      setItemStatus(item.id, "error");
    }
  }
}
```

### 7.4 状态机模型（防止 UI 状态混乱）

```typescript
type ProcessState =
  | { phase: "idle" }
  | { phase: "translating" }
  | { phase: "generating_audio" }
  | { phase: "done"; result: Result }
  | { phase: "error"; message: string };
```

### 7.5 错误处理策略

| 场景 | 处理方式 |
|------|----------|
| Claude API 超时/失败 | Toast 提示 + 重试按钮，不清空已有内容 |
| ElevenLabs 失败 | 提示翻译已成功可复制，音频生成失败可重试 |
| localStorage 超出容量 | 自动清理最旧记录，告知用户 |
| 空输入提交 | 输入框抖动动画 + 提示文字，不触发 API |
| 网络断开 | 统一错误边界（Error Boundary）优雅降级 |

---

## 八、环境变量配置

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
```

```bash
# .env.example（提交到 git 的模板）
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

---

## 九、开发实施步骤

### Phase 1：项目初始化（约 10 分钟）

1. `npx create-next-app@latest chinese-voiceflow --typescript --tailwind --app`
2. 安装依赖：
   ```bash
   npm install @anthropic-ai/sdk         # Claude SDK
   npm install shadcn@latest             # UI 组件
   npm install next-themes               # 暗色模式
   npm install nanoid                    # 唯一 ID 生成
   npm install jszip                     # 批量打包下载
   npx shadcn init                       # 初始化 shadcn
   npx shadcn add button textarea badge toast progress tabs sheet
   ```
3. 配置 `.env.local`，设置项目基础结构

### Phase 2：API Routes（约 20 分钟）

1. 实现 `/api/translate/route.ts`（Claude 调用 + JSON 解析）
2. 实现 `/api/tts/route.ts`（ElevenLabs 调用 + 二进制流返回）
3. 本地 curl 测试两个接口

### Phase 3：核心单条模式 UI（约 25 分钟）

1. `ChineseInput.tsx`：文本框、字数统计、填入示例
2. `TranslationOutput.tsx`：结果展示、复制按钮
3. `AudioPlayer.tsx`：自定义播放器 + 下载
4. `SingleMode.tsx`：组合以上，接入 `useTranslate` + `useTTS` hooks
5. 整体联调：输入 → 翻译 → 生成语音 → 播放全流程

### Phase 4：高级功能（约 25 分钟）

1. `useHistory.ts` + `HistoryPanel.tsx`：历史记录增删查
2. `BatchMode.tsx` + `BatchItem.tsx`：批量输入 + 顺序处理 + ZIP 下载
3. `ModeToggle.tsx`：单条/批量模式切换
4. Header 中集成历史面板入口（Sheet 抽屉形式）

### Phase 5：细节打磨（约 10 分钟）

1. 暗色/亮色模式完整测试
2. 移动端响应式检查
3. 键盘快捷键 `Cmd/Ctrl + Enter`
4. Loading Skeleton 动画
5. 所有错误场景人工测试

---

## 十、部署方案

推荐 **Vercel**（与 Next.js 原生集成）：

```bash
npm install -g vercel
vercel --prod
# 在 Vercel Dashboard 中配置环境变量：
# ANTHROPIC_API_KEY / ELEVENLABS_API_KEY
```

部署后得到公开访问链接，用于笔试提交。

---

## 十一、演示脚本（录屏用）

1. 打开工具，介绍界面布局。
2. **填入示例文案**（一键填入割草机器人文案）。
3. 选择「短视频优化」模式，选择 Rachel 声音。
4. 点击「翻译并生成语音」，展示加载过程。
5. 翻译结果出现后，**一键复制**演示。
6. **播放音频**，展示英文语音效果。
7. **下载音频**，展示文件命名。
8. 演示**历史记录**：刷新页面后历史仍在，点击播放历史音频。
9. 切换**批量模式**，输入 2-3 条文案，批量处理，最后打包下载 ZIP。
10. 切换**暗色模式**展示 UI 细节。

---

## 十二、风险与应对

| 风险 | 应对方案 |
|------|----------|
| ElevenLabs 免费额度不足 | 提前注册账户，确认剩余额度；音频时长控制在合理范围 |
| Claude API 响应慢 | 使用 haiku 模型（最快），添加流式输出的视觉反馈 |
| localStorage 存储上限 | 容量保护逻辑，base64 音频体积监控 |
| 跨浏览器音频格式 | ElevenLabs 返回 MP3，主流浏览器均支持 |
| API 密钥泄露 | 全部走服务端 API Routes，前端不接触密钥 |

---

*计划制定日期：2026-04-13*
