import type { ProtocolId } from "../../../core/requests/contracts.js";

export interface HarnessProfileRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly allowedProtocols: readonly ProtocolId[];
}

interface GatewayClientKeyRecord {
  readonly id: string;
  readonly keyPrefix: string;
  readonly keyLast4: string;
  readonly status: "active" | "expiring" | "revoked";
  readonly expiresAt: Date | null;
  readonly lastUsedAt: Date | null;
  readonly createdAt: Date;
  readonly revokedAt: Date | null;
}

export interface GatewayClientRecord {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "disabled";
  readonly profile: HarnessProfileRecord;
  readonly allowedProtocols: readonly ProtocolId[];
  readonly keys: readonly GatewayClientKeyRecord[];
  readonly lastUsedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PersistGatewayClientCommand {
  readonly clientId: string;
  readonly name: string;
  readonly profile: HarnessProfileRecord;
  readonly allowedProtocols: readonly ProtocolId[];
  readonly key: PersistGatewayClientKey;
  readonly now: Date;
}

export interface PersistGatewayClientKey {
  readonly id: string;
  readonly keyPrefix: string;
  readonly keyLast4: string;
  readonly secretHash: string;
}

export interface GatewayClientRepository {
  listProfiles: () => Promise<readonly HarnessProfileRecord[]>;
  getProfileBySlug: (slug: string) => Promise<HarnessProfileRecord | null>;
  list: () => Promise<readonly GatewayClientRecord[]>;
  create: (command: PersistGatewayClientCommand) => Promise<GatewayClientRecord>;
  addKey: (clientId: string, key: PersistGatewayClientKey, now: Date, previousExpiresAt: Date | null) => Promise<GatewayClientRecord | null>;
  revokeKey: (keyId: string, now: Date) => Promise<GatewayClientRecord | null>;
}
