import type {
  CredentialProber,
  CredentialProbeResult,
  EndpointRecord,
} from "../../control-plane/features/connections/contracts.js";
import type { TransportRegistry } from "../../data-plane/transport/contracts.js";

import { classifyProbeStatus, resolveProbeTarget } from "./transport-probe.js";

export class TransportCredentialProber implements CredentialProber {
  public constructor(
    private readonly transport: TransportRegistry,
    private readonly timeoutMs: number,
  ) {}

  public async probe(input: { endpoint: EndpointRecord; model: string; secret: string }): Promise<CredentialProbeResult> {
    const target = resolveProbeTarget(input.endpoint);
    try {
      const response = await this.transport.request({
        origin: target.origin,
        path: target.path,
        method: "POST",
        headers: probeHeaders(input.endpoint, input.secret),
        body: new TextEncoder().encode(JSON.stringify(probeBody(input.endpoint.protocol, input.model))),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      await drain(response.body);
      return { classification: classifyProbeStatus(response.statusCode), statusCode: response.statusCode };
    } catch {
      return { classification: "unavailable", statusCode: null };
    }
  }
}

function probeHeaders(endpoint: EndpointRecord, secret: string): Record<string, string> {
  const headers: Record<string, string> = {
    "accept": "application/json",
    "content-type": "application/json",
  };
  if (endpoint.authScheme === "bearer")
    headers.authorization = `Bearer ${secret}`;
  else
    headers["x-api-key"] = secret;
  if (endpoint.protocol === "anthropic-messages")
    headers["anthropic-version"] = "2023-06-01";
  return headers;
}

function probeBody(protocol: EndpointRecord["protocol"], model: string): object {
  if (protocol === "openai-responses")
    return { model, input: "Reply with OK.", max_output_tokens: 1, stream: false };
  return {
    model,
    messages: [{ role: "user", content: "Reply with OK." }],
    max_tokens: 1,
    stream: false,
  };
}

async function drain(body: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const chunk of body)
    void chunk;
}
