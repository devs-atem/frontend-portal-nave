// @ts-check
import { describe, it, expect } from "vitest";
import { envValue } from "./setup-utils.mjs";

describe("envValue", () => {
  it("mantém valor simples sem alterar", () => {
    expect(envValue("foo")).toBe("foo");
    expect(envValue("kebab-case")).toBe("kebab-case");
    expect(envValue("snake_case")).toBe("snake_case");
    expect(envValue("portal_vendas")).toBe("portal_vendas");
    expect(envValue("admin,admin_portal")).toBe("admin,admin_portal");
    expect(envValue(42)).toBe("42");
  });

  it("vazio ou nullish devolve string vazia", () => {
    expect(envValue("")).toBe("");
    expect(envValue(undefined)).toBe("");
    expect(envValue(null)).toBe("");
  });

  it("adiciona aspas duplas em valor com espaço — caso que quebra o mise", () => {
    expect(envValue("Portal Financeiro")).toBe('"Portal Financeiro"');
    expect(envValue("Canal do Cliente Ream")).toBe('"Canal do Cliente Ream"');
    expect(envValue(" leading")).toBe('" leading"');
    expect(envValue("trailing ")).toBe('"trailing "');
  });

  it("escapa aspas duplas internas", () => {
    expect(envValue('Nome com "aspas"')).toBe('"Nome com \\"aspas\\""');
  });

  it("escapa backslash", () => {
    expect(envValue("path\\to\\file")).toBe('"path\\\\to\\\\file"');
  });

  it("aspa valores que contêm $ (evita expansão de variável)", () => {
    expect(envValue("$VAR")).toBe('"$VAR"');
    expect(envValue("foo$bar")).toBe('"foo$bar"');
  });

  it("aspa valores com aspa simples", () => {
    expect(envValue("it's")).toBe(`"it's"`);
  });
});
