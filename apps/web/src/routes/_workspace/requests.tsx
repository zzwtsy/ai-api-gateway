import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RequestsPage } from "@/features/requests/requests-page";

const requestSearchSchema = z.object({
  requestId: z.string().optional(),
});

export const Route = createFileRoute("/_workspace/requests")({
  validateSearch: requestSearchSchema,
  component: function RequestsRoute() {
    const { requestId } = Route.useSearch();
    return <RequestsPage requestId={requestId} />;
  },
});
