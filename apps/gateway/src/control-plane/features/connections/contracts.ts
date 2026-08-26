import type { EncryptedSecret } from "../../../core/crypto/secret-cipher.js";

export type ConnectionProtocol = "openai-chat" | "openai-responses" | "anthropic-messages";
export type BillingMode = "metered" | "subscription" | "free" | "custom" | "unknown";
export type CredentialStatus = "unverified" | "healthy" | "auth_failed" | "unavailable" | "disabled";

export const connectionCreationLimits = {
  maxEndpoints: 32,
  maxAccounts: 32,
  maxCredentialsPerAccount: 64,
  maxCredentialBindingsPerEndpoint: 64,
  maxCredentials: 256,
} as const;

export interface EndpointRecord {
  readonly id: string;
  readonly name: string;
  readonly protocol: ConnectionProtocol;
  readonly baseUrl: string;
  readonly requestPath: string;
  readonly authScheme: "bearer" | "x-api-key";
  readonly supportsStreaming: boolean;
  readonly status: "active" | "disabled";
}

export interface CredentialRecord {
  readonly id: string;
  readonly name: string;
  readonly maskedDisplay: string;
  readonly status: CredentialStatus;
  readonly endpointIds: readonly string[];
  readonly lastSuccessAt: Date | null;
  readonly lastFailureAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly rotatedAt: Date | null;
  readonly disabledAt: Date | null;
}

export interface AccountRecord {
  readonly id: string;
  readonly name: string;
  readonly billingMode: BillingMode;
  readonly status: "active" | "disabled";
  readonly credentials: readonly CredentialRecord[];
}

