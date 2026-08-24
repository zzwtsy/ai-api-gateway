import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CIPHER_VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export interface SecretKeyringConfig {
  readonly activeKeyId: string;
  readonly keys: Readonly<Record<string, string>>;
  readonly fingerprintPepper: string;
}

export interface EncryptedSecret {
  readonly encryptedSecret: string;
  readonly secretKeyId: string;
  readonly fingerprint: string;
  readonly maskedDisplay: string;
}

export class SecretCipher {
  readonly #activeKeyId: string;
  readonly #keys = new Map<string, Buffer>();
  readonly #fingerprintPepper: string;

  public constructor(config: SecretKeyringConfig) {
    this.#activeKeyId = config.activeKeyId;
    this.#fingerprintPepper = config.fingerprintPepper;
    for (const [keyId, encoded] of Object.entries(config.keys)) {
      const key = Buffer.from(encoded, "base64");
      if (key.byteLength !== 32) {
        throw new Error(`Provider Secret key ${keyId} must decode to exactly 32 bytes.`);
      }
      this.#keys.set(keyId, key);
    }
    if (!this.#keys.has(this.#activeKeyId)) {
      throw new Error(`Provider Secret active key ${this.#activeKeyId} is missing from the keyring.`);
    }
  }

  public encrypt(secret: string, credentialId: string): EncryptedSecret {
    const key = this.#requiredKey(this.#activeKeyId);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
    cipher.setAAD(this.#aad(credentialId, this.#activeKeyId));
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encryptedSecret: [
        CIPHER_VERSION,
        iv.toString("base64url"),
        tag.toString("base64url"),
        ciphertext.toString("base64url"),
      ].join("."),
      secretKeyId: this.#activeKeyId,
      fingerprint: createHmac("sha256", this.#fingerprintPepper).update(secret, "utf8").digest("base64url"),
      maskedDisplay: maskSecret(secret),
    };
  }

  public decrypt(encryptedSecret: string, secretKeyId: string, credentialId: string): string {
    const [version, ivText, tagText, ciphertextText, extra] = encryptedSecret.split(".");
    if (version !== CIPHER_VERSION || ivText === undefined || tagText === undefined || ciphertextText === undefined || extra !== undefined) {
      throw new Error("Provider Secret ciphertext has an unsupported format.");
    }
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    if (iv.byteLength !== IV_BYTES || tag.byteLength !== TAG_BYTES) {
      throw new Error("Provider Secret ciphertext has invalid authentication metadata.");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.#requiredKey(secretKeyId), iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(this.#aad(credentialId, secretKeyId));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  public matchesFingerprint(secret: string, fingerprint: string): boolean {
    const actual = createHmac("sha256", this.#fingerprintPepper).update(secret, "utf8").digest();
    const expected = Buffer.from(fingerprint, "base64url");
    return actual.byteLength === expected.byteLength && timingSafeEqual(actual, expected);
  }

  #requiredKey(keyId: string): Buffer {
    const key = this.#keys.get(keyId);
    if (key === undefined) {
      throw new Error(`Provider Secret key ${keyId} is not available.`);
    }
    return key;
  }

  #aad(credentialId: string, keyId: string): Buffer {
    return Buffer.from(`provider-credential:${credentialId}:${keyId}`, "utf8");
  }
}

export function maskSecret(secret: string): string {
  const suffix = secret.slice(-4);
  return suffix.length === 0 ? "••••" : `••••${suffix}`;
}
