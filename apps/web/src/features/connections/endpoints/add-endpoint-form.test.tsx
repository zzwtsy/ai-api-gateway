import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { connectionFixture } from "../detail/connection-detail.test-fixtures";
import { EndpointDirectory } from "./endpoint-directory";

const hookMocks = vi.hoisted(() => ({
  addEndpoint: vi.fn(),
  useAddConnectionEndpoint: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { readonly children: ReactNode }) => <a href="/models">{children}</a>,
}));
vi.mock("../hooks", () => ({
  useAddConnectionEndpoint: hookMocks.useAddConnectionEndpoint,
}));

beforeEach(() => {
  hookMocks.addEndpoint.mockReset();
  hookMocks.useAddConnectionEndpoint.mockReturnValue({
    add: hookMocks.addEndpoint,
    error: null,
    isError: false,
    isPending: false,
  });
});

describe("Endpoint batch draft", () => {
  it("submits two ordered Endpoints with independent paths and complete fields", async () => {
    const user = userEvent.setup();
    hookMocks.addEndpoint.mockResolvedValue({});
    render(<EndpointDirectory connection={connectionFixture} />);

    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));
    await user.type(screen.getByLabelText("Endpoint 名称"), "Chat Endpoint");
    await user.click(screen.getByRole("button", { name: "再添加一个 Endpoint" }));
    const names = screen.getAllByLabelText("Endpoint 名称");
    const protocols = screen.getAllByRole("combobox", { name: "协议" });
    const authSchemes = screen.getAllByRole("combobox", { name: "鉴权方式" });
    const paths = screen.getAllByLabelText("请求路径");
    await user.type(names[1]!, "Responses Endpoint");
    await user.clear(paths[0]!);
    await user.type(paths[0]!, "/custom/chat");
    await user.click(protocols[0]!);
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));
    await user.click(protocols[1]!);
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));
    await user.click(authSchemes[0]!);
    await user.click(screen.getByRole("option", { name: "X-API-Key" }));
    await user.click(screen.getAllByRole("checkbox", { name: "支持流式响应" })[0]!);

    expect(paths[0]).toHaveValue("/custom/chat");
    expect(paths[1]).toHaveValue("/v1/responses");
    screen.getAllByRole("checkbox", { name: /主账号 · 主 Key/u }).forEach(checkbox => expect(checkbox).toBeChecked());
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));

    expect(hookMocks.addEndpoint).toHaveBeenCalledWith("provider_01", { endpoints: [
      {
        name: "Chat Endpoint",
        protocol: "openai-responses",
        baseUrl: "https://api.example.com",
        requestPath: "/custom/chat",
        authScheme: "x-api-key",
        supportsStreaming: false,
        credentialIds: ["credential_01"],
      },
      {
        name: "Responses Endpoint",
        protocol: "openai-responses",
        baseUrl: "https://api.example.com",
        requestPath: "/v1/responses",
        authScheme: "bearer",
        supportsStreaming: true,
        credentialIds: ["credential_01"],
      },
    ] });
    expect(screen.queryByRole("heading", { name: "添加 Endpoint" })).not.toBeInTheDocument();
  });

  it("keeps values attached to stable field ids when another row is removed", async () => {
    const user = userEvent.setup();
    render(<EndpointDirectory connection={connectionFixture} />);
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));
    await user.type(screen.getByLabelText("Endpoint 名称"), "First Endpoint");
    await user.click(screen.getByRole("button", { name: "再添加一个 Endpoint" }));
    await user.type(screen.getAllByLabelText("Endpoint 名称")[1]!, "Second Endpoint");
    await user.click(screen.getAllByRole("button", { name: "删除此行" })[0]!);

    expect(screen.getAllByLabelText("Endpoint 名称")).toHaveLength(1);
    expect(screen.getByLabelText("Endpoint 名称")).toHaveValue("Second Endpoint");
    expect(screen.getByRole("button", { name: "删除此行" })).toBeDisabled();
  });
});

describe("Endpoint batch dialog", () => {
  it("blocks dismissal during a failed owned transaction and preserves its draft and error", async () => {
    const user = userEvent.setup();
    let rejectAdd!: (error: Error) => void;
    const mutationState = {
      add: hookMocks.addEndpoint,
      error: null as Error | null,
      isError: false,
      isPending: false,
    };
    hookMocks.addEndpoint.mockReturnValue(new Promise((_, reject) => {
      rejectAdd = reject;
    }));
    hookMocks.useAddConnectionEndpoint.mockReturnValue(mutationState);
    render(<EndpointDirectory connection={connectionFixture} />);
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));
    await user.type(screen.getByLabelText("Endpoint 名称"), "Duplicate Endpoint");
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));

    await user.keyboard("{Escape}");
    expect(screen.getByRole("heading", { name: "添加 Endpoint" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    const overlay = document.querySelector<HTMLElement>("[data-slot='dialog-overlay']");
    expect(overlay).not.toBeNull();
    await user.click(overlay!);
    expect(screen.getByRole("heading", { name: "添加 Endpoint" })).toBeVisible();

    const error = new Error("Endpoint 名称冲突");
    mutationState.error = error;
    mutationState.isError = true;
    rejectAdd(error);
    await waitFor(() => expect(screen.getByText("Endpoint 名称冲突")).toBeVisible());
    expect(screen.getByLabelText("Endpoint 名称")).toHaveValue("Duplicate Endpoint");
  });

  it("closes after a successful owned transaction and restores trigger focus", async () => {
    const user = userEvent.setup();
    let resolveAdd!: () => void;
    hookMocks.addEndpoint.mockReturnValue(new Promise<void>((resolve) => {
      resolveAdd = resolve;
    }));
    render(<EndpointDirectory connection={connectionFixture} />);
    const trigger = screen.getByRole("button", { name: "添加 Endpoint" });
    await user.click(trigger);
    await user.type(screen.getByLabelText("Endpoint 名称"), "Created Endpoint");
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));

    resolveAdd();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "添加 Endpoint" })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("restores trigger focus after Escape and cancel, then reopens cleanly", async () => {
    const user = userEvent.setup();
    render(<EndpointDirectory connection={connectionFixture} />);
    const trigger = screen.getByRole("button", { name: "添加 Endpoint" });
    await user.click(trigger);
    await user.type(screen.getByLabelText("Endpoint 名称"), "Discarded Endpoint");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("heading", { name: "添加 Endpoint" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getByLabelText("Endpoint 名称")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(trigger).toHaveFocus();
  });

  it("uses fixed regions and locks controls while pending", async () => {
    const user = userEvent.setup();
    hookMocks.useAddConnectionEndpoint.mockReturnValue({
      add: hookMocks.addEndpoint,
      error: null,
      isError: false,
      isPending: true,
    });
    render(<EndpointDirectory connection={connectionFixture} />);
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("flex", "min-h-0", "flex-col", "max-h-[calc(100dvh-2rem)]", "gap-0", "overflow-hidden", "p-0");
    expect(dialog.querySelector("[data-slot='dialog-header']")).toHaveClass("shrink-0");
    expect(dialog.querySelector("form > div")).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    expect(dialog.querySelector("[data-slot='dialog-footer']")).toHaveClass("shrink-0");
    expect(screen.getByLabelText("Endpoint 名称")).toBeDisabled();
    expect(screen.getByRole("button", { name: "再添加一个 Endpoint" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "添加中添加 Endpoint" })).toBeDisabled();
  });
});
