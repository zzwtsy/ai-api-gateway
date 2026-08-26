import type {
  AddEndpointInput,
  ConnectionRecord,
  CreateConnectionInput,
} from "./contracts.js";
import { AppError } from "../../../core/errors/app-error.js";

import { connectionCreationLimits } from "./contracts.js";

export function validateCreateInput(input: CreateConnectionInput): void {
  validateCreateCounts(input);
  const credentialBindings = collectEndpointCredentialRefs(input.endpoints);
  const credentialRefs = collectCredentialRefs(input.accounts);
  validateCredentialReferenceGraph(credentialBindings, credentialRefs);
  validateCreateNames(input);
  validateEndpointAddresses(input.endpoints);
}

export function validateAddEndpointInputs(
  connection: ConnectionRecord,
  inputs: readonly AddEndpointInput[],
  existing: readonly ConnectionRecord[],
): void {
  if (inputs.length === 0 || inputs.length > connectionCreationLimits.maxEndpoints) {
    throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints", message: "Endpoint 数量超出允许范围。" }]);
  }
  const names = new Set(connection.endpoints.map(endpoint => endpoint.name));
  const addresses = new Set(existing.flatMap(item => item.endpoints).map(endpointAddress));
  for (const input of inputs) {
    if (input.credentialIds.length === 0 || input.credentialIds.length > connectionCreationLimits.maxCredentialBindingsPerEndpoint
      || new Set(input.credentialIds).size !== input.credentialIds.length) {
      throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints.credentialIds", message: "Credential 绑定必须至少一项且不能重复。" }]);
    }
    if (names.has(input.name))
      throw new AppError("CONNECTION_CONFLICT");
    names.add(input.name);
    const address = endpointAddress(input);
    if (addresses.has(address))
      throw new AppError("CONNECTION_CONFLICT");
    addresses.add(address);
  }
  const credentials = new Map(connection.accounts.flatMap(account => account.credentials.map(credential => [credential.id, credential] as const)));
  for (const input of inputs) {
    if (input.credentialIds.some(credentialId => credentials.get(credentialId)?.status === undefined
      || credentials.get(credentialId)?.status === "disabled")) {
      throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
    }
  }
}

export function validateExistingConflicts(
  input: CreateConnectionInput,
  existing: readonly ConnectionRecord[],
): void {
  if (existing.some(connection => connection.name === input.name || connection.providerSlug === input.providerSlug)) {
    throw new AppError("CONNECTION_CONFLICT");
  }
  const existingEndpoints = existing.flatMap(connection => connection.endpoints);
  if (input.endpoints.some(endpoint =>
    existingEndpoints.some(existingEndpoint => endpointAddress(endpoint) === endpointAddress(existingEndpoint)),
  )) {
    throw new AppError("CONNECTION_CONFLICT");
  }
}

function validateCreateCounts(input: CreateConnectionInput): void {
  if (input.endpoints.length === 0 || input.endpoints.length > connectionCreationLimits.maxEndpoints) {
    throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints", message: "Endpoint 数量超出允许范围。" }]);
  }
  if (input.accounts.length === 0 || input.accounts.length > connectionCreationLimits.maxAccounts) {
    throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "accounts", message: "账号数量超出允许范围。" }]);
  }
}

function collectEndpointCredentialRefs(
  endpoints: CreateConnectionInput["endpoints"],
): Set<string> {
  const endpointRefs = new Set<string>();
  const credentialBindings = new Set<string>();
  for (const endpoint of endpoints) {
    if (endpointRefs.has(endpoint.ref)) {
      throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints.ref", message: "Endpoint ref 必须唯一。" }]);
    }
    endpointRefs.add(endpoint.ref);
    if (endpoint.credentialRefs.length === 0 || endpoint.credentialRefs.length > connectionCreationLimits.maxCredentialBindingsPerEndpoint) {
      throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints.credentialRefs", message: "每个 Endpoint 至少绑定一个 Credential。" }]);
    }
    const endpointCredentialRefs = new Set<string>();
    for (const ref of endpoint.credentialRefs) {
      if (endpointCredentialRefs.has(ref)) {
        throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints.credentialRefs", message: "Credential ref 不能重复。" }]);
      }
      endpointCredentialRefs.add(ref);
      credentialBindings.add(ref);
    }
  }
  return credentialBindings;
}

