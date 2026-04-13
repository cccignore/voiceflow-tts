# Skills 使用指南

本项目共安装 51 个 Skills，来自 4 个来源：
- **obra/superpowers** — 开发流程方法论
- **vercel-labs/agent-skills** — 前端/React 最佳实践
- **anthropics/skills** — Anthropic 官方工具集
- **muratcankoylan/Agent-Skills-for-Context-Engineering** — 上下文工程

调用方式：对话中输入 `/skill-name`，或描述任务时由 Claude 自动匹配触发。

---

## 一、开发流程

| Skill | 触发时机 | 作用 |
|-------|---------|------|
| `using-superpowers` | 每次对话开始时 | 建立如何发现和使用 Skills 的上下文，让 Claude 更主动地调用其他 Skills |
| `brainstorming` | 任何创意/功能开发之前 | 在动手之前探索用户意图、需求和设计方向，防止方向跑偏 |
| `writing-plans` | 有需求但还没写代码时 | 把规格/需求转化为多步骤实现计划 |
| `executing-plans` | 已有实现计划，开始执行时 | 在独立 session 中按计划执行，带 review 检查点 |
| `test-driven-development` | 实现任何功能或修 bug 之前 | 先写测试再写实现，确保代码有验证保障 |
| `systematic-debugging` | 遇到 bug、测试失败或异常行为时 | 系统化定位问题，避免盲目猜测 |
| `verification-before-completion` | 声称任务完成之前 | 运行验证命令确认结果，禁止空口断言"已完成" |
| `finishing-a-development-branch` | 实现完毕、测试通过后 | 引导决策：merge / PR / 清理，给出结构化的收尾选项 |
| `requesting-code-review` | 完成功能、合并前 | 验证工作是否满足需求，提交 review 请求 |
| `receiving-code-review` | 收到 code review 反馈后 | 不盲目接受反馈，技术上严格验证再实施 |
| `using-git-worktrees` | 需要隔离开发环境时 | 创建独立的 git worktree，避免污染当前工作区 |
| `subagent-driven-development` | 当前 session 中执行多个独立任务时 | 用子智能体并发执行独立任务 |
| `dispatching-parallel-agents` | 面对 2 个以上无依赖关系的独立任务时 | 并行分发给多个 Agent 同时处理 |

---

## 二、前端 / React

| Skill | 触发时机 | 作用 |
|-------|---------|------|
| `frontend-design` | 构建 Web 组件、页面、应用时 | 生成高质量、有设计感的前端代码，避免千篇一律的 AI 审美 |
| `react-best-practices` | 写/审/重构 React 或 Next.js 代码时 | Vercel 工程团队的 40+ 条性能优化规则（waterfall、SSR、bundle 等） |
| `react-native-skills` | 构建 React Native / Expo 移动应用时 | React Native 和 Expo 最佳实践，列表性能、动画、原生模块 |
| `react-view-transitions` | 实现页面过渡、路由动画时 | 使用 React View Transition API 实现流畅的原生感动画 |
| `composition-patterns` | 重构组件或设计可复用 API 时 | React 组件组合模式：compound components、render props、context provider，避免 boolean prop 泛滥 |
| `web-design-guidelines` | Review UI 代码或做无障碍审计时 | 100+ 条 Web 界面规范检查：无障碍、断点、表单、动画、国际化 |
| `web-artifacts-builder` | 构建复杂多组件 HTML artifact 时 | 使用 React + Tailwind + shadcn/ui 构建需要状态管理、路由的复杂 artifact |
| `webapp-testing` | 测试本地 Web 应用功能时 | 用 Playwright 与浏览器交互、截图、查看 console log，验证前端行为 |
| `algorithmic-art` | 用代码生成艺术/生成式图形时 | 用 p5.js 创作算法艺术：流场、粒子系统、带参数探索的随机艺术 |
| `canvas-design` | 需要生成海报、艺术设计稿时 | 用设计哲学创作 .png/.pdf 静态视觉作品 |

---

## 三、部署

| Skill | 触发时机 | 作用 |
|-------|---------|------|
| `deploy-to-vercel` | 要部署应用到 Vercel 时 | 执行部署操作：上线、获取链接、创建预览部署 |
| `vercel-cli-with-tokens` | 用 token 鉴权操作 Vercel 时 | 通过 access token 而非交互登录使用 Vercel CLI，设置环境变量等 |

---

## 四、文档 / 文件处理

