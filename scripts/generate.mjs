#!/usr/bin/env node
// @ts-check
/**
 * Gerador de scaffolds do template-frontend-atem.
 *
 * Uso interativo:
 *   node scripts/generate.mjs            # pergunta o que gerar
 *   node scripts/generate.mjs module     # gera um módulo
 *
 * Uso não-interativo:
 *   node scripts/generate.mjs module --name=financeiro --label="Financeiro" \
 *     --icon=DollarSign --order=20 \
 *     --children="faturas:Faturas:FileText,pagamentos:Pagamentos:CreditCard"
 *
 * Hoje existe só o subcomando `module`. A estrutura comporta outros
 * geradores no futuro (ex: `generate service`).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FEATURES_DIR = join(ROOT, "src", "features");

// ─── Logging ─────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const log = {
  title: (msg) => console.log(`\n${C.bold}${C.cyan}${msg}${C.reset}`),
  info: (msg) => console.log(`${C.dim}${msg}${C.reset}`),
  success: (msg) => console.log(`${C.green}✔${C.reset} ${msg}`),
  warn: (msg) => console.log(`${C.yellow}⚠${C.reset} ${msg}`),
  error: (msg) => console.error(`${C.red}✖${C.reset} ${msg}`),
};

// ─── CLI args ────────────────────────────────────────────────────────────

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: "string" },
    label: { type: "string" },
    icon: { type: "string" },
    order: { type: "string" },
    permission: { type: "string" },
    flag: { type: "string" },
    children: { type: "string" },
    service: { type: "string" },
    force: { type: "boolean", default: false },
    "no-interactive": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`
${C.bold}generate — scaffold de módulos do template${C.reset}

Uso:
  node scripts/generate.mjs                                  # interativo
  node scripts/generate.mjs module                           # subcomando interativo
  node scripts/generate.mjs module --name=foo [flags]        # não-interativo

Subcomandos:
  module     Gera uma feature nova em src/features/<name>/

Flags (módulo):
  --name=<kebab-case>              Nome da feature (obrigatório)
  --label="<string>"               Label de menu (default: Title Case do name)
  --icon=<LucideName>              Ícone do menu (default: Package)
  --order=<number>                 Ordem no menu (default: próximo múltiplo de 10)
  --permission=<string>            Permissão exigida (default: vazio)
  --flag=<string>                  Feature flag que libera (default: vazio)
  --children="slug:Label:Icon,..." Sub-rotas (vírgula separa, dois pontos separa campos)
  --service=<ClassName>            Também scaffolda src/features/<name>/services/<ClassName>.ts
                                   + aumenta AppServices + registra no container via module.services
  --force                          Sobrescreve se a feature já existe
  --no-interactive                 Falha se faltar flag em vez de perguntar
  -h, --help                       Mostra esta ajuda
`);
  process.exit(0);
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function loadInquirer() {
  if (args["no-interactive"]) return null;
  try {
    return await import("@inquirer/prompts");
  } catch {
    log.warn(
      "@inquirer/prompts não instalado. Rode `yarn install` ou use --no-interactive.",
    );
    return null;
  }
}

async function ask(inq, type, flagName, opts) {
  if (args[flagName] !== undefined) return args[flagName];
  if (!inq) {
    if (opts?.default !== undefined) return opts.default;
    throw new Error(`Flag --${flagName} obrigatória em modo não-interativo.`);
  }
  return inq[type]({
    message: opts.message,
    default: opts.default,
    choices: opts.choices,
    validate: opts.validate,
  });
}

function toTitleCase(str) {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function validateKebab(name) {
  return /^[a-z][a-z0-9-]*$/.test(name)
    ? true
    : "Use kebab-case: letras minúsculas, dígitos e hífens (começar com letra).";
}

function validatePascal(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
    ? true
    : "Use PascalCase: começar com maiúscula, só letras e dígitos (ex: ClientesService).";
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal[0]?.toLowerCase() + pascal.slice(1);
}

/**
 * Deriva a chave do service no container a partir do nome da feature.
 * `cadastros` → `cadastros`; `tipos-pessoa` → `tiposPessoa`.
 *
 * A escolha de usar o nome da feature (e não o nome da classe) parte do
 * padrão "1 service principal por feature". Pra features com múltiplos
 * services o dev edita o `module.tsx` manualmente.
 */
function deriveServiceKey(featureName) {
  return toCamelCase(featureName);
}

/**
 * Lê o maior `order` já existente nos módulos e retorna o próximo
 * múltiplo de 10 pra sugerir um valor novo.
 */
