import { describe, it, expect, vi, afterEach } from "vitest";

async function load(hostname: string) {
  vi.resetModules();
  vi.stubEnv("VITE_APP_ENV", "");
  vi.stubGlobal("location", { ...window.location, hostname });
  return import("./index");
}

describe("resolveEnv sem VITE_APP_ENV", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each(["portalnave-localhost-dev.grupoatem.com.br", "localhost-dev.ream.com.br"])(
    "%s resolve para development",
    async (host) => {
      const { resolveEnv } = await load(host);
      expect(resolveEnv()).toBe("development");
    },
  );

  it.each(["localhost", "127.0.0.1"])("%s resolve para development", async (host) => {
    const { resolveEnv } = await load(host);
    expect(resolveEnv()).toBe("development");
  });

  it("prefixo localhost-dev. em domínio fora dos aliases não vira development", async () => {
    const { resolveEnv } = await load("localhost-dev.example-dev.com");
    expect(resolveEnv()).toBe("homologation");
  });

  it("host -dev que não é alias local continua em homologation", async () => {
    const { resolveEnv } = await load("authcog-dev.grupoatem.com.br");
    expect(resolveEnv()).toBe("homologation");
  });
});
