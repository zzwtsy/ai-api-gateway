import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("uses the Base UI button contract and handles trusted interaction", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button onClick={onClick}>
        <SearchIcon data-icon="inline-start" />
        搜索
      </Button>,
    );

    const button = screen.getByRole("button", { name: "搜索" });
    expect(button).toHaveAttribute("data-slot", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
