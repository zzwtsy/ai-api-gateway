export interface GatewayClientIdentity {
  readonly id: string;
  readonly name: string;
  readonly keyPrefix: string;
}

export interface GatewayClientAuthenticator {
  authenticate(key: string): Promise<GatewayClientIdentity | null>;
}
