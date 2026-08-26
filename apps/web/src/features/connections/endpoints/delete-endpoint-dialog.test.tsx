import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteEndpointDialog } from "./delete-endpoint-dialog";

const hookMocks = vi.hoisted(() => ({
  refetchImpact: vi.fn(),
  removeEndpoint: vi.fn(),
  useDeleteEndpoint: vi.fn(),
  useEndpointDeletionImpact: vi.fn(),
}));

vi.mock("../hooks", () => ({
  useDeleteEndpoint: hookMocks.useDeleteEndpoint,
  useEndpointDeletionImpact: hookMocks.useEndpointDeletionImpact,
}));

const deletableImpact = {
  credentialBindingCount: 1,
  modelBindingCount: 2,
  compatibilityProfileCount: 3,
  compatibilityFactCount: 4,
  completedProbeRunCount: 5,
  activeProbeRunCount: 0,
  blocked: false,
};

beforeEach(() => {
  hookMocks.refetchImpact.mockReset();
  hookMocks.removeEndpoint.mockReset();
  hookMocks.useDeleteEndpoint.mockReset();
  hookMocks.useEndpointDeletionImpact.mockReset();
  hookMocks.useEndpointDeletionImpact.mockReturnValue({
    data: deletableImpact,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: hookMocks.refetchImpact,
  });
  hookMocks.useDeleteEndpoint.mockReturnValue({
    error: null,
    isError: false,
    remove: hookMocks.removeEndpoint,
  });
});

describe("Endpoint deletion impact", () => {
  it("does not mount the impact query before opening and shows loading while fetching", async () => {
    const user = userEvent.setup();
    hookMocks.useEndpointDeletionImpact.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isFetching: true,
      isPending: true,
      refetch: hookMocks.refetchImpact,
    });
    render(<EndpointDeleteHarness />);

    expect(hookMocks.useEndpointDeletionImpact).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "删除 主 Endpoint" }));

    expect(hookMocks.useEndpointDeletionImpact).toHaveBeenCalledWith("endpoint_01", true);
    expect(screen.getByLabelText("正在加载删除影响")).toBeVisible();
    expect(screen.getByRole("button", { name: "确认删除" })).toBeDisabled();
  });

  it("offers impact retry and never deletes while the impact is unavailable", async () => {
    const user = userEvent.setup();
    hookMocks.refetchImpact.mockResolvedValue({});
    hookMocks.useEndpointDeletionImpact.mockReturnValue({
      data: undefined,
      error: new Error("影响查询不可用"),
      isError: true,
      isFetching: false,
      isPending: false,
      refetch: hookMocks.refetchImpact,
    });
    render(<EndpointDeleteHarness />);
    await user.click(screen.getByRole("button", { name: "删除 主 Endpoint" }));

    expect(screen.getByText("影响查询不可用")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "重新加载" }));
    expect(hookMocks.refetchImpact).toHaveBeenCalledOnce();
    expect(hookMocks.removeEndpoint).not.toHaveBeenCalled();
  });

  it("shows all cascade counts and deletes only after explicit confirmation", async () => {
    const user = userEvent.setup();
    hookMocks.removeEndpoint.mockResolvedValue({});
    render(<EndpointDeleteHarness />);
    await user.click(screen.getByRole("button", { name: "删除 主 Endpoint" }));

    expect(screen.getByText("Credential 绑定").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("模型绑定").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("兼容性 Profile").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("兼容性 Fact").nextSibling).toHaveTextContent("4");
    expect(screen.getByText("已完成 Probe").nextSibling).toHaveTextContent("5");
    expect(screen.getByText("进行中 Probe").nextSibling).toHaveTextContent("0");
    expect(screen.getByText(/已完成 Compatibility Probe 会随 Endpoint 删除/u)).toBeVisible();
    expect(screen.getByText(/已完成 Compatibility Probe 记录会随 Endpoint 一并删除/u)).toBeVisible();
    expect(screen.getAllByText(/历史 Request 和 Attempt/u)).toHaveLength(2);
    expect(screen.queryByText(/已完成测试记录会保留/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/已完成 Probe 仅解除配置关联/u)).not.toBeInTheDocument();
    expect(hookMocks.removeEndpoint).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(hookMocks.removeEndpoint).toHaveBeenCalledWith("endpoint_01");
    await waitFor(() => expect(screen.getByRole("button", { name: "添加 Endpoint" })).toHaveFocus());
  });

  it("explains and blocks deletion while a Probe is active", async () => {
    const user = userEvent.setup();
    hookMocks.useEndpointDeletionImpact.mockReturnValue({
      data: { ...deletableImpact, activeProbeRunCount: 2, blocked: true },
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: hookMocks.refetchImpact,
    });
    render(<EndpointDeleteHarness />);
    await user.click(screen.getByRole("button", { name: "删除 主 Endpoint" }));

    expect(screen.getByText("当前不能删除")).toBeVisible();
    expect(screen.getByText(/2.*个进行中的 Probe/u)).toBeVisible();
    expect(screen.getByRole("button", { name: "确认删除" })).toBeDisabled();
  });
});

