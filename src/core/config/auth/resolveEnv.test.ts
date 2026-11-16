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

  it.each(["localhost-dev.grupoatem.com.br", "localhost-dev.ream.com.br"])(
    "%s resolve para development",
    async (host) => {
      const { resolveEnv } = await load(host);
      expect(resolveEnv()).toBe("development");
    },
  );

  it("host -dev que não é alias local continua em homologation", async () => {
    const { resolveEnv } = await load("authcog-dev.grupoatem.com.br");
    expect(resolveEnv()).toBe("homologation");
  });
});
