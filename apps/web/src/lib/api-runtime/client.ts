import type { Middleware } from "openapi-fetch";
import type { paths } from "@/api/schema";
import createFetchClient from "openapi-fetch";

import createReactQueryClient from "openapi-react-query";

const developmentToken = import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_ADMIN_TOKEN ?? "admin_dev_local")
  : undefined;

const developmentAuthMiddleware: Middleware = {
  onRequest({ request }) {
    if (developmentToken !== undefined && !request.headers.has("authorization")) {
      request.headers.set("authorization", `Bearer ${developmentToken}`);
      return request;
    }
    return undefined;
  },
};

export const fetchClient = createFetchClient<paths>({
  baseUrl: window.location.origin,
  credentials: "include",
});

fetchClient.use(developmentAuthMiddleware);

/**
 * OpenAPI-aware TanStack Query adapter. Query keys are derived from
 * HTTP method + path + params instead of being duplicated by hand.
 */
export const api = createReactQueryClient(fetchClient);

export function describeApiError(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) {
    return fallback;
  }
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
