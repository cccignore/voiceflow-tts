# VoiceFlow

中文口播文案一键生成英文翻译与英文语音的 Next.js 工具。

这个项目最初来自 AI 工程师实习笔试题，后续在原始要求基础上继续做了完整产品化增强，包括单条/批量处理、历史记录、译文编辑后重生成语音、导出 TXT/SRT、声音试听、飞书批处理等能力。当前版本更偏向一个可实际使用的轻量工作台，而不是只完成题目的 demo。

## 1. 项目定位

适用场景：

- 运营输入中文口播文案
- 系统生成英文翻译
- 根据英文结果生成英文语音
- 可用于短视频、直播投放、素材试音、批量处理等场景

核心目标：

- 尽量低门槛
- 页面直观可用
- 输出结果可直接复制、试听、下载
- 在不接入 LLM 的前提下，尽可能把体验做完整

## 2. 当前功能

### 基础能力

- 中文文案输入
- 英文翻译生成
- ElevenLabs 英文语音生成
- 音频在线播放与下载

### 单条模式增强

- `标准翻译 / 短视频优化` 双风格切换
- 声音选择
- 声音试听预览
- 声音参数预设与微调
- 结果区空态、加载态、错误态
- 译文内联编辑
- “仅重新生成语音”：编辑译文后只重新调用 TTS，不重新翻译
- 导出 `TXT / SRT`

### 批量模式增强

- 一次录入多条中文文案
- 顺序处理，避免过快触发外部服务限流
- 单条结果状态展示
- 失败项重试
- 已完成项下载

### 历史记录

- 本地持久化保存历史
- 搜索中文/英文全文
- 按声音筛选
- 收藏置顶
- 删除单条 / 清空全部
- 从历史记录克隆回单条模式继续编辑

### 辅助工具

- 飞书多维表格批量处理 API：`/app/api/feishu/stream/route.ts`
- 飞书本地批处理脚本：`/scripts/feishu/batch.ts`
- 静态飞书工具页：`/public/tools/feishu/index.html`

## 3. 标准翻译 vs 短视频优化

当前版本没有接入 LLM，因此这两种模式不是“两个独立 AI 模型”的结果。

- `标准翻译`
  说明：直接基于中文做常规英文翻译，结果更偏忠实表达。

- `短视频优化`
  说明：先得到标准英文翻译，再做规则化处理，让句子更短、更顺口、更适合 TTS 朗读和短视频节奏。

这意味着：

- 它们确实是两套输出
- 但“短视频优化”目前是规则优化，不是 LLM 驱动的深度改写
- 如果未来接入 LLM，可以把这两条链路彻底拆开，分别从中文直接生成两版英文

## 4. 技术栈

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `lucide-react`
- `@vitalets/google-translate-api`
- `ElevenLabs Text-to-Speech API`
- 本地存储：`localStorage`

## 5. 项目结构

当前仓库已经按“可维护的前端项目”做了整理，主要按职责拆分：

```text
.
├── app
│   ├── api
│   │   ├── feishu/stream/route.ts
│   │   ├── translate/route.ts
│   │   └── tts/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── features
│   │   ├── batch
│   │   ├── history
│   │   └── single
│   ├── layout
│   └── ui
├── config
│   └── voices.ts
├── contexts
├── docs
│   ├── deployment
│   ├── notes
│   └── references
├── hooks
├── lib
├── public
│   └── tools/feishu
├── scripts
│   └── feishu
├── types
├── .env.example
└── README.md
```

### 目录说明

- `app/`
  Next.js App Router 入口与 API 路由。

- `components/features/single`
  单条模式的输入、输出、播放器等业务组件。

- `components/features/batch`
  批量模式相关组件。

- `components/features/history`
  历史记录面板与卡片。

- `components/ui`
  通用基础 UI 组件。

- `config/voices.ts`
  声音枚举、默认声音、示例文案。

- `hooks/`
  翻译、TTS、历史记录等业务 hooks。

- `lib/`
  翻译、ElevenLabs、存储、音频工具等底层逻辑。

