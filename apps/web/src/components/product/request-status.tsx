import { StatusBadge } from "@/components/product/status-badge";

type RequestOutcome = "running" | "succeeded" | "failed" | "client_cancelled";

export function RequestStatus({ outcome }: { readonly outcome: RequestOutcome }) {
  switch (outcome) {
    case "succeeded":
      return <StatusBadge tone="success">成功</StatusBadge>;
    case "failed":
      return <StatusBadge tone="danger">失败</StatusBadge>;
    case "client_cancelled":
      return <StatusBadge tone="warning">已取消</StatusBadge>;
    case "running":
      return <StatusBadge tone="neutral">进行中</StatusBadge>;
  }
}
