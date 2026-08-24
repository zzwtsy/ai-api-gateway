import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { maskSecret, SecretCipher } from "./secret-cipher.js";

const keys = {
  current: Buffer.alloc(32, 7).toString("base64"),
  previous: Buffer.alloc(32, 3).toString("base64"),
};

describe("SecretCipher", () => {
  it("round-trips a Secret without embedding plaintext", () => {
    const cipher = createCipher("current");
    const encrypted = cipher.encrypt("provider-test-value", "credential-a");

    expect(encrypted.encryptedSecret).not.toContain("provider-test-value");
    expect(encrypted.secretKeyId).toBe("current");
    expect(encrypted.maskedDisplay).toBe("••••alue");
    expect(cipher.decrypt(encrypted.encryptedSecret, encrypted.secretKeyId, "credential-a"))
      .toBe("provider-test-value");
  });

  it("keeps old ciphertext decryptable while the previous key remains in the keyring", () => {
    const oldCipher = createCipher("previous");
    const encrypted = oldCipher.encrypt("rotated-provider-value", "credential-a");
    const rotatedCipher = createCipher("current");

    expect(rotatedCipher.decrypt(encrypted.encryptedSecret, encrypted.secretKeyId, "credential-a"))
      .toBe("rotated-provider-value");
  });

  it("rejects ciphertext copied to a different Credential", () => {
    const cipher = createCipher("current");
    const encrypted = cipher.encrypt("provider-test-value", "credential-a");

    expect(() => cipher.decrypt(encrypted.encryptedSecret, encrypted.secretKeyId, "credential-b")).toThrow();
  });

  it("rejects invalid keyrings", () => {
    expect(() => new SecretCipher({
      activeKeyId: "current",
      keys: { current: Buffer.alloc(31).toString("base64") },
      fingerprintPepper: "provider-fingerprint-pepper-for-test",
    })).toThrow("must decode to exactly 32 bytes");
    expect(() => new SecretCipher({
      activeKeyId: "missing",
      keys,
      fingerprintPepper: "provider-fingerprint-pepper-for-test",
    })).toThrow("is missing from the keyring");
  });

  it("rejects malformed ciphertext and unavailable historical keys", () => {
    const cipher = createCipher("current");
    const encrypted = cipher.encrypt("provider-test-value", "credential-a");
    const [, iv, tag, ciphertext] = encrypted.encryptedSecret.split(".");

    for (const malformed of [
      "v2.invalid",
      "v1",
      `v1.${iv}`,
      `v1.${iv}.${tag}`,
      `v1.${iv}.${tag}.${ciphertext}.extra`,
    ]) {
      expect(() => cipher.decrypt(malformed, "current", "credential-a"))
        .toThrow("unsupported format");
    }
    expect(() => cipher.decrypt(`v1.${iv}.AA.${ciphertext}`, "current", "credential-a"))
      .toThrow("invalid authentication metadata");
    expect(() => cipher.decrypt(encrypted.encryptedSecret, "missing", "credential-a"))
      .toThrow("is not available");
  });

  it("matches fingerprints without accepting altered or malformed values", () => {
    const cipher = createCipher("current");
    const encrypted = cipher.encrypt("provider-test-value", "credential-a");

    expect(cipher.matchesFingerprint("provider-test-value", encrypted.fingerprint)).toBe(true);
    expect(cipher.matchesFingerprint("different-value", encrypted.fingerprint)).toBe(false);
    expect(cipher.matchesFingerprint("provider-test-value", "AA")).toBe(false);
  });

  it("masks short and empty values without returning plaintext", () => {
    expect(maskSecret("abc")).toBe("••••abc");
    expect(maskSecret("")).toBe("••••");
  });
});

function createCipher(activeKeyId: string): SecretCipher {
  return new SecretCipher({
    activeKeyId,
    keys,
    fingerprintPepper: "provider-fingerprint-pepper-for-test",
  });
}
