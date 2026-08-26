import type { ReactNode } from "react";
import type { components } from "@/api/schema";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { connectionFixture } from "../detail/connection-detail.test-fixtures";
import { EndpointDirectory } from "./endpoint-directory";

const hookMocks = vi.hoisted(() => ({
  addEndpoint: vi.fn(),
  updateEndpoint: vi.fn(),
  useAddConnectionEndpoint: vi.fn(),
  useUpdateEndpoint: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { readonly children: ReactNode }) => <a href="/models">{children}</a>,
}));
vi.mock("../hooks", () => ({
  useAddConnectionEndpoint: hookMocks.useAddConnectionEndpoint,
  useUpdateEndpoint: hookMocks.useUpdateEndpoint,
}));

beforeEach(() => {
  hookMocks.addEndpoint.mockReset();
  hookMocks.updateEndpoint.mockReset();
  hookMocks.useAddConnectionEndpoint.mockReturnValue({
    add: hookMocks.addEndpoint,
    error: null,
    isError: false,
    isPending: false,
  });
  hookMocks.useUpdateEndpoint.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    update: hookMocks.updateEndpoint,
  });
});

describe("Endpoint edit dialog", () => {
  it("loads bindings and submits all editable fields", async () => {
    const user = userEvent.setup();
    hookMocks.updateEndpoint.mockResolvedValue({});
    render(<EndpointDirectory connection={connectionWithSecondCredential()} />);

    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(screen.getByLabelText("Endpoint 名称")).toHaveValue("主 Endpoint");
    expect(screen.getByRole("checkbox", { name: /主账号 · 主 Key/u })).toBeChecked();
    await user.clear(screen.getByLabelText("Endpoint 名称"));
    await user.type(screen.getByLabelText("Endpoint 名称"), "Responses Endpoint");
    await user.click(screen.getByRole("combobox", { name: "协议" }));
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));
    expect(screen.getByLabelText("请求路径")).toHaveValue("/v1/responses");
    await user.clear(screen.getByLabelText("上游 Base URL"));
    await user.type(screen.getByLabelText("上游 Base URL"), "https://responses.example.com");
    await user.click(screen.getByRole("combobox", { name: "鉴权方式" }));
    await user.click(screen.getByRole("option", { name: "X-API-Key" }));
    await user.click(screen.getByRole("checkbox", { name: "支持流式响应" }));
    await user.click(screen.getByRole("checkbox", { name: /备用 Key/u }));
    await user.click(screen.getByRole("button", { name: "保存修改" }));

    expect(hookMocks.updateEndpoint).toHaveBeenCalledWith("endpoint_01", {
      authScheme: "x-api-key",
      baseUrl: "https://responses.example.com",
      credentialIds: ["credential_01", "credential_02"],
      name: "Responses Endpoint",
      protocol: "openai-responses",
      requestPath: "/v1/responses",
      supportsStreaming: false,
    });
    expect(screen.queryByRole("heading", { name: "编辑 Endpoint" })).not.toBeInTheDocument();
  });

  it("requires an explicitly removed disabled binding and prevents reselecting it", async () => {
    const user = userEvent.setup();
    hookMocks.updateEndpoint.mockResolvedValue({});
    render(<EndpointDirectory connection={connectionWithDisabledBinding()} />);
    await user.click(screen.getByRole("button", { name: "编辑" }));

    const disabledBinding = screen.getByRole("checkbox", { name: /已禁用，保存前需取消绑定/u });
    expect(disabledBinding).toBeChecked();
    expect(disabledBinding).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    expect(screen.getByText("请先取消绑定已禁用的 Credential")).toBeVisible();
    expect(hookMocks.updateEndpoint).not.toHaveBeenCalled();
    await user.click(disabledBinding);
    expect(disabledBinding).not.toBeChecked();
    expect(disabledBinding).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    expect(hookMocks.updateEndpoint).toHaveBeenCalledWith("endpoint_01", expect.objectContaining({ credentialIds: ["credential_01"] }));
  });

  it("keeps custom paths and failed edits, then resets current values when reopened", async () => {
    const user = userEvent.setup();
    hookMocks.updateEndpoint.mockRejectedValue(new Error("Endpoint 名称冲突"));
    hookMocks.useUpdateEndpoint.mockReturnValue({
      error: new Error("Endpoint 名称冲突"),
      isError: true,
      isPending: false,
      update: hookMocks.updateEndpoint,
    });
    const connection = structuredClone(connectionFixture);
    connection.endpoints[0]!.requestPath = "/custom/path";
    render(<EndpointDirectory connection={connection} />);
    const trigger = screen.getByRole("button", { name: "编辑" });
    await user.click(trigger);
    await user.click(screen.getByRole("combobox", { name: "协议" }));
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));
    expect(screen.getByLabelText("请求路径")).toHaveValue("/custom/path");
    await user.clear(screen.getByLabelText("Endpoint 名称"));
    await user.type(screen.getByLabelText("Endpoint 名称"), "冲突名称");
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    expect(screen.getByText("Endpoint 名称冲突")).toBeVisible();
    expect(screen.getByLabelText("Endpoint 名称")).toHaveValue("冲突名称");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getByLabelText("Endpoint 名称")).toHaveValue("主 Endpoint");
  });

  it("keeps fixed regions and locks controls while pending", async () => {
    const user = userEvent.setup();
    hookMocks.useUpdateEndpoint.mockReturnValue({ error: null, isError: false, isPending: true, update: hookMocks.updateEndpoint });
    render(<EndpointDirectory connection={connectionFixture} />);
    await user.click(screen.getByRole("button", { name: "编辑" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("flex", "min-h-0", "flex-col", "max-h-[calc(100dvh-2rem)]", "gap-0", "overflow-hidden", "p-0");
    expect(dialog.querySelector("[data-slot='dialog-header']")).toHaveClass("shrink-0");
    expect(dialog.querySelector("form > div")).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    expect(dialog.querySelector("[data-slot='dialog-footer']")).toHaveClass("shrink-0");
    expect(screen.getByLabelText("Endpoint 名称")).toBeDisabled();
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存中保存修改" })).toBeDisabled();
  });

  it("blocks Escape during the owned update transaction", async () => {
    const user = userEvent.setup();
    let resolveUpdate!: () => void;
    hookMocks.updateEndpoint.mockReturnValue(new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    }));
    render(<EndpointDirectory connection={connectionFixture} />);
    await user.click(screen.getByRole("button", { name: "编辑" }));
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("heading", { name: "编辑 Endpoint" })).toBeVisible();
    resolveUpdate();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "编辑 Endpoint" })).not.toBeInTheDocument());
  });
});

function connectionWithSecondCredential(): components["schemas"]["Connection"] {
  const connection = structuredClone(connectionFixture);
  connection.accounts[0]!.credentials.push({
    ...connection.accounts[0]!.credentials[0]!,
    id: "credential_02",
    name: "备用 Key",
    endpointIds: [],
  });
  return connection;
}

function connectionWithDisabledBinding(): components["schemas"]["Connection"] {
  const connection = connectionWithSecondCredential();
  connection.accounts[0]!.credentials[1]!.status = "disabled";
  connection.accounts[0]!.credentials[1]!.endpointIds = ["endpoint_01"];
  return connection;
}