function nextOrder() {
  if (!existsSync(FEATURES_DIR)) return 10;
  let max = -1;
  for (const dir of readdirSync(FEATURES_DIR)) {
    const file = join(FEATURES_DIR, dir, "module.tsx");
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");
    const match = content.match(/order:\s*(\d+)/);
    if (match) {
      const n = Number(match[1]);
      if (n > max) max = n;
    }
  }
  if (max < 0) return 10;
  return Math.floor(max / 10) * 10 + 10;
}

/**
 * Parseia o CSV de children do flag `--children`.
 * Formato: `slug:Label:Icon,slug2:Label2:Icon2`.
 * `Label` e `Icon` são opcionais e caem em defaults.
 */
function parseChildren(csv) {
  if (!csv) return [];
  return csv
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [slug, label, icon] = part.split(":").map((s) => s?.trim());
      if (!slug) throw new Error(`Child sem slug em "${part}".`);
      const v = validateKebab(slug);
      if (v !== true) throw new Error(`Child "${slug}": ${v}`);
      return {
        slug,
        label: label || toTitleCase(slug),
        icon: icon || "Package",
      };
    });
}

// ─── Templates ───────────────────────────────────────────────────────────

/**
 * Stub de service que recebe o `IHttpService` no construtor. Boilerplate
 * minimo e didático — intencionalmente sem interface separada pra reduzir
 * boilerplate no scaffold (dev adiciona depois se quiser).
 */
function serviceTemplate(className) {
  return `import type { IHttpService } from "@core/http/models/IHttpService";

/**
 * Service da feature. Edite esse arquivo pra implementar as chamadas
 * HTTP que a feature precisa. O \`http\` é injetado pelo container IoC.
 *
 * Exemplo de método:
 *
 * \`\`\`ts
 * async list(): Promise<Item[]> {
 *   return this.http.get<Item[]>("/items");
 * }
 * \`\`\`
 */
export class ${className} {
  constructor(private readonly http: IHttpService) {}

  /**
   * Smoke test gerado pelo scaffold — remove assim que tiver métodos
   * reais. Serve só pra garantir que o service é instanciável e que
   * \`this.http\` foi injetado pelo container.
   */
  isReady(): boolean {
    return Boolean(this.http);
  }
}
`;
}

function pageTemplate(slug, label) {
  const Pascal = toPascalCase(slug);
  return `import { Card, Typography } from "@devs-atem/design-system";

export const ${Pascal}Page = () => {
  return (
    <div style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
      <Typography.H1>${label}</Typography.H1>
      <Typography.Body>
        Página gerada pelo scaffold. Edite em{" "}
        <code>src/features/${slug}/pages/${Pascal}Page.tsx</code>.
      </Typography.Body>

      <Card>
        <Card.Header>
          <Typography.H3>Próximos passos</Typography.H3>
        </Card.Header>
        <Card.Body>
          <Typography.Body>Implemente a lógica da feature aqui.</Typography.Body>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ${Pascal}Page;
`;
}

/**
 * Monta os pedaços opcionais do module.tsx relacionados a service:
 * - `imports`: linha de import do service
 * - `augment`: bloco `declare module` que aumenta AppServices
 * - `servicesField`: campo `services` do objeto Module (com indent 2)
 *
 * Se `cfg.service` não vier, retorna strings vazias.
 *
 * @param {{ name: string, service?: string }} cfg
 */
function serviceSnippets(cfg) {
  if (!cfg.service) {
    return { imports: "", augment: "", servicesField: "" };
  }
  const key = deriveServiceKey(cfg.name);
  const imports = `import { ${cfg.service} } from "./services/${cfg.service}";\n`;
  const augment = `
declare module "@core/ioc/registry" {
  interface AppServices {
    ${key}: ${cfg.service};
  }
}
`;
  const servicesField = `  services: (c) =>
    c.add({ ${key}: new ${cfg.service}(c.get("http")) }),
`;
  return { imports, augment, servicesField };
}

/**
 * @param {object} cfg
 * @param {string} cfg.name
 * @param {string} cfg.label
 * @param {string} cfg.icon
 * @param {number} cfg.order
 * @param {string} cfg.permission
 * @param {string} cfg.flag
 * @param {string=} cfg.service
 */
