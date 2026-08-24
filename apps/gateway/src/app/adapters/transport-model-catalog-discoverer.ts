import type {
  EndpointRecord,
  ModelCatalogDiscoverer,
  ModelCatalogDiscoveryResult,
} from "../../control-plane/features/connections/contracts.js";
import type { TransportRegistry, UpstreamResponse } from "../../data-plane/transport/contracts.js";

import { Buffer } from "node:buffer";

import { classifyProbeStatus } from "./transport-probe.js";

const MAX_MODEL_CATALOG_BYTES = 1024 * 1024;

export class TransportModelCatalogDiscoverer implements ModelCatalogDiscoverer {
  public constructor(
    private readonly transport: TransportRegistry,
    private readonly timeoutMs: number,
  ) {}

  public async discover(input: {
    readonly endpoint: EndpointRecord;
    readonly modelsPath: string;
    readonly secret: string;
  }): Promise<ModelCatalogDiscoveryResult> {
    const target = resolveModelCatalogTarget(input.endpoint, input.modelsPath);
    try {
      const response = await this.transport.request({
        ...target,
        method: "GET",
        headers: modelCatalogHeaders(input.endpoint, input.secret),
        body: new Uint8Array(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (response.statusCode < 200 || response.statusCode >= 300) {
        await drain(response.body);
        const classification = classifyProbeStatus(response.statusCode);
        return {
          outcome: "failed",
          classification: classification === "auth_failed" ? "auth_failed" : "upstream_rejected",
          statusCode: response.statusCode,
        };
      }
      const body = await readBoundedBody(response);
      const modelIds = parseOpenAIModelIds(body);
      return modelIds === null
        ? { outcome: "failed", classification: "invalid_response", statusCode: response.statusCode }
        : { outcome: "succeeded", modelIds };
    } catch {
      return { outcome: "failed", classification: "unavailable", statusCode: null };
    }
  }
}

function resolveModelCatalogTarget(endpoint: EndpointRecord, modelsPath: string) {
  const url = new URL(endpoint.baseUrl);
  const prefix = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return { origin: url.origin, path: `${prefix}${modelsPath}` };
}

function modelCatalogHeaders(endpoint: EndpointRecord, secret: string): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (endpoint.authScheme === "bearer")
    headers.authorization = `Bearer ${secret}`;
  else
    headers["x-api-key"] = secret;
  return headers;
}

async function readBoundedBody(response: UpstreamResponse): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_MODEL_CATALOG_BYTES)
      throw new Error("model catalog response exceeds limit");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function drain(body: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const chunk of body)
    void chunk;
}

function parseOpenAIModelIds(body: string): readonly string[] | null {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isRecord(value) || !Array.isArray(value.data))
    return null;
  const ids = value.data.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.trim() === "")
      return null;
    return item.id;
  });
  if (ids.includes(null))
    return null;
  return [...new Set(ids as string[])].sort((left, right) => left.localeCompare(right));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
