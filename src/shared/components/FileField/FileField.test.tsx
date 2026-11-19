// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { FileField } from "./index";

const file = new File(["x"], "contrato.pdf", { type: "application/pdf" });

describe("FileField", () => {
  it("mostra a chamada para arrastar/clicar e a dica, sem botão de remover", () => {
    render(<FileField value={null} onChange={vi.fn()} hint="PDF • Até 20 MB" />);
    expect(screen.getByText("Arraste e solte o arquivo aqui")).toBeTruthy();
    expect(screen.getByText("clique para selecionar")).toBeTruthy();
    expect(screen.getByText("PDF • Até 20 MB")).toBeTruthy();
    expect(screen.queryByLabelText("Remover arquivo")).toBeNull();
  });

  it("emite o arquivo escolhido no input nativo", () => {
    const onChange = vi.fn();
    const { container } = render(<FileField value={null} onChange={onChange} ariaLabel="Anexo" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("emite o arquivo solto na área", () => {
    const onChange = vi.fn();
    render(<FileField value={null} onChange={onChange} ariaLabel="Anexo" />);
    fireEvent.drop(screen.getByRole("button", { name: "Anexo" }), {
      dataTransfer: { files: [file] },
    });
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("ignora arraste quando desabilitado", () => {
    const onChange = vi.fn();
    render(<FileField value={null} onChange={onChange} ariaLabel="Anexo" disabled />);
    fireEvent.drop(screen.getByRole("button", { name: "Anexo" }), {
      dataTransfer: { files: [file] },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exibe nome e tamanho do arquivo e remove com null", () => {
    const onChange = vi.fn();
    render(<FileField value={file} onChange={onChange} />);
    expect(screen.getByText("contrato.pdf")).toBeTruthy();
    expect(screen.getByText("1 KB")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Remover arquivo"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("aplica erro e desabilita a remoção", () => {
    const { container } = render(<FileField value={file} onChange={vi.fn()} error disabled />);
    expect(container.querySelector(".nm-file-field--error")).not.toBeNull();
    expect((screen.getByLabelText("Remover arquivo") as HTMLButtonElement).disabled).toBe(true);
  });
});
