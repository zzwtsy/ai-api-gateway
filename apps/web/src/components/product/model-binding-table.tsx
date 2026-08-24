import { StatusBadge } from "@/components/product/status-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ModelBindingTableItem {
  readonly endpointId: string;
  readonly id: string;
  readonly name: string;
  readonly status: "unverified" | "available" | "deprecated" | "unavailable";
  readonly upstreamModelId: string;
}

export function ModelBindingTable({
  bindings,
  endpointColumnLabel,
  endpointNames,
  showMetadata = false,
}: {
  readonly bindings: readonly ModelBindingTableItem[];
  readonly endpointColumnLabel: string;
  readonly endpointNames: ReadonlyMap<string, string>;
  readonly showMetadata?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>模型</TableHead>
          <TableHead>上游模型 ID</TableHead>
          <TableHead>{endpointColumnLabel}</TableHead>
          <TableHead>状态</TableHead>
          {showMetadata && <TableHead>元数据</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {bindings.map(binding => (
          <TableRow key={binding.id}>
            <TableCell className="font-medium">{binding.name}</TableCell>
            <TableCell><code className="text-xs">{binding.upstreamModelId}</code></TableCell>
            <TableCell>{endpointNames.get(binding.endpointId) ?? binding.endpointId}</TableCell>
            <TableCell>
              <StatusBadge tone={modelStatusTone(binding.status)}>
                {modelStatusLabel(binding.status)}
              </StatusBadge>
            </TableCell>
            {showMetadata && <TableCell><Badge variant="secondary">能力与价格未知</Badge></TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function modelStatusLabel(status: ModelBindingTableItem["status"]): string {
  return { unverified: "未验证", available: "可用", deprecated: "已弃用", unavailable: "不可用" }[status];
}

function modelStatusTone(status: ModelBindingTableItem["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "available")
    return "success";
  if (status === "unverified")
    return "warning";
  if (status === "unavailable")
    return "danger";
  return "neutral";
}
