import type { ProtocolId } from "../../../core/requests/contracts.js";
import type { Clock } from "../../../core/time/clock.js";
import type { GatewayClientRepository, PersistGatewayClientKey } from "./contracts.js";
import { randomUUID } from "node:crypto";

import { gatewayKeyPrefix, generateGatewayKey, hashGatewayKey } from "../../../core/crypto/gateway-key.js";
import { AppError } from "../../../core/errors/app-error.js";

export class GatewayClientService {
  public constructor(
    private readonly repository: GatewayClientRepository,
    private readonly pepper: string,
    private readonly clock: Clock,
  ) {}

  public listProfiles() {
    return this.repository.listProfiles();
  }

  public list() {
    return this.repository.list();
  }

  public async create(input: { name: string; profileSlug: string; allowedProtocols: readonly ProtocolId[] }) {
    const profile = await this.repository.getProfileBySlug(input.profileSlug);
    if (profile === null) {
      throw new AppError("HARNESS_PROFILE_NOT_FOUND");
    }
    if (input.allowedProtocols.some(protocol => !profile.allowedProtocols.includes(protocol))) {
      throw new AppError("CLIENT_PROTOCOL_NOT_ALLOWED");
    }
    const fullKey = generateGatewayKey(profile.slug);
    const client = await this.repository.create({
      clientId: randomUUID(),
      name: input.name,
      profile,
      allowedProtocols: input.allowedProtocols,
      key: this.persistedKey(fullKey),
      now: this.clock.now(),
    });
    return { client, key: fullKey };
  }

  public async rotate(clientId: string, overlapHours: number) {
    const profiles = await this.repository.listProfiles();
    const client = (await this.repository.list()).find(item => item.id === clientId);
    if (client === undefined || !profiles.some(profile => profile.id === client.profile.id)) {
      throw new AppError("CLIENT_NOT_FOUND");
    }
    const fullKey = generateGatewayKey(client.profile.slug);
    const now = this.clock.now();
    const expiresAt = overlapHours === 0 ? now : new Date(now.getTime() + overlapHours * 3_600_000);
    const updated = await this.repository.addKey(clientId, this.persistedKey(fullKey), now, expiresAt);
    if (updated === null) {
      throw new AppError("CLIENT_NOT_FOUND");
    }
    return { client: updated, key: fullKey };
  }

  public async revoke(keyId: string) {
    const client = await this.repository.revokeKey(keyId, this.clock.now());
    if (client === null) {
      throw new AppError("CLIENT_KEY_NOT_FOUND");
    }
    return client;
  }

  private persistedKey(fullKey: string): PersistGatewayClientKey {
    return {
      id: randomUUID(),
      keyPrefix: gatewayKeyPrefix(fullKey),
      keyLast4: fullKey.slice(-4),
      secretHash: hashGatewayKey(fullKey, this.pepper).toString("base64url"),
    };
  }
}
