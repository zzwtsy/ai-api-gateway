---
name: record-ui-evidence
description: 在 ai-api-gateway 的 UI 或浏览器流程变化需要 Playwright 证据、截图、Trace、Video 或 GIF 演示时使用；从精确 Commit 和同一次隔离运行生成可验证证据，默认使用真实 Gateway/Web 与 Mock Provider。
---

# 记录 UI 证据

浏览器证据必须证明用户实际经过的入口。默认启动真实 Gateway 和 Web，只 Mock 外部 Provider；检查 Provider 实收、客户端结果和 Request/Attempt，而不是只截取系统自己的“成功”状态。

GIF 是可选展示格式，不是所有 UI PR 的强制要求，也不替代 Playwright 断言、Trace 或 Artifact Gate。真实 Provider Smoke 是可选证据；没有凭据的普通贡献者必须能够运行 Keyless Golden Path。

## 事实来源

- [端到端测试规则](../../../apps/e2e/AGENTS.md)
- [Playwright 配置](../../../apps/e2e/playwright.config.ts)
- [质量门禁与验证证据](../../../docs/conventions/quality-gates-and-evidence.md)
- [Web 产品 UX 约定](../../../docs/conventions/web-product-ux.md)
- [Web Agent 规则](../../../apps/web/AGENTS.md)

## 选择证据形式

| 变化 | 主证据 | 可选展示 |
| --- | --- | --- |
| 静态布局、密度、响应式 | 1280px 与 1024px 截图 + 组件/浏览器断言 | Before/After 图 |
| 表单、导航、筛选恢复 | Playwright Test + Trace | 短 Video/GIF |
| Streaming、进行中、错误恢复 | Playwright 状态断言 + Trace/Video | GIF |
| 请求详情、Attempt、诊断 | 浏览器断言 + Admin API/数据库外部核对 | Storyboard |
| 发布入口或静态资源 | Built Artifact Browser Test | 截图/Video |
| Provider 实际兼容 | 可选 Live Provider Smoke | 明确标注为 Live 的演示 |

截图只能证明一个状态；GIF/Video 只能展示过程。行为合同仍由可失败的断言证明。

## 固定证据来源

1. 录制前读取完整 Git Object ID 和真实工作树状态；录制结束后再次读取。两次身份不一致时丢弃整次临时产物，不得发布或迁移到最终目录：

```bash
git status --short --branch
git rev-parse HEAD
```

2. 针对 PR 的正式证据应来自干净工作树。若必须展示未提交修改，元数据记录完整 Commit、`dirty: true` 和未验证说明，不能把工作树内容归因于该 Commit。不得通过环境变量覆盖 Git 身份。
3. 一个 Storyboard 的所有帧来自同一个 Server、Mock Provider、存储根、浏览器 Context 和场景运行。自动化失败时丢弃该次帧，从新状态重新运行；禁止拼接不同运行。
4. 使用隔离浏览器 Context，不读取用户浏览器 Cookie、扩展、Local Storage 或已登录 Session。
5. 默认使用项目 Playwright 配置中的 Memory Storage 和 Mock Provider。只有用户明确要求且凭据可安全使用时运行 Live Provider；永不读取、打印或捕获 Secret 值。

## 运行真实入口

开发形态的聚焦场景：

```bash
pnpm --filter @aigw/e2e test -- golden-path.spec.ts
```

完整 Keyless 浏览器 Gate：

```bash
pnpm check:e2e
```

需要证明编译产物时：

```bash
pnpm build
AIGW_E2E_USE_BUILD=1 pnpm --filter @aigw/e2e test -- golden-path.spec.ts
```

PowerShell 中使用 `$env:AIGW_E2E_USE_BUILD = "1"` 设置环境变量。发布入口变化还需要：

```bash
pnpm check:artifact
```

不要用测试专用 DOM 注入、伪造系统事件或只挂载内部组件替代真实入口。外部 Provider Mock 是项目正式 Keyless 证据的一部分，不属于这种捷径。

## 设计 Storyboard

选择 3 至 6 个能够讲清一个用户故事的状态，例如：

```text
初始列表
→ 输入或选择完成
→ 请求进行中
→ 请求完成
→ Request/Attempt 详情
```

规则：

