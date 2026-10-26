import type { AuthMeta } from "@core/config/auth/types";

export interface AuthenticationContextData {
  token: string;
  refreshToken: string;
  subject: string;
  email: string;
  name: string;
  roles: Set<string>;
  permissionSet: AuthMeta["permissionSet"];
  adminMode: boolean;
  logout: () => Promise<void>;
  /** Checa se o usuário tem a permissão (considera wildcard e adminMode). */
  authByPermission: (checkPermission: string) => boolean;
}

export enum AuthCookieKeys {
  refreshToken = "refreshToken",
}
