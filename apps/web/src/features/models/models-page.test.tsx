import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelsPage } from "./models-page";

const hookMocks = vi.hoisted(() => ({
  useModelBindings: vi.fn(),
}));
const onModelBindingIdChange = vi.fn();

vi.mock("./hooks", () => hookMocks);
vi.mock("./create-model-binding-form", () => ({
  CreateModelBindingForm: ({ onCancel }: { onCancel: () => void }) => (
    <div>
      模型绑定表单
      <button type="button" onClick={onCancel}>取消</button>
    </div>
  ),
}));

const endpoints = [{
  id: "endpoint_01",
  label: "DeepSeek / 默认 Endpoint",
  protocol: "openai-chat",
  credentials: [],
}] as const;

const binding = {
  id: "binding_01",
  endpointId: "endpoint_01",
  upstreamModelId: "deepseek-chat",
  name: "DeepSeek Chat",
  status: "unverified",
  createdAt: "2026-08-24T08:00:00.000Z",
  updatedAt: "2026-08-24T08:00:00.000Z",
} as const;

describe("models page", () => {
  beforeEach(() => {
    onModelBindingIdChange.mockReset();
    hookMocks.useModelBindings.mockReturnValue(readyQuery([]));
  });

  it("covers UX-MODELS-CREATE-DIALOG: uses the route-owned endpoint directory for binding creation", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "添加模型绑定" }));
    expect(screen.getByText("模型绑定表单")).toBeVisible();
    expect(screen.getByText(/选择目标 Endpoint/u)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("heading", { name: "添加模型绑定" })).not.toBeInTheDocument();
  });

  it("explains the Endpoint prerequisite instead of disabling the create action", async () => {
    const user = userEvent.setup();
    renderPage([]);

    const createButton = screen.getByRole("button", { name: "添加模型绑定" });
    expect(createButton).toBeEnabled();
    await user.click(createButton);

    expect(screen.getByText("没有可绑定的 Endpoint")).toBeVisible();
    expect(screen.getByText(/请先在连接页创建上游 Endpoint/u)).toBeVisible();
    expect(screen.getByRole("button", { name: "取消" })).toBeVisible();
  });

  it("renders endpoint-level bindings without inventing price or capability data", () => {
    hookMocks.useModelBindings.mockReturnValue(readyQuery([binding]));
    renderPage();

    expect(screen.getByText("DeepSeek Chat")).toBeVisible();
    expect(screen.getByText("DeepSeek / 默认 Endpoint")).toBeVisible();
    expect(screen.getByText("未验证")).toBeVisible();
    expect(screen.getByText("能力与价格未知")).toBeVisible();
  });

  it("opens a URL-owned non-modal Inspector with only current model facts", async () => {
    const user = userEvent.setup();
    hookMocks.useModelBindings.mockReturnValue(readyQuery([binding]));
    renderPage(endpoints, "binding_01");

    const inspector = screen.getByRole("region", { name: "DeepSeek Chat" });
    expect(within(inspector).getByText("DeepSeek / 默认 Endpoint")).toBeVisible();
    expect(within(inspector).getByText(/未知不等于不支持或数值为 0/u)).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "DeepSeek Chat" })).not.toBeInTheDocument();

    await user.click(within(inspector).getByRole("button", { name: "关闭模型详情" }));
    expect(onModelBindingIdChange).toHaveBeenCalledWith(undefined, { replace: true });
  });

  it("removes an invalid modelBindingId without selecting the first binding", async () => {
    hookMocks.useModelBindings.mockReturnValue(readyQuery([binding]));
    renderPage(endpoints, "missing-binding");

    await waitFor(() => {
      expect(onModelBindingIdChange).toHaveBeenCalledWith(undefined, { replace: true });
    });
    expect(screen.queryByRole("region", { name: "DeepSeek Chat" })).not.toBeInTheDocument();
  });

  it("covers UX-MODELS-DIRECTORY-LIFECYCLE: keeps cached bindings visible after a refresh failure", () => {
    hookMocks.useModelBindings.mockReturnValue({
      ...readyQuery([binding]),
      error: new Error("刷新失败"),
      isError: true,
      isRefetchError: true,
    });
    renderPage();

    expect(screen.getByText("DeepSeek Chat")).toBeVisible();
    expect(screen.getByText("模型目录可能已过期")).toBeVisible();
    expect(screen.queryByText("尚未创建模型绑定")).not.toBeInTheDocument();
  });
});

function renderPage(endpointOptions: typeof endpoints | [] = endpoints, modelBindingId?: string) {
  return render(
    <ModelsPage
      endpointError={null}
      endpoints={endpointOptions}
      endpointsLoading={false}
      modelBindingId={modelBindingId}
      onModelBindingIdChange={onModelBindingIdChange}
      onRetryEndpoints={vi.fn()}
    />,
  );
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