- 一个证据只证明一个明确主张；
- 所有帧使用相同 Viewport、缩放和 Crop；布局变化同时覆盖 1280px 与 1024px；
- 帧按词法命名：`00-initial.png`、`01-running.png`、`02-settled.png`；
- 在每次截图前等待唯一、可验证的 DOM 状态，不用固定延时证明完成；
- Locator 必须精确命中预期元素，能使用 `exact: true` 时不要依赖宽泛子串；
- 完成条件使用精确结果元素，不用 `body.textContent.includes(prompt)`，避免用户输入回显造成假通过；
- Tool、Retry、Fallback、错误或恢复场景必须显示稳定 Error Code、Attempt 状态或诊断详情，聊天结果本身不能证明路径；
- 截图、Trace、Video 和 GIF 不得包含完整 Key、Cookie、用户 Prompt、个人数据、真实上游响应或无关标签页。

本地证据写入 Git 忽略目录：

```text
.artifacts/ui-evidence/<full-sha>/<scenario>/
.artifacts/ui-evidence/dirty-<short-sha>/<scenario>/
├── frames/
├── trace.zip
├── video.webm
├── demo.gif
└── metadata.json
```

使用 [元数据模板](references/evidence-metadata.example.json) 记录证据来源。不存在的文件不要在元数据中伪造。

## 验证外部世界

UI 进入成功状态前后，按场景检查：

- Mock Provider 实际收到的 Header、Query 和 Body；
- 客户端实际收到的响应字节或结构；
- Admin API/数据库中的 Request 与全部 Attempt；
- 实际 RouteTarget、Credential ID、Snapshot Version、Error/Usage/Cost Observation；
- Client Cancel 是否真实终止上游；
- URL 筛选、详情和刷新后状态是否恢复；
- Shutdown 后是否没有残留 Socket、Timer 或写入任务。

只截取“成功”Toast 或表格行不构成上述证明。

## 编码 GIF

GIF 仅在需要快速展示离散交互状态时生成。要求 `python3`、`ffmpeg` 和 `ffprobe`；缺失时报告依赖，不自动安装。

```bash
python3 .agents/skills/record-ui-evidence/scripts/encode_gif.py \
  .artifacts/ui-evidence/<commit>/<scenario>/frames \
  .artifacts/ui-evidence/<commit>/<scenario>/demo.gif \
  --durations 1.5,1.5,1.5,3.5 \
  --fps 10 \
  --max-width 1200 \
  --colors 128
```

一个 Duration 可应用全部帧；否则必须每帧一个正数。最终已完成状态保持最长。文件过大时先减小宽度，再减少颜色或 FPS，不能让中文文字不可读。

## 验证最终证据

1. 读取编码器 JSON Summary，核对源帧、编码帧、尺寸、时长和字节数；
2. 查看最终 GIF/Video/Trace，而不只看源截图；
3. 确认最终帧停留足够、顺序正确、没有 Secret 或个人数据；
4. 运行 `git status --short`，确认产物只在 `.artifacts/` 或 Playwright 忽略目录；
5. 确认 `metadata.json` 记录完整 Commit、真实 Dirty 状态、运行形态、Provider 类型、Viewport、命令和验证主张；Clean 证据的 `unverified` 必须为空，Dirty 证据必须说明未验证范围；
6. 确认录制前后 Git 身份一致；PR Head 在录制后变化时，旧证据不再证明新 Head，重新判断并按需录制。

## 发布与 PR

除非用户或仓库政策明确要求，不自动上传或修改远端。不要把 GIF、Video、Trace 提交到会合并进长期分支的普通代码历史。附加证据时，在 PR 中同时说明：

```text
Commit
clean/dirty
开发或编译产物
Mock 或 Live Provider
场景和 Viewport
测试/Trace/截图/Video/GIF 路径
证据能证明什么
证据不能证明什么
```

Live Provider 演示必须明确标记，且不能把 Credential、Prompt 或响应原文暴露在附件中。

本 Skill 参考 DeepSeek Harness `record-browser-gif` 的同一运行证据链、DOM 状态等待和最终编码验证，并按本项目的 Keyless Mock Provider 策略重写；许可见 [Third-Party Notices](../THIRD_PARTY_NOTICES.md)。
