import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

describe("Field", () => {
  it("connects the label, invalid control and alert semantics", () => {
    render(
      <Field data-invalid>
        <FieldLabel htmlFor="endpoint">Endpoint</FieldLabel>
        <Input id="endpoint" aria-invalid />
        <FieldError>请输入合法 URL</FieldError>
      </Field>,
    );

    expect(screen.getByLabelText("Endpoint")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("请输入合法 URL");
  });
});
