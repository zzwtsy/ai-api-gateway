import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ModelsRoutePage } from "@/routes/-components/models-route-page";

const modelSearchSchema = z.object({
  modelBindingId: z.string().optional(),
});

export const Route = createFileRoute("/_workspace/models")({
  validateSearch: modelSearchSchema,
  component: function ModelsRoute() {
    const { modelBindingId } = Route.useSearch();
    const navigate = Route.useNavigate();

    return (
      <ModelsRoutePage
        modelBindingId={modelBindingId}
        onModelBindingIdChange={(nextModelBindingId, options) => {
          void navigate({
            replace: options?.replace ?? false,
            search: previous => ({
              ...previous,
              modelBindingId: nextModelBindingId,
            }),
          });
        }}
      />
    );
  },
});
