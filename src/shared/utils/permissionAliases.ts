import { authConfig } from "@core/config/auth";

/**
 * Expande o array de módulos adicionando equivalentes canônicos
 * quando um alias (ou alias com sufixo :read/:write) é encontrado.
 *
 * A tabela de aliases vem do preset do provider (`permissions.permissionAliases`).
 * Default: identidade (sem expansão).
 */
export function expandPermissionAliases(modules: string[]): string[] {
  const aliases = authConfig.permissions.permissionAliases;
  if (!aliases || !Object.keys(aliases).length) return modules;

  const expanded = new Set(modules);

  for (const mod of modules) {
    for (const [alias, canonical] of Object.entries(aliases)) {
      if (mod === alias || mod.startsWith(`${alias}:`)) {
        const suffix = mod.slice(alias.length);
        expanded.add(`${canonical}${suffix}`);
      }
    }
  }

  return Array.from(expanded);
}
