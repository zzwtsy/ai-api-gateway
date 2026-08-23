---
status: active
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 官方工具链初始化基线

项目遵循 **Official-tool-first**：框架或工具已经提供初始化器、Registry 或生成器时，先由官方工具建立基线，项目只维护业务增量和可机械验证的边界。

## 固定版本与选择

| 能力 | 固定版本 | 当前选择 |
| --- | --- | --- |
| Node.js | 24.x | 生产和 CI 运行时 |
| pnpm | 11.22.0 | Monorepo 包管理器 |
| TypeScript | 6.0.3 | 全仓库唯一版本 |
| shadcn CLI | 4.19.0 | Vite、Base UI、Nova、Neutral、Lucide |
| Base UI | 1.7.0 | shadcn Primitive Base |
| `@antfu/eslint-config` | 9.3.0 | React、JSX a11y、TypeScript、Flat Config |
| Tailwind CSS | 4.3.3 | CSS-first 配置 |
| `tailwind-merge` | 3.6.0 | Tailwind 4.0–4.3 兼容线 |
| TanStack Router | 1.170.18 | 文件路由；`routeTree.gen.ts` 生成 |
| `@tanstack/router-plugin` | 1.168.23 | Vite Route Generator + Automatic Code Splitting |
| openapi-typescript | 7.13.0 | OpenAPI → TypeScript 类型生成 |
| openapi-fetch | 0.17.0 | 原生 Fetch 风格类型安全传输 |
| openapi-react-query | 0.5.4 | OpenAPI-aware TanStack Query Adapter |

机器可读来源是 [`.toolchain/baseline.json`](../../.toolchain/baseline.json)。

## shadcn 官方流程

干净参考工程使用：

```bash
pnpm dlx shadcn@4.19.0 init \
  --name aigw-web-baseline \
  --template vite \
  --preset base-nova
```

现有 `apps/web` 应使用官方 Preset Apply 和 Registry Add，而不是手工伪造组件：

```bash
pnpm exec shadcn apply --cwd apps/web --preset base-nova

pnpm exec shadcn add --cwd apps/web \
  badge button card empty field input label select separator skeleton spinner table

pnpm ui:info
```

更新现有组件前先运行：

```bash
pnpm exec shadcn add button --cwd apps/web --dry-run
pnpm exec shadcn add button --cwd apps/web --diff button.tsx
```

禁止从网页或 GitHub 手工复制一份“看起来像 shadcn”的组件替代 Registry 流程。`apps/web/src/components/ui/` 是 Registry-owned 目录，除了 `.toolchain/baseline.json` 登记的 `<component>.tsx` 之外不得出现测试、业务组件、Wrapper、Hook、Helper 或手写新组件；这些代码分别进入 `src/test/shadcn`、`components/product|layout` 或 Feature。项目允许对已安装组件做最小本地补丁，但每个补丁必须登记在 `.toolchain/baseline.json`。基线同时保存已评审组件的 SHA-256；组件源码改变而未更新评审记录时，静态 Gate 直接失败。

## Antfu ESLint 官方流程

初始 Wizard 命令：

```bash
pnpm dlx @antfu/eslint-config@9.3.0
```

Wizard 负责 Flat Config 基线；仓库在其上增量叠加：

- Gateway Control/Data/Core/DB 依赖边界；
- Control Plane Feature 隔离；
- Web Feature 隔离；
- 复杂度和文件长度棘轮；
- shadcn Registry 源码的窄范围例外。

不得重新维护 `@eslint/js + typescript-eslint + globals` 的平行手写基线。

## TanStack Router 文件路由基线

Web 路由由 `@tanstack/router-plugin/vite` 扫描 `src/routes/`，生成 `src/routeTree.gen.ts`。插件必须位于 React Vite Plugin 之前，并启用 `autoCodeSplitting`。Route 文件只负责 URL/Search/Loader/Layout 与 Feature 装配；`routes/-*` 用于需要被 Router 忽略的 Route-owned 支撑组件。`routeTree.gen.ts` 必须提交以支持无依赖源码审查，但永远不得手工编辑。

## 控制面请求基线

固定链路是 `openapi-typescript → openapi-fetch → openapi-react-query → TanStack Query`。OpenAPI 只生成类型，不再生成第二套运行时 SDK；`openapi-fetch` 负责类型安全 Fetch，`openapi-react-query` 复用 TanStack Query API 并由 method/path/params 派生 Query Key。这样不会与 Alova 等自带缓存/请求状态的请求层形成双重 server-state owner。

## 当前 Alpha 3 构建说明

`0.1.0-alpha.3` 的源码基线依据固定的官方 shadcn Registry Commit 和 Antfu 配置接口重建。构建环境无法访问 npm Registry，因此没有虚报已经执行官方 CLI、安装依赖或生成锁文件。进入有网络的 Node 24 环境后必须完成：

```bash
corepack enable
pnpm install
pnpm ui:info
pnpm verify:toolchain-official
pnpm api:generate
pnpm check:web
```

只有 `shadcn info`、安装版本探针、正式 OpenAPI Client 和完整 Web Gate 全绿后，初始化才视为完全激活。

## 防漂移 Gate

```bash
pnpm verify:toolchain-baseline
pnpm verify:toolchain-official
```

静态 Gate 检查提交源码；官方探针在安装依赖后调用真实 shadcn CLI，并核对 Base、Style、Tailwind 和固定工具版本。
