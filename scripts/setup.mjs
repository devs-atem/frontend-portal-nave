#!/usr/bin/env node
// @ts-check
/**
 * Setup wizard do template-frontend-atem.
 *
 * Modo interativo:    `node scripts/setup.mjs`
 * Modo não-interativo: `node scripts/setup.mjs --name=foo --auth=atem --rules=portal_foo`
 *
 * O script é idempotente — pode ser rodado várias vezes.
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { envValue } from "./setup-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const log = {
  title: (msg) =>
    console.log(`\n${COLORS.bold}${COLORS.cyan}${msg}${COLORS.reset}`),
  info: (msg) => console.log(`${COLORS.dim}${msg}${COLORS.reset}`),
  success: (msg) => console.log(`${COLORS.green}✔${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✖${COLORS.reset} ${msg}`),
};

// ─── Args CLI (modo não-interativo) ──────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    name: { type: "string" },
    "product-name": { type: "string" },
    auth: { type: "string" },
    rules: { type: "string" },
    "admin-roles": { type: "string" },
    "no-interactive": { type: "boolean", default: false },
    "no-git-reset": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`
${COLORS.bold}Setup wizard do template-frontend-atem${COLORS.reset}

Uso:
  node scripts/setup.mjs                       # interativo
  node scripts/setup.mjs --name=portal-x ...   # não-interativo

Flags:
  --name=<kebab-case>         Nome do pacote (ex: portal-financeiro)
  --product-name="<string>"   Nome legível (ex: "Portal Financeiro")
  --auth=atem|ream            Provedor de auth
  --rules=<string>            Identificador de permissão (ex: portal_financeiro)
  --admin-roles=a,b,c         Lista de roles admin
  --no-git-reset              Mantém o histórico git atual
  --no-interactive            Falha se faltar flag em vez de perguntar
  -h, --help                  Mostra esta ajuda
`);
  process.exit(0);
}

// ─── Prompts com fallback pra CLI args ───────────────────────────────────

async function loadInquirer() {
  if (args["no-interactive"]) return null;
  try {
    return await import("@inquirer/prompts");
  } catch {
    log.warn(
      "@inquirer/prompts não instalado. Rode `yarn install` primeiro ou use --no-interactive.",
    );
    return null;
  }
}

async function ask(inquirer, type, name, opts) {
  if (args[name] !== undefined) return args[name];
  if (!inquirer) {
    if (opts?.default !== undefined) return opts.default;
    throw new Error(`Flag --${name} obrigatória em modo não-interativo.`);
  }
  return inquirer[type]({ message: opts.message, default: opts.default, choices: opts.choices });
}

// ─── Helpers de arquivo ──────────────────────────────────────────────────

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function replaceInFile(path, replacements) {
  if (!existsSync(path)) return;
  let content = readFileSync(path, "utf-8");
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }
  writeFileSync(path, content);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  log.title("┌─ Template Setup ─────────────────────────────────────┐");
  log.info("Esse wizard configura o template para o seu novo projeto.");
  log.info("Pode ser rodado várias vezes com segurança.\n");

  const inq = await loadInquirer();

  // ── Identidade ─────────────────────────────────────────────
  log.title("▸ Identidade do projeto");

  const name = await ask(inq, "input", "name", {
    message: "Nome do pacote (kebab-case):",
    default: "novo-projeto-atem",
  });
  const productName = await ask(inq, "input", "product-name", {
    message: "Nome legível do produto:",
    default: toTitleCase(name),
  });

  // ── Auth ───────────────────────────────────────────────────
  log.title("▸ Autenticação");

  const authProvider = await ask(inq, "select", "auth", {
    message: "Provedor de auth:",
    default: "atem",
    choices: [
      { name: "atem — Cognito Atem (gateway.grupoatem.com.br)", value: "atem" },
      { name: "ream — Middleware Ream (mw.ream.com.br/mw-auth)", value: "ream" },
    ],
  });
  const rules = await ask(inq, "input", "rules", {
    message: "Identificador de permissão (rules):",
    default: authProvider === "ream" ? "canal_cliente_ream" : "portal_generic",
  });
  const adminRoles = await ask(inq, "input", "admin-roles", {
    message: "Roles de admin (separados por vírgula):",
    default: authProvider === "ream" ? "admin" : "admin,admin_" + rules,
  });

  // ── Opcionais ──────────────────────────────────────────────
  log.title("▸ Observabilidade (opcionais)");

  const flagsmithEnvId = inq
    ? await inq.input({
        message: "Flagsmith env ID (vazio pra desabilitar):",
        default: "",
      })
    : "";
  const enableDatadog = inq
    ? await inq.confirm({ message: "Habilitar Datadog RUM?", default: false })
    : false;

  // ── Git reset ──────────────────────────────────────────────
  const resetGit = !args["no-git-reset"]
    ? inq
      ? await inq.confirm({
          message:
            "Resetar histórico git? (recomendado se você clonou o template)",
          default: true,
        })
      : false
    : false;

  // ── Confirmação ────────────────────────────────────────────
  log.title("▸ Resumo");
  console.log(`  Nome:         ${name}`);
  console.log(`  Produto:      ${productName}`);
  console.log(`  Auth:         ${authProvider}`);
  console.log(`  Rules:        ${rules}`);
  console.log(`  Admin roles:  ${adminRoles}`);
  console.log(`  Flagsmith:    ${flagsmithEnvId || "(desabilitado)"}`);
  console.log(`  Datadog:      ${enableDatadog ? "habilitado" : "desabilitado"}`);
  console.log(`  Reset git:    ${resetGit ? "sim" : "não"}\n`);

  if (inq) {
    const ok = await inq.confirm({ message: "Aplicar?", default: true });
    if (!ok) {
      log.warn("Cancelado.");
      process.exit(0);
    }
  }

  // ── Execução ───────────────────────────────────────────────
  log.title("▸ Aplicando mudanças");

  // 1. package.json
  const pkgPath = join(ROOT, "package.json");
  const pkg = readJson(pkgPath);  
  pkg.name = name;
  pkg.description = `Front-end do produto ${productName}, baseado no template-frontend-atem.`;
  pkg.version = "0.1.0";
  writeJson(pkgPath, pkg);
  log.success("package.json atualizado");

  // 2. .env — valores vão por `envValue()` que aspa quando tem espaço/
  // caractere especial, pra o parser do mise aceitar (dotenv do Vite
  // aceita os dois formatos). Sem isso, nome composto quebra `mise run dev`.
  const envLines = [
    `# Gerado por scripts/setup.mjs`,
    `VITE_AUTH_PROVIDER=${envValue(authProvider)}`,
    `VITE_AUTH_RULES=${envValue(rules)}`,
    `VITE_AUTH_ADMIN_ROLES=${envValue(adminRoles)}`,
    `VITE_APP_NAME=${envValue(productName)}`,
    `VITE_APP_ENV=development`,
    `VITE_FLAGSMITH_ENV_ID=${envValue(flagsmithEnvId)}`,
  ];
  if (enableDatadog) {
    envLines.push(
      `VITE_DATADOG_APP_ID=`,
      `VITE_DATADOG_CLIENT_TOKEN=`,
      `VITE_DATADOG_SERVICE=${envValue(name)}`,
    );
  }
  writeFileSync(join(ROOT, ".env"), envLines.join("\n") + "\n");
  log.success(".env criado");

  // 3. index.html e README — substitui placeholders
  const placeholders = [
    ["{{PRODUCT_NAME}}", productName],
    ["{{PROJECT_NAME}}", name],
    ["{{AUTH_PROVIDER}}", authProvider],
  ];
  replaceInFile(join(ROOT, "index.html"), placeholders);
  replaceInFile(join(ROOT, "README.md"), placeholders);
  log.success("index.html e README.md atualizados");

  // 4. Git reset (opcional)
  if (resetGit) {
    const gitDir = join(ROOT, ".git");
    if (existsSync(gitDir)) {
      rmSync(gitDir, { recursive: true, force: true });
      log.success("Histórico git removido (rode `git init` depois)");
    }
  }

  // ── Final ──────────────────────────────────────────────────
  log.title("┗━ Pronto!");
  console.log(`
Próximos passos:
  ${COLORS.cyan}mise run dev${COLORS.reset}       # sobe o dev server em http://localhost:3000
  ${COLORS.cyan}mise run doctor${COLORS.reset}    # valida o ambiente

Documentação completa: ${COLORS.dim}./README.md${COLORS.reset}
`);
}

function toTitleCase(str) {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
