// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { DateField } from "./index";

describe("DateField", () => {
  it("renderiza o CalendarRange do DS exibindo a data em DD/MM/AAAA", () => {
    const { container } = render(<DateField value="2026-12-15" onChange={vi.fn()} />);

    expect(container.querySelector(".atem-calendar-range__trigger")).not.toBeNull();
    expect(container.querySelector('input[type="date"]')).toBeNull();
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("15/12/2026");
  });

  it("aplica o estado de erro", () => {
    const { container } = render(<DateField value="" onChange={vi.fn()} error />);
    expect(container.querySelector(".nm-date-field--error")).not.toBeNull();
  });
});