function moduleTemplateSingle(cfg) {
  const Pascal = toPascalCase(cfg.name);
  const varName = `${Pascal[0].toLowerCase()}${Pascal.slice(1)}Module`;
  const menuExtras = [];
  if (cfg.permission) menuExtras.push(`    permission: ${JSON.stringify(cfg.permission)},`);
  if (cfg.flag) menuExtras.push(`    flag: ${JSON.stringify(cfg.flag)},`);
  const extras = menuExtras.length ? "\n" + menuExtras.join("\n") : "";
  const { imports, augment, servicesField } = serviceSnippets(cfg);

  return `import type { Module } from "@core/router/module.contract";
import { ${Pascal}Page } from "./pages/${Pascal}Page";
${imports}${augment}
const ${varName}: Module = {
  name: ${JSON.stringify(cfg.name)},
  routes: [
    { path: "/${cfg.name}", element: <${Pascal}Page /> },
  ],
  menu: {
    label: ${JSON.stringify(cfg.label)},
    path: "/${cfg.name}",
    icon: ${JSON.stringify(cfg.icon)},
    order: ${cfg.order},${extras}
  },
${servicesField}};

export default ${varName};
`;
}

/**
 * @param {object} cfg
 * @param {string} cfg.name
 * @param {string} cfg.label
 * @param {string} cfg.icon
 * @param {number} cfg.order
 * @param {string} cfg.permission
 * @param {string} cfg.flag
 * @param {string=} cfg.service
 * @param {{slug: string, label: string, icon: string}[]} cfg.children
 */
function moduleTemplateChildren(cfg) {
  const pageImports = cfg.children
    .map((c) => `import { ${toPascalCase(c.slug)}Page } from "./pages/${toPascalCase(c.slug)}Page";`)
    .join("\n");

  const routes = cfg.children
    .map(
      (c) =>
        `    { path: "/${cfg.name}/${c.slug}", element: <${toPascalCase(c.slug)}Page /> },`,
    )
    .join("\n");

  const children = cfg.children
    .map(
      (c) =>
        `      { label: ${JSON.stringify(c.label)}, path: "/${cfg.name}/${c.slug}", icon: ${JSON.stringify(c.icon)} },`,
    )
    .join("\n");

  const menuExtras = [];
  if (cfg.permission) menuExtras.push(`    permission: ${JSON.stringify(cfg.permission)},`);
  if (cfg.flag) menuExtras.push(`    flag: ${JSON.stringify(cfg.flag)},`);
  const extras = menuExtras.length ? "\n" + menuExtras.join("\n") : "";

  const varName = `${toPascalCase(cfg.name)[0].toLowerCase()}${toPascalCase(cfg.name).slice(1)}Module`;
  const { imports: serviceImport, augment, servicesField } = serviceSnippets(cfg);

  return `import type { Module } from "@core/router/module.contract";
${pageImports}
${serviceImport}${augment}
const ${varName}: Module = {
  name: ${JSON.stringify(cfg.name)},
  routes: [
${routes}
  ],
  menu: {
    label: ${JSON.stringify(cfg.label)},
    icon: ${JSON.stringify(cfg.icon)},
    order: ${cfg.order},${extras}
    children: [
${children}
    ],
  },
${servicesField}};

export default ${varName};
`;
}

// ─── Subcomando: module ──────────────────────────────────────────────────

