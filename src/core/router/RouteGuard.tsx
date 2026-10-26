import { Navigate } from "react-router-dom";
import { type PropsWithChildren, type ReactElement } from "react";

import { useAuth } from "@core/auth/AuthContext";
import { useFeatureFlag } from "@shared/hooks/useFeatureFlag";

/**
 * Guard de rota — bloqueia o render com base em permissão e/ou feature flag.
 *
 * Use nas rotas dentro do `module.tsx` de cada feature.
 *
 * ```tsx
 * import { RouteGuard } from "@core/router/RouteGuard";
 * import { generatePermissionMatcher } from "@utils/index";
 *
 * {
 *   path: "/usuarios",
 *   element: (
 *     <RouteGuard
 *       flag="sidebar_users"
 *       rules={generatePermissionMatcher("portal_vendas:users:read")}
 *     >
 *       <UsersPage />
 *     </RouteGuard>
 *   ),
 * }
 * ```
 */
interface RouteGuardProps extends PropsWithChildren {
  children: ReactElement;
  /** Matcher de permissão. Use `generatePermissionMatcher("foo:bar:*")`. */
  rules?: (permission: string) => boolean;
  /** Nome da feature flag (Flagsmith) que libera a rota. */
  flag?: string;
  /** Exige permissão de escrita (sufixo :write). */
  requireWrite?: boolean;
}

const ACCESS_DENIED_PATH = "/access-denied";

export const RouteGuard = ({
  children,
  rules,
  flag,
  requireWrite,
}: RouteGuardProps) => {
  const auth = useAuth();
  const flagEnabled = useFeatureFlag(flag);

  // Admin ignora tudo
  if (auth.adminMode) return children;

  // Flag
  if (flag && !flagEnabled) {
    return <Navigate to={ACCESS_DENIED_PATH} replace />;
  }

  // Permissão
  if (rules) {
    const modules = auth.permissionSet.SYSTEM_MODULES ?? [];
    const matches = modules.filter(rules);
    const ok = requireWrite
      ? matches.some((m) => m.endsWith(":write"))
      : matches.length > 0;
    if (!ok) return <Navigate to={ACCESS_DENIED_PATH} replace />;
  }

  return children;
};

export default RouteGuard;
