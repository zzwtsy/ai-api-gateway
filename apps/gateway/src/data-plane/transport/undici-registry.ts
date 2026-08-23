import { Pool } from "undici";

import type { Env } from "../../config/env-schema.js";
import type { TransportRegistry, UpstreamRequest, UpstreamResponse } from "./contracts.js";
import { assertUpstreamRequestInvariant } from "./invariant.js";

export class UndiciTransportRegistry implements TransportRegistry {
  readonly #pools = new Map<string, Pool>();

  public constructor(private readonly env: Env) {}

  public async request(input: UpstreamRequest): Promise<UpstreamResponse> {
    assertUpstreamRequestInvariant(input);
    const pool = this.#getPool(input.origin);
    const response = await pool.request({
      method: input.method,
      path: input.path,
      headers: input.headers,
      body: input.body,
      signal: input.signal,
    });
    return {
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
    };
  }

  public async close(): Promise<void> {
    await Promise.all([...this.#pools.values()].map(async (pool) => pool.close()));
    this.#pools.clear();
  }

  #getPool(origin: string): Pool {
    const existing = this.#pools.get(origin);
    if (existing !== undefined) {
      return existing;
    }
    const pool = new Pool(origin, {
      connections: this.env.UPSTREAM_CONNECTIONS,
      pipelining: 1,
      connectTimeout: this.env.UPSTREAM_CONNECT_TIMEOUT_MS,
      headersTimeout: this.env.UPSTREAM_HEADERS_TIMEOUT_MS,
      bodyTimeout: this.env.UPSTREAM_BODY_IDLE_TIMEOUT_MS,
    });
    this.#pools.set(origin, pool);
    return pool;
  }
}
