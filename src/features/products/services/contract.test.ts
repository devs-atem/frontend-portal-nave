import { describe, it, expect } from "vitest";

import { formatCnpj, isValidCnpj, maskCnpj, normalizeCnpj } from "./contract";

describe("helpers de CNPJ", () => {
  it("normaliza removendo a máscara e mantendo alfanuméricos em maiúsculas", () => {
    expect(normalizeCnpj("11.222.333/0001-81")).toBe("11222333000181");
    expect(normalizeCnpj("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });

  it("valida CNPJ numérico (com e sem máscara)", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000180")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("123")).toBe(false);
  });

  it("valida CNPJ alfanumérico", () => {
    expect(isValidCnpj("12ABC34501DE35")).toBe(true);
    expect(isValidCnpj("12ABC34501DE34")).toBe(false);
  });

  it("formata e mascara CNPJ", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
    expect(maskCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(maskCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });
});
