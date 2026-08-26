import type {
  ArrayPath,
  FieldErrors,
  FieldPath,
  FieldPathByValue,
  FieldError as ReactHookFormFieldError,
} from "react-hook-form";

interface ConnectionCredentialFormValue {
  ref: string;
  name: string;
  secret: string;
}

interface ConnectionAccountFormValue {
  ref: string;
  name: string;
  billingMode: "metered" | "subscription" | "free" | "custom" | "unknown";
  credentials: ConnectionCredentialFormValue[];
}

export interface ConnectionEndpointFormValue {
  ref: string;
  name: string;
  protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
  baseUrl: string;
  requestPath: string;
  authScheme: "bearer" | "x-api-key";
  supportsStreaming: boolean;
  credentialRefs: string[];
}

export interface ConnectionFormValue {
  name: string;
  providerSlug: string;
  endpoints: ConnectionEndpointFormValue[];
  accounts: ConnectionAccountFormValue[];
}

export function fieldPath(value: string): FieldPath<ConnectionFormValue> {
  return value as FieldPath<ConnectionFormValue>;
}

export function arrayPath(value: string): ArrayPath<ConnectionFormValue> {
  return value as ArrayPath<ConnectionFormValue>;
}

export function endpointCredentialRefsPath(index: number): FieldPathByValue<ConnectionFormValue, string[]> {
  return fieldPath(`endpoints.${index}.credentialRefs`) as FieldPathByValue<ConnectionFormValue, string[]>;
}

export function endpointProtocolPath(index: number): FieldPathByValue<ConnectionFormValue, ConnectionEndpointFormValue["protocol"]> {
  return fieldPath(`endpoints.${index}.protocol`) as FieldPathByValue<ConnectionFormValue, ConnectionEndpointFormValue["protocol"]>;
}

export function hasConnectionProviderErrors(errors: FieldErrors<ConnectionFormValue>): boolean {
  if (errors.name !== undefined || errors.providerSlug !== undefined)
    return true;
  const accountErrors = Array.isArray(errors.accounts)
    ? errors.accounts as readonly (AccountErrors | undefined)[]
    : [];
  return accountErrors.some((account) => {
    if (account === undefined || account.name !== undefined || account.root !== undefined)
      return account !== undefined;
    const credentials = Array.isArray(account.credentials)
      ? account.credentials as readonly (CredentialErrors | undefined)[]
      : [];
    return credentials.some(credential => credential !== undefined
      && (credential.name !== undefined || credential.secret !== undefined || credential.root !== undefined));
  });
}

interface CredentialErrors {
  readonly name?: ReactHookFormFieldError;
  readonly secret?: ReactHookFormFieldError;
  readonly root?: ReactHookFormFieldError;
}

interface AccountErrors {
  readonly name?: ReactHookFormFieldError;
  readonly root?: ReactHookFormFieldError;
  readonly credentials?: readonly (CredentialErrors | undefined)[] | ReactHookFormFieldError;
}
