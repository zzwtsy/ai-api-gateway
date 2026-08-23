import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneClassNames = {
  success: "border-success/20 bg-success/10 text-success-foreground",
  warning: "border-warning/20 bg-warning/10 text-warning-foreground",
} as const;

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "variant"> & {
  readonly tone: "success" | "warning" | "danger" | "neutral";
};

export function StatusBadge({ tone, className, ...props }: StatusBadgeProps) {
  if (tone === "danger") {
    return <Badge variant="destructive" className={className} {...props} />;
  }

  if (tone === "neutral") {
    return <Badge variant="secondary" className={className} {...props} />;
  }

  return (
    <Badge
      variant="outline"
      className={cn(toneClassNames[tone], className)}
      {...props}
    />
  );
}
