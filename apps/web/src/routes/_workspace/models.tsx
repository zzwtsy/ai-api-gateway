import { createFileRoute } from "@tanstack/react-router";
import { ModelsRoutePage } from "@/routes/-components/models-route-page";

export const Route = createFileRoute("/_workspace/models")({
  component: ModelsRoutePage,
});
