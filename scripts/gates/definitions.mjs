const MODE_NAMES = [
  "quick",
  "control",
  "data",
  "protocol",
  "db",
  "web",
  "e2e",
  "artifact",
  "docs",
  "hygiene",
  "all",
  "ci",
  "ci-static",
  "ci-core",
  "ci-protocol",
  "ci-artifact",
];

export const allowedGateModes = Object.freeze([...MODE_NAMES]);

/** @param {string} selected */
export function gatesFor(selected) {
  if (!MODE_NAMES.includes(selected)) {
    throw new Error(`expected check mode: ${MODE_NAMES.join(" | ")}`);
  }

  const staticCore = staticGates();
  const typechecks = typecheckGates();
  const core = coreGates();
  const protocol = protocolGates();
  const artifact = artifactGates();

  switch (selected) {
    case "quick":
      return combineGateSets(
        quickVerificationGates(),
        typechecks.filter(gate => gate.id !== "e2e-typecheck"),
        [pnpmScript("gateway-unit", "Gateway 单元测试", "--filter", "@aigw/gateway", "test", {
          needs: ["gateway-typecheck"],
        })],
      );
    case "control":
      return combineGateSets(
        quickVerificationGates(),
        typechecks.filter(gate => gate.id !== "e2e-typecheck"),
        core.filter(gate => ["openapi-contract", "generated-api"].includes(gate.id)),
      );
    case "data":
      return combineGateSets(
        quickVerificationGates(),
        typechecks.filter(gate => gate.id === "gateway-typecheck"),
        protocol.filter(gate => ["protocol-contract", "keyless-protocol-snapshot"].includes(gate.id)),
      );
    case "protocol":
      return combineGateSets(
        quickVerificationGates(),
        typechecks.filter(gate => gate.id === "gateway-typecheck"),
        protocol.filter(gate => gate.id !== "database-integration"),
      );
    case "db":
      return combineGateSets(
        quickVerificationGates(),
        [rootScript("migrations", "Migration 与快照", "verify:migrations")],
        typechecks.filter(gate => gate.id === "gateway-typecheck"),
        protocol.filter(gate => gate.id === "database-integration"),
      );
    case "web":
      return combineGateSets(
        quickVerificationGates(),
        [rootScript("toolchain-official", "shadcn 与 Antfu 官方安装探针", "verify:toolchain-official", { needs: ["toolchain-baseline"] })],
        typechecks.filter(gate => gate.id === "web-typecheck"),
        core.filter(gate => ["web-test", "web-build"].includes(gate.id)),
      );
    case "e2e":
      return combineGateSets(
        quickVerificationGates(),
        typechecks,
        artifact.filter(gate => ["build", "browser-e2e"].includes(gate.id)),
      );
    case "artifact":
      return combineGateSets(quickVerificationGates(), typechecks, artifact);
    case "docs":
      return docsOnlyGates();
    case "hygiene":
      return hygieneGates();
    case "ci-static":
      return combineGateSets(staticCore, typechecks, hygieneAnalysisGates());
    case "ci-core":
      return combineGateSets(
        quickVerificationGates(),
        typechecks.filter(gate => gate.id !== "e2e-typecheck"),
        core,
      );
    case "ci-protocol":
      return combineGateSets(
        quickVerificationGates(),
        [rootScript("migrations", "Migration 与快照", "verify:migrations")],
        typechecks.filter(gate => gate.id === "gateway-typecheck"),
        protocol,
      );
    case "ci-artifact":
      return combineGateSets(quickVerificationGates(), typechecks, artifact);
    case "all":
    case "ci":
      return combineGateSets(staticCore, typechecks, core, protocol, artifact, hygieneAnalysisGates());
  }
}

