import type { Locator, Page, Route, TestInfo } from "@playwright/test";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const adminHeaders = { authorization: "Bearer admin_dev_local" };
const providerPort = process.env.AIGW_E2E_PROVIDER_PORT ?? "4010";
const providerOrigin = `http://127.0.0.1:${providerPort}`;
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const sourceStateScript = path.join(repositoryRoot, "scripts/evidence/read-git-source-state.ts");
const execFileAsync = promisify(execFile);
const viewports = [
  { width: 1440, height: 1000 },
  { width: 1280, height: 900 },
  { width: 1024, height: 768 },
] as const;

test.use({ trace: "off" });

test("Endpoint 生命周期在目标桌面视口可完整操作", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const sourceState = await readSourceState();
  expect(sourceState.dirty, "未提交浏览器证据必须明确记录 dirty: true").toBe(true);
  const browserIssues = collectBrowserIssues(page);
  const screenshots: string[] = [];

  await page.context().clearCookies();
  await page.setExtraHTTPHeaders(adminHeaders);

  for (const viewport of viewports) {
    const screenshot = await exerciseViewport(page, testInfo, viewport, browserIssues);
    screenshots.push(screenshot);
  }

  expect(browserIssues, `浏览器 Console、pageerror 或 5xx：${JSON.stringify(browserIssues)}`).toEqual([]);
  await readSourceState(sourceState);
  await attachMetadata(testInfo, sourceState, screenshots);
});

async function exerciseViewport(
  page: Page,
  testInfo: TestInfo,
  viewport: typeof viewports[number],
  browserIssues: string[],
): Promise<string> {
  const identity = `${testInfo.project.name}-${viewport.width}-${randomUUID().slice(0, 8)}`;
  const names = {
    connection: `生命周期 ${identity}`,
    initialChat: `Chat ${identity}`,
    initialResponses: `Responses ${identity}`,
    batchChat: `Batch Chat ${identity}`,
    batchResponses: `Batch Responses ${identity}`,
    edited: `Edited Anthropic ${identity}`,
  };

  await page.setViewportSize(viewport);
  await page.goto("/connections");
  await expect(page).toHaveTitle(/AI API Gateway/u);
  await createConnection(page, identity, names);
  await openEndpointsAndProveHistory(page, names);
  if (viewport.width === 1440 && viewport.height === 1000)
    await proveAddEndpointPendingRecovery(page, identity, browserIssues, testInfo.project.name);
  await expectNoDocumentOverflow(page);

  const screenshotName = `endpoint-lifecycle-${viewport.width}x${viewport.height}.png`;
  const screenshotPath = testInfo.outputPath(screenshotName);
  await page.screenshot({ path: screenshotPath, animations: "disabled" });
  await testInfo.attach(screenshotName, { path: screenshotPath, contentType: "image/png" });

  await batchAddEndpoints(
    page,
    identity,
    names,
    requiresScroll(viewport),
  );
  await editEndpoint(page, identity, names);
  await deleteWithRecovery(page, names.edited);
  await deleteEndpoint(page, names.initialChat);
  await deleteEndpoint(page, names.initialResponses);
  await deleteEndpoint(page, names.batchResponses);

  await expect(page.getByText("当前连接没有 Endpoint", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "添加 Endpoint" })).toBeFocused();
  expectConnectionSearch(page);
  await expectNoDocumentOverflow(page);
  return screenshotName;
}

async function createConnection(
  page: Page,
  identity: string,
  names: Record<"connection" | "initialChat" | "initialResponses", string>,
): Promise<void> {
  await page.getByRole("button", { name: "添加连接" }).click();
  const dialog = page.getByRole("dialog", { name: "添加连接" });
  await expectDialogInsideViewport(dialog);
  await dialog.getByLabel("连接名称").fill(names.connection);
  await dialog.getByLabel("Provider 标识").fill(`lifecycle-${identity}`);
  await dialog.getByRole("button", { name: "添加 Key" }).click();
  await dialog.getByLabel("Provider API Key", { exact: true }).fill(`fake-provider-${identity}-one`);
  await dialog.getByLabel("Provider API Key 2", { exact: true }).fill(`fake-provider-${identity}-two`);
  await dialog.getByRole("button", { name: "下一步：Endpoint" }).click();

  await dialog.getByLabel("Endpoint 名称").fill(names.initialChat);
  await dialog.getByLabel("上游 Base URL").fill(`${providerOrigin}/${identity}/initial-chat`);
  await dialog.getByRole("button", { name: "添加 Endpoint" }).click();
  await dialog.getByLabel("Endpoint 名称").nth(1).fill(names.initialResponses);
  await dialog.getByRole("combobox", { name: "协议" }).nth(1).click();
  await page.getByRole("option", { name: "OpenAI Responses" }).click();
  await dialog.getByLabel("上游 Base URL").nth(1).fill(`${providerOrigin}/${identity}/initial-responses`);
  const secondBindings = dialog.getByRole("group", { name: "Endpoint 2 绑定访问 Key" });
  await secondBindings.getByRole("checkbox").nth(1).click();
  await expect(dialog.getByRole("button", { name: "创建连接" })).toBeVisible();
  await dialog.getByRole("button", { name: "创建连接" }).click();

  await expect(dialog).toHaveCount(0);
  const directoryButton = page.getByRole("button", { name: names.connection, exact: true });
  await expect(directoryButton).toBeVisible();
  await directoryButton.click();
  await expect(directoryButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new URL(page.url()).searchParams.get("connectionId")).not.toBeNull();
}

