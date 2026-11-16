/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Aliases locais (127.0.0.1 em /etc/hosts) liberados pelos SPAs de auth hospedados.
  const devAliases = {
    atem: "localhost-dev.grupoatem.com.br",
    ream: "localhost-dev.ream.com.br",
  } as const;
  const provider = env.VITE_AUTH_PROVIDER === "ream" ? "ream" : "atem";
  const https = env.VITE_HTTPS === "true";
  const protocol = https ? "https" : "http";

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      // HTTPS local (certificado autoassinado) quando VITE_HTTPS=true.
      ...(https ? [basicSsl()] : []),
      {
        // Resolve a URL de abertura com a porta final (padrão 5173, ou --port <porta>).
        name: "open-dev-alias",
        configResolved(config) {
          config.server.open = `${protocol}://${devAliases[provider]}:${config.server.port}`;
        },
      },
    ],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: Object.values(devAliases),
      proxy: env.VITE_API_PROXY_TARGET
        ? {
            "/rest": {
              target: env.VITE_API_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    build: {
      sourcemap: true,
      outDir: "dist",
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
