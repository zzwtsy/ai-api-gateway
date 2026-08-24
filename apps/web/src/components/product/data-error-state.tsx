import { CircleX, RefreshCw, TriangleAlert } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataErrorStateProps {
  readonly className?: string;
  readonly description: string;
  readonly onRetry?: () => Promise<unknown> | void;
  readonly title: string;
  readonly tone?: "error" | "warning";
}

export function DataErrorState({
  className,
  description,
  onRetry,
  title,
  tone = "error",
}: DataErrorStateProps) {
  const Icon = tone === "error" ? CircleX : TriangleAlert;
  return (
    <Alert
      variant={tone === "error" ? "destructive" : "default"}
      className={cn(tone === "warning" && "border-warning/20 bg-warning/10", className)}
    >
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {onRetry !== undefined && (
        <AlertAction>
          <Button size="sm" variant="outline" onClick={() => void onRetry()}>
            <RefreshCw data-icon="inline-start" />
            重新加载
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
