import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { pageManifest } from "@/routes/-page-manifest";

export const Route = createFileRoute("/_workspace")({
  component: () => <AppShell pages={pageManifest} />,
});
