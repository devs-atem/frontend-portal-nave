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
  const openUrl = `${https ? "https" : "http"}://${devAliases[provider]}:5173`;

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      // HTTPS local (certificado autoassinado) quando VITE_HTTPS=true.
      ...(https ? [basicSsl()] : []),
    ],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: Object.values(devAliases),
      open: openUrl,
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
