import type { Module } from "./module.contract";

/**
 * Transforma o retorno de `import.meta.glob` em uma lista de módulos.
 *
 * Isolado em função pura pra permitir testes sem depender de Vite:
 * basta passar um objeto `{ "<path>": { default: Module } }` manualmente.
 *
 * - Entradas sem `default` são ignoradas (ex: arquivo criado em branco).
 * - Mantém a ordem de inserção do objeto; ordenação por `menu.order`
 *   acontece no `useMenuItems`, não aqui.
 */
export function buildModuleList(
  entries: Record<string, { default?: Module } | undefined>,
): Module[] {
  return Object.values(entries)
    .map((entry) => entry?.default)
    .filter((mod): mod is Module => !!mod);
}

const globResult = import.meta.glob<{ default: Module }>(
  "../../features/*/module.tsx",
  { eager: true },
);

/** Lista de módulos descobertos em `src/features/*`. */
export const modules: Module[] = buildModuleList(globResult);
