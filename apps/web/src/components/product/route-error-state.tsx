import type { ErrorComponentProps } from "@tanstack/react-router";

import { DataErrorState } from "@/components/product/data-error-state";

export function RouteErrorState({ reset }: ErrorComponentProps) {
  return (
    <DataErrorState
      className="mx-auto max-w-2xl"
      title="无法显示页面"
      description="页面渲染失败。请重新加载；如果问题持续，请检查 Gateway 日志。"
      onRetry={reset}
    />
  );
}
