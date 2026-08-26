import { render, screen, waitFor } from "@testing-library/react";

import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteConnectionDialog } from "./delete-connection-dialog";

const hookMocks = vi.hoisted(() => ({
  refetchImpact: vi.fn(),
  removeConnection: vi.fn(),
  useConnectionDeletionImpact: vi.fn(),
  useDeleteConnection: vi.fn(),
}));

vi.mock("../hooks", () => ({
  useConnectionDeletionImpact: hookMocks.useConnectionDeletionImpact,
  useDeleteConnection: hookMocks.useDeleteConnection,
}));

const deletableImpact = {
  endpointCount: 2,
  accountCount: 2,
  credentialCount: 3,
  credentialBindingCount: 4,
  modelBindingCount: 5,
  compatibilityProfileCount: 6,
  compatibilityFactCount: 7,
  completedProbeRunCount: 8,
  activeProbeRunCount: 0,
  blocked: false,
  blockedReason: null,
};

beforeEach(() => {
  hookMocks.refetchImpact.mockReset();
  hookMocks.removeConnection.mockReset();
  hookMocks.useConnectionDeletionImpact.mockReset();
  hookMocks.useDeleteConnection.mockReset();
  hookMocks.useConnectionDeletionImpact.mockReturnValue({
    data: deletableImpact,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: hookMocks.refetchImpact,
  });
  hookMocks.useDeleteConnection.mockReturnValue({
    error: null,
    isError: false,
    remove: hookMocks.removeConnection,
  });
});

describe("Connection deletion impact", () => {
  it("loads impact only after opening and disables confirmation while loading", async () => {
    const user = userEvent.setup();
    hookMocks.useConnectionDeletionImpact.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isFetching: true,
      isPending: true,
      refetch: hookMocks.refetchImpact,
    });
    render(<ConnectionDeleteHarness />);

    expect(hookMocks.useConnectionDeletionImpact).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "删除连接" }));

    expect(hookMocks.useConnectionDeletionImpact).toHaveBeenCalledWith("connection-01", true);
    expect(screen.getByLabelText("正在加载删除影响")).toBeVisible();
    expect(screen.getByRole("button", { name: "确认删除" })).toBeDisabled();
  });

  it("shows all cascade counts and requires explicit confirmation", async () => {
    const user = userEvent.setup();
    hookMocks.removeConnection.mockResolvedValue({ connectionId: "connection-01" });
    render(<ConnectionDeleteHarness />);

    await user.click(screen.getByRole("button", { name: "删除连接" }));
    expect(screen.getByText("Endpoint").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("账号").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Credential").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Credential 绑定").nextSibling).toHaveTextContent("4");
    expect(screen.getByText("模型绑定").nextSibling).toHaveTextContent("5");
    expect(screen.getByText("Compatibility Profile").nextSibling).toHaveTextContent("6");
    expect(screen.getByText("Compatibility Fact").nextSibling).toHaveTextContent("7");
    expect(screen.getByText("已完成 Probe").nextSibling).toHaveTextContent("8");
    expect(screen.getByText("进行中 Probe").nextSibling).toHaveTextContent("0");
    expect(screen.getByText(/历史 Request 和 Attempt 会保留/u)).toBeVisible();
    expect(hookMocks.removeConnection).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(hookMocks.removeConnection).toHaveBeenCalledWith("connection-01");
    await waitFor(() => expect(screen.getByRole("button", { name: "添加连接" })).toHaveFocus());
  });

  it("offers impact retry and blocks deletion when impact cannot be loaded", async () => {
    const user = userEvent.setup();
    hookMocks.useConnectionDeletionImpact.mockReturnValue({
      data: undefined,
      error: new Error("影响查询不可用"),
      isError: true,
      isFetching: false,
      isPending: false,
      refetch: hookMocks.refetchImpact,
    });
    render(<ConnectionDeleteHarness />);

    await user.click(screen.getByRole("button", { name: "删除连接" }));
    expect(screen.getByText("影响查询不可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "确认删除" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "重新加载" }));

    expect(hookMocks.refetchImpact).toHaveBeenCalledOnce();
    expect(hookMocks.removeConnection).not.toHaveBeenCalled();
  });

  it("blocks deletion for a connection with an active Probe", async () => {
    const user = userEvent.setup();
    hookMocks.useConnectionDeletionImpact.mockReturnValue({
      data: {
        ...deletableImpact,
        activeProbeRunCount: 2,
        blocked: true,
        blockedReason: "active_probe",
      },
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: hookMocks.refetchImpact,
    });
    render(<ConnectionDeleteHarness />);

    await user.click(screen.getByRole("button", { name: "删除连接" }));

    expect(screen.getByText("有 2 个进行中的 Probe，请等待测试结束后重新加载影响。")).toBeVisible();
    expect(screen.getByRole("button", { name: "确认删除" })).toBeDisabled();
  });
});

describe("Connection deletion lifecycle", () => {
  it("keeps the dialog open and recoverable after DELETE failure", async () => {
    const user = userEvent.setup();
    hookMocks.removeConnection.mockRejectedValue(new Error("活跃 Probe 阻止删除"));
    hookMocks.useDeleteConnection.mockReturnValue({
      error: new Error("活跃 Probe 阻止删除"),
      isError: true,
      remove: hookMocks.removeConnection,
    });
    render(<ConnectionDeleteHarness />);

    await user.click(screen.getByRole("button", { name: "删除连接" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(await screen.findByText("无法删除连接")).toBeVisible();
    expect(screen.getByText("活跃 Probe 阻止删除")).toBeVisible();
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "取消" })).toBeEnabled();
  });

  it("calls the parent with the deleted ID and restores focus on cancel", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    hookMocks.removeConnection.mockResolvedValue({ connectionId: "connection-01" });
    render(<ConnectionDeleteHarness onDeleted={onDeleted} />);

    const trigger = screen.getByRole("button", { name: "删除连接" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(onDeleted).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(onDeleted).toHaveBeenCalledWith("connection-01");
  });
});

function ConnectionDeleteHarness({ onDeleted = vi.fn() }: { readonly onDeleted?: (connectionId: string) => void }) {
  const addConnectionRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={addConnectionRef} type="button">添加连接</button>
      <DeleteConnectionDialog
        connectionId="connection-01"
        connectionName="测试连接"
        finalFocus={() => addConnectionRef.current}
        onDeleted={onDeleted}
      />
    </div>
  );
}
