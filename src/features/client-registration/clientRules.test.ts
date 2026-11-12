import { describe, it, expect } from "vitest";

import AppError from "@shared/utils/appError";

import { buildProductIdsPatch, errorMessage, sameSet } from "./clientRules";

const FALLBACK = "Não foi possível salvar o cliente.";
const httpError = (status: number, message = "") =>
  new AppError(message, "error", "AppError", status);

describe("sameSet", () => {
  it("ignora a ordem", () => {
    expect(sameSet(["p1", "p2"], ["p2", "p1"])).toBe(true);
  });
  it("detecta tamanhos ou itens diferentes", () => {
    expect(sameSet(["p1"], ["p1", "p2"])).toBe(false);
    expect(sameSet(["p1"], ["p2"])).toBe(false);
  });
});

describe("buildProductIdsPatch", () => {
  it("não envia productIds quando a seleção não mudou", () => {
    expect(buildProductIdsPatch(["p1"], ["p1"], "ready")).toBeUndefined();
  });

  it("envia a lista completa quando a seleção mudou", () => {
    expect(buildProductIdsPatch(["p1", "p2"], ["p1"], "ready")).toEqual(["p1", "p2"]);
  });

  it.each(["idle", "loading", "error"] as const)(
    "não envia quando o detalhe não carregou (%s)",
    (state) => {
      expect(buildProductIdsPatch(["p2"], ["p1"], state)).toBeUndefined();
    },
  );

  it("desmarcar tudo envia lista vazia", () => {
    expect(buildProductIdsPatch([], ["p1"], "ready")).toEqual([]);
  });
});

describe("errorMessage", () => {
  it("409 usa a mensagem da API", () => {
    expect(errorMessage(httpError(409, "BP já cadastrado."), FALLBACK)).toBe(
      "BP já cadastrado.",
    );
  });

  it("409 sem mensagem usa o texto padrão", () => {
    expect(errorMessage(httpError(409), FALLBACK)).toBe(
      "Já existe um cliente com este BP ou CNPJ.",
    );
  });

  it("400 com CNPJ na mensagem", () => {
    expect(errorMessage(httpError(400, "cnpj.headquarters inválido"), FALLBACK)).toBe(
      "CNPJ inválido.",
    );
  });

  it("400 genérico", () => {
    expect(errorMessage(httpError(400, "name is required"), FALLBACK)).toBe(
      "Dados inválidos. Revise os campos informados.",
    );
  });

  it("404", () => {
    expect(errorMessage(httpError(404), FALLBACK)).toBe(
      "Cliente ou produto não encontrado.",
    );
  });

  it("aceita statusCode no lugar de status", () => {
    expect(errorMessage({ statusCode: 404 }, FALLBACK)).toBe(
      "Cliente ou produto não encontrado.",
    );
  });

  it("sem status usa a mensagem do erro ou o fallback", () => {
    expect(errorMessage(new Error("Falha de rede"), FALLBACK)).toBe("Falha de rede");
    expect(errorMessage(null, FALLBACK)).toBe(FALLBACK);
  });
});
