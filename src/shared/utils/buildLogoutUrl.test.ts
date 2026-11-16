import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

async function load(provider: "atem" | "ream") {
  vi.resetModules();
  vi.stubEnv("VITE_AUTH_PROVIDER", provider);
  vi.stubEnv("VITE_APP_ENV", "development");
  vi.stubEnv("VITE_AUTH_RULES", "portal_test");
  return import("./index");
}

describe("buildLogoutUrl (development)", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, origin: "https://localhost:5173" });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ["atem", "https://authcog-dev.grupoatem.com.br/#/logout"],
    ["ream", "https://auth-dev.ream.com.br/#/logout"],
  ] as const)("provider %s aponta para o SPA de login hospedado", async (provider, base) => {
    const { buildLogoutUrl } = await load(provider);
    const url = buildLogoutUrl();
    expect(url.startsWith(`${base}?`)).toBe(true);
    expect(url).not.toContain("localhost:3000");
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("url")).toBe("https://localhost:5173");
    expect(qs.get("rules")).toBe("portal_test");
  });
});
