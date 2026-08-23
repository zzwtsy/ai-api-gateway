const requestHopByHopHeaders = new Set([
  "authorization",
  "connection",
  "cookie",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-api-key",
]);

const responseHopByHopHeaders = new Set([
  "connection",
  "set-cookie",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function buildUpstreamHeaders(headers: Headers, apiKey: string): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (!requestHopByHopHeaders.has(name.toLowerCase())) {
      result[name] = value;
    }
  });
  result.authorization = `Bearer ${apiKey}`;
  result["content-type"] ??= "application/json";
  return result;
}

export function copyUpstreamResponseHeaders(
  setHeader: (name: string, value: string) => void,
  headers: Readonly<Record<string, string | readonly string[] | undefined>>,
): void {
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || responseHopByHopHeaders.has(name.toLowerCase())) {
      continue;
    }
    setHeader(name, Array.isArray(value) ? value.join(", ") : value);
  }
}
