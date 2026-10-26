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

        const response = await authService.refresh(current);
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
