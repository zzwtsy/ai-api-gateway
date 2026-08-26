export interface EndpointOption {
  readonly id: string;
  readonly label: string;
  readonly protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
  readonly credentials: readonly {
    readonly id: string;
    readonly label: string;
  }[];
}
