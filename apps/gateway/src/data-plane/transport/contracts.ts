export interface UpstreamRequest {
  readonly origin: string;
  readonly path: string;
  readonly method: "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
  readonly signal: AbortSignal;
}

export interface UpstreamResponse {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly body: AsyncIterable<Uint8Array>;
}

export interface TransportRegistry {
  request: (input: UpstreamRequest) => Promise<UpstreamResponse>;
  close: () => Promise<void>;
}
