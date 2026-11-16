import { describe, it, expect, vi, afterEach } from "vitest";

async function load(provider: "atem" | "ream") {
  vi.resetModules();
  vi.stubEnv("VITE_AUTH_PROVIDER", provider);
  vi.stubEnv("VITE_APP_ENV", "development");
  vi.stubEnv("VITE_AUTH_RULES", "portal_test");
  return import("./index");
}

describe("buildLogoutUrl (development)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Origem real do navegador: o Vite abre no alias do provider (https://localhost-dev.<domínio>:5173).
  it.each([
    ["atem", "https://authcog-dev.grupoatem.com.br/#/logout", "https://localhost-dev.grupoatem.com.br:5173"],
    ["ream", "https://auth-dev.ream.com.br/#/logout", "https://localhost-dev.ream.com.br:5173"],
  ] as const)("provider %s aponta para o SPA de login hospedado", async (provider, base, origin) => {
    vi.stubGlobal("location", { ...window.location, origin });
    const { buildLogoutUrl } = await load(provider);
    const url = buildLogoutUrl();
    expect(url.startsWith(`${base}?`)).toBe(true);
    expect(url).not.toContain("localhost:3000");
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("url")).toBe(origin);
    expect(qs.get("rules")).toBe("portal_test");
  });
});