- `scripts/feishu`
  独立运行的飞书批处理脚本。

- `docs/`
  部署、开发记录、参考文档。

- `output/`
  本地批处理生成的临时音频输出目录，已加入 `.gitignore`，不会再推送到远端。

## 6. 环境变量

复制 `.env.example` 为 `.env.local`，再填入真实值：

```bash
cp .env.example .env.local
```

### 必填

- `ELEVENLABS_API_KEY`
  ElevenLabs 的 API Key，用于语音生成。

### 可选

- `FEISHU_APP_ID`
  飞书开放平台应用 ID，仅飞书批处理功能需要。

- `FEISHU_APP_SECRET`
  飞书开放平台应用密钥，仅飞书批处理功能需要。

## 7. 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

默认地址：

- [http://localhost:3000](http://localhost:3000)

### 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run feishu-batch
```

## 8. 主要页面与接口

### 页面

- `/`
  主应用页面，包含单条模式与批量模式。

- `/tools/feishu/index.html`
  飞书工具页静态入口。

### API

- `POST /api/translate`
  输入中文，返回：
  - `standard`
  - `shortVideo`

- `POST /api/tts`
  输入英文文本与声音参数，返回 MP3 音频流。

- `POST /api/feishu/stream`
  飞书批量处理的 SSE 流式接口。

## 9. 数据与状态说明

### 历史记录

- 保存在浏览器 `localStorage`
- 默认最多保留 30 条
- 同时做了体积预算控制，避免本地存储超限

### 音频

- 页面内播放使用 base64 音频
- 本地批处理导出到 `output/feishu-batch/`
- `output/` 已忽略，不会进入 Git

## 10. 相比原始笔试题，新增了什么

原始笔试题只要求：

- 输入中文文案
- 展示英文翻译
- 提供音频播放/下载

当前项目在此基础上新增了：

- 更完整的 UI 设计与亮色主题适配
- 单条模式 / 批量模式切换
- 标准翻译 / 短视频优化双风格
- 历史记录面板
- 历史搜索、筛选、收藏、克隆
- 译文编辑与仅重新生成语音
- TXT/SRT 导出
- 声音试听
- 批量失败重试
- 飞书批量处理脚本与接口
- 更规范的目录组织与部署文档

## 11. 已知限制

- 当前翻译依赖 `@vitalets/google-translate-api`，稳定性受第三方翻译服务状态影响
- “短视频优化”当前为规则优化，不是 LLM 改写
- 历史记录存本地浏览器，不支持跨设备同步
- ElevenLabs 免费额度、限频、异常活动检测都会影响 TTS 可用性

## 12. 后续可演进方向

在不背离项目主旨的前提下，比较值得继续做的方向：

- 接入 LLM，让 `标准翻译` 和 `短视频优化` 真正成为两条独立生成链路
- 为译文增加句级时间切分，生成更准确的 SRT
- 给批量模式增加 ZIP 打包下载
- 增加任务级进度统计与失败原因聚合
- 增加可选的“品牌语气模板 / 行业模板”
- 支持云端历史记录与团队协作

## 13. 部署说明

部署文档已整理到：

- [docs/deployment/VERCEL_ALIYUN.md](/Users/chenyinuo/Documents/实习相关/Project/remote笔试/docs/deployment/VERCEL_ALIYUN.md)

推荐部署方式：

- `Vercel + 自有域名解析`

原因：

- 对 Next.js 兼容最好
- 部署速度快
- 适合当前这种带服务端 API 的轻量工具

## 14. 致面试或评审者

这个仓库不是“只够交作业”的版本，而是沿着真实使用场景继续演进过的版本。相比单纯完成功能，我更关注这几点：

- 操作链路是否顺手
- 失败时是否有可理解反馈
- 批量与历史记录是否足够实用
- 目录结构和代码组织是否方便后续继续开发

如果你需要，我也可以继续补一份更偏“笔试答辩视角”的项目说明文档，把设计取舍、功能演进和技术判断单独整理出来。