function quickVerificationGates() {
  return [
    rootScript("script-tests", "仓库脚本自测", "test:scripts"),
    rootScript("gate-contract", "Gate、Package Script 与 CI 合同", "verify:gate-contract", { needs: ["script-tests"] }),
    rootScript("typescript-version", "TypeScript 单版本", "verify:typescript-version"),
    rootScript("toolchain-baseline", "官方工具链提交基线", "verify:toolchain-baseline"),
    rootScript("boundaries", "架构依赖边界", "verify:boundaries"),
    rootScript("imports", "相对导入完整性", "verify:imports"),
    rootScript("runtime-invariants", "模块运行时不变量所有权", "verify:runtime-invariants"),
    rootScript("secret-safety", "Secret 静态安全", "verify:secret-safety"),
  ];
}

function staticGates() {
  return combineGateSets(
    quickVerificationGates(),
    [
      rootScript("toolchain-official", "shadcn 与 Antfu 官方安装探针", "verify:toolchain-official", { needs: ["toolchain-baseline"] }),
      rootScript("agent-assets", "Agent 与 Skill 资产", "verify:agent-assets"),
      rootScript("project-version", "项目版本投影", "verify:project-version"),
      rootScript("decision-notes", "Decision Note 生命周期与格式", "verify:decisions"),
      rootScript("migrations", "Migration 与快照", "verify:migrations"),
      rootScript("module-graph", "生成模块依赖图新鲜度", "docs:module-graph:check"),
      rootScript("docs", "中文规范与生成投影", "docs:check", { needs: ["decision-notes", "module-graph"] }),
    ],
  );
}

function typecheckGates() {
  return [
    pnpmScript("gateway-typecheck", "Gateway TypeScript", "--filter", "@aigw/gateway", "typecheck", {
      needs: ["typescript-version"],
    }),
    pnpmScript("web-typecheck", "Web TypeScript", "--filter", "@aigw/web", "typecheck", {
      needs: ["typescript-version", "toolchain-baseline"],
    }),
    pnpmScript("e2e-typecheck", "E2E TypeScript", "--filter", "@aigw/e2e", "typecheck", {
      needs: ["typescript-version"],
    }),
  ];
}

function coreGates() {
  return [
    pnpmScript("gateway-critical-coverage", "关键模块覆盖率", "--filter", "@aigw/gateway", "test:coverage", {
      needs: ["gateway-typecheck"],
    }),
    pnpmScript(
      "openapi-contract",
      "控制面 OpenAPI Contract",
      "--filter",
      "@aigw/gateway",
      "exec",
      "vitest",
      "run",
      "tests/contract/openapi-contract.test.ts",
      { needs: ["gateway-typecheck"] },
    ),
    pnpmScript("web-test", "Web 单元测试", "--filter", "@aigw/web", "test", {
      needs: ["web-typecheck"],
    }),
    pnpmScript("generated-api", "OpenAPI 类型新鲜度", "run", "api:generated:check", {
      needs: ["openapi-contract", "web-typecheck"],
    }),
    pnpmScript("web-build", "Web 构建", "--filter", "@aigw/web", "build", {
      needs: ["web-typecheck", "web-test"],
    }),
  ];
}

function protocolGates() {
  return [
    pnpmScript("protocol-contract", "Data Plane 协议单元测试", "--filter", "@aigw/gateway", "test:protocol", {
      needs: ["gateway-typecheck", "runtime-invariants"],
    }),
    pnpmScript(
      "keyless-protocol-snapshot",
      "Keyless 真实组合协议 Snapshot",
      "--filter",
      "@aigw/gateway",
      "exec",
      "vitest",
      "run",
      "tests/contract/data-plane-snapshot.test.ts",
      { needs: ["gateway-typecheck", "runtime-invariants"] },
    ),
    pnpmScript(
      "data-golden-path",
      "Data Plane Golden Path",
      "--filter",
      "@aigw/gateway",
      "exec",
      "vitest",
      "run",
      "tests/contract/data-plane-golden-path.test.ts",
      { needs: ["gateway-typecheck", "runtime-invariants"] },
    ),
    pnpmScript("database-integration", "PostgreSQL 集成测试", "--filter", "@aigw/gateway", "test:integration", {
      needs: ["gateway-typecheck", "migrations", "runtime-invariants"],
    }),
  ];
}

