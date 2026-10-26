#!/usr/bin/env node
// @ts-check
/**
 * Doctor — valida que o ambiente está pronto pra desenvolver.
 * Checa: versão de Node, presença de .env, variáveis obrigatórias.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const results = [];

function check(name, fn) {
  try {
    const result = fn();
    results.push({ name, status: "ok", detail: result });
  } catch (err) {
    results.push({ name, status: "fail", detail: err.message });
  }
}

function warn(name, fn) {
  try {
    const result = fn();
    results.push({ name, status: result ? "ok" : "warn", detail: result });
  } catch (err) {
    results.push({ name, status: "warn", detail: err.message });
  }
}

// ─── Checagens ───────────────────────────────────────────────────────────

check("Node ≥ 18", () => {
  const major = parseInt(process.versions.node.split(".")[0], 10);
  if (major < 18) throw new Error(`Node ${process.version} (precisa ≥ 18)`);
  return `v${process.versions.node}`;
});

warn("yarn instalado", () => {
  try {
    return execSync("yarn --version", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    throw new Error("yarn não encontrado. Rode `mise install` ou `npm i -g yarn`.");
  }
});

warn("mise.toml presente", () => existsSync(join(ROOT, "mise.toml")) && "sim");

check(".env presente", () => {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath))
    throw new Error("não encontrado. Rode `mise run setup`.");
  return "sim";
});

check("Variáveis obrigatórias no .env", () => {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) throw new Error("sem .env");
  const content = readFileSync(envPath, "utf-8");
  const required = [
    "VITE_AUTH_PROVIDER",
    "VITE_AUTH_RULES",
    "VITE_AUTH_ADMIN_ROLES",
    "VITE_APP_NAME",
  ];
  const missing = required.filter(
    (k) => !new RegExp(`^${k}=\\S`, "m").test(content),
  );
  if (missing.length)
    throw new Error(`faltando: ${missing.join(", ")}`);
  return "todas presentes";
});

warn("node_modules instalado", () =>
  existsSync(join(ROOT, "node_modules")) && "sim",
);

warn("pelo menos um módulo em src/features/", () => {
  const featuresDir = join(ROOT, "src", "features");
  if (!existsSync(featuresDir)) return false;
  const dirs = readdirSync(featuresDir).filter((entry) => {
    const full = join(featuresDir, entry);
    return (
      statSync(full).isDirectory() && existsSync(join(full, "module.tsx"))
    );
  });
  if (!dirs.length) return false;
  return `${dirs.length} módulo(s): ${dirs.join(", ")}`;
});

// ─── Output ──────────────────────────────────────────────────────────────

console.log(`\n${C.bold}Doctor — status do ambiente${C.reset}\n`);

let hasFail = false;
for (const r of results) {
  const icon =
    r.status === "ok"
      ? `${C.green}✔${C.reset}`
      : r.status === "warn"
        ? `${C.yellow}⚠${C.reset}`
        : `${C.red}✖${C.reset}`;
  console.log(`  ${icon} ${r.name.padEnd(32)} ${C.dim}${r.detail}${C.reset}`);
  if (r.status === "fail") hasFail = true;
}
console.log();

if (hasFail) {
  console.log(`${C.red}Alguns checks falharam.${C.reset} Veja acima.\n`);
  process.exit(1);
}
console.log(`${C.green}Ambiente OK.${C.reset}\n`);
