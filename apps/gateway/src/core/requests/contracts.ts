export type ProtocolId = "openai-chat" | "openai-responses" | "anthropic-messages";
export type RequestOutcome = "running" | "succeeded" | "failed" | "client_cancelled";
export type AttemptOutcome = "running" | "succeeded" | "failed" | "client_cancelled";
export type ObservationStatus = "pending" | "complete" | "incomplete";

export interface GatewayRequestRecord {
  readonly id: string;
  readonly clientId: string;
  readonly protocol: ProtocolId;
  readonly requestedModel: string;
  readonly upstreamModel: string;
  readonly routingSnapshotVersion: number;
  readonly stream: boolean;
  readonly outcome: RequestOutcome;
  readonly statusCode: number | null;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly latencyMs: number | null;
  readonly ttftMs: number | null;
  readonly observationStatus: ObservationStatus;
  readonly observedBytes: number;
}

export interface GatewayAttemptRecord {
  readonly id: string;
  readonly requestId: string;
  readonly sequence: number;
  readonly connectionId: string;
  readonly credentialId: string;
  readonly upstreamModel: string;
  readonly outcome: AttemptOutcome;
  readonly statusCode: number | null;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly errorCode: string | null;
  readonly fallbackReason: string | null;
}

export interface RequestWithAttempts extends GatewayRequestRecord {
  readonly attempts: readonly GatewayAttemptRecord[];
}

export interface StartRequestInput {
  readonly id: string;
  readonly clientId: string;
  readonly protocol: ProtocolId;
  readonly requestedModel: string;
  readonly upstreamModel: string;
  readonly routingSnapshotVersion: number;
  readonly stream: boolean;
  readonly startedAt: Date;
}

export interface StartAttemptInput {
  readonly id: string;
  readonly requestId: string;
  readonly sequence: number;
  readonly connectionId: string;
  readonly credentialId: string;
  readonly upstreamModel: string;
  readonly startedAt: Date;
}

export interface CompleteRequestInput {
  readonly id: string;
  readonly outcome: Exclude<RequestOutcome, "running">;
  readonly statusCode: number | null;
  readonly finishedAt: Date;
  readonly latencyMs: number;
  readonly ttftMs: number | null;
  readonly observationStatus: Exclude<ObservationStatus, "pending">;
  readonly observedBytes: number;
}

export interface CompleteAttemptInput {
  readonly id: string;
  readonly outcome: Exclude<AttemptOutcome, "running">;
  readonly statusCode: number | null;
  readonly finishedAt: Date;
  readonly errorCode?: string;
  readonly fallbackReason?: string;
}

export interface StartRequestWithAttemptInput {
  readonly request: StartRequestInput;
  readonly attempt: StartAttemptInput;
}

export interface CompleteRequestWithAttemptInput {
  readonly request: CompleteRequestInput;
  readonly attempt: CompleteAttemptInput;
}

export interface StartedRequestWithAttempt {
  readonly request: GatewayRequestRecord;
  readonly attempt: GatewayAttemptRecord;
}

export interface RequestStore {
  startRequestWithAttempt: (input: StartRequestWithAttemptInput) => Promise<StartedRequestWithAttempt>;
  completeRequestWithAttempt: (input: CompleteRequestWithAttemptInput) => Promise<void>;
  listRequests: (limit: number) => Promise<readonly GatewayRequestRecord[]>;
  getRequest: (id: string) => Promise<RequestWithAttempts | null>;
}