function collectCredentialRefs(
  accounts: CreateConnectionInput["accounts"],
): Set<string> {
  const accountRefs = new Set<string>();
  const credentialRefs = new Set<string>();
  let credentialCount = 0;
  for (const account of accounts) {
    if (accountRefs.has(account.ref)) {
      throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "accounts.ref", message: "Account ref 必须唯一。" }]);
    }
    accountRefs.add(account.ref);
    if (account.credentials.length === 0 || account.credentials.length > connectionCreationLimits.maxCredentialsPerAccount) {
      throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "accounts.credentials", message: "每个账号至少包含一个 Credential。" }]);
    }
    for (const credential of account.credentials) {
      credentialCount += 1;
      if (credentialCount > connectionCreationLimits.maxCredentials) {
        throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "accounts.credentials", message: "Credential 总数超出允许范围。" }]);
      }
      if (credentialRefs.has(credential.ref)) {
        throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "accounts.credentials.ref", message: "Credential ref 必须唯一。" }]);
      }
      credentialRefs.add(credential.ref);
    }
  }
  return credentialRefs;
}

function validateCredentialReferenceGraph(
  credentialBindings: ReadonlySet<string>,
  credentialRefs: ReadonlySet<string>,
): void {
  for (const ref of credentialBindings) {
    if (!credentialRefs.has(ref)) {
      throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints.credentialRefs", message: "Endpoint 绑定了不存在的 Credential ref。" }]);
    }
  }
  for (const ref of credentialRefs) {
    if (!credentialBindings.has(ref)) {
      throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "accounts.credentials", message: "每个 Credential 至少绑定一个 Endpoint。" }]);
    }
  }
}

function validateCreateNames(input: CreateConnectionInput): void {
  const accountNames = new Set<string>();
  const credentialNames = new Set<string>();
  for (const account of input.accounts) {
    if (accountNames.has(account.name)) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    accountNames.add(account.name);
    for (const credential of account.credentials) {
      const key = `${account.ref}\u0000${credential.name}`;
      if (credentialNames.has(key)) {
        throw new AppError("CREDENTIAL_CONFLICT");
      }
      credentialNames.add(key);
    }
  }
  const endpointNames = new Set<string>();
  for (const endpoint of input.endpoints) {
    if (endpointNames.has(endpoint.name)) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    endpointNames.add(endpoint.name);
  }
}

function validateEndpointAddresses(input: CreateConnectionInput["endpoints"]): void {
  const endpointAddresses = new Set<string>();
  for (const endpoint of input) {
    const address = endpointAddress(endpoint);
    if (endpointAddresses.has(address)) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    endpointAddresses.add(address);
  }
}

function endpointAddress(endpoint: {
  readonly protocol: string;
  readonly baseUrl: string;
  readonly requestPath: string;
}): string {
  return `${endpoint.protocol}\u0000${normalizeBaseUrl(endpoint.baseUrl)}\u0000${endpoint.requestPath}`;
}

function normalizeBaseUrl(value: string): string {
  let baseUrl: URL;
  try {
    baseUrl = new URL(value);
  } catch {
    throw new AppError("COMMON_VALIDATION_FAILED", [{ path: "endpoints.baseUrl", message: "Base URL 必须是合法 URL。" }]);
  }
  baseUrl.pathname = baseUrl.pathname.replace(/\/$/, "");
  baseUrl.search = "";
  baseUrl.hash = "";
  return baseUrl.toString().replace(/\/$/, "");
}
