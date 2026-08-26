import type { ConnectionFormValue } from "./create-connection-form-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { connectionProtocolDefaultPaths } from "../shared/connection-protocol-options";
import { connectionFormSchema } from "./create-connection-form-schema";
import { fieldPath } from "./create-connection-form-types";
import { findPresetBySlug } from "./presets";

type FormStep = "provider" | "endpoint";

const defaultValues: ConnectionFormValue = {
  name: "",
  providerSlug: "",
  endpoints: [{
    ref: "endpoint-0",
    name: "默认 Endpoint",
    protocol: "openai-chat",
    baseUrl: "",
    requestPath: connectionProtocolDefaultPaths["openai-chat"],
    authScheme: "bearer",
    supportsStreaming: true,
    credentialRefs: ["credential-0"],
  }],
  accounts: [{
    ref: "account-0",
    name: "主账号",
    billingMode: "unknown",
    credentials: [{ ref: "credential-0", name: "主 Key", secret: "" }],
  }],
};

export function useCreateConnectionDraft() {
  const [selectedPresetSlug, setSelectedPresetSlug] = useState<string>("custom");
  const [step, setStep] = useState<FormStep>("provider");
  const requestPathIsCustomRef = useRef<Record<string, boolean>>({});
  const draftRef = useRef(0);
  const form = useForm<ConnectionFormValue>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues,
  });
  const endpointFields = useFieldArray({ control: form.control, name: "endpoints" });
  const accountFields = useFieldArray({ control: form.control, name: "accounts" });
  const accounts = useWatch({ control: form.control, name: "accounts" }) ?? [];
  const credentialOptions = accounts.flatMap((account, accountIndex) =>
    account.credentials.map((credential, credentialIndex) => ({
      ref: credential.ref,
      label: `${account.name} / ${credential.name || `Key ${credentialIndex + 1}`}（账号 ${accountIndex + 1}）`,
    })),
  );

  const createRequestRef = (kind: string) => {
    let ref: string;
    do {
      ref = `${kind}-${draftRef.current}`;
      draftRef.current += 1;
    } while (requestRefExists(form.getValues(), ref));
    return ref;
  };
  const updateEndpointBindings = (update: (refs: string[]) => string[]) => {
    const endpoints = form.getValues("endpoints");
    endpoints.forEach((endpoint, endpointIndex) => {
      form.setValue(
        fieldPath(`endpoints.${endpointIndex}.credentialRefs`),
        update(endpoint.credentialRefs),
        { shouldValidate: true },
      );
    });
  };
  const addCredentialRefToEndpoints = (ref: string) => {
    updateEndpointBindings(refs => refs.includes(ref) ? refs : [...refs, ref]);
  };
  const removeCredentialRefFromEndpoints = (ref: string) => {
    updateEndpointBindings(refs => refs.filter(item => item !== ref));
  };
  const addCredential = () => {
    const ref = createRequestRef("credential");
    addCredentialRefToEndpoints(ref);
    return ref;
  };

  const handlePresetSelect = (slug: string) => {
    setSelectedPresetSlug(slug);
    if (slug === "custom")
      return;
    const preset = findPresetBySlug(slug);
    if (preset === undefined)
      return;
    form.setValue("name", preset.name, { shouldValidate: true });
    form.setValue("providerSlug", preset.slug, { shouldValidate: true });
    form.setValue(fieldPath("endpoints.0.protocol"), preset.protocol, { shouldValidate: true });
    form.setValue(fieldPath("endpoints.0.baseUrl"), preset.baseUrl, { shouldValidate: true });
    form.setValue(fieldPath("endpoints.0.requestPath"), preset.requestPath, { shouldValidate: true });
    const ref = form.getValues("endpoints.0.ref");
    requestPathIsCustomRef.current[ref] = false;
  };

  const addAccount = () => {
    const credentialRef = addCredential();
    accountFields.append({
      ref: createRequestRef("account"),
      name: `账号 ${accountFields.fields.length + 1}`,
      billingMode: "unknown",
      credentials: [{ ref: credentialRef, name: "主 Key", secret: "" }],
    });
  };
  const removeAccount = (index: number) => {
    const account = form.getValues("accounts")[index];
    if (account !== undefined)
      account.credentials.forEach(credential => removeCredentialRefFromEndpoints(credential.ref));
    accountFields.remove(index);
  };
  const addEndpoint = () => {
    const ref = createRequestRef("endpoint");
    endpointFields.append({
      ref,
      name: `Endpoint ${endpointFields.fields.length + 1}`,
      protocol: "openai-chat",
      baseUrl: "",
      requestPath: connectionProtocolDefaultPaths["openai-chat"],
      authScheme: "bearer",
      supportsStreaming: true,
      credentialRefs: credentialOptions[0] === undefined ? [] : [credentialOptions[0].ref],
    });
    requestPathIsCustomRef.current[ref] = false;
  };
  const removeEndpoint = (index: number) => {
    const endpoint = form.getValues("endpoints")[index];
    if (endpoint !== undefined)
      delete requestPathIsCustomRef.current[endpoint.ref];
    endpointFields.remove(index);
  };
  const onProtocolChange = (index: number, protocol: ConnectionFormValue["endpoints"][number]["protocol"]) => {
    const ref = form.getValues("endpoints")[index]?.ref;
    if (ref !== undefined && requestPathIsCustomRef.current[ref] !== true) {
      form.setValue(fieldPath(`endpoints.${index}.requestPath`), connectionProtocolDefaultPaths[protocol], { shouldValidate: true });
    }
  };
  const onRequestPathChange = (index: number) => {
    const ref = form.getValues("endpoints")[index]?.ref;
    if (ref !== undefined)
      requestPathIsCustomRef.current[ref] = true;
  };

  return {
    accountFields,
    addAccount,
    addCredential,
    addEndpoint,
    credentialOptions,
    endpointFields,
    form,
    handlePresetSelect,
    onProtocolChange,
    onRequestPathChange,
    removeAccount,
    removeCredentialRefFromEndpoints,
    removeEndpoint,
    selectedPresetSlug,
    setStep,
    step,
    reset: () => {
      form.reset();
      requestPathIsCustomRef.current = {};
      setStep("provider");
    },
  };
}

function requestRefExists(value: ConnectionFormValue, ref: string): boolean {
  return value.endpoints.some(endpoint => endpoint.ref === ref)
    || value.accounts.some(account => account.ref === ref || account.credentials.some(credential => credential.ref === ref));
}
