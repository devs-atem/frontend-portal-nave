// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { emptyItem } from "../services/contractRules";
import { SaveDraftModal } from "./SaveDraftModal";

const item = {
  ...emptyItem(),
  included: true,
  productId: "p1",
  productCode: "100",
  reservedCapacity: "1000.000",
  maximumCapacity: "1500.000",
  maximumQuota: "500.000",
  allowedMovementTypeCodes: ["ENTRADA", "SAIDA"],
};

const base = {
  mode: "create" as const,
  internalCode: "SAP-PENDENTE-000001",
  contractNumber: "000001",
  baseText: "C001 — Base C001",
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  effectiveTo: undefined,
  attachment: null,
  items: [{ item, name: "Óleo diesel S-10" }],
  saving: false,
  error: null,
  onConfirm: () => undefined,
  onClose: () => undefined,
};

describe("SaveDraftModal", () => {
  it("mostra o resumo curto e todos os detalhes do contrato e dos itens", () => {
    render(<SaveDraftModal {...base} />);
    const aside = screen.getByLabelText("Resumo");
    expect(aside.textContent).toContain("Rascunho");
    expect(aside.textContent).toContain("000001");
    expect(aside.textContent).toContain("C001");

    expect(screen.getByText("SAP-PENDENTE-000001")).toBeTruthy();
    expect(screen.getByText("C001 — Base C001")).toBeTruthy();
    expect(screen.getByText("01/01/2026")).toBeTruthy();
    expect(screen.getByText("Indeterminada")).toBeTruthy();
    expect(screen.getByText("Nenhum")).toBeTruthy();
    expect(screen.getByText(/Óleo diesel S-10/)).toBeTruthy();
    expect(screen.getByText("ENTRADA")).toBeTruthy();
    expect(screen.getByText("SAIDA")).toBeTruthy();
    expect(screen.queryByText("Ativo")).toBeNull();
    expect(screen.getByText("GSV")).toBeTruthy();
  });

  it("mostra o anexo escolhido e o aviso de contrato sem itens", () => {
    const file = new File(["x"], "contrato.pdf", { type: "application/pdf" });
    render(<SaveDraftModal {...base} attachment={file} items={[]} />);
    expect(screen.getByText(/contrato\.pdf/)).toBeTruthy();
    expect(screen.getByText(/Nenhum item marcado/)).toBeTruthy();
  });

  it("confirma e volta pelos botões; o rótulo muda na edição", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <SaveDraftModal {...base} onConfirm={onConfirm} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Criar rascunho" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<SaveDraftModal {...base} mode="edit" onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeTruthy();
  });

  it("não fecha enquanto salva e exibe o erro do envio", () => {
    const onClose = vi.fn();
    render(<SaveDraftModal {...base} saving error="Falha ao salvar" onClose={onClose} />);
    expect(screen.getByRole("alert").textContent).toBe("Falha ao salvar");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("tem título na coluna escura e na coluna branca e botão de fechar", () => {
    render(<SaveDraftModal {...base} />);
    expect(screen.getAllByText("Confirmar rascunho")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeTruthy();
  });

  it("usa o painel de altura total com fundo desfocado", () => {
    const { container } = render(<SaveDraftModal {...base} />);
    expect(container.querySelector(".atem-modal__overlay.nm-save-draft__overlay")).not.toBeNull();
    expect(container.querySelector(".atem-modal__panel.nm-save-draft__panel")).not.toBeNull();
  });
});