async function generateModule(inq) {
  log.title("┌─ Novo módulo ──────────────────────────────────────┐");

  const name = await ask(inq, "input", "name", {
    message: "Nome da feature (kebab-case):",
    validate: validateKebab,
  });
  const v = validateKebab(name);
  if (v !== true) throw new Error(v);

  const dir = join(FEATURES_DIR, name);
  if (existsSync(dir) && !args.force) {
    throw new Error(
      `Feature "${name}" já existe em ${dir}. Use --force para sobrescrever.`,
    );
  }

  const label = await ask(inq, "input", "label", {
    message: "Label do menu:",
    default: toTitleCase(name),
  });
  const icon = await ask(inq, "input", "icon", {
    message: "Ícone (nome Lucide, ex: Package, DollarSign):",
    default: "Package",
  });
  const orderRaw = await ask(inq, "input", "order", {
    message: "Ordem no menu:",
    default: String(nextOrder()),
  });
  const order = Number(orderRaw);
  if (!Number.isFinite(order)) throw new Error(`Order inválido: ${orderRaw}`);

  const permission = await ask(inq, "input", "permission", {
    message: "Permissão exigida (vazio = sem):",
    default: "",
  });
  const flag = await ask(inq, "input", "flag", {
    message: "Feature flag (vazio = sem):",
    default: "",
  });

  // Service (opcional). Scaffolda src/features/<name>/services/<ClassName>.ts
  // + aumento de AppServices + campo `services` no module.tsx.
  let service = "";
  if (args.service !== undefined) {
    service = args.service;
  } else if (inq) {
    const want = await inq.confirm({
      message: "Scaffoldar um service IoC junto?",
      default: false,
    });
    if (want) {
      service = await inq.input({
        message: "Nome da classe do service (PascalCase, ex: ClientesService):",
        default: `${toPascalCase(name)}Service`,
      });
    }
  }
  if (service) {
    const sv = validatePascal(service);
    if (sv !== true) throw new Error(`Service "${service}": ${sv}`);
  }

  // Children
  let children = [];
  if (args.children !== undefined) {
    children = parseChildren(args.children);
  } else if (inq) {
    const kind = await inq.select({
      message: "Formato:",
      default: "single",
      choices: [
        { name: "Página única", value: "single" },
        { name: "Módulo com sub-rotas", value: "children" },
      ],
    });
    if (kind === "children") {
      children = await collectChildrenInteractive(inq);
    }
  }

  // Resumo + confirmação
  log.title("▸ Resumo");
  console.log(`  Pasta:        src/features/${name}/`);
  console.log(`  Label:        ${label}`);
  console.log(`  Icon:         ${icon}`);
  console.log(`  Order:        ${order}`);
  console.log(`  Permission:   ${permission || "(vazio)"}`);
  console.log(`  Flag:         ${flag || "(vazio)"}`);
  console.log(
    `  Service:      ${
      service ? `${service} (key: ${deriveServiceKey(name)})` : "(nenhum)"
    }`,
  );
  if (children.length) {
    console.log(`  Sub-rotas:`);
    for (const c of children) {
      console.log(`    - /${name}/${c.slug}  ${c.label}  (${c.icon})`);
    }
  }
  console.log();

  if (inq) {
    const ok = await inq.confirm({ message: "Gerar?", default: true });
    if (!ok) {
      log.warn("Cancelado.");
      process.exit(0);
    }
  }

  // Escrita
  mkdirSync(join(dir, "pages"), { recursive: true });
  if (service) mkdirSync(join(dir, "services"), { recursive: true });

  const cfg = { name, label, icon, order, permission, flag, service, children };

  if (children.length === 0) {
    const Pascal = toPascalCase(name);
    writeFileSync(join(dir, "pages", `${Pascal}Page.tsx`), pageTemplate(name, label));
    writeFileSync(join(dir, "module.tsx"), moduleTemplateSingle(cfg));
  } else {
    for (const child of children) {
      const Pascal = toPascalCase(child.slug);
      writeFileSync(
        join(dir, "pages", `${Pascal}Page.tsx`),
        pageTemplate(child.slug, child.label),
      );
    }
    writeFileSync(join(dir, "module.tsx"), moduleTemplateChildren(cfg));
  }

  if (service) {
    writeFileSync(
      join(dir, "services", `${service}.ts`),
      serviceTemplate(service),
    );
  }

  log.title("┗━ Pronto!");
  log.success(`Módulo "${name}" criado em src/features/${name}/`);
  console.log();
  log.info("Rode `yarn dev` ou `mise run dev` pra ver o novo item no menu.");
}

async function collectChildrenInteractive(inq) {
  const children = [];
  log.info("Adicione as sub-rotas. Deixe o slug em branco pra encerrar.");
  while (true) {
    const slug = await inq.input({
      message: `  Child #${children.length + 1} slug (vazio pra terminar):`,
    });
    if (!slug) break;
    const v = validateKebab(slug);
    if (v !== true) {
      log.error(v);
      continue;
    }
    const label = await inq.input({
      message: "  Label:",
      default: toTitleCase(slug),
    });
    const icon = await inq.input({
      message: "  Icon (Lucide):",
      default: "Package",
    });
    children.push({ slug, label, icon });
  }
  if (children.length === 0) {
    log.warn("Nenhuma sub-rota adicionada — gerando com página única.");
  }
  return children;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  const inq = await loadInquirer();
  let subcommand = positionals[0];

  if (!subcommand) {
    if (!inq) {
      throw new Error(
        "Subcomando faltando. Uso: `generate module`. Rode com -h pra ajuda.",
      );
    }
    subcommand = await inq.select({
      message: "O que você quer gerar?",
      default: "module",
      choices: [{ name: "module — nova feature em src/features/", value: "module" }],
    });
  }

  switch (subcommand) {
    case "module":
      await generateModule(inq);
      break;
    default:
      throw new Error(`Subcomando desconhecido: "${subcommand}". Use \`generate -h\`.`);
  }
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
