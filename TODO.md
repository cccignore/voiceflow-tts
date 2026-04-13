# 开发任务清单

> 完成一个模块后在【】中打 ✓，即【✓】
> 详细方案见 [PLAN.md](./PLAN.md)

---

## 【✓】模块一：项目初始化

- [x] 手动初始化 Next.js 16 项目（TypeScript + Tailwind + App Router）
- [x] 安装核心依赖：`nanoid`、`jszip`、`next-themes`、`sonner`、`lucide-react`、`clsx`、`tailwind-merge`
- [x] 初始化 shadcn/ui，安装组件：button、textarea、badge、tabs、sheet、progress、skeleton、select
- [x] 创建 `.env.local`（`ELEVENLABS_API_KEY` 已填入）
- [x] 创建 `.env.example` 模板
- [x] 搭建完整目录结构（app/、components/layout|features|ui/、hooks/、lib/、types/、constants/）
- [x] 配置 `next.config.ts`、`tailwind.config.ts`、`tsconfig.json`、`postcss.config.mjs`
- [x] 创建 `types/index.ts`、`constants/voices.ts`、`lib/utils.ts`
- [x] 验证：`npm run build` 零错误编译通过，`npm run dev` 正常启动

---

## 【✓】模块二：翻译 API Route（使用 `@vitalets/google-translate-api` ✅ 已安装）

> 无需 API Key，直接在 API Route 中调用。
> 短视频优化版通过规则后处理实现（分句 + 控制长度）。

- [x] 创建 `app/api/translate/route.ts`
- [x] 接入 `@vitalets/google-translate-api`，调用 `translate(text, { from: 'zh-CN', to: 'en' })`
- [x] 实现 `lib/translate.ts` — `shortVideoOptimize()` 函数（缩写展开 + 断句 + 首词大写）
- [x] 同时返回 `standard` 和 `shortVideo` 两个字段
- [x] 添加输入校验（空文本 → 400，超 1000 字符 → 400）
- [x] 添加错误处理（429 限速、500 服务异常，返回中文友好提示）
- [x] `curl` 验证：正常翻译 ✓、空输入拦截 ✓、超长输入拦截 ✓

---

## 【✓】模块三：语音合成 API Route

- [x] 创建 `app/api/tts/route.ts`
- [x] 创建 `lib/elevenlabs.ts` 封装 API 调用逻辑
- [x] 接入 ElevenLabs REST API（`/v1/text-to-speech/{voice_id}`）
- [x] 配置模型（`eleven_turbo_v2_5`）和声音参数（stability 0.5、similarity_boost 0.75、style 0.3）
- [x] 返回 `audio/mpeg` ArrayBuffer，前端直接接收为可播放 Blob
- [x] voiceId 校验（白名单验证，非法值自动回退默认声音）
- [x] 错误处理：异常活动 402、无效 Key 401、限速 429、额度耗尽 402，全部返回中文友好提示
- [x] curl 验证：空文本拦截 ✓、无效 voiceId 回退 ✓、账号异常正确识别 ✓
- [ ] ⚠️ 账号问题待解决：ElevenLabs 免费账号被标记异常活动（VPN/代理触发），关闭 VPN 或升级付费后即可正常使用

---

## 【✓】模块四：全局布局与导航

- [x] 配置 `next-themes` Provider（dark 默认，无闪烁）
- [x] 实现 `components/layout/Header.tsx`：动态波形 Logo · 滚动阴影 · 历史按钮 · 主题切换（Sun/Moon 旋转动画）
- [x] 实现 `components/layout/ModeToggle.tsx`：渐变滑动 Tab（单条/批量）
- [x] 创建 `contexts/mode-context.tsx` 全局模式状态管理
- [x] 更新 `app/layout.tsx`：Syne + DM Sans 字体 · ModeProvider · Toaster
- [x] 更新 `app/globals.css`：完整设计系统（CSS 变量 · 微点阵背景 · 动画关键帧 · glass 工具类）
- [x] 更新 `tailwind.config.ts`：注册 font-syne · font-dm · custom shadows
- [x] 实现 `app/page.tsx`：Hero 标题 · ModeToggle · 内容占位区（模块五接管）
- [x] 验证：`npm run build` 零错误 ✓

---

## 【✓】模块五：单条模式核心 UI

- [x] `ChineseInput.tsx`：自适应高度 textarea · 实时字数统计（渐变警戒色）· 填入示例按钮 · ⌘+Enter 快捷键
- [x] `TranslationOutput.tsx`：标准翻译 + 短视频优化版双块 · Copy 按钮 checkmark 动画 · stagger 入场
- [x] `hooks/useTranslate.ts`：状态机（idle → translating → done/error）· 错误重试
- [x] `SingleMode.tsx`：StyleToggle · VoiceSelect · SubmitButton（shimmer hover 效果）· 错误 banner + 重试
- [x] 更新 `app/page.tsx`：Hero 标题 + ModeToggle + SingleMode 正式接入
- [x] 验证：`npm run build` 零错误 · 页面 200 · 翻译 API 双版本返回正常 ✓

---

## 【✓】模块六：音频播放器

