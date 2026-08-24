import type {
  GatewayClientRecord,
  GatewayClientRepository,
  HarnessProfileRecord,
  PersistGatewayClientCommand,
  PersistGatewayClientKey,
} from "../../control-plane/features/clients/contracts.js";
import { AppError } from "../../core/errors/app-error.js";

const profiles: readonly HarnessProfileRecord[] = [
  { id: "profile-generic-openai-chat", slug: "generic-openai-chat", name: "通用 OpenAI Chat", allowedProtocols: ["openai-chat"] },
  { id: "profile-codex", slug: "codex", name: "Codex", allowedProtocols: ["openai-responses"] },
  { id: "profile-claude-code", slug: "claude-code", name: "Claude Code", allowedProtocols: ["anthropic-messages"] },
];

export class MemoryGatewayClientRepository implements GatewayClientRepository {
  readonly #clients = new Map<string, GatewayClientRecord>();

  public async listProfiles(): Promise<readonly HarnessProfileRecord[]> { return profiles; }
  public async getProfileBySlug(slug: string): Promise<HarnessProfileRecord | null> { return profiles.find(profile => profile.slug === slug) ?? null; }
  public async list(): Promise<readonly GatewayClientRecord[]> { return [...this.#clients.values()]; }

  public async create(command: PersistGatewayClientCommand): Promise<GatewayClientRecord> {
    if ([...this.#clients.values()].some(client => client.name === command.name))
      throw new AppError("CLIENT_CONFLICT");
    const client: GatewayClientRecord = {
      id: command.clientId,
      name: command.name,
      status: "active",
      profile: command.profile,
      allowedProtocols: command.allowedProtocols,
      keys: [toKey(command.key, command.now)],
      lastUsedAt: null,
      createdAt: command.now,
      updatedAt: command.now,
    };
    this.#clients.set(client.id, client);
    return client;
  }

  public async addKey(clientId: string, key: PersistGatewayClientKey, now: Date, previousExpiresAt: Date | null): Promise<GatewayClientRecord | null> {
    const client = this.#clients.get(clientId);
    if (client === undefined)
      return null;
    const updated = {
      ...client,
      keys: [
        ...client.keys.map(item => item.status === "active" ? { ...item, status: "expiring" as const, expiresAt: previousExpiresAt } : item),
        toKey(key, now),
      ],
      updatedAt: now,
    };
    this.#clients.set(clientId, updated);
    return updated;
  }

  public async revokeKey(keyId: string, now: Date): Promise<GatewayClientRecord | null> {
    for (const client of this.#clients.values()) {
      if (!client.keys.some(key => key.id === keyId))
        continue;
      const updated = { ...client, keys: client.keys.map(key => key.id === keyId ? { ...key, status: "revoked" as const, revokedAt: now } : key), updatedAt: now };
      this.#clients.set(client.id, updated);
      return updated;
    }
    return null;
  }
}

function toKey(key: PersistGatewayClientKey, now: Date) {
  return { id: key.id, keyPrefix: key.keyPrefix, keyLast4: key.keyLast4, status: "active" as const, expiresAt: null, lastUsedAt: null, createdAt: now, revokedAt: null };
}
