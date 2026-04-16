# Vercel + 阿里云域名解析部署说明

本文按当前项目 `voiceflow` 的实际情况编写。

## 先确认项目部署信息

- 框架：`Next.js 16`
- 部署方式：`Vercel`
- 构建命令：`npm run build`
- 运行环境：Node.js 服务端
- 必配环境变量：`ELEVENLABS_API_KEY`
- 翻译能力：当前使用 `@vitalets/google-translate-api`，不需要单独配置翻译 API Key

## 推荐域名方案

优先推荐先接一个子域名，例如：

- `voice.liucu.cn`
- `tts.liucu.cn`

这样风险更低，也不会影响你主域名的其他用途。

如果你想直接用根域名 `liucu.cn` 也可以，但通常建议同时加上 `www.liucu.cn`，并在 Vercel 里做跳转统一。

## 一、把项目部署到 Vercel

### 1. 推送代码到 GitHub

这一步你已经有仓库了，当前代码也已经推送。

### 2. 在 Vercel 导入项目

1. 打开 `https://vercel.com/new`
2. 选择你的 GitHub 仓库 `cccignore/voiceflow-tts`
3. 点击 `Import`

### 3. 配置项目基本信息

通常保持默认即可：

- Framework Preset：`Next.js`
- Root Directory：项目根目录
- Build Command：`npm run build`
- Output Directory：留空，使用 Next.js 默认值
- Install Command：默认即可，一般是 `npm install`

### 4. 配置环境变量

在 Vercel 项目创建页，或项目创建后进入：

- `Project Settings`
- `Environment Variables`

新增：

- Key：`ELEVENLABS_API_KEY`
- Value：你的 ElevenLabs key

环境建议勾选：

- `Production`
- `Preview`
- `Development`

### 5. 点击 Deploy

部署成功后，你会先拿到一个 Vercel 地址，类似：

- `voiceflow-tts-xxxx.vercel.app`

先用这个地址测试：

- 页面能打开
- 输入中文后可以正常翻译
- 可以生成音频

## 二、在 Vercel 绑定你的域名

### 方案 A：推荐先绑定子域名

假设你要绑定：

- `voice.liucu.cn`

操作：

1. 打开 Vercel 项目
2. 进入 `Settings`
3. 进入 `Domains`
4. 点击 `Add Domain`
5. 输入 `voice.liucu.cn`
6. 保存

这时 Vercel 会提示你添加一条 DNS 记录。对于子域名，通常是：

- 类型：`CNAME`
- 主机记录：`voice`
- 记录值：Vercel 给出的目标值

很多时候会是类似下面这样的值：

- `cname.vercel-dns.com`
- 或某个项目专属的 `vercel-dns-xxx.com`

以 Vercel 页面实时显示的值为准。

### 方案 B：绑定根域名

如果你要绑定：

- `liucu.cn`

Vercel 一般会要求你加一个 apex A 记录，常见为：

- 类型：`A`
- 主机记录：`@`
- 记录值：`76.76.21.21`

如果同时加 `www.liucu.cn`，则通常还要再加一条：

- 类型：`CNAME`
- 主机记录：`www`
- 记录值：Vercel 给出的 CNAME 地址

是否是这些值，以 Vercel 后台给你的域名配置提示为准。

## 三、在阿里云添加 DNS 解析

你这个域名现在在阿里云，解析也直接在阿里云做。

操作路径：

1. 登录阿里云控制台
2. 进入 `云解析 DNS`
3. 找到你的域名 `liucu.cn`
4. 点击 `解析设置`
5. 点击 `添加记录`

### 如果你绑定的是 `voice.liucu.cn`

按 Vercel 给的值填写，一般类似：

- 记录类型：`CNAME`
- 主机记录：`voice`
- 记录值：`cname.vercel-dns.com` 或 Vercel 提示的专属值
- 解析请求来源：`默认`
- TTL：默认即可

### 如果你绑定的是 `liucu.cn`

一般类似：

- 记录类型：`A`
- 主机记录：`@`
- 记录值：`76.76.21.21`
- 解析请求来源：`默认`
- TTL：默认即可

如果还要加 `www.liucu.cn`：

- 记录类型：`CNAME`
- 主机记录：`www`
- 记录值：Vercel 提示值

## 四、等待生效并回 Vercel 验证

DNS 修改后，回到 Vercel 的域名页面等待验证。

正常流程：

1. Vercel 检测到 DNS 已生效
2. 自动签发 HTTPS 证书
3. 域名状态变为可用

一般几分钟内完成，偶尔会更久。

## 五、部署后检查清单

上线后建议检查：

1. 打开你的正式域名，确认首页正常显示
2. 输入中文文案，确认翻译接口可用
3. 生成语音，确认 ElevenLabs 调用成功
4. 测试下载按钮
5. 测试历史记录功能
6. 手机浏览器打开一次，确认布局正常

## 六、这次我已经帮你确认过的内容

当前项目在部署层面有这些结论：

- 必须用支持 Node/Serverless 的平台，不能按纯静态页面部署
- 当前唯一必配环境变量是 `ELEVENLABS_API_KEY`
- 构建命令是 `npm run build`
- 本地沙箱里构建失败的原因是 `next/font/google` 拉取 Google Fonts 被网络限制，不是业务代码报错

这意味着：

- 在 Vercel 上通常可以正常构建
- 如果你未来改成国内服务器自建，可能要把 Google Fonts 换成本地字体或自托管字体，避免构建和访问受限

## 七、我现在可以替你做的事

在你本机项目里，我可以继续直接做这些：

- 检查并整理部署所需环境变量
- 补充 `README` 或单独部署文档
- 本地执行构建检查，提前找出部署风险
- 如果你提供 `Vercel Token`，我可以用 CLI 帮你把项目链接到 Vercel
- 如果你已经本机登录过 `vercel` CLI，我也可以继续执行 `vercel link`、`vercel env`、`vercel deploy`

## 八、需要你亲自完成的事

下面这些操作如果你不提供账户权限，我不能代做：

- 登录你的 Vercel 账号
- 在 Vercel Dashboard 新建项目
- 在阿里云控制台修改 DNS 解析记录
- 粘贴或确认正式的 `ELEVENLABS_API_KEY`

## 九、最省事的实际执行顺序

建议你按这个顺序走：

1. 在 Vercel 导入 GitHub 仓库
2. 填 `ELEVENLABS_API_KEY`
3. 先部署拿到 `vercel.app` 地址
4. 打开测试没问题后
5. 再绑定 `voice.liucu.cn`
6. 去阿里云加一条 `CNAME`
7. 等 Vercel 自动签证书

## 参考资料

- Vercel 自定义域名文档：https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Vercel 域名设置文档：https://vercel.com/docs/domains/set-up-custom-domain
- 阿里云添加解析记录文档：https://help.aliyun.com/zh/dns/pubz-add-parsing-record