async function openEndpointsAndProveHistory(
  page: Page,
  names: Record<"initialChat" | "initialResponses", string>,
): Promise<void> {
  const connectionId = new URL(page.url()).searchParams.get("connectionId");
  expect(connectionId).not.toBeNull();
  await page.getByRole("tab", { name: "Endpoints" }).click();
  await expect(page.getByText(names.initialChat, { exact: true })).toBeVisible();
  await expect(page.getByText(names.initialResponses, { exact: true })).toBeVisible();
  expectConnectionSearch(page, connectionId ?? undefined);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Endpoints" })).toHaveAttribute("aria-selected", "true");
  expectConnectionSearch(page, connectionId ?? undefined);
  await page.getByRole("tab", { name: "账号" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("accounts");
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Endpoints" })).toHaveAttribute("aria-selected", "true");
  expectConnectionSearch(page, connectionId ?? undefined);
}

async function batchAddEndpoints(
  page: Page,
  identity: string,
  names: Record<"batchChat" | "batchResponses", string>,
  mustScroll: boolean,
): Promise<void> {
  const trigger = page.getByRole("button", { name: "添加 Endpoint" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "添加 Endpoint" });
  await expectDialogInsideViewport(dialog);
  await dialog.getByRole("button", { name: "再添加一个 Endpoint" }).click();
  await dialog.getByLabel("Endpoint 名称").nth(0).fill(names.batchChat);
  await dialog.getByLabel("上游 Base URL").nth(0).fill(`${providerOrigin}/${identity}/batch-chat`);
  await dialog.getByLabel("Endpoint 名称").nth(1).fill(names.batchResponses);
  await dialog.getByRole("combobox", { name: "协议" }).nth(1).click();
  await page.getByRole("option", { name: "OpenAI Responses" }).click();
  await dialog.getByLabel("上游 Base URL").nth(1).fill(`${providerOrigin}/${identity}/batch-responses`);

  const body = dialog.locator("form > .overflow-y-auto");
  await expectScrollOwnership(body, mustScroll);
  await expectLocatorInsideViewport(dialog.locator("[data-slot=dialog-header]"));
  await expectLocatorInsideViewport(dialog.locator("[data-slot=dialog-footer]"));
  const submit = dialog.getByRole("button", { name: "添加 Endpoint" });
  await expectLocatorInsideViewport(submit);
  await submit.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(names.batchChat, { exact: true })).toBeVisible();
  await expect(page.getByText(names.batchResponses, { exact: true })).toBeVisible();
  await expect(trigger).toBeFocused();
  expectConnectionSearch(page);
  await expectNoDocumentOverflow(page);
}

async function proveAddEndpointPendingRecovery(
  page: Page,
  identity: string,
  browserIssues: string[],
  projectName: string,
): Promise<void> {
  const connectionId = new URL(page.url()).searchParams.get("connectionId");
  if (connectionId === null)
    throw new Error("缺少 Endpoint 批量新增负向场景所需的 connectionId");
  const endpointPath = `/admin/api/v1/connections/${connectionId}/endpoints`;
  const matchesEndpointPath = (url: URL) => url.pathname === endpointPath;
  const injectedError = "批量 Endpoint 校验失败，请修正后重试";
  const draftNames = [`Pending Chat ${identity}`, `Pending Responses ${identity}`] as const;
  let markRequestIntercepted!: () => void;
  let releaseFailureResponse!: () => void;
  const requestIntercepted = new Promise<void>((resolve) => {
    markRequestIntercepted = resolve;
  });
  const failureResponseReleased = new Promise<void>((resolve) => {
    releaseFailureResponse = resolve;
  });
  const routeHandler = async (route: Route): Promise<void> => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    markRequestIntercepted();
    await failureResponseReleased;
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        code: "ENDPOINT_BATCH_REJECTED",
        message: injectedError,
        data: null,
        error: { type: "business" },
        meta: { requestId: "req_endpoint_batch_recoverable_error" },
      }),
    });
  };
  let routeActive = true;

  await page.route(matchesEndpointPath, routeHandler);
  try {
    const trigger = page.getByRole("button", { name: "添加 Endpoint" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "添加 Endpoint" });
    await dialog.getByRole("button", { name: "再添加一个 Endpoint" }).click();
    await dialog.getByLabel("Endpoint 名称").nth(0).fill(draftNames[0]);
    await dialog.getByLabel("上游 Base URL").nth(0).fill(`${providerOrigin}/${identity}/pending-chat`);
    await dialog.getByLabel("Endpoint 名称").nth(1).fill(draftNames[1]);
    await dialog.getByRole("combobox", { name: "协议" }).nth(1).click();
    await page.getByRole("option", { name: "OpenAI Responses" }).click();
    await dialog.getByLabel("上游 Base URL").nth(1).fill(`${providerOrigin}/${identity}/pending-responses`);
    await dialog.getByRole("button", { name: "添加 Endpoint" }).click();
    await requestIntercepted;

    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await page.locator("[data-slot=dialog-overlay]").click({ position: { x: 4, y: 4 } });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toHaveCount(0);

    releaseFailureResponse();
    await expect(dialog.getByText(injectedError, { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Endpoint 名称").nth(0)).toHaveValue(draftNames[0]);
    await expect(dialog.getByLabel("Endpoint 名称").nth(1)).toHaveValue(draftNames[1]);
    await expect(dialog.getByLabel("请求路径").nth(0)).toHaveValue("/v1/chat/completions");
    await expect(dialog.getByLabel("请求路径").nth(1)).toHaveValue("/v1/responses");
    if (projectName === "chromium") {
      expect(browserIssues).toEqual([
        "console: Failed to load resource: the server responded with a status of 409 (Conflict)",
      ]);
    } else if (projectName === "firefox") {
      expect(browserIssues).toEqual([]);
    } else {
      throw new Error(`未定义 ${projectName} 的预期 409 Console 行为`);
    }
    browserIssues.length = 0;

    await page.unroute(matchesEndpointPath, routeHandler);
    routeActive = false;
    await dialog.getByRole("button", { name: "取消" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  } finally {
    releaseFailureResponse();
    if (routeActive)
      await page.unroute(matchesEndpointPath, routeHandler);
  }
}

async function editEndpoint(
  page: Page,
  identity: string,
  names: Record<"batchChat" | "edited", string>,
): Promise<void> {
  const row = endpointRow(page, names.batchChat);
  await row.getByRole("button", { name: "编辑" }).click();
  const dialog = page.getByRole("dialog", { name: "编辑 Endpoint" });
  await expectDialogInsideViewport(dialog);
  await dialog.getByLabel("Endpoint 名称").fill(names.edited);
  await dialog.getByRole("combobox", { name: "协议" }).click();
  await page.getByRole("option", { name: "Anthropic Messages" }).click();
  await dialog.getByLabel("上游 Base URL").fill(`${providerOrigin}/${identity}/edited`);
  await dialog.getByLabel("请求路径").fill("/v1/messages-custom");
  await dialog.getByRole("combobox", { name: "鉴权方式" }).click();
  await page.getByRole("option", { name: "X-API-Key" }).click();
  await dialog.getByRole("checkbox", { name: "支持流式响应" }).click();
  await dialog
    .getByRole("group", { name: "Endpoint 配置 绑定 Credential" })
    .getByRole("checkbox")
    .nth(1)
    .click();
  await dialog.getByRole("button", { name: "保存修改" }).click();

  await expect(dialog).toHaveCount(0);
  const editedRow = endpointRow(page, names.edited);
  await expect(editedRow.getByText("Anthropic Messages", { exact: true })).toBeVisible();
  await expect(editedRow.getByText("不支持", { exact: true })).toBeVisible();
  await expect(editedRow).toContainText("/v1/messages-custom");
  expectConnectionSearch(page);
}

async function deleteWithRecovery(page: Page, endpointName: string): Promise<void> {
  const trigger = endpointRow(page, endpointName).getByRole("button", { name: `删除 ${endpointName}` });
  await trigger.click();
  let dialog = page.getByRole("alertdialog", { name: `删除${endpointName}？` });
  await expectDeletionDialogReady(dialog);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  dialog = page.getByRole("alertdialog", { name: `删除${endpointName}？` });
  await expectDeletionDialogReady(dialog);
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  dialog = page.getByRole("alertdialog", { name: `删除${endpointName}？` });
  await expectDeletionDialogReady(dialog);
  await dialog.getByRole("button", { name: "确认删除" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(endpointRow(page, endpointName)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加 Endpoint" })).toBeFocused();
  expectConnectionSearch(page);
}

async function deleteEndpoint(page: Page, endpointName: string): Promise<void> {
  await endpointRow(page, endpointName).getByRole("button", { name: `删除 ${endpointName}` }).click();
  const dialog = page.getByRole("alertdialog", { name: `删除${endpointName}？` });
  await expectDeletionDialogReady(dialog);
  await dialog.getByRole("button", { name: "确认删除" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(endpointRow(page, endpointName)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加 Endpoint" })).toBeFocused();
  expectConnectionSearch(page);
}

async function expectDeletionDialogReady(dialog: Locator): Promise<void> {
  await expectDialogInsideViewport(dialog);
  await expect(dialog.getByText("Credential 绑定", { exact: true })).toBeVisible();
  await expect(dialog.getByText("进行中 Probe", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "确认删除" })).toBeEnabled();
}

function endpointRow(page: Page, endpointName: string): Locator {
  return page.getByRole("row").filter({ has: page.getByText(endpointName, { exact: true }) });
}

function expectConnectionSearch(page: Page, expectedConnectionId?: string): void {
  const search = new URL(page.url()).searchParams;
  const connectionId = search.get("connectionId");
  if (expectedConnectionId === undefined)
    expect(typeof connectionId).toBe("string");
  else
    expect(connectionId).toBe(expectedConnectionId);
  expect(search.get("tab")).toBe("endpoints");
}

async function expectDialogInsideViewport(dialog: Locator): Promise<void> {
  await expectLocatorInsideViewport(dialog);
}

async function expectLocatorInsideViewport(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const view = element.ownerDocument.defaultView;
    return view !== null
      && rect.left >= 0
      && rect.right <= view.innerWidth + 1
      && rect.top >= 0
      && rect.bottom <= view.innerHeight + 1;
  })).toBe(true);
}

async function expectScrollOwnership(body: Locator, mustScroll: boolean): Promise<void> {
  await expect.poll(() => body.evaluate(element =>
    element.ownerDocument.defaultView?.getComputedStyle(element).overflowY)).toBe("auto");
  const scrollable = await body.evaluate(element => element.scrollHeight > element.clientHeight);
  if (mustScroll)
    expect(scrollable, "1024×768 的批量 Dialog Body 必须可滚动").toBe(true);
  if (!scrollable)
    return;
  await body.evaluate((element) => {
    element.scrollTop = Math.max(1, element.scrollHeight - element.clientHeight);
  });
  await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
}

function requiresScroll(viewport: { readonly width: number; readonly height: number }): boolean {
  return viewport.width === 1024 || viewport.height === 768;
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const geometry = await page.locator("html").evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(geometry.scrollWidth, `文档横向溢出：${JSON.stringify(geometry)}`)
    .toBeLessThanOrEqual(geometry.clientWidth);
}

function collectBrowserIssues(page: Page): string[] {
  const issues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      issues.push(`console: ${message.text()}`);
  });
  page.on("pageerror", error => issues.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500)
      issues.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

async function readSourceState(expected?: GitSourceState): Promise<GitSourceState> {
  const args = [sourceStateScript, repositoryRoot];
  if (expected !== undefined)
    args.push(expected.commit, expected.statusFingerprint);
  const { stdout } = await execFileAsync(process.execPath, args, { cwd: repositoryRoot, encoding: "utf8" });
  const value: unknown = JSON.parse(stdout);
  if (!isGitSourceState(value))
    throw new Error("Git 源身份字段无效");
  return value;
}

function isGitSourceState(value: unknown): value is GitSourceState {
  if (value === null || typeof value !== "object")
    return false;
  const state = value as Partial<GitSourceState>;
  return typeof state.commit === "string"
    && /^[0-9a-f]{40,64}$/u.test(state.commit)
    && typeof state.dirty === "boolean"
    && typeof state.statusFingerprint === "string"
    && /^[0-9a-f]{64}$/u.test(state.statusFingerprint);
}

async function attachMetadata(
  testInfo: TestInfo,
  sourceState: GitSourceState,
  screenshots: readonly string[],
): Promise<void> {
  const metadataPath = testInfo.outputPath("metadata.json");
  const metadata = {
    schemaVersion: 1,
    commit: sourceState.commit,
    dirty: sourceState.dirty,
    statusFingerprint: sourceState.statusFingerprint,
    project: testInfo.project.name,
    viewports,
    claim: "真实 Gateway、Web、Memory 与 Mock Provider 下的 Connection/Endpoint 完整 UI 生命周期",
    artifacts: { screenshots },
    unverified: ["证据来自未提交工作树，不能只归因于所记录的 Commit。", "本 Journey 不宣称 Mock Provider 收到数据面请求。"],
  };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  await testInfo.attach("metadata", { path: metadataPath, contentType: "application/json" });
}

interface GitSourceState {
  readonly commit: string;
  readonly dirty: boolean;
  readonly statusFingerprint: string;
}
