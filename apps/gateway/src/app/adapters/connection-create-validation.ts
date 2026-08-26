import type {
  ConnectionRecord,
  CreateConnectionCommand,
  CreateConnectionCredentialCommand,
} from "../../control-plane/features/connections/contracts.js";
import { connectionCreationLimits } from "../../control-plane/features/connections/contracts.js";

import { AppError } from "../../core/errors/app-error.js";

type CreateConnectionEndpoint = CreateConnectionCommand["endpoints"][number];

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function normalizeCreateConnectionEndpoints(command: CreateConnectionCommand) {
  return command.endpoints.map(endpoint => ({
    ...endpoint,
    baseUrl: normalizeBaseUrl(endpoint.baseUrl),
  }));
}

export function validateCreateConnectionCommand(
  command: CreateConnectionCommand,
  normalizedEndpoints: readonly CreateConnectionEndpoint[] = command.endpoints,
): void {
  validateAggregateSizes(command);
  validateEndpoints(command.endpoints, normalizedEndpoints);
  const { credentialIds } = validateAccounts(command.accounts);
  validateCredentialBindings(command.endpoints, credentialIds);
}

export async function validateCredentialFingerprints(
  credentials: readonly CreateConnectionCredentialCommand[],
  hasExistingFingerprint: (fingerprint: string) => Promise<boolean>,
): Promise<void> {
  const fingerprints = new Set<string>();
  for (const credential of credentials) {
    if (fingerprints.has(credential.encrypted.fingerprint)
      || await hasExistingFingerprint(credential.encrypted.fingerprint)) {
      throw new AppError("CREDENTIAL_CONFLICT");
    }
    fingerprints.add(credential.encrypted.fingerprint);
  }
}

export function hasConnectionConflict(
  items: Iterable<ConnectionRecord>,
  command: Pick<CreateConnectionCommand, "providerId" | "name" | "providerSlug">,
  endpointAddresses: ReadonlySet<string>,
): boolean {
  for (const item of items) {
    if (item.id === command.providerId || item.name === command.name || item.providerSlug === command.providerSlug) {
      return true;
    }
    if (item.endpoints.some(endpoint => endpointAddresses.has(endpointAddress(endpoint)))) {
      return true;
    }
  }
  return false;
}

export function endpointAddress(endpoint: Pick<CreateConnectionEndpoint, "baseUrl" | "requestPath"> & { readonly protocol: string }): string {
  return `${endpoint.protocol}\u0000${endpoint.baseUrl}\u0000${endpoint.requestPath}`;
}

export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("code" in error && error.code === "23505") {
    return true;
  }
  return "cause" in error && isUniqueViolation(error.cause);
}

export function isFingerprintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("constraint" in error && typeof error.constraint === "string" && error.constraint.includes("fingerprint")) {
    return true;
  }
  return "cause" in error && isFingerprintViolation(error.cause);
}

function validateAggregateSizes(command: CreateConnectionCommand): void {
  if (command.endpoints.length === 0 || command.endpoints.length > connectionCreationLimits.maxEndpoints
    || command.accounts.length === 0 || command.accounts.length > connectionCreationLimits.maxAccounts) {
    throw new AppError("COMMON_VALIDATION_FAILED");
  }
}

function validateEndpoints(
  endpoints: readonly CreateConnectionEndpoint[],
  normalizedEndpoints: readonly CreateConnectionEndpoint[],
): void {
  const ids = new Set<string>();
  const names = new Set<string>();
  const addresses = new Set<string>();
  endpoints.forEach((endpoint, index) => {
    const normalizedEndpoint = normalizedEndpoints[index];
    if (normalizedEndpoint === undefined) {
      throw new AppError("COMMON_VALIDATION_FAILED");
    }
    if (ids.has(endpoint.id) || names.has(endpoint.name) || addresses.has(endpointAddress(normalizedEndpoint))) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    ids.add(endpoint.id);
    names.add(endpoint.name);
    addresses.add(endpointAddress(normalizedEndpoint));
    validateEndpointBindings(endpoint.credentialIds);
  });
}

function validateEndpointBindings(credentialIds: readonly string[]): void {
  if (credentialIds.length === 0 || credentialIds.length > connectionCreationLimits.maxCredentialBindingsPerEndpoint
    || new Set(credentialIds).size !== credentialIds.length) {
    throw new AppError("COMMON_VALIDATION_FAILED");
  }
}

function validateAccounts(accounts: CreateConnectionCommand["accounts"]): { credentialIds: ReadonlySet<string> } {
  const accountIds = new Set<string>();
  const accountNames = new Set<string>();
  const credentialIds = new Set<string>();
  const credentialNames = new Set<string>();
  let credentialCount = 0;
  for (const account of accounts) {
    if (accountIds.has(account.id) || accountNames.has(account.name)) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    accountIds.add(account.id);
    accountNames.add(account.name);
    validateAccountCredentialCount(account.credentials.length);
    for (const credential of account.credentials) {
      credentialCount += 1;
      const nameKey = `${account.id}\u0000${credential.name}`;
      if (credentialCount > connectionCreationLimits.maxCredentials || credentialIds.has(credential.id)
        || credentialNames.has(nameKey)) {
        throw new AppError("CREDENTIAL_CONFLICT");
      }
      credentialIds.add(credential.id);
      credentialNames.add(nameKey);
    }
  }
  if (credentialCount === 0) {
    throw new AppError("COMMON_VALIDATION_FAILED");
  }
  return { credentialIds };
}

function validateAccountCredentialCount(count: number): void {
  if (count === 0 || count > connectionCreationLimits.maxCredentialsPerAccount) {
    throw new AppError("COMMON_VALIDATION_FAILED");
  }
}

function validateCredentialBindings(
  endpoints: readonly CreateConnectionEndpoint[],
  credentialIds: ReadonlySet<string>,
): void {
  const boundCredentialIds = new Set<string>();
  for (const endpoint of endpoints) {
    for (const credentialId of endpoint.credentialIds) {
      if (!credentialIds.has(credentialId)) {
        throw new AppError("COMMON_VALIDATION_FAILED");
      }
      boundCredentialIds.add(credentialId);
    }
  }
  if ([...credentialIds].some(credentialId => !boundCredentialIds.has(credentialId))) {
    throw new AppError("COMMON_VALIDATION_FAILED");
  }
}
