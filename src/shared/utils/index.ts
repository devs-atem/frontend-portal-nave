import { authConfig, loginSpaUrl } from "@core/config/auth";

const PERMISSION_METHODS = ["read", "write"] as const;

/** Expande `foo:*` em `['foo:read', 'foo:write']`. */
export const toReplaceAsterisk = (permission: string): string[] => {
  if (permission.includes("*")) {
    return PERMISSION_METHODS.map((m) => permission.replace("*", m));
  }
  return [permission];
};

/**
 * Monta um matcher que verifica se uma permissão de módulo bate com a esperada.
 * Usado no `RouteGuard`:
 *   `rules={generatePermissionMatcher("portal_vendas:users:*")}`.
 *
 * Regra: aceita wildcard. `foo:bar:*` casa com `foo:bar:read` ou `foo:bar:write`.
 */
export const generatePermissionMatcher =
  (permissionRef: string) =>
  (userPermission: string): boolean => {
    // Escapa chars especiais do regex, depois troca `*` por `[^:]+`
    const normalized = permissionRef
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^:]+");
    const exp = new RegExp(`^${normalized}$`);
    return exp.test(userPermission);
  };

/**
 * Monta a URL de logout: `${loginSpaUrl}?url=<origin>&rules=<rules>`.
 *
 * Esse é o único formato aceito pelos SPAs de auth da Atem e do Ream.
 * Os nomes dos query params podem ser customizados via
 * `authConfig.loginSpa.queryParams` (default: `url`/`rules`).
 */
export function buildLogoutUrl(): string {
  const { origin } = window.location;
  const { urlParam, rulesParam } = authConfig.loginSpa.queryParams ?? {
    urlParam: "url",
    rulesParam: "rules",
  };
  const qs = new URLSearchParams({
    [urlParam]: origin,
    [rulesParam]: authConfig.rules,
  });
  return `${loginSpaUrl}?${qs.toString()}`;
}

/** Primeira letra maiúscula. */
export const capitalize = (s: string) =>
  s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;

/** Iniciais pra avatar (ex: "Ramon Lima" → "RL"). */
export const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
