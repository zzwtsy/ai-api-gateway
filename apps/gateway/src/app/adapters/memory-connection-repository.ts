import type {
  ConnectionRecord,
  ConnectionRepository,
  CreateConnectionInput,
} from "../../control-plane/features/connections/contracts.js";

import type { Clock } from "../../core/time/clock.js";
import { randomUUID } from "node:crypto";
import { AppError } from "../../core/errors/app-error.js";

export class MemoryConnectionRepository implements ConnectionRepository {
  readonly #items = new Map<string, ConnectionRecord>();

  public constructor(private readonly clock: Clock) {}

  public async list(): Promise<readonly ConnectionRecord[]> {
    return [...this.#items.values()].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  public async getById(id: string): Promise<ConnectionRecord | null> {
    return this.#items.get(id) ?? null;
  }

  public async create(input: CreateConnectionInput): Promise<ConnectionRecord> {
    const normalizedBaseUrl = normalizeBaseUrl(input.baseUrl);
    const hasConflict = [...this.#items.values()].some(item =>
      item.name === input.name || (item.protocol === input.protocol && item.baseUrl === normalizedBaseUrl),
    );
    if (hasConflict) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    const now = this.clock.now();
    const record: ConnectionRecord = {
      id: randomUUID(),
      ...input,
      baseUrl: normalizedBaseUrl,
      createdAt: now,
      updatedAt: now,
    };
    this.#items.set(record.id, record);
    return record;
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
