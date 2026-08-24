import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { CreateModelBindingForm } from "./create-model-binding-form";

const hookMocks = vi.hoisted(() => ({ create: vi.fn(), discover: vi.fn(), resetDiscovery: vi.fn() }));

vi.mock("./hooks", () => ({
  useCreateModelBinding: () => ({
    create: hookMocks.create,
    error: null,
    isError: false,
    isPending: false,
  }),
  useDiscoverUpstreamModels: () => ({
    data: undefined,
    discover: hookMocks.discover,
    error: null,
    isError: false,
    isPending: false,
    reset: hookMocks.resetDiscovery,
  }),
}));

const endpoint = {
  id: "endpoint_01",
  label: "DeepSeek / 默认 Endpoint",
  protocol: "openai-chat" as const,
  credentials: [{ id: "credential_01", label: "主账号 · 主 Key · sk-••••abcd" }],
};

it("shows an Endpoint label while submitting its stable ID", async () => {
  const user = userEvent.setup();
  hookMocks.create.mockResolvedValue({});
  render(
    <CreateModelBindingForm
      endpoints={[endpoint]}
      onCreated={vi.fn()}
    />,
  );

  const endpointSelect = screen.getByRole("combobox", { name: "Endpoint" });
  await user.click(endpointSelect);
  await user.click(screen.getByRole("option", { name: "DeepSeek / 默认 Endpoint" }));
  expect(endpointSelect).toHaveTextContent("DeepSeek / 默认 Endpoint");
  expect(endpointSelect).not.toHaveTextContent("endpoint_01");

  await user.type(screen.getByLabelText("上游模型 ID"), "deepseek-chat");
  await user.type(screen.getByLabelText("显示名称"), "DeepSeek Chat");
  await user.click(screen.getByRole("button", { name: "保存模型绑定" }));

  expect(hookMocks.create).toHaveBeenCalledWith({
    endpointId: "endpoint_01",
    name: "DeepSeek Chat",
    upstreamModelId: "deepseek-chat",
  });
});

it("discovers upstream models and fills the selected model ID and name", async () => {
  const user = userEvent.setup();
  hookMocks.discover.mockResolvedValue({ models: [{ id: "deepseek-chat" }, { id: "deepseek-reasoner" }] });
  render(<CreateModelBindingForm endpoints={[endpoint]} onCreated={vi.fn()} />);

  await user.click(screen.getByRole("combobox", { name: "Endpoint" }));
  await user.click(await screen.findByRole("option", { name: "DeepSeek / 默认 Endpoint" }));
  expect(screen.getByRole("combobox", { name: "Credential" })).toHaveTextContent("主账号 · 主 Key");
  await user.click(screen.getByRole("button", { name: "获取上游模型" }));

  expect(hookMocks.discover).toHaveBeenCalledWith("endpoint_01", {
    credentialId: "credential_01",
    modelsPath: "/v1/models",
  });
  const discovered = await screen.findByRole("combobox", { name: "选择上游模型" });
  await user.click(discovered);
  await user.click(await screen.findByRole("option", { name: "deepseek-reasoner" }));

  expect(screen.getByLabelText("上游模型 ID")).toHaveValue("deepseek-reasoner");
  expect(screen.getByLabelText("显示名称")).toHaveValue("deepseek-reasoner");
});
