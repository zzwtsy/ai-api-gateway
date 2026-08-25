import type { Page } from "@playwright/test";

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { createRecordedRequest } from "./support/recorded-request.js";

const recordEvidence = process.env.AIGW_RECORD_UI_EVIDENCE === "1";
const gatewayPort = process.env.AIGW_E2E_GATEWAY_PORT ?? "3001";
const providerPort = process.env.AIGW_E2E_PROVIDER_PORT ?? "4010";
const webPort = process.env.AIGW_E2E_WEB_PORT ?? "5173";
const gatewayOrigin = `http://127.0.0.1:${gatewayPort}`;
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const evidenceRoot = path.join(repositoryRoot, ".artifacts/ui-evidence");
const scenario = "web-ui-contract";
const execFileAsync = promisify(execFile);

test.use({ trace: "off" });

test("记录 Web UI 合同与 Request 响应式布局截图", async ({ page, request }) => {
  test.skip(!recordEvidence, "仅在显式记录 UI 证据时生成截图");
  const sourceState = await readEvidenceSourceState();
  await mkdir(evidenceRoot, { recursive: true });
  const outputDirectory = await mkdtemp(path.join(evidenceRoot, `.${scenario}-`));
  let published = false;

  try {
    await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
    await page.context().clearCookies();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "概览" })).toBeVisible();
    await expect(page.getByText("请求转发链路", { exact: true })).toBeVisible();
    await expect(page.getByText(/留给后续功能/u)).toHaveCount(0);
    await page.screenshot({
      path: path.join(outputDirectory, "overview-1440x1000.png"),
      animations: "disabled",
    });

    await page.getByRole("button", { name: "选择界面主题" }).click();
    await page.getByRole("menuitemradio", { name: "深色" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/u);
    await page.screenshot({
      path: path.join(outputDirectory, "overview-dark-1440x1000.png"),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "选择界面主题" }).click();
    await page.getByRole("menuitemradio", { name: "浅色" }).click();
    await expect(page.locator("html")).toHaveClass(/light/u);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.getByRole("button", { name: "切换侧边栏" }).click();
    await expect(page.locator("[data-slot=\"sidebar\"][data-state]"))
      .toHaveAttribute("data-state", "collapsed");
    await page.screenshot({
      path: path.join(outputDirectory, "overview-collapsed-1024x768.png"),
      animations: "disabled",
    });

    const headers = { authorization: "Bearer admin_dev_local" };
    const connectionResponse = await request.post(`${gatewayOrigin}/admin/api/v1/connections`, {
      headers,
      data: {
        name: "本地模拟上游",
        providerSlug: "openai-compatible",
        endpoint: {
          name: "默认 Endpoint",
          protocol: "openai-chat",
          baseUrl: `http://127.0.0.1:${providerPort}`,
          requestPath: "/v1/chat/completions",
          authScheme: "bearer",
          supportsStreaming: true,
        },
        account: { name: "主账号", billingMode: "unknown" },
        credential: { name: "主 Key", secret: "mock-provider-key" },
      },
    });
    expect(connectionResponse.status()).toBe(201);
    const connectionPayload = await connectionResponse.json() as {
      data: {
        id: string;
        endpoints: readonly [{ id: string }];
      };
    };
    const connectionId = connectionPayload.data.id;
    const endpointId = connectionPayload.data.endpoints[0].id;
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/connections");
    const desktopSidebar = page.locator("[data-slot=\"sidebar\"][data-state]");
    if (await desktopSidebar.getAttribute("data-state") === "collapsed") {
      await page.getByRole("button", { name: "切换侧边栏" }).click();
    }
    await expect(desktopSidebar).toHaveAttribute("data-state", "expanded");
    await expect(page.getByText("本地模拟上游", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("管理上游 Provider Endpoint、协议和连接状态。")).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "connections-1440x1000.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByRole("button", { name: "完整兼容性测试" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(outputDirectory, "connections-detail-1280x900.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByRole("button", { name: "完整兼容性测试" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(outputDirectory, "connections-detail-1024x768.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("tab", { name: "兼容性" }).click();
    await page.getByRole("button", { name: "开始完整测试" }).click();
    await page.getByLabel("实测模型 ID").fill("ui-evidence-model");
    await page.getByRole("button", { name: "开始计费测试" }).click();
    await expect(page.getByText("正在测试兼容性")).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "compatibility-progress-1280x900.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByText("正在测试兼容性")).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "compatibility-progress-1024x768.png"),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "关闭并后台继续" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("connectionId")).toBe(connectionId);
    await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("compatibility");
    await expect(page.getByRole("cell", { name: "鉴权", exact: true })).toBeVisible();
    await expect(page.getByText("已验证", { exact: true })).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "compatibility-complete-1024x768.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: path.join(outputDirectory, "compatibility-complete-1280x900.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    const addConnectionButton = page.getByRole("button", { name: "添加连接" });
    await addConnectionButton.click();
    await expect(page.getByLabel("连接名称")).toHaveValue("");
    await expect(page.getByLabel("Provider 标识")).toHaveValue("");
    await expect(page.getByText("Provider 与访问凭据")).toBeVisible();
    await expectOverlayInsideViewport(page);
    await page.screenshot({
      path: path.join(outputDirectory, "connections-create-provider-1440x1000.png"),
      animations: "disabled",
    });
    await page.getByLabel("连接名称").fill("UI 证据连接");
    await page.getByLabel("Provider 标识").fill("ui-evidence");
    await page.getByLabel("Provider API Key").fill("provider-ui-evidence-key");
    await page.getByRole("button", { name: "下一步：Endpoint" }).click();
    await expect(page.getByLabel("上游 Base URL")).toHaveValue("");
    await expect(page.getByText("请输入合法的 URL")).toHaveCount(0);
    await page.screenshot({
      path: path.join(outputDirectory, "connections-create-endpoint-1440x1000.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await expectOverlayInsideViewport(page);
    await page.screenshot({
      path: path.join(outputDirectory, "connections-create-endpoint-1024x768.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(addConnectionButton).toBeFocused();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/models");
    const addModelButton = page.getByRole("button", { name: "添加模型绑定" });
    await addModelButton.click();
    await page.getByRole("combobox", { name: "目标 Endpoint" }).click();
    await page.getByRole("option", { name: "本地模拟上游 / 默认 Endpoint" }).click();
    await expect(page.getByText("上游模型发现（可选）")).toBeVisible();
    await expect(page.getByText("创建后的状态")).toBeVisible();
    await expectOverlayInsideViewport(page);
    await page.screenshot({
      path: path.join(outputDirectory, "models-form-1280x900.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await expectOverlayInsideViewport(page);
    await page.screenshot({
      path: path.join(outputDirectory, "models-form-1024x768.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(addModelButton).toBeFocused();

    const modelResponse = await request.post(`${gatewayOrigin}/admin/api/v1/models`, {
      headers,
      data: { endpointId, upstreamModelId: "ui-evidence-model", name: "UI 证据模型" },
    });
    expect(modelResponse.status()).toBe(201);
    const modelPayload = await modelResponse.json() as { data: { id: string } };
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/models");
    await expect(page.getByText("UI 证据模型", { exact: true })).toBeVisible();
    await expect(page.getByText("能力与价格未知", { exact: true })).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "models-1280x900.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(outputDirectory, "models-1024x768.png"),
      animations: "disabled",
    });

    await page.goto(`/models?modelBindingId=${encodeURIComponent(modelPayload.data.id)}`);
    await expect(page.getByRole("region", { name: "UI 证据模型" })).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "models-inspector-1024x768.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/clients");
    await expect(page.getByText("尚未创建 Gateway 客户端")).toBeVisible();
    await expect(page.getByLabel("完整 Gateway Key")).toHaveCount(0);
    await page.screenshot({
      path: path.join(outputDirectory, "clients-empty-1280x900.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    const addClientButton = page.getByRole("button", { name: "添加客户端" }).first();
    await addClientButton.click();
    await expect(page.getByLabel("客户端名称")).toBeVisible();
    await expectOverlayInsideViewport(page);
    await page.screenshot({
      path: path.join(outputDirectory, "clients-form-1280x900.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await expectOverlayInsideViewport(page);
    await page.screenshot({
      path: path.join(outputDirectory, "clients-form-1024x768.png"),
      animations: "disabled",
    });

    await page.keyboard.press("Escape");
    await expect(addClientButton).toBeFocused();
    const clientResponse = await request.post(`${gatewayOrigin}/admin/api/v1/clients`, {
      headers,
      data: {
        name: "Codex · UI 证据",
        profileSlug: "codex",
        allowedProtocols: ["openai-responses"],
      },
    });
    expect(clientResponse.status()).toBe(201);
    const clientPayload = await clientResponse.json() as {
      data: { client: { id: string } };
    };
    const clientId = clientPayload.data.client.id;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/clients");
    const clientRow = page.getByRole("row").filter({ hasText: "Codex · UI 证据" });
    const protocolCell = clientRow.getByRole("cell").nth(1);
    await expect(protocolCell.getByText("OpenAI Responses", { exact: true })).toBeVisible();
    await expect(protocolCell.getByText("Codex", { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: path.join(outputDirectory, "clients-directory-1280x900.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(outputDirectory, "clients-directory-1024x768.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/clients?clientId=${encodeURIComponent(clientId)}`);
    await expect(page.getByText("现有完整 Gateway Key 无法恢复")).toBeVisible();
    await expect(page.getByText(/YOUR_GATEWAY_CLIENT_KEY/u)).toBeVisible();
    await expect(page.getByLabel("完整 Gateway Key")).toHaveCount(0);
    await page.screenshot({
      path: path.join(outputDirectory, "clients-inspector-1280x900.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(outputDirectory, "clients-inspector-1024x768.png"),
      animations: "disabled",
    });

    const model = "ui-evidence-model";
    const { requestId } = await createRecordedRequest(request, model);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/requests");
    await page.getByRole("link", { name: new RegExp(model, "u") }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]requestId=${requestId}(?:&|$)`, "u"));
    await expect(page.getByText("第 1 次尝试")).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "requests-1440x1000.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByRole("region", { name: "逻辑请求" })).toBeVisible();
    await expect(page.getByRole("region", { name: "请求详情" })).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "requests-stacked-1280x900.png"),
      animations: "disabled",
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByText("第 1 次尝试")).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "requests-stacked-1024x768.png"),
      animations: "disabled",
    });

    await page.route(/\/admin\/api\/v1\/requests(?:\?.*)?$/u, route => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        code: "COMMON_INTERNAL_ERROR",
        message: "服务器内部错误",
        data: null,
        error: { type: "internal" },
        meta: { requestId: "req_ui_evidence_error" },
      }),
    }));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/requests");
    await expect(page.getByText("无法加载逻辑请求")).toBeVisible();
    await expect(page.getByRole("button", { name: "重新加载" })).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "requests-list-error-contained-1440x1000.png"),
      animations: "disabled",
    });

    await readEvidenceSourceState(sourceState);

    await writeFile(path.join(outputDirectory, "metadata.json"), `${JSON.stringify({
      schemaVersion: 1,
      commit: sourceState.commit,
      dirty: sourceState.dirty,
      mode: "development",
      provider: "mock",
      scenario,
      viewports: [
        { width: 1440, height: 1000, deviceScaleFactor: 1 },
        { width: 1280, height: 900, deviceScaleFactor: 1 },
        { width: 1024, height: 768, deviceScaleFactor: 1 },
      ],
      commands: [
        `AIGW_RECORD_UI_EVIDENCE=1 AIGW_E2E_GATEWAY_PORT=${gatewayPort} AIGW_E2E_PROVIDER_PORT=${providerPort} AIGW_E2E_WEB_PORT=${webPort} pnpm --filter @aigw/e2e exec playwright test tests/visual-evidence.spec.ts`,
      ],
      claims: [
        "Light/Dark semantic themes and the official inset Sidebar render in the real Web app",
        "Sidebar expanded and collapsed layouts remain visible at the verified desktop viewports",
        "Connections and Request detail render against the real in-memory Gateway and Mock Provider",
        "Connection detail omits the duplicate full compatibility test action at 1280px and 1024px",
        "Compatibility Probe progress remains closeable and both progress and durable model-scoped facts render at 1280px and 1024px",
        "Endpoint model bindings render as unverified with capability and price explicitly unknown",
        "The Model creation flow preserves optional discovery and manual entry inside the viewport at 1280px and 1024px",
        "The two-step Connection creation flow remains inside the viewport at 1440px and 1024px",
        "The Clients empty and creation states render inside the viewport without exposing a complete Gateway Key",
        "The Clients directory displays only derived protocol badges, without a duplicate Harness badge, at 1280px and 1024px",
        "The non-modal Client Inspector renders a non-secret protocol-specific configuration template within the content viewport at 1280px and 1024px",
        "The non-modal Model Inspector renders current Endpoint facts without inventing capability or price data at 1024px",
        "Overview and Connections describe current product behavior without development roadmap copy",
        "The connection form does not prefill development fixture names, identifiers or URLs",
        "Request Workbench uses side-by-side geometry at 1440px and stacked geometry at 1280px and 1024px",
        "Request List error and retry action remain inside the Master region at 1440px",
      ],
      artifacts: {
        screenshots: [
          "overview-1440x1000.png",
          "overview-dark-1440x1000.png",
          "overview-collapsed-1024x768.png",
          "connections-1440x1000.png",
          "connections-detail-1280x900.png",
          "connections-detail-1024x768.png",
          "compatibility-progress-1280x900.png",
          "compatibility-progress-1024x768.png",
          "compatibility-complete-1280x900.png",
          "compatibility-complete-1024x768.png",
          "connections-create-provider-1440x1000.png",
          "connections-create-endpoint-1440x1000.png",
          "connections-create-endpoint-1024x768.png",
          "models-1280x900.png",
          "models-1024x768.png",
          "models-inspector-1024x768.png",
          "models-form-1280x900.png",
          "models-form-1024x768.png",
          "clients-empty-1280x900.png",
          "clients-form-1280x900.png",
          "clients-form-1024x768.png",
          "clients-directory-1280x900.png",
          "clients-directory-1024x768.png",
          "clients-inspector-1280x900.png",
          "clients-inspector-1024x768.png",
          "requests-1440x1000.png",
          "requests-stacked-1280x900.png",
          "requests-stacked-1024x768.png",
          "requests-list-error-contained-1440x1000.png",
        ],
      },
      unverified: sourceState.dirty
        ? ["证据来自未提交工作树，不能只归因于所记录的 Commit。"]
        : [],
    }, null, 2)}\n`);

    const finalOutputDirectory = path.join(evidenceRoot, sourceState.directoryKey, scenario);
    await mkdir(path.dirname(finalOutputDirectory), { recursive: true });
    await rm(finalOutputDirectory, { recursive: true, force: true });
    await rename(outputDirectory, finalOutputDirectory);
    published = true;
  } finally {
    if (!published)
      await rm(outputDirectory, { recursive: true, force: true });
  }
});

async function readEvidenceSourceState(expected?: GitSourceState): Promise<GitSourceState> {
  const args = [
    path.join(repositoryRoot, "scripts/evidence/read-git-source-state.ts"),
    repositoryRoot,
  ];
  if (expected !== undefined)
    args.push(expected.commit, expected.statusFingerprint);
  const { stdout } = await execFileAsync(process.execPath, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const value: unknown = JSON.parse(stdout);
  if (value === null || typeof value !== "object")
    throw new Error("Git 源身份不是对象");
  const state = value as Partial<GitSourceState>;
  if (typeof state.commit !== "string" || !/^[0-9a-f]{40,64}$/u.test(state.commit)
    || typeof state.dirty !== "boolean"
    || typeof state.statusFingerprint !== "string" || !/^[0-9a-f]{64}$/u.test(state.statusFingerprint)
    || typeof state.directoryKey !== "string") {
    throw new Error("Git 源身份字段无效");
  }
  return state as GitSourceState;
}

interface GitSourceState {
  readonly commit: string;
  readonly dirty: boolean;
  readonly statusFingerprint: string;
  readonly directoryKey: string;
}

async function expectOverlayInsideViewport(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(async () => dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0
      && rect.right <= element.ownerDocument.documentElement.clientWidth
      && rect.top >= 0
      && rect.bottom <= element.ownerDocument.documentElement.clientHeight;
  })).toBe(true);
}