function artifactGates() {
  return [
    pnpmScript("build", "生产构建", "run", "build", {
      needs: ["gateway-typecheck", "web-typecheck", "boundaries", "imports"],
    }),
    pnpmScript("artifact-smoke", "plain Node 构建产物 Smoke", "exec", "node", "scripts/artifact/smoke.mjs", {
      needs: ["build"],
    }),
    pnpmScript("browser-e2e", "编译产物浏览器 Golden Path", "--filter", "@aigw/e2e", "test", {
      needs: ["e2e-typecheck", "build"],
      env: { AIGW_E2E_USE_BUILD: "1" },
    }),
    pnpmScript("docker-smoke", "Docker Compose 发布形态 Smoke", "exec", "node", "scripts/artifact/docker-smoke.mjs", {
      needs: ["build", "browser-e2e"],
    }),
  ];
}

function hygieneAnalysisGates() {
  return [
    rootScript("lint", "类型感知 Lint", "lint", { needs: ["gateway-typecheck", "web-typecheck", "e2e-typecheck"] }),
    rootScript("knip", "死代码与依赖分析", "knip", { needs: ["gateway-typecheck", "web-typecheck", "e2e-typecheck"] }),
    rootScript("duplication", "跨文件重复代码分析", "duplication"),
  ];
}

function hygieneGates() {
  return combineGateSets(staticGates(), typecheckGates(), hygieneAnalysisGates());
}

function docsOnlyGates() {
  return [
    rootScript("script-tests", "仓库脚本自测", "test:scripts"),
    rootScript("project-version", "项目版本投影", "verify:project-version"),
    rootScript("decision-notes", "Decision Note 生命周期与格式", "verify:decisions"),
    rootScript("module-graph", "生成模块依赖图新鲜度", "docs:module-graph:check"),
    rootScript("docs", "中文规范与生成投影", "docs:check", { needs: ["decision-notes", "module-graph"] }),
    rootScript("agent-assets", "Agent 与 Skill 资产", "verify:agent-assets", { needs: ["docs"] }),
    rootScript("secret-safety", "Secret 静态安全", "verify:secret-safety"),
  ];
}

/** @param {string} id @param {string} label @param {string} script @param {Partial<Gate>} [options] */
function rootScript(id, label, script, options = {}) {
  return pnpmScript(id, label, "run", script, options);
}

/**
 * @param {string} id
 * @param {string} label
 * @param {...(string | Partial<Gate>)} values
 */
function pnpmScript(id, label, ...values) {
  const last = values.at(-1);
  const options = typeof last === "object" && last !== null ? values.pop() : {};
  return {
    id,
    label,
    command: "pnpm",
    args: /** @type {string[]} */ (values),
    needs: [...(options.needs ?? [])],
    after: [...(options.after ?? [])],
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.env === undefined ? {} : { env: options.env }),
  };
}

/** @param {...readonly Gate[][]} sets */
function combineGateSets(...sets) {
  const byId = new Map();
  for (const set of sets) {
    for (const gate of set) {
      const current = byId.get(gate.id);
      if (current !== undefined && JSON.stringify(current) !== JSON.stringify(gate)) {
        throw new Error(`conflicting gate definitions for ${gate.id}`);
      }
      byId.set(gate.id, gate);
    }
  }
  return [...byId.values()];
}

/**
 * @typedef {object} Gate
 * @property {string} id
 * @property {string} label
 * @property {string} command
 * @property {string[]} args
 * @property {string[]} needs
 * @property {string[]} after
 * @property {string | undefined} [cwd]
 * @property {Record<string, string | undefined> | undefined} [env]
 */
