import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/routes/-components/overview-page";

export const Route = createFileRoute("/_workspace/")({
  component: OverviewPage,
});
