export type ConnectionProtocol = "openai-chat" | "openai-responses" | "anthropic-messages";

export interface ConnectionRecord {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly protocol: ConnectionProtocol;
  readonly baseUrl: string;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateConnectionInput {
  readonly name: string;
  readonly provider: string;
  readonly protocol: ConnectionProtocol;
  readonly baseUrl: string;
  readonly enabled: boolean;
}

export interface ConnectionRepository {
  list(): Promise<readonly ConnectionRecord[]>;
  getById(id: string): Promise<ConnectionRecord | null>;
  create(input: CreateConnectionInput): Promise<ConnectionRecord>;
}