- [x] `hooks/useTTS.ts`：调用 `/api/tts` → ArrayBuffer → base64 data URL · 状态机（idle/generating/done/error）
- [x] `AudioPlayer.tsx`：自定义播放器（不用原生 `<audio>`）· Pointer Events 拖拽进度条 + RAF 平滑更新 · 播放中琥珀脉冲按钮 + 动态波形条 · 时间显示 · 下载 MP3（含时间戳）
- [x] `AudioPlayerSkeleton`：生成中骨架占位动画
- [x] 更新 `SingleMode.tsx`：两阶段流程（翻译 → TTS）· 按钮分阶段提示文字 · TTS 失败时降级（保留翻译结果）· `onComplete` 回调供模块七使用
- [x] 验证：`npm run build` 零错误 ✓

---

## 【✓】模块七：历史记录功能

- [x] `lib/storage.ts`：localStorage CRUD · 容量保护（最多 30 条 / 4MB 上限 · QuotaExceeded 自动降级）
- [x] `hooks/useHistory.ts`：客户端 state + 增/删/清空，mount 时从 localStorage 恢复
- [x] `components/features/HistoryItemCard.tsx`：时间格式化（今天/昨天/日期）· MiniPlayer（独立 Audio 实例）· MiniCopy · 展开/收起双版本翻译 · 删除二次确认 Toast
- [x] `components/features/HistoryPanel.tsx`：shadcn Sheet 右侧抽屉 · 数量展示 · 清空全部二次确认 · 空态插画 · 底部容量提示
- [x] `components/layout/Header.tsx`：历史按钮右上角数量角标（>0 时显示琥珀徽章）
- [x] `app/page.tsx`：`onComplete` 回调自动保存 · 历史数量传给 Header
- [x] 验证：`npm run build` 零错误 ✓ · 刷新页面历史仍存在 · 历史音频可播放

---

## 【✓】模块八：批量模式

- [x] 实现 `components/features/BatchItemCard.tsx`（单条批量文案卡片）
  - [x] 文本输入框（最多 500 字符，实时计数）
  - [x] 状态标签：待处理 / 处理中 / 完成 / 失败（彩色角标 + 边框光晕）
  - [x] 完成后显示：MiniPlay 播放、下载按钮、翻译预览
  - [x] 删除本条按钮
- [x] 实现 `components/features/BatchMode.tsx`
  - [x] 动态添加/删除文案输入框（最多 10 条）
  - [x] 「开始批量处理」按钮（顺序处理每条，更新各自状态）
  - [x] 「打包下载全部」按钮（JSZip 动态导入，打包所有 MP3 为 .zip）
  - [x] 「清空全部」按钮
  - [x] StyleToggle + VoiceSelect 全局配置
  - [x] 底部统计栏（共 N 条 · 已填写 N 条 · N 条完成）
- [x] 接入 `app/page.tsx`，替换占位符
- [x] 验证：`npm run build` 零错误 ✓

---

## 【✓】模块九：细节打磨与错误处理

- [x] 所有 loading 状态添加 Skeleton 动画（TranslationSkeleton 翻译中、AudioPlayerSkeleton 生成中）
- [x] 空输入提交时输入框抖动动画（animate-shake）+ 红色边框 + 提示文字 + toast.error
- [x] Cmd/Ctrl+Enter 在空输入时也触发 shake（父组件统一处理）
- [x] API 失败统一 Toast 错误提示 + 内联重试按钮（错误 banner）
- [x] 翻译成功但语音生成失败：保留翻译结果 + 降级提示（模块六已实现）
- [x] 移动端响应式：max-w-3xl + px-4/sm:px-6 + flex-wrap + sm:flex-row（全覆盖）
- [x] 暗色模式：CSS 变量体系覆盖所有组件，dark class 切换无遗漏
- [x] `waveBar` 关键帧迁移到 globals.css（去掉 AudioPlayer 内联 style 标签）
- [x] 验证：`npm run build` 零错误 ✓

---

## 【】模块十：部署上线

- [ ] 检查 `.env.local` 未提交到 git（`.gitignore` 包含）
- [ ] 执行 `npm run build` 确认无编译错误
- [ ] 部署到 Vercel（`vercel --prod`）
- [ ] 在 Vercel Dashboard 配置环境变量（`ANTHROPIC_API_KEY`、`ELEVENLABS_API_KEY`）
- [ ] 验证线上环境完整功能流程（翻译 → 语音 → 历史 → 批量）
- [ ] 获取部署链接，准备提交

---

## 进度概览

| 模块 | 状态 |
|------|------|
| 模块一：项目初始化 | ✅ 完成 |
| 模块二：翻译 API Route | ✅ 完成 |
| 模块三：语音合成 API Route | ✅ 完成（账号异常待解决） |
| 模块四：全局布局与导航 | ✅ 完成 |
| 模块五：单条模式核心 UI | ✅ 完成 |
| 模块六：音频播放器 | ✅ 完成 |
| 模块七：历史记录功能 | ✅ 完成 |
| 模块八：批量模式 | ✅ 完成 |
| 模块九：细节打磨与错误处理 | ✅ 完成 |
| 模块十：部署上线 | 未开始 |
