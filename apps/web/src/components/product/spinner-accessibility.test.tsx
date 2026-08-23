import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "@/components/ui/spinner";

describe("产品加载状态", () => {
  it("overrides the Registry default with a Chinese accessible name", () => {
    render(<Spinner aria-label="加载中" />);

    expect(screen.getByRole("status", { name: "加载中" })).toBeVisible();
  });
});
