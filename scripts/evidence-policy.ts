type Surface = "repository" | "control" | "data" | "protocol" | "database" | "web" | "e2e" | "artifact" | "docs" | "security" | "unknown";
type RiskFlag = "data-plane-hot-path" | "secret-or-auth" | "persistent-format" | "release-entry" | "durable-decision" | "toolchain-baseline";

interface EvidenceRule {
  surface: Exclude<Surface, "unknown">;
  reason: string;
  pattern: RegExp;
}

interface EvidenceMatch {
  path: string;
  surface: Exclude<Surface, "unknown">;
  reason: string;
}

const surfaceCommands: Readonly<Record<Surface, readonly string[]>> = Object.freeze({
  repository: ["pnpm check:ci:static", "pnpm check:artifact"],
  control: ["pnpm check:control"],
  data: ["pnpm check:data"],
  protocol: ["pnpm check:protocol"],
  database: ["pnpm check:db"],
  web: ["pnpm check:web"],
  e2e: ["pnpm check:e2e"],
  artifact: ["pnpm check:artifact"],
  docs: ["pnpm check:docs"],
  security: ["pnpm check:ci:static", "pnpm check:protocol"],
  unknown: ["pnpm check:all"],
});

const rules = [
  rule("repository", "仓库工具链、Gate 或依赖发生变化", /^(?:package\.json|apps\/[^/]+\/package\.json|pnpm-workspace\.yaml|tsconfig(?:\.[^/]+)?\.json|apps\/[^/]+\/tsconfig(?:\.[^/]+)?\.json|(?:commitlint|eslint)\.config\.ts|knip\.json|\.jscpd\.json|lefthook\.yml|scripts\/|\.toolchain\/|\.vscode\/|\.github\/workflows\/)/u),
  rule("control", "控制面 Route、认证或 Feature 发生变化", /^apps\/gateway\/src\/control-plane\//u),
  rule("data", "数据面运行路径发生变化", /^(?:apps\/gateway\/src\/data-plane\/|apps\/gateway\/src\/app\/adapters\/(?:memory|postgres)-request-store\.ts)/u),
  rule("protocol", "协议处理、Fixture 或协议合同发生变化", /^(?:apps\/gateway\/src\/data-plane\/protocols\/|apps\/gateway\/tests\/contract\/data-plane|fixtures\/protocols\/)/u),
  rule("database", "数据库 Schema、Migration 或持久化适配器发生变化", /^(?:apps\/gateway\/src\/db\/|apps\/gateway\/drizzle\/|apps\/gateway\/src\/app\/adapters\/postgres-|apps\/gateway\/tests\/integration\/)/u),
  rule("web", "Web 产品行为或 API 消费发生变化", /^apps\/web\//u),
  rule("web", "Web 产品页面合同或布局 Token 发生变化", /^docs\/product\/ux\/(?:page-contracts|design-tokens)\.json$/u),
  rule("e2e", "可见 Web 表面、路由或 Theme 发生变化", /^(?:apps\/web\/src\/(?:index\.css|router\.tsx|routes\/(?!.*\.(?:test|spec)\.)|components\/(?:layout|product|ui)\/(?!.*\.(?:test|spec)\.)|features\/.*(?<!\.(?:test|spec))\.tsx)|docs\/product\/ux\/(?:page-contracts|design-tokens)\.json$)/u),
  rule("e2e", "浏览器或 Mock Provider 旅程发生变化", /^apps\/e2e\//u),
  rule("artifact", "启动、生命周期、容器或构建产物发生变化", /^(?:Dockerfile|docker-compose\.yml|\.dockerignore|apps\/gateway\/src\/(?:index\.ts|app\/lifecycle\.ts|app\/shutdown-controller(?:\.test)?\.ts)|scripts\/artifact\/)/u),
  rule("docs", "规范、Decision、Agent 指令或 Skill 发生变化", /^(?:README(?:\.en)?\.md|CHANGELOG\.md|CONTRIBUTING\.md|SECURITY\.md|AGENTS\.md|CLAUDE\.md|docs\/|ai\/|\.agents\/|\.github\/(?!workflows\/))/u),
  rule("security", "Secret、认证、Credential、加密或环境变量发生变化", /^(?:\.env\.example|SECURITY\.md|apps\/gateway\/src\/(?:config\/|core\/crypto\/|core\/logging\/|control-plane\/auth\/|data-plane\/credentials\/)|docs\/conventions\/security-and-secrets\.md)/u),
];

/**
 * 选择覆盖变更路径的最小命名证据面；未知生产或配置路径保守升级为完整 Gate。
 */
export function selectEvidence(paths: readonly string[]) {
  const normalized = [...new Set(paths.map(normalizePath).filter(Boolean))].sort();
  const matches: EvidenceMatch[] = [];
  const unmatched: string[] = [];

  for (const path of normalized) {
    const pathMatches = rules.filter(current => current.pattern.test(path));
    if (pathMatches.length === 0) {
      unmatched.push(path);
      continue;
    }
    for (const current of pathMatches) {
      matches.push({ path, surface: current.surface, reason: current.reason });
    }
  }

  const surfaces: Surface[] = [...new Set(matches.map(match => match.surface))];
  if (unmatched.length > 0)
    surfaces.push("unknown");
  const commands = orderedUnique(surfaces.flatMap(surface => surfaceCommands[surface]));
  const riskFlags = determineRiskFlags(normalized);

  return {
    formatVersion: 1,
    paths: normalized,
    surfaces,
    commands,
    riskFlags,
    matches,
    unmatched,
  };
}

export function renderEvidenceSelection(selection: ReturnType<typeof selectEvidence>): string {
  const lines = [
    `变更文件：${selection.paths.length}`,
    `证据面：${selection.surfaces.length === 0 ? "无（没有变更）" : selection.surfaces.join(", ")}`,
  ];
  if (selection.riskFlags.length > 0)
    lines.push(`高风险标记：${selection.riskFlags.join(", ")}`);
  if (selection.unmatched.length > 0) {
    lines.push("未识别路径（已保守升级为 check:all）：");
    lines.push(...selection.unmatched.map(path => `  - ${path}`));
  }
  lines.push("建议命令：");
  lines.push(...(selection.commands.length === 0 ? ["  - 无"] : selection.commands.map(command => `  - ${command}`)));
  return `${lines.join("\n")}\n`;
}

function determineRiskFlags(paths: readonly string[]): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (paths.some(path => /data-plane\/(?:protocols|transport|observation|routing|credentials)\//u.test(path))) {
    flags.push("data-plane-hot-path");
  }
  if (paths.some(path => /credential|secret|auth|crypto|\.env/iu.test(path)))
    flags.push("secret-or-auth");
  if (paths.some(path => /drizzle|migration|schema\//u.test(path)))
    flags.push("persistent-format");
  if (paths.some(path => /lifecycle|Dockerfile|docker-compose|artifact/u.test(path)))
    flags.push("release-entry");
  if (paths.some(path => /docs\/decisions\//u.test(path)))
    flags.push("durable-decision");
  if (paths.some(path => /components\.json|components\/ui\/|eslint\.config|\.toolchain|tsconfig/u.test(path)))
    flags.push("toolchain-baseline");
  return flags;
}

function rule(surface: Exclude<Surface, "unknown">, reason: string, pattern: RegExp): EvidenceRule {
  return { surface, reason, pattern };
}

function orderedUnique<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const unique: T[] = [];
  for (const value of values) {
    if (seen.has(value))
      continue;
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

function normalizePath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//u, "");
}
