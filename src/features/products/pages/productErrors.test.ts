import { describe, it, expect } from "vitest";

import AppError from "@shared/utils/appError";
import { productErrorMessage } from "./productErrors";

const err = (status: number, msg = "x") =>
  new AppError(msg, "error", "AppError", status);

describe("productErrorMessage", () => {
  it("exclusão de produto em uso (500 ou 409) vira mensagem amigável", () => {
    const expected = "Produto em uso em contratos e não pode ser excluído.";
    expect(productErrorMessage(err(500, "P2003"), "delete")).toBe(expected);
    expect(productErrorMessage(err(409), "delete")).toBe(expected);
  });

  it("409 ao salvar exibe a mensagem da API", () => {
    const msg = 'A product with sapCode "1" already exists';
    expect(productErrorMessage(err(409, msg), "save")).toBe(msg);
  });

  it("404 e 400", () => {
    expect(productErrorMessage(err(404), "save")).toBe("Produto ou cliente não encontrado.");
    expect(productErrorMessage(err(400), "save")).toBe(
      "Dados inválidos. Revise os campos informados.",
    );
  });

  it("fallback usa a mensagem do erro", () => {
    expect(productErrorMessage(err(503, "Indisponível"), "save")).toBe("Indisponível");
    expect(productErrorMessage(null, "save")).toBe("Não foi possível concluir a operação.");
  });
});
