/**
 * Generated contract placeholder for the initial source archive.
 * Run `pnpm api:generate` after installing dependencies; CI then enforces freshness.
 */
export interface paths {
  "/admin/api/v1/connections": {
    get: operations["listConnections"];
    post: operations["createConnection"];
  };
  "/admin/api/v1/connections/{connectionId}": {
    get: operations["getConnectionById"];
  };
  "/admin/api/v1/requests": {
    get: operations["listGatewayRequests"];
  };
  "/admin/api/v1/requests/{requestId}": {
    get: operations["getGatewayRequestById"];
  };
}

export interface components {
  schemas: {
    Connection: Connection;
    GatewayRequest: GatewayRequest;
    GatewayRequestDetail: GatewayRequestDetail;
    ErrorEnvelope: ErrorEnvelope;
  };
}

export interface operations {
  listConnections: {
    responses: { 200: { content: { "application/json": SuccessEnvelope<Connection[]> } } };
  };
  getConnectionById: {
    parameters: { path: { connectionId: string } };
    responses: { 200: { content: { "application/json": SuccessEnvelope<Connection> } } };
  };
  createConnection: {
    requestBody: {
      content: {
        "application/json": Pick<Connection, "name" | "provider" | "protocol" | "baseUrl" | "enabled">;
      };
    };
    responses: { 201: { content: { "application/json": SuccessEnvelope<Connection> } } };
  };
  listGatewayRequests: {
    parameters: { query?: { limit?: number } };
    responses: { 200: { content: { "application/json": SuccessEnvelope<GatewayRequest[]> } } };
  };
  getGatewayRequestById: {
    parameters: { path: { requestId: string } };
    responses: { 200: { content: { "application/json": SuccessEnvelope<GatewayRequestDetail> } } };
  };
}

export interface Connection {
  id: string;
  name: string;
  provider: string;
  protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
  baseUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GatewayRequest {
  id: string;
  clientId: string;
  protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
  requestedModel: string;
  upstreamModel: string;
  routingSnapshotVersion: number;
  stream: boolean;
  outcome: "running" | "succeeded" | "failed" | "client_cancelled";
  statusCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  latencyMs: number | null;
  ttftMs: number | null;
  observationStatus: "pending" | "complete" | "incomplete";
  observedBytes: number;
}

export interface GatewayAttempt {
  id: string;
  requestId: string;
  sequence: number;
  connectionId: string;
  credentialId: string;
  upstreamModel: string;
  outcome: "running" | "succeeded" | "failed" | "client_cancelled";
  statusCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  errorCode: string | null;
  fallbackReason: string | null;
}

export interface GatewayRequestDetail extends GatewayRequest {
  attempts: GatewayAttempt[];
}

export interface SuccessEnvelope<T> {
  success: true;
  code: "COMMON_OK" | "COMMON_CREATED";
  message: string;
  data: T;
  error: null;
  meta: { requestId: string };
}

export interface ErrorEnvelope {
  success: false;
  code: string;
  message: string;
  data: null;
  error: { type: string; details?: Array<{ path: string; message: string }> };
  meta: { requestId: string };
}
