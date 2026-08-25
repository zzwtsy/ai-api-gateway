import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientsPage } from "./clients-page";

const hookMocks = vi.hoisted(() => ({
  revoke: vi.fn(),
  rotate: vi.fn(),
  useGatewayClients: vi.fn(),
  useRevokeGatewayClientKey: vi.fn(),
  useRotateGatewayClientKey: vi.fn(),
}));

vi.mock("./hooks", () => hookMocks);

const client = {
  id: "client_01",
  name: "Codex · 工作站",
  status: "active",
  profile: {
    id: "profile_01",
    slug: "codex",
    name: "Codex",
    allowedProtocols: ["openai-responses"],
  },
  allowedProtocols: ["openai-responses"],
  keys: [{
    id: "key_01",
    keyPrefix: "gw_codex_AbCd",
    keyLast4: "wxyz",
    status: "active",
    expiresAt: null,
    lastUsedAt: null,
    createdAt: "2026-08-24T08:00:00.000Z",
    revokedAt: null,
  }],
  lastUsedAt: null,
  createdAt: "2026-08-24T08:00:00.000Z",
  updatedAt: "2026-08-24T08:00:00.000Z",
} as const;

const createdResult = {
  client,
  key: "gw_codex_AbCd-full-secret-wxyz",
} as const;

const onClientIdChange = vi.fn();

vi.mock("./create-client-form", () => ({
  CreateClientForm: ({ onCreated }: { readonly onCreated: (result: typeof createdResult) => void }) => (
    <button type="button" onClick={() => onCreated(createdResult)}>完成创建</button>
  ),
}));

describe("clients page", () => {
  beforeEach(() => {
    onClientIdChange.mockReset();
    hookMocks.revoke.mockReset();
    hookMocks.rotate.mockReset();
    hookMocks.useGatewayClients.mockReturnValue(readyQuery([]));
    hookMocks.useRotateGatewayClientKey.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      rotate: hookMocks.rotate,
    });
    hookMocks.useRevokeGatewayClientKey.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      revoke: hookMocks.revoke,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("covers UX-CLIENTS-SECRET-ONCE: shows a newly created Key only in the explicit completion state", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderClientsPage();

    await user.click(screen.getAllByRole("button", { name: "添加客户端" })[0]!);
    await user.click(screen.getByRole("button", { name: "完成创建" }));

    expect(screen.getByLabelText("完整 Gateway Key")).toHaveValue(createdResult.key);
    await user.click(screen.getByRole("button", { name: "复制 Key" }));
    expect(writeText).toHaveBeenCalledWith(createdResult.key);
    await user.click(screen.getByRole("button", { name: "我已保存，关闭" }));
    expect(screen.queryByDisplayValue(createdResult.key)).not.toBeInTheDocument();
  });

  it("covers UX-CLIENTS-INSPECTOR-LIFECYCLE: keeps Key metadata and lifecycle actions inside the non-modal Inspector", async () => {
    const user = userEvent.setup();
    hookMocks.useGatewayClients.mockReturnValue(readyQuery([client]));
    hookMocks.revoke.mockResolvedValue(undefined);
    renderClientsPage("client_01");

    expect(screen.getByRole("region", { name: "Codex · 工作站" })).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Codex · 工作站" })).not.toBeInTheDocument();
    expect(screen.getByText("gw_codex_AbCd••••wxyz")).toBeVisible();
    expect(screen.getByText("现有完整 Gateway Key 无法恢复")).toBeVisible();
    expect(screen.getByText(/YOUR_GATEWAY_CLIENT_KEY/u)).toBeVisible();
    expect(screen.queryByText(createdResult.key)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(hookMocks.revoke).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认撤销" }));
    expect(hookMocks.revoke).toHaveBeenCalledWith("key_01");
  });

  it("closes the Inspector through the route owner", async () => {
    const user = userEvent.setup();
    hookMocks.useGatewayClients.mockReturnValue(readyQuery([client]));
    renderClientsPage("client_01");

    await user.click(screen.getByRole("button", { name: "关闭客户端详情" }));

    expect(onClientIdChange).toHaveBeenCalledWith(undefined, { replace: true });
  });

  it("opens detail through the route-owned client selection callback", async () => {
    const user = userEvent.setup();
    hookMocks.useGatewayClients.mockReturnValue(readyQuery([client]));
    renderClientsPage();

    const row = screen.getByRole("row", { name: /Codex · 工作站/u });
    expect(within(row).getByText("1 个可用")).toBeVisible();
    expect(within(row).getByText("OpenAI Responses", { exact: true })).toBeVisible();
    expect(within(row).queryByText("Codex", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("gw_codex_AbCd••••wxyz")).not.toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "查看详情" }));
    expect(onClientIdChange).toHaveBeenCalledWith("client_01");
  });

  it("removes an invalid clientId without selecting the first client", async () => {
    hookMocks.useGatewayClients.mockReturnValue(readyQuery([client]));
    renderClientsPage("missing-client");

    await waitFor(() => {
      expect(onClientIdChange).toHaveBeenCalledWith(undefined, { replace: true });
    });
    expect(screen.queryByText("现有完整 Gateway Key 无法恢复")).not.toBeInTheDocument();
  });

  it("returns to the same detail after rotating and saving the one-time configuration", async () => {
    const user = userEvent.setup();
    hookMocks.useGatewayClients.mockReturnValue(readyQuery([client]));
    hookMocks.rotate.mockResolvedValue(createdResult);
    renderClientsPage("client_01");

    await user.click(screen.getByRole("button", { name: "轮换 Key 并生成完整配置" }));
    expect(hookMocks.rotate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认轮换" }));
    expect(hookMocks.rotate).toHaveBeenCalledWith("client_01");
    expect(await screen.findByLabelText("完整 Gateway Key")).toHaveValue(createdResult.key);
    expect(screen.getByText(/gw_codex_AbCd-full-secret-wxyz/u)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "我已保存，返回详情" }));
    expect(screen.queryByDisplayValue(createdResult.key)).not.toBeInTheDocument();
    expect(screen.getByText("现有完整 Gateway Key 无法恢复")).toBeVisible();
    expect(onClientIdChange).not.toHaveBeenCalledWith(undefined, expect.anything());
  });

  it("covers UX-CLIENTS-DIRECTORY-LIFECYCLE: keeps cached clients visible when a background refresh fails", () => {
    hookMocks.useGatewayClients.mockReturnValue({
      ...readyQuery([client]),
      error: new Error("刷新失败"),
      isError: true,
      isRefetchError: true,
    });

    renderClientsPage();

    expect(screen.getByText("Codex · 工作站")).toBeVisible();
    expect(screen.getByText("客户端目录可能已过期")).toBeVisible();
    expect(screen.queryByText("尚未创建 Gateway 客户端")).not.toBeInTheDocument();
  });
});

function renderClientsPage(clientId?: string) {
  return render(<ClientsPage clientId={clientId} onClientIdChange={onClientIdChange} />);
}

function readyQuery<T>(data: T) {
  return {
    data,
    error: null,
    isError: false,
    isPending: false,
    isRefetchError: false,
    refetch: vi.fn(),
  };
}
