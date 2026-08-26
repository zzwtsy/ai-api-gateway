import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionsPage } from "../connections-page";

const hookMocks = vi.hoisted(() => ({
  createConnection: vi.fn(),
  useConnections: vi.fn(),
  useCreateConnection: vi.fn(),
}));

vi.mock("../hooks", () => hookMocks);

const onConnectionIdChange = vi.fn();

beforeEach(() => {
  hookMocks.createConnection.mockReset();
  hookMocks.useConnections.mockReturnValue({
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isRefetchError: false,
    refetch: vi.fn(),
  });
  hookMocks.useCreateConnection.mockReturnValue({
    create: hookMocks.createConnection,
    error: null,
    isError: false,
    isPending: false,
  });
  onConnectionIdChange.mockReset();
});

describe("connection creation dialog", () => {
  it("validates the Provider step before revealing Endpoint settings", async () => {
    const user = userEvent.setup();
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));

    expect(screen.getByLabelText("连接名称")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByLabelText("上游 Base URL")).not.toBeInTheDocument();
  });

  it("selects the newly created connection and closes the dialog", async () => {
    const user = userEvent.setup();
    hookMocks.createConnection.mockResolvedValue({ id: "conn_new" });
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.type(screen.getByLabelText("连接名称"), "新连接");
    await user.type(screen.getByLabelText("Provider 标识"), "new-provider");
    await user.type(screen.getByLabelText("Provider API Key"), "provider-secret");
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
    await user.type(screen.getByLabelText("上游 Base URL"), "https://provider.example.com");
    await user.click(screen.getByRole("button", { name: "创建连接" }));

    await waitFor(() => {
      expect(onConnectionIdChange).toHaveBeenLastCalledWith("conn_new");
    });
    expect(screen.queryByRole("heading", { name: "添加连接" })).not.toBeInTheDocument();
  });

  it("shows Select labels and updates an untouched recommended request path", async () => {
    const user = userEvent.setup();
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await completeProviderStep(user, "protocol-default");
    const protocol = screen.getByRole("combobox", { name: "协议" });
    const requestPath = screen.getByLabelText("请求路径");
    expect(screen.getByLabelText("上游 Base URL")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("请输入合法的 URL")).not.toBeInTheDocument();
    expect(protocol).toHaveTextContent("OpenAI Chat Completions");

    await user.click(protocol);
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));
    expect(protocol).toHaveTextContent("OpenAI Responses");
    expect(requestPath).toHaveValue("/v1/responses");
  });

  it("preserves a manually edited request path when the protocol changes", async () => {
    const user = userEvent.setup();
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await completeProviderStep(user, "protocol-custom");
    const protocol = screen.getByRole("combobox", { name: "协议" });
    const requestPath = screen.getByLabelText("请求路径");
    await user.clear(requestPath);
    await user.type(requestPath, "/custom/chat");
    await user.click(protocol);
    await user.click(screen.getByRole("option", { name: "Anthropic Messages" }));

    expect(protocol).toHaveTextContent("Anthropic Messages");
    expect(requestPath).toHaveValue("/custom/chat");
  });
});

