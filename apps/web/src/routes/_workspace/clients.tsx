import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ClientsPage } from "@/features/clients/clients-page";

const clientSearchSchema = z.object({
  clientId: z.string().optional(),
});

export const Route = createFileRoute("/_workspace/clients")({
  validateSearch: clientSearchSchema,
  component: function ClientsRoute() {
    const { clientId } = Route.useSearch();
    const navigate = Route.useNavigate();

    return (
      <ClientsPage
        clientId={clientId}
        onClientIdChange={(nextClientId, options) => {
          void navigate({
            replace: options?.replace ?? false,
            search: previous => ({
              ...previous,
              clientId: nextClientId,
            }),
          });
        }}
      />
    );
  },
});
