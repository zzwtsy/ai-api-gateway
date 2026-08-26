import type { AddEndpointsFormValue } from "./endpoint-form-schema";
import type { components } from "@/api/schema";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { connectionProtocolDefaultPaths } from "../shared/connection-protocol-options";
import { addEndpointsFormSchema } from "./endpoint-form-schema";

type Connection = components["schemas"]["Connection"];

export function useAddEndpointDraft(connection: Connection, credentialIds: readonly string[]) {
  const requestPathIsCustomRef = useRef<Record<string, boolean>>({});
  const form = useForm<AddEndpointsFormValue>({
    resolver: zodResolver(addEndpointsFormSchema),
    defaultValues: { endpoints: [createEndpointValue(connection, credentialIds)] },
  });
  const endpointFields = useFieldArray({ control: form.control, name: "endpoints" });

  const addEndpoint = () => {
    endpointFields.append(createEndpointValue(connection, credentialIds));
  };
  const removeEndpoint = (index: number, fieldId: string) => {
    if (endpointFields.fields.length <= 1)
      return;
    delete requestPathIsCustomRef.current[fieldId];
    endpointFields.remove(index);
  };
  const onProtocolChange = (
    index: number,
    fieldId: string,
    protocol: AddEndpointsFormValue["endpoints"][number]["protocol"],
  ) => {
    if (requestPathIsCustomRef.current[fieldId] !== true) {
      form.setValue(
        `endpoints.${index}.requestPath`,
        connectionProtocolDefaultPaths[protocol],
        { shouldValidate: true },
      );
    }
  };
  const onRequestPathChange = (fieldId: string) => {
    requestPathIsCustomRef.current[fieldId] = true;
  };

  return {
    addEndpoint,
    endpointFields,
    form,
    onProtocolChange,
    onRequestPathChange,
    removeEndpoint,
  };
}

function createEndpointValue(
  connection: Connection,
  credentialIds: readonly string[],
): AddEndpointsFormValue["endpoints"][number] {
  return {
    name: "",
    protocol: "openai-chat",
    baseUrl: connection.endpoints[0]?.baseUrl ?? "",
    requestPath: connectionProtocolDefaultPaths["openai-chat"],
    authScheme: connection.endpoints[0]?.authScheme ?? "bearer",
    supportsStreaming: true,
    credentialIds: [...credentialIds],
  };
}