export interface ConnectionRecord {
  readonly id: string;
  readonly name: string;
  readonly providerSlug: string;
  readonly presetKind: "built-in" | "custom";
  readonly status: "active" | "disabled";
  readonly endpoints: readonly EndpointRecord[];
  readonly accounts: readonly AccountRecord[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

type ConnectionDeletionBlockReason = "active_probe";

export interface ConnectionDeletionImpact {
  readonly endpointCount: number;
  readonly accountCount: number;
  readonly credentialCount: number;
  readonly credentialBindingCount: number;
  readonly modelBindingCount: number;
  readonly compatibilityProfileCount: number;
  readonly compatibilityFactCount: number;
  readonly completedProbeRunCount: number;
  readonly activeProbeRunCount: number;
  readonly blocked: boolean;
  readonly blockedReason: ConnectionDeletionBlockReason | null;
}

export interface ConnectionDeletionResult {
  readonly connectionId: string;
}

export interface ConnectionLifecycle {
  getDeletionImpact: (connectionId: string) => Promise<ConnectionDeletionImpact | null>;
  deleteConnection: (connectionId: string) => Promise<ConnectionDeletionResult | null>;
}

export interface CreateConnectionInput {
  readonly name: string;
  readonly providerSlug: string;
  readonly endpoints: readonly {
    readonly ref: string;
    readonly name: string;
    readonly protocol: ConnectionProtocol;
    readonly baseUrl: string;
    readonly requestPath: string;
    readonly authScheme: "bearer" | "x-api-key";
    readonly supportsStreaming: boolean;
    readonly credentialRefs: readonly string[];
  }[];
  readonly accounts: readonly {
    readonly ref: string;
    readonly name: string;
    readonly billingMode: BillingMode;
    readonly credentials: readonly {
      readonly ref: string;
      readonly name: string;
      readonly secret: string;
    }[];
  }[];
}

interface CreateConnectionEndpointCommand {
  readonly id: string;
  readonly name: string;
  readonly protocol: ConnectionProtocol;
  readonly baseUrl: string;
  readonly requestPath: string;
  readonly authScheme: "bearer" | "x-api-key";
  readonly supportsStreaming: boolean;
  readonly credentialIds: readonly string[];
}

export interface CreateConnectionCredentialCommand {
  readonly id: string;
  readonly name: string;
  readonly encrypted: EncryptedSecret;
}

interface CreateConnectionAccountCommand {
  readonly id: string;
  readonly name: string;
  readonly billingMode: BillingMode;
  readonly credentials: readonly CreateConnectionCredentialCommand[];
}

export interface CreateConnectionCommand {
  readonly providerId: string;
  readonly name: string;
  readonly providerSlug: string;
  readonly endpoints: readonly CreateConnectionEndpointCommand[];
  readonly accounts: readonly CreateConnectionAccountCommand[];
  readonly now: Date;
}

export interface AddEndpointInput {
  readonly name: string;
  readonly protocol: ConnectionProtocol;
  readonly baseUrl: string;
  readonly requestPath: string;
  readonly authScheme: "bearer" | "x-api-key";
  readonly supportsStreaming: boolean;
  readonly credentialIds: readonly string[];
}

export interface AddEndpointsCommand {
  readonly connectionId: string;
  readonly endpoints: readonly (AddEndpointInput & { readonly endpointId: string })[];
  readonly now: Date;
}

export interface UpdateEndpointCommand extends AddEndpointInput {
  readonly endpointId: string;
  readonly now: Date;
}

export interface EndpointDeletionImpact {
  readonly credentialBindingCount: number;
  readonly modelBindingCount: number;
  readonly compatibilityProfileCount: number;
  readonly compatibilityFactCount: number;
  readonly completedProbeRunCount: number;
  readonly activeProbeRunCount: number;
  readonly blocked: boolean;
}

export interface EndpointLifecycle {
  addEndpoints: (command: AddEndpointsCommand) => Promise<ConnectionRecord | null>;
  updateEndpoint: (command: UpdateEndpointCommand) => Promise<ConnectionRecord | null>;
  getDeletionImpact: (endpointId: string) => Promise<EndpointDeletionImpact | null>;
  deleteEndpoint: (endpointId: string, now: Date) => Promise<ConnectionRecord | null>;
}

export interface RotateCredentialCommand {
  readonly credentialId: string;
  readonly encrypted: EncryptedSecret;
  readonly now: Date;
}

export interface CredentialProbeTarget {
  readonly connectionId: string;
  readonly credentialId: string;
  readonly credentialStatus: CredentialStatus;
  readonly encryptedSecret: string;
  readonly secretKeyId: string;
  readonly endpoint: EndpointRecord;
}

export type CredentialProbeClassification
  = "healthy" | "auth_failed" | "rate_limited" | "upstream_rejected" | "unavailable";

export interface CredentialProbeResult {
  readonly classification: CredentialProbeClassification;
  readonly statusCode: number | null;
}

export interface CredentialProber {
  probe: (input: {
    readonly endpoint: EndpointRecord;
    readonly model: string;
    readonly secret: string;
  }) => Promise<CredentialProbeResult>;
}

export type ModelCatalogDiscoveryResult
  = | {
    readonly outcome: "succeeded";
    readonly modelIds: readonly string[];
  }
  | {
    readonly outcome: "failed";
    readonly classification: "auth_failed" | "upstream_rejected" | "unavailable" | "invalid_response";
    readonly statusCode: number | null;
  };

export interface ModelCatalogDiscoverer {
  discover: (input: {
    readonly endpoint: EndpointRecord;
    readonly modelsPath: string;
    readonly secret: string;
  }) => Promise<ModelCatalogDiscoveryResult>;
}

export interface RecordCredentialProbeCommand {
  readonly credentialId: string;
  readonly status: CredentialStatus | null;
  readonly succeeded: boolean;
  readonly now: Date;
}

export interface ConnectionRepository {
  list: () => Promise<readonly ConnectionRecord[]>;
  getById: (id: string) => Promise<ConnectionRecord | null>;
  hasCredentialFingerprint: (fingerprint: string) => Promise<boolean>;
  create: (command: CreateConnectionCommand) => Promise<ConnectionRecord>;
  addEndpoints: (command: AddEndpointsCommand) => Promise<ConnectionRecord | null>;
  rotateCredential: (command: RotateCredentialCommand) => Promise<ConnectionRecord | null>;
  disableCredential: (credentialId: string, now: Date) => Promise<ConnectionRecord | null>;
  getCredentialProbeTarget: (credentialId: string, endpointId: string) => Promise<CredentialProbeTarget | null>;
  recordCredentialProbe: (command: RecordCredentialProbeCommand) => Promise<ConnectionRecord | null>;
}

export const compatibilityProbeChecks = [
  "basic",
  "stream",
  "usage",
  "unknown_field",
  "tools",
  "reasoning",
  "structured_output",
  "error_shape",
  "harness",
] as const;

export type CompatibilityProbeCheck = (typeof compatibilityProbeChecks)[number];
type CompatibilityProbeRunStatus = "queued" | "running" | "succeeded" | "failed";
export type CompatibilityProfileStatus = "verified" | "documented" | "partial" | "unverified" | "blocked";
export type CompatibilitySupportLevel = "supported" | "partial" | "ignored" | "unsupported" | "degraded" | "unknown";

export interface CompatibilityProbeRunRecord {
  readonly id: string;
  readonly profileId: string;
  readonly connectionId: string;
  readonly endpointId: string;
  readonly credentialId: string;
  readonly harnessProfileId: string;
  readonly model: string;
  readonly checks: readonly CompatibilityProbeCheck[];
  readonly status: CompatibilityProbeRunStatus;
  readonly totalChecks: number;
  readonly completedChecks: number;
  readonly currentCheck: CompatibilityProbeCheck | null;
  readonly errorMessage: string | null;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly updatedAt: Date;
}

export interface CompatibilityProfileRecord {
  readonly id: string;
  readonly connectionId: string;
  readonly endpointId: string;
  readonly harnessProfileId: string;
  readonly status: CompatibilityProfileStatus;
  readonly lastProbeAt: Date | null;
  readonly summary: string | null;
}

export interface CompatibilityFactRecord {
  readonly profileId: string;
  readonly featureKey: string;
  readonly supportLevel: CompatibilitySupportLevel;
  readonly evidenceSource: "documented" | "probed" | "manual";
  readonly evidenceRef: string;
  readonly verifiedModelId: string;
  readonly verifiedAt: Date;
  readonly notes: string;
}

export interface ConnectionCompatibilityRecord {
  readonly profiles: readonly CompatibilityProfileRecord[];
  readonly facts: readonly CompatibilityFactRecord[];
  readonly runs: readonly CompatibilityProbeRunRecord[];
}

export interface CompatibilityFactObservation {
  readonly featureKey: string;
  readonly supportLevel: CompatibilitySupportLevel;
  readonly notes: string;
}

export interface CompatibilityProbeCheckResult {
  readonly check: CompatibilityProbeCheck;
  readonly facts: readonly CompatibilityFactObservation[];
  readonly credentialResult?: CredentialProbeResult;
  readonly stopRemainingChecks?: boolean;
}

export interface CompatibilityProber {
  probeCheck: (input: {
    readonly check: CompatibilityProbeCheck;
    readonly endpoint: EndpointRecord;
    readonly model: string;
    readonly secret: string;
    readonly signal: AbortSignal;
  }) => Promise<CompatibilityProbeCheckResult>;
}

export interface CreateCompatibilityProbeRunCommand {
  readonly runId: string;
  readonly profileId: string;
  readonly connectionId: string;
  readonly endpointId: string;
  readonly credentialId: string;
  readonly harnessProfileId: string;
  readonly model: string;
  readonly checks: readonly CompatibilityProbeCheck[];
  readonly now: Date;
}

export interface CompatibilityProbeRepository {
  createRun: (command: CreateCompatibilityProbeRunCommand) => Promise<{
    readonly run: CompatibilityProbeRunRecord;
    readonly created: boolean;
  }>;
  listByConnection: (connectionId: string) => Promise<ConnectionCompatibilityRecord>;
  claimRun: (runId: string, now: Date) => Promise<CompatibilityProbeRunRecord | null>;
  recordCheck: (command: {
    readonly runId: string;
    readonly facts: readonly CompatibilityFactObservation[];
    readonly completedChecks: number;
    readonly nextCheck: CompatibilityProbeCheck | null;
    readonly now: Date;
  }) => Promise<CompatibilityProbeRunRecord | null>;
  completeRun: (command: {
    readonly runId: string;
    readonly profileStatus: CompatibilityProfileStatus;
    readonly summary: string;
    readonly now: Date;
  }) => Promise<CompatibilityProbeRunRecord | null>;
  failRun: (runId: string, errorMessage: string, now: Date) => Promise<CompatibilityProbeRunRecord | null>;
  invalidateForEndpoint: (endpointId: string, now: Date) => Promise<void>;
  deleteForEndpoint: (endpointId: string) => Promise<void>;
}

export interface CompatibilityProbeCoordinator {
  enqueue: (runId: string) => void;
}
