import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const recordEvidence = process.env.AIGW_RECORD_UI_EVIDENCE === "1";
const gatewayOrigin = `http://127.0.0.1:${process.env.AIGW_E2E_GATEWAY_PORT ?? "3001"}`;
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const evidenceRoot = path.join(repositoryRoot, ".artifacts/ui-evidence");
const scenario = "shadcn-blue-sidebar";
const execFileAsync = promisify(execFile);

test("记录 Blue/Inter Sidebar 规范截图", async ({ page, request }) => {
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
    await page.screenshot({
      path: path.join(outputDirectory, "overview-1440x1000.png"),
      animations: "disabled",
    });

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
        provider: "openai-compatible",
        protocol: "openai-chat",
        baseUrl: "http://127.0.0.1:4010",
        enabled: true,
      },
    });
    expect(connectionResponse.status()).toBe(201);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/connections");
    const desktopSidebar = page.locator("[data-slot=\"sidebar\"][data-state]");
    if (await desktopSidebar.getAttribute("data-state") === "collapsed") {
      await page.getByRole("button", { name: "切换侧边栏" }).click();
    }
    await expect(desktopSidebar).toHaveAttribute("data-state", "expanded");
    await expect(page.getByText("本地模拟上游")).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "connections-1440x1000.png"),
      animations: "disabled",
    });

    const gatewayResponse = await request.post(`${gatewayOrigin}/openai/v1/chat/completions`, {
      headers: {
        "authorization": "Bearer gw_dev_local_key",
        "content-type": "application/json",
      },
      data: {
        model: "demo-model",
        stream: true,
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(gatewayResponse.status()).toBe(200);
    await gatewayResponse.text();
    await page.goto("/requests");
    await page.getByText("demo-model").first().click();
    await expect(page.getByText("第 1 次尝试")).toBeVisible();
    await page.screenshot({
      path: path.join(outputDirectory, "requests-1440x1000.png"),
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
        { width: 1024, height: 768, deviceScaleFactor: 1 },
      ],
      claims: [
        "Blue/Inter theme and official inset Sidebar render in the real Web app",
        "Sidebar expanded and collapsed layouts remain visible at the verified desktop viewports",
        "Connections and Request detail render against the real in-memory Gateway and Mock Provider",
      ],
      artifacts: {
        screenshots: [
          "overview-1440x1000.png",
          "overview-collapsed-1024x768.png",
          "connections-1440x1000.png",
          "requests-1440x1000.png",
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
    path.join(repositoryRoot, "scripts/evidence/read-git-source-state.mjs"),
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