describe("Endpoint deletion lifecycle", () => {
  it("keeps the dialog open after DELETE failure and exposes the error", async () => {
    const user = userEvent.setup();
    hookMocks.removeEndpoint.mockRejectedValue(new Error("活跃 Probe 阻止删除"));
    hookMocks.useDeleteEndpoint.mockReturnValue({
      error: new Error("活跃 Probe 阻止删除"),
      isError: true,
      remove: hookMocks.removeEndpoint,
    });
    render(<EndpointDeleteHarness />);
    await user.click(screen.getByRole("button", { name: "删除 主 Endpoint" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(await screen.findByText("无法删除 Endpoint")).toBeVisible();
    expect(screen.getByText("活跃 Probe 阻止删除")).toBeVisible();
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "取消" })).toBeEnabled();
  });

  it("locks duplicate submission and Escape during DELETE", async () => {
    const user = userEvent.setup();
    let resolveRemove!: () => void;
    hookMocks.removeEndpoint.mockReturnValue(new Promise<void>((resolve) => {
      resolveRemove = resolve;
    }));
    render(<EndpointDeleteHarness />);
    await user.click(screen.getByRole("button", { name: "删除 主 Endpoint" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(screen.getByRole("button", { name: "删除中确认删除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(hookMocks.removeEndpoint).toHaveBeenCalledOnce();
    resolveRemove();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("cancels with no DELETE and restores focus to the row trigger", async () => {
    const user = userEvent.setup();
    render(<EndpointDeleteHarness />);
    const trigger = screen.getByRole("button", { name: "删除 主 Endpoint" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(hookMocks.removeEndpoint).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(trigger).toHaveFocus();
  });

  it("moves focus to Add Endpoint if refreshed props remove the deleted row", async () => {
    const user = userEvent.setup();
    let resolveRemove!: () => void;
    hookMocks.removeEndpoint.mockReturnValue(new Promise<void>((resolve) => {
      resolveRemove = resolve;
    }));
    const view = render(<EndpointDeleteHarness />);
    await user.click(screen.getByRole("button", { name: "删除 主 Endpoint" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    view.rerender(<EndpointDeleteHarness showEndpoint={false} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "添加 Endpoint" })).toHaveFocus());
    resolveRemove();
  });
});

function EndpointDeleteHarness({ showEndpoint = true }: { readonly showEndpoint?: boolean }) {
  const addEndpointRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={addEndpointRef} type="button">添加 Endpoint</button>
      {showEndpoint && (
        <DeleteEndpointDialog
          connectionId="provider_01"
          endpointId="endpoint_01"
          endpointName="主 Endpoint"
          successFocusRef={addEndpointRef}
        />
      )}
    </div>
  );
}
