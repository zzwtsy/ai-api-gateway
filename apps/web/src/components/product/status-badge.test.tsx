import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("status badge", () => {
  it.each([
    ["success", "outline", "bg-success/10"],
    ["warning", "outline", "bg-warning/10"],
    ["danger", "destructive", "bg-destructive/10"],
    ["neutral", "secondary", "bg-secondary"],
  ] as const)("maps %s to the owned product tone", (tone, variant, className) => {
    render(<StatusBadge tone={tone}>{tone}</StatusBadge>);

    const badge = screen.getByText(tone);
    expect(badge).toHaveAttribute("data-variant", variant);
    expect(badge).toHaveClass(className);
  });
});