describe("connection creation bindings", () => {
  it("adds and removes compact Endpoint and Key rows, then submits explicit bindings", async () => {
    const user = userEvent.setup();
    hookMocks.createConnection.mockResolvedValue({ id: "conn_batch" });
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.type(screen.getByLabelText("连接名称"), "批量连接");
    await user.type(screen.getByLabelText("Provider 标识"), "batch-provider");
    await user.type(screen.getByLabelText("Provider API Key"), "batch-secret-a");
    await user.click(screen.getByRole("button", { name: "添加 Key" }));
    await user.type(screen.getByLabelText("Provider API Key 2"), "batch-secret-b");
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));

    await user.type(screen.getByLabelText("上游 Base URL"), "https://batch.example");
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));
    expect(screen.getAllByRole("button", { name: "删除 Endpoint" })).toHaveLength(2);
    const protocols = screen.getAllByRole("combobox");
    await user.click(protocols[1]!);
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));
    const paths = screen.getAllByLabelText("请求路径");
    expect(paths[1]).toHaveValue("/v1/responses");
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes.at(-1)!);

    await user.click(screen.getAllByRole("button", { name: "删除 Endpoint" })[1]!);
    expect(screen.getAllByRole("button", { name: "删除 Endpoint" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "创建连接" }));

    await waitFor(() => expect(hookMocks.createConnection).toHaveBeenCalledOnce());
    const payload = hookMocks.createConnection.mock.calls[0]![0];
    expect(payload.endpoints).toHaveLength(1);
    expect(payload.accounts[0].credentials).toHaveLength(2);
    expect(payload.endpoints[0].credentialRefs).toEqual(
      expect.arrayContaining([
        payload.accounts[0].credentials[0].ref,
        payload.accounts[0].credentials[1].ref,
      ]),
    );
    expect(payload.accounts[0].credentials.map((credential: { secret: string }) => credential.secret)).toEqual([
      "batch-secret-a",
      "batch-secret-b",
    ]);
  });

  it("keeps request-local refs unique when adding another account", async () => {
    const user = userEvent.setup();
    hookMocks.createConnection.mockResolvedValue({ id: "conn_multi_account" });
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.type(screen.getByLabelText("连接名称"), "多账号连接");
    await user.type(screen.getByLabelText("Provider 标识"), "multi-account");
    await user.type(screen.getByLabelText("Provider API Key"), "account-a-secret");
    await user.click(screen.getByRole("button", { name: "添加账号" }));
    const accountNames = screen.getAllByLabelText("账号名称");
    await user.clear(accountNames[1]!);
    await user.type(accountNames[1]!, "备用账号");
    const secrets = screen.getAllByLabelText("Provider API Key");
    await user.type(secrets[1]!, "account-b-secret");
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
    await user.type(screen.getByLabelText("上游 Base URL"), "https://multi-account.example");
    await user.click(screen.getByRole("button", { name: "创建连接" }));

    await waitFor(() => expect(hookMocks.createConnection).toHaveBeenCalledOnce());
    const payload = hookMocks.createConnection.mock.calls[0]![0];
    const credentialRefs = payload.accounts.flatMap((account: { credentials: { ref: string }[] }) => account.credentials.map(credential => credential.ref));
    expect(new Set(credentialRefs).size).toBe(credentialRefs.length);
    expect(payload.endpoints[0].credentialRefs).toEqual(expect.arrayContaining(credentialRefs));
  });

  it("shows a binding error without mutating, then submits after the Key is rebound", async () => {
    const user = userEvent.setup();
    hookMocks.createConnection.mockResolvedValue({ id: "conn_rebound" });
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.type(screen.getByLabelText("连接名称"), "绑定校验");
    await user.type(screen.getByLabelText("Provider 标识"), "binding-check");
    await user.type(screen.getByLabelText("Provider API Key"), "binding-secret");
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
    await user.type(screen.getByLabelText("上游 Base URL"), "https://binding.example");
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "创建连接" }));

    await waitFor(() => expect(screen.getByText("此 Key 尚未绑定 Endpoint，请在步骤 2 的绑定区域勾选。")).toBeVisible());
    expect(hookMocks.createConnection).not.toHaveBeenCalled();
    expect(screen.getByLabelText("上游 Base URL")).toHaveValue("https://binding.example");

    await user.click(screen.getByRole("button", { name: "上一步" }));
    expect(screen.getByLabelText("Provider API Key")).toHaveValue("binding-secret");
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "创建连接" }));
    await waitFor(() => expect(hookMocks.createConnection).toHaveBeenCalledOnce());
  });

  it("keeps all entered rows after a failed create so the user can correct and retry", async () => {
    const user = userEvent.setup();
    hookMocks.createConnection.mockRejectedValue(new Error("创建失败"));
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.type(screen.getByLabelText("连接名称"), "失败后保留");
    await user.type(screen.getByLabelText("Provider 标识"), "failed-create");
    await user.type(screen.getByLabelText("Provider API Key"), "failed-secret");
    await user.click(screen.getByRole("button", { name: "添加 Key" }));
    await user.type(screen.getByLabelText("Provider API Key 2"), "failed-secret-two");
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
    await user.type(screen.getByLabelText("上游 Base URL"), "https://failed.example");
    await user.click(screen.getByRole("button", { name: "创建连接" }));

    await waitFor(() => expect(hookMocks.createConnection).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("上游 Base URL")).toHaveValue("https://failed.example");
    await user.click(screen.getByRole("button", { name: "上一步" }));
    expect(screen.getByLabelText("连接名称")).toHaveValue("失败后保留");
    expect(screen.getByLabelText("Provider API Key")).toHaveValue("failed-secret");
    expect(screen.getByLabelText("Provider API Key 2")).toHaveValue("failed-secret-two");
  });
});

async function completeProviderStep(user: ReturnType<typeof userEvent.setup>, slug: string) {
  await user.type(screen.getByLabelText("连接名称"), `连接 ${slug}`);
  await user.type(screen.getByLabelText("Provider 标识"), slug);
  await user.type(screen.getByLabelText("Provider API Key"), "provider-secret");
  await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
}

function renderConnectionsPage() {
  return render(
    <ConnectionsPage
      connectionId={undefined}
      connectionTab="overview"
      modelBindings={{ data: [], error: null, loading: false, onRetry: vi.fn(), stale: false }}
      onConnectionIdChange={onConnectionIdChange}
      onConnectionTabChange={vi.fn()}
    />,
  );
}
