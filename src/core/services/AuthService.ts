import axios from "axios";

import { authConfig, authRefreshUrl } from "@core/config/auth";
import type { AuthenticationResponse } from "@core/config/auth/types";
import type { IAuthService } from "@core/services/models/IAuthService";

/**
 * Fala com o endpoint de refresh do provedor de auth.
 * É `standalone` — não compartilha o axios interno com o IHttpService
 * porque esse não tem token (ainda).
 */
export class AuthService implements IAuthService {
  private readonly client = axios.create({
    timeout: authConfig.authApi.timeout ?? 60_000,
    headers: authConfig.authApi.extraHeaders,
  });

  async refresh(refreshToken: string): Promise<AuthenticationResponse> {
    const { data } = await this.client.post<AuthenticationResponse>(
      authRefreshUrl,
      { token: refreshToken },
    );
    return data;
  }
}
