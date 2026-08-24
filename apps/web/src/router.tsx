import { createRouter } from "@tanstack/react-router";

import { RouteErrorState } from "@/components/product/route-error-state";
import { queryClient } from "@/lib/query-client";

import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultErrorComponent: RouteErrorState,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
