import { createHmac, timingSafeEqual } from "node:crypto";

export function hashGatewayKey(key: string, pepper: string): Buffer {
  return createHmac("sha256", pepper).update(key, "utf8").digest();
}

export function gatewayKeyPrefix(key: string): string {
  return key.slice(0, Math.min(key.length, 10));
}

export function verifyGatewayKey(key: string, expectedHash: Buffer, pepper: string): boolean {
  const actualHash = hashGatewayKey(key, pepper);
  return actualHash.byteLength === expectedHash.byteLength && timingSafeEqual(actualHash, expectedHash);
}
