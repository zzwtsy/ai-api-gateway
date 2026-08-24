import type { UpstreamRequest } from "./contracts.js";

const forbiddenForwardedHeaders = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "keep-alive",
  "proxy-authorization",
  "transfer-encoding",
  "upgrade",
]);

/** Assert transport inputs before a connection pool observes them. */
export function assertUpstreamRequestInvariant(input: UpstreamRequest): void {
  let origin: URL;
  try {
    origin = new URL(input.origin);
  } catch {
    throw new TransportInvariantError("origin must be an absolute URL");
  }
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== input.origin) {
    throw new TransportInvariantError("origin must contain only an http(s) origin");
  }
  if (!input.path.startsWith("/") || input.path.startsWith("//")) {
    throw new TransportInvariantError("path must be origin-relative and start with one slash");
  }
  if (input.method === "GET" && input.body.byteLength !== 0) {
    throw new TransportInvariantError("GET transport request body must be empty");
  }
  for (const name of Object.keys(input.headers)) {
    if (forbiddenForwardedHeaders.has(name.toLowerCase())) {
      throw new TransportInvariantError(`forbidden forwarded header: ${name}`);
    }
  }
  if (typeof input.signal.aborted !== "boolean" || typeof input.signal.addEventListener !== "function") {
    throw new TransportInvariantError("transport request requires an AbortSignal");
  }
}

export class TransportInvariantError extends Error {
  public override readonly name = "TransportInvariantError";
}
