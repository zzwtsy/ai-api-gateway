import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { readOpenAiChatRequest } from "./request.js";

const jsonObject = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 24 }),
  fc.jsonValue(),
  { maxKeys: 12 },
);

describe("OpenAI Chat routing extraction properties", () => {
  it("arbitrary provider extension fields do not change gateway-owned extraction", () => {
    fc.assert(fc.property(
      jsonObject,
      fc.string({ minLength: 1, maxLength: 80 }),
      fc.boolean(),
      (extensionFields, model, stream) => {
        const body = new TextEncoder().encode(JSON.stringify({
          ...extensionFields,
          model,
          stream,
        }));
        expect(readOpenAiChatRequest(body)).toEqual({ requestedModel: model, stream });
      },
    ));
  });
});
