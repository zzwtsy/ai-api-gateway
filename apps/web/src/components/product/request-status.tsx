import { Badge } from "@/components/ui/badge";

type RequestOutcome = "running" | "succeeded" | "failed" | "client_cancelled";

export function RequestStatus({ outcome }: { readonly outcome: RequestOutcome }) {
  switch (outcome) {
    case "succeeded":
      return <Badge variant="success">成功</Badge>;
    case "failed":
      return <Badge variant="destructive">失败</Badge>;
    case "client_cancelled":
      return <Badge variant="warning">已取消</Badge>;
    case "running":
      return <Badge variant="secondary">进行中</Badge>;
  }
}
