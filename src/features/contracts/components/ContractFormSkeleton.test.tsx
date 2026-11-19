// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContractFormSkeleton } from "./ContractFormSkeleton";

describe("ContractFormSkeleton", () => {
  it("indica carregamento e não exibe campos reais", () => {
    render(<ContractFormSkeleton mode="create" />);
    const root = screen.getByRole("status", { name: "Carregando formulário" });
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(root.querySelector("input")).toBeNull();
  });

  it("renderiza as seções de dados gerais e itens na criação", () => {
    const { container } = render(<ContractFormSkeleton mode="create" />);
    // título + (dados gerais, itens) = 2 cards com borda
    expect(
      container.querySelectorAll('div[style*="border: 1px solid"]').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("na nova revisão troca os dados gerais pela vigência da revisão", () => {
    const { container: create } = render(<ContractFormSkeleton mode="create" />);
    const { container: revision } = render(<ContractFormSkeleton mode="revision" />);
    expect(revision.innerHTML).not.toBe(create.innerHTML);
  });
});
