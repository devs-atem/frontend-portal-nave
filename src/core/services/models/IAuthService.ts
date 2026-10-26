import type { AuthenticationResponse } from "@core/config/auth/types";

export interface IAuthService {
  /** Chama o endpoint de refresh com o cookie atual. */
  refresh(refreshToken: string): Promise<AuthenticationResponse>;
}
