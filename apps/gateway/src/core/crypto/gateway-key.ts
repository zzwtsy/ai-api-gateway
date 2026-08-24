import type { Buffer } from "node:buffer";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const GATEWAY_KEY_RANDOM_BYTES = 32;

export function hashGatewayKey(key: string, pepper: string): Buffer {
  return createHmac("sha256", pepper).update(key, "utf8").digest();
}

export function gatewayKeyPrefix(key: string): string {
  return key.slice(0, Math.min(key.length, 10));
}

export function generateGatewayKey(profileSlug: string): string {
  const normalizedProfile = profileSlug
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  if (normalizedProfile.length === 0) {
    throw new Error("Gateway Client profile slug must contain an ASCII letter or number.");
  }
  return `gw_${normalizedProfile}_${randomBytes(GATEWAY_KEY_RANDOM_BYTES).toString("base64url")}`;
}

export function verifyGatewayKey(key: string, expectedHash: Buffer, pepper: string): boolean {
  const actualHash = hashGatewayKey(key, pepper);
  return actualHash.byteLength === expectedHash.byteLength && timingSafeEqual(actualHash, expectedHash);
}
