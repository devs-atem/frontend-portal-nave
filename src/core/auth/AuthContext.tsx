import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Cookies from "universal-cookie";
import { jwtDecode } from "jwt-decode";

import { authConfig } from "@core/config/auth";
import type { AuthenticationResponse } from "@core/config/auth/types";
import LoadingApp from "@shared/components/LoadingApp";
import { useIoC } from "@shared/hooks/useIoC";
import { buildLogoutUrl, toReplaceAsterisk } from "@shared/utils/index";
import { expandPermissionAliases } from "@shared/utils/permissionAliases";
import {
  AuthCookieKeys,
  type AuthenticationContextData,
} from "./models/IAuthContext";

interface CognitoParsedToken {
  exp: number;
  sub: string;
  iat: number;
}

const AuthContext = createContext<AuthenticationContextData | null>(null);

/** Refresh em andamento (evita chamadas duplicadas simultâneas). */
let refreshInFlight: Promise<AuthenticationResponse> | null = null;

interface AuthProviderProps {
  children?: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthenticationContextData | null>(null);

  const http = useIoC("http");
  const authService = useIoC("auth");

  const cookieName = authConfig.cookie.name ?? AuthCookieKeys.refreshToken;
  const bufferMs = authConfig.refresh.bufferMs ?? 59 * 60 * 1_000;
  const safetyMarginMs = authConfig.refresh.safetyMarginMs ?? 30_000;

  const logout = useCallback(async () => {
    const url = await buildLogoutUrl();
    window.location.href = url;
  }, []);

  // ── Refresh scheduling ─────────────────────────────────────
  const scheduleRefreshBefore = useCallback(
    async (nextRefreshTime: number): Promise<string | null> => {
      try {
        const data = await tokenRefresh(nextRefreshTime - safetyMarginMs);
        if (!data) return null;
        const bearer = `${data.TokenType} ${data.AccessToken}`;
        http.setAuthorization(bearer);
        return bearer;
      } catch (err) {
        console.error("[AuthContext] refresh falhou:", err);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const tokenRefresh = useCallback(
    async (
      refreshTokenExpirationTime?: number,
    ): Promise<AuthenticationResponse | null> => {
      try {
        const cookies = new Cookies();
        const current = cookies.get(cookieName);
        if (!current) throw new Error("Refresh token não encontrado no cookie");

        if (
          refreshTokenExpirationTime &&
          Date.now() <= refreshTokenExpirationTime
        ) {
          return null;
        }

        // Compartilha a chamada em andamento: o StrictMode (dev) monta o
        // bootstrap duas vezes e isso dispararia dois refresh seguidos.
        refreshInFlight ??= authService
          .refresh(current)
          .finally(() => {
            refreshInFlight = null;
          });
        const response = await refreshInFlight;
        const parsed = jwtDecode<CognitoParsedToken>(response.AccessToken);
        const nextRefreshTime = parsed.exp * 1_000 - bufferMs;

        http.setTokenExpirationStrategy(
          async () => await scheduleRefreshBefore(nextRefreshTime),
        );

        return response;
      } catch (err) {
        console.error("[AuthContext] tokenRefresh falhou:", err);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Bootstrap ──────────────────────────────────────────────
  const bootstrap = useCallback(async () => {
    try {
      const data = await tokenRefresh();
      if (!data) {
        if (authConfig.onRefreshFailure === "logout") await logout();
        return;
      }

      http.setAuthorization(`${data.TokenType} ${data.AccessToken}`);

      const extractRoles =
        authConfig.permissions.extractRoles ??
        ((meta) => meta.permissionSet.ROLES ?? meta.roles ?? []);
      const extractModules =
        authConfig.permissions.extractModules ??
        ((meta) => meta.permissionSet.SYSTEM_MODULES ?? []);

      const roles = extractRoles(data.meta);
      const modules = expandPermissionAliases(extractModules(data.meta));
      const adminMode = roles.some((r) =>
        authConfig.permissions.adminRoles.includes(r),
      );

      const authData: AuthenticationContextData = {
        token: data.AccessToken,
        refreshToken: data.RefreshToken,
        subject: data.meta.id,
        email: data.meta.email,
        name: data.meta.name,
        roles: new Set(roles),
        permissionSet: {
          ...data.meta.permissionSet,
          SYSTEM_MODULES: modules,
        },
        adminMode,
        logout,
        authByPermission: (checkPermission: string) => {
          if (adminMode) return true;
          const expanded = toReplaceAsterisk(checkPermission);
          return modules.some((m) => expanded.includes(m));
        },
      };

      setState(authData);
    } catch (err) {
      console.error("[AuthContext] bootstrap falhou:", err);
      if (authConfig.onRefreshFailure === "logout") await logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // ── DEV ONLY: bypass de autenticação ───────────────────────
    // Com VITE_AUTH_BYPASS=true, injeta um usuário mock e pula o
    // refresh/login real.
    //
    // Por padrão o mock é admin (adminMode) — bom pra ver todos os
    // módulos. Para TESTAR o RBAC, defina VITE_AUTH_BYPASS_ADMIN=false
    // e liste as permissões em VITE_AUTH_BYPASS_PERMISSIONS (separadas
    // por vírgula). Aí o usuário mock fica sujeito aos filtros de menu
    // e ao RouteGuard, como um usuário comum.
    if (import.meta.env.VITE_AUTH_BYPASS === "true") {
      const bypassAdmin = import.meta.env.VITE_AUTH_BYPASS_ADMIN !== "false";
      const bypassModules = expandPermissionAliases(
        (import.meta.env.VITE_AUTH_BYPASS_PERMISSIONS ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );

      console.warn(
        `[AuthContext] ⚠️ AUTH BYPASS ativo (VITE_AUTH_BYPASS=true) — usuário mock ${
          bypassAdmin ? "ADMIN (ignora RBAC)" : "comum (sujeito ao RBAC)"
        }. NÃO use em produção.`,
      );

      setState({
        token: "dev-bypass-token",
        refreshToken: "dev-bypass-refresh",
        subject: "dev-bypass",
        email: "dev@local",
        name: bypassAdmin ? "Dev (bypass admin)" : "Dev (bypass)",
        roles: new Set(bypassAdmin ? ["admin"] : []),
        permissionSet: {
          ROLES: bypassAdmin ? ["admin"] : [],
          SYSTEM_MODULES: bypassModules,
        },
        adminMode: bypassAdmin,
        logout,
        authByPermission: (checkPermission: string) => {
          if (bypassAdmin) return true;
          const expanded = toReplaceAsterisk(checkPermission);
          return bypassModules.some((m) => expanded.includes(m));
        },
      });
      return;
    }

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {state && state.token ? <>{ children }</> : <LoadingApp />}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthenticationContextData => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth precisa estar dentro de um AuthProvider");
  }
  return ctx;
};
