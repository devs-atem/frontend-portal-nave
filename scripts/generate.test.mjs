// @ts-check
import { describe, it, expect, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCRIPT = join(__dirname, "generate.mjs");
const FEATURES = join(ROOT, "src", "features");

/**
 * Pastas criadas pelos testes — limpas no afterEach pra manter
 * o repo em estado consistente mesmo em falha.
 */
const createdDirs = new Set();

function run(args, opts = {}) {
  return execFileSync("node", [SCRIPT, ...args], {
    encoding: "utf-8",
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
}

function runExpectFail(args) {
  try {
    run(args);
    throw new Error("esperava falha, mas o comando saiu com 0");
  } catch (err) {
    if (err.status === undefined) throw err;
    return { status: err.status, stderr: err.stderr?.toString() ?? "" };
  }
}

afterEach(() => {
  for (const dir of createdDirs) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
  createdDirs.clear();
});

describe("generate module", () => {
  it("cria pasta, module.tsx e página única com os campos corretos", () => {
    const dir = join(FEATURES, "teste-single");
    createdDirs.add(dir);

    run([
      "module",
      "--name=teste-single",
      "--label=Teste Single",
      "--icon=Package",
      "--order=99",
      "--no-interactive",
    ]);

    expect(existsSync(dir)).toBe(true);
    expect(existsSync(join(dir, "module.tsx"))).toBe(true);
    expect(existsSync(join(dir, "pages", "TesteSinglePage.tsx"))).toBe(true);

    const mod = readFileSync(join(dir, "module.tsx"), "utf-8");
    expect(mod).toMatch(/name: "teste-single"/);
    expect(mod).toMatch(/label: "Teste Single"/);
    expect(mod).toMatch(/icon: "Package"/);
    expect(mod).toMatch(/order: 99/);
    expect(mod).toMatch(/path: "\/teste-single"/);
    expect(mod).toMatch(/TesteSinglePage/);

    const page = readFileSync(join(dir, "pages", "TesteSinglePage.tsx"), "utf-8");
    expect(page).toMatch(/export const TesteSinglePage/);
  });

  it("gera módulo com sub-rotas quando --children é passado", () => {
    const dir = join(FEATURES, "teste-children");
    createdDirs.add(dir);

    run([
      "module",
      "--name=teste-children",
      "--label=Teste Children",
      "--icon=Folder",
      "--order=50",
      "--children=foo:Foo:FileText,bar:Bar:ChartPie",
      "--no-interactive",
    ]);

    expect(existsSync(join(dir, "pages", "FooPage.tsx"))).toBe(true);
    expect(existsSync(join(dir, "pages", "BarPage.tsx"))).toBe(true);
    expect(existsSync(join(dir, "pages", "TesteChildrenPage.tsx"))).toBe(false);

    const mod = readFileSync(join(dir, "module.tsx"), "utf-8");
    expect(mod).toMatch(/path: "\/teste-children\/foo"/);
    expect(mod).toMatch(/path: "\/teste-children\/bar"/);
    expect(mod).toMatch(/FooPage/);
    expect(mod).toMatch(/BarPage/);
    expect(mod).toMatch(/children: \[/);
    // Importante: menu-pai não tem `path`
    expect(mod).not.toMatch(/path: "\/teste-children",/);
  });

  it("inclui permission e flag quando passados", () => {
    const dir = join(FEATURES, "teste-perm");
    createdDirs.add(dir);

    run([
      "module",
      "--name=teste-perm",
      "--label=Teste Perm",
      "--icon=Shield",
      "--order=10",
      "--permission=portal_x:teste:*",
      "--flag=sidebar_teste",
      "--no-interactive",
    ]);

    const mod = readFileSync(join(dir, "module.tsx"), "utf-8");
    expect(mod).toMatch(/permission: "portal_x:teste:\*"/);
    expect(mod).toMatch(/flag: "sidebar_teste"/);
  });

  it("falha se a feature já existe sem --force", () => {
    const dir = join(FEATURES, "teste-dup");
    createdDirs.add(dir);

    run(["module", "--name=teste-dup", "--order=10", "--no-interactive"]);
    const { status, stderr } = runExpectFail([
      "module",
      "--name=teste-dup",
      "--order=10",
      "--no-interactive",
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/já existe/);
  });

  it("sobrescreve quando --force é passado", () => {
    const dir = join(FEATURES, "teste-force");
    createdDirs.add(dir);

    run([
      "module",
      "--name=teste-force",
      "--label=Primeiro",
      "--order=10",
      "--no-interactive",
    ]);
    run([
      "module",
      "--name=teste-force",
      "--label=Segundo",
      "--order=10",
      "--force",
      "--no-interactive",
    ]);
    const mod = readFileSync(join(dir, "module.tsx"), "utf-8");
    expect(mod).toMatch(/label: "Segundo"/);
    expect(mod).not.toMatch(/label: "Primeiro"/);
  });

  it("rejeita nome que não seja kebab-case", () => {
    const { status, stderr } = runExpectFail([
      "module",
      "--name=NomeInvalido",
      "--order=10",
      "--no-interactive",
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/kebab-case/);
  });

  it("rejeita child com slug fora do kebab-case", () => {
    const { status, stderr } = runExpectFail([
      "module",
      "--name=teste-child-bad",
      "--order=10",
      "--children=OK:OK:Package",
      "--no-interactive",
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/Child "OK"/);
    expect(stderr).toMatch(/kebab-case/);
  });

  it("scaffolda service IoC quando --service é passado", () => {
    const dir = join(FEATURES, "teste-svc");
    createdDirs.add(dir);

    run([
      "module",
      "--name=teste-svc",
      "--label=Teste",
      "--icon=Package",
      "--order=70",
      "--service=TesteSvcService",
      "--no-interactive",
    ]);

    expect(existsSync(join(dir, "services", "TesteSvcService.ts"))).toBe(true);

    const svc = readFileSync(
      join(dir, "services", "TesteSvcService.ts"),
      "utf-8",
    );
    expect(svc).toMatch(/export class TesteSvcService/);
    expect(svc).toMatch(/private readonly http: IHttpService/);

    const mod = readFileSync(join(dir, "module.tsx"), "utf-8");
    // Importa o service
    expect(mod).toMatch(
      /import \{ TesteSvcService \} from "\.\/services\/TesteSvcService"/,
    );
    // Aumenta AppServices via declaration merging
    expect(mod).toMatch(/declare module "@core\/ioc\/registry"/);
    expect(mod).toMatch(/testeSvc: TesteSvcService/);
    // Registra no container no campo `services`
    expect(mod).toMatch(/services: \(c\) =>/);
    expect(mod).toMatch(
      /c\.add\(\{ testeSvc: new TesteSvcService\(c\.get\("http"\)\) \}\)/,
    );
  });

  it("rejeita --service fora do PascalCase", () => {
    const { status, stderr } = runExpectFail([
      "module",
      "--name=teste-svc-bad",
      "--order=10",
      "--service=invalid-name",
      "--no-interactive",
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/PascalCase/);
  });

  it("não cria pasta services/ quando --service é omitido", () => {
    const dir = join(FEATURES, "teste-no-svc");
    createdDirs.add(dir);

    run([
      "module",
      "--name=teste-no-svc",
      "--label=Teste",
      "--icon=Package",
      "--order=80",
      "--no-interactive",
    ]);

    expect(existsSync(join(dir, "services"))).toBe(false);
    const mod = readFileSync(join(dir, "module.tsx"), "utf-8");
    expect(mod).not.toMatch(/declare module "@core\/ioc\/registry"/);
    expect(mod).not.toMatch(/services:/);
  });

  it("gera service IoC em conjunto com sub-rotas", () => {
    const dir = join(FEATURES, "teste-svc-children");
    createdDirs.add(dir);

    run([
      "module",
      "--name=teste-svc-children",
      "--label=Teste",
      "--icon=Package",
      "--order=90",
      "--children=foo:Foo:FileText",
      "--service=TesteSvcChildrenService",
      "--no-interactive",
    ]);

    expect(existsSync(join(dir, "services", "TesteSvcChildrenService.ts"))).toBe(
      true,
    );
    expect(existsSync(join(dir, "pages", "FooPage.tsx"))).toBe(true);

    const mod = readFileSync(join(dir, "module.tsx"), "utf-8");
    expect(mod).toMatch(/children: \[/);
    expect(mod).toMatch(/testeSvcChildren: TesteSvcChildrenService/);
    expect(mod).toMatch(/services: \(c\) =>/);
  });
});
