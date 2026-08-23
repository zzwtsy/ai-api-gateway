import type { Buffer } from "node:buffer";

import type { GatewayClientAuthenticator, GatewayClientIdentity } from "./contracts.js";

import { gatewayKeyPrefix, hashGatewayKey, verifyGatewayKey } from "../../core/crypto/gateway-key.js";

export class StaticGatewayClientAuthenticator implements GatewayClientAuthenticator {
  readonly #expectedHash: Buffer;
  readonly #identity: GatewayClientIdentity;

  public constructor(key: string, private readonly pepper: string) {
    this.#expectedHash = hashGatewayKey(key, pepper);
    this.#identity = {
      id: "bootstrap-client",
      name: "Bootstrap Harness",
      keyPrefix: gatewayKeyPrefix(key),
    };
  }

  public async authenticate(key: string): Promise<GatewayClientIdentity | null> {
    return verifyGatewayKey(key, this.#expectedHash, this.pepper) ? this.#identity : null;
  }
}