| Skill | 触发时机 | 作用 |
|-------|---------|------|
| `pdf` | 涉及 PDF 文件的任何操作 | 读取/提取/合并/拆分/旋转/加水印/OCR/加密 PDF |
| `docx` | 涉及 Word 文档时 | 创建/读取/编辑 .docx，支持目录、页码、表格、图片、修订等专业格式 |
| `pptx` | 涉及 PPT/演示文稿时 | 创建/解析/编辑 .pptx，支持模板、布局、备注、合并拆分 |
| `xlsx` | 涉及电子表格时 | 操作 .xlsx/.csv/.tsv：编辑列、公式、格式、清洗脏数据、图表 |
| `doc-coauthoring` | 要写文档、方案、技术规范时 | 引导结构化协作写作流程：上下文传递 → 内容迭代 → 读者验证 |
| `internal-comms` | 写内部沟通材料时 | 状态报告、领导汇报、事故报告、公司简报、FAQ 等内部文档模板 |

---

## 五、AI / Agent 开发

| Skill | 触发时机 | 作用 |
|-------|---------|------|
| `claude-api` | 调用 Claude API 或 Anthropic SDK 时 | 构建/调试 Claude API 应用，含 prompt caching 最佳实践 |
| `mcp-builder` | 构建 MCP Server 时 | 创建高质量 MCP 服务器（Python FastMCP / TypeScript SDK），集成外部 API |
| `skill-creator` | 创建或优化 Skill 时 | 从零创建 Skill、修改现有 Skill、跑 eval 测试触发准确率 |
| `writing-skills` | 创建/编辑/验证 Skills 时 | 确保 Skill 在部署前可正常工作 |
| `advanced-evaluation` | 构建 LLM 评估系统时 | LLM-as-Judge 生产级方案：直接打分、两两对比、消除位置偏差、评估流水线 |
| `evaluation` | 评估 Agent 性能或构建测试框架时 | 多维度评估 Agent 质量，构建质量门禁 |
| `bdi-mental-states` | 实现 BDI 认知 Agent 架构时 | 建模 Agent 心智状态（Belief-Desire-Intention），整合 RDF/本体论/神经符号 AI |
| `hosted-agents` | 构建后台/沙箱 Agent 时 | 后台 Agent、沙箱 VM 执行、多人协作 Agent、Modal 沙箱、自我派生 Agent |
| `multi-agent-patterns` | 设计多 Agent 系统时 | Supervisor 模式、Swarm 架构、Agent 交接、上下文隔离、并行执行 |
| `tool-design` | 设计 Agent 工具接口时 | 工具命名规范、描述优化、工具整合/精简，降低 Agent 选错工具的概率 |
| `project-development` | 启动 LLM 项目或设计批处理流水线时 | 评估任务-模型适配度、Agent 项目架构、成本估算、LLM vs 传统方案选型 |

---

## 六、Context Engineering（上下文工程）

| Skill | 触发时机 | 作用 |
|-------|---------|------|
| `context-fundamentals` | 理解/设计 Agent 上下文架构时 | 上下文窗口原理、注意力机制、渐进式信息披露、上下文预算规划 |
| `context-degradation` | 诊断 Agent 性能下降或上下文问题时 | 识别上下文劣化：lost-in-middle、上下文污染、注意力分散，提供缓解方案 |
| `context-compression` | 需要压缩对话历史或减少 token 时 | 长对话压缩策略：结构化摘要、tokens-per-task 优化、长时运行 Agent session 管理 |
| `context-optimization` | 优化上下文效率或降低成本时 | KV-cache 优化、上下文分区、观测遮蔽、扩展有效上下文容量 |
| `memory-systems` | 实现 Agent 跨 session 记忆时 | 对比主流记忆框架（Mem0、Zep/Graphiti、Letta、LangMem、Cognee），设计长期记忆架构 |
| `filesystem-context` | 用文件系统管理 Agent 上下文时 | 把上下文卸载到文件、动态上下文发现、Agent 草稿本、按需加载上下文 |

---

## 七、设计 / 品牌

| Skill | 触发时机 | 作用 |
|-------|---------|------|
| `brand-guidelines` | 需要应用 Anthropic 品牌风格时 | 将 Anthropic 官方配色和字体应用到任何 artifact |
| `theme-factory` | 给 artifact 应用主题时 | 10 套预设主题（颜色+字体）可应用于 slides、报告、HTML 页面，也可即时生成新主题 |
| `slack-gif-creator` | 制作 Slack 动图时 | 创建针对 Slack 优化的动态 GIF，提供约束条件、验证工具和动画概念 |

---

## 快速触发参考

```
# 开始新项目前
/using-superpowers

# 开始写代码前
/brainstorming → /writing-plans → /test-driven-development

# 遇到 bug
/systematic-debugging

# 完成功能后
/verification-before-completion → /requesting-code-review → /finishing-a-development-branch

# React 开发
/react-best-practices  /composition-patterns  /react-view-transitions

# 部署
/deploy-to-vercel

# 上下文/Agent 开发
/context-fundamentals → /context-optimization → /memory-systems
```
