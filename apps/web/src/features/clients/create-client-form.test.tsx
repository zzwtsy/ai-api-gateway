import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { CreateClientForm } from "./create-client-form";

const hookMocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("./hooks", () => ({
  useCreateGatewayClient: () => ({
    create: hookMocks.create,
    error: null,
    isError: false,
    isPending: false,
  }),
  useHarnessProfiles: () => ({
    data: [
      { id: "profile-chat", slug: "generic-openai-chat", name: "通用 OpenAI Chat", allowedProtocols: ["openai-chat"] },
      { id: "profile-codex", slug: "codex", name: "Codex", allowedProtocols: ["openai-responses"] },
    ],
    error: null,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  hookMocks.create.mockReset();
});

it("derives the allowed protocol from the selected Harness Profile", async () => {
  const user = userEvent.setup();
  hookMocks.create.mockResolvedValue({ client: {}, key: "test-key" });
  render(<CreateClientForm onCancel={vi.fn()} onCreated={vi.fn()} />);

  await user.type(screen.getByLabelText("客户端名称"), "Codex · 工作站");
  const profile = screen.getByRole("combobox", { name: "Harness Profile" });
  await user.click(profile);
  await user.click(screen.getByRole("option", { name: "Codex" }));

  expect(profile).toHaveTextContent("Codex");
  expect(profile).not.toHaveTextContent("codex");
  expect(screen.getByText("OpenAI Responses", { exact: true })).toBeVisible();
  expect(screen.queryByRole("combobox", { name: "入口协议" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "创建客户端" }));
  expect(hookMocks.create).toHaveBeenCalledWith({
    allowedProtocols: ["openai-responses"],
    name: "Codex · 工作站",
    profileSlug: "codex",
  });
});

it("offers an explicit cancel action without creating a client", async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(<CreateClientForm onCancel={onCancel} onCreated={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "取消" }));

  expect(onCancel).toHaveBeenCalledOnce();
  expect(hookMocks.create).not.toHaveBeenCalled();
});
