import type { ReactNode } from "react";
import flagsmith from "@flagsmith/flagsmith";
import { FlagsmithProvider as FlagsmithLibProvider } from "@flagsmith/flagsmith/react";

import {
  flagsmithApiUrl,
  flagsmithEnabled,
  flagsmithEnvId,
} from "@core/config/featureFlags";

/**
 * Wrapper opt-in do FlagsmithProvider.
 *
 * - Se `VITE_FLAGSMITH_ENV_ID` estiver vazio, o provider não é montado e os
 *   filhos passam direto. O `useFeatureFlag`/`useMenuItems` tratam esse
 *   caso retornando "flag habilitada".
 * - A URL da API vem de `flagsmithApiUrl` (env `VITE_FLAGSMITH_API_URL`,
 *   com fallback pro host corporativo).
 */
export function FlagsmithProvider({ children }: { children: ReactNode }) {
  if (!flagsmithEnabled) return <>{children}</>;

  return (
    <FlagsmithLibProvider
      options={{
        environmentID: flagsmithEnvId,
        api: flagsmithApiUrl,
      }}
      flagsmith={flagsmith}
    >
      {/* flagsmith/react tipifica `children` como ReactElement estrito;
          Fragment satisfaz o shape e aceita qualquer ReactNode dentro. */}
      <>{children}</>
    </FlagsmithLibProvider>
  );
}

export default FlagsmithProvider;
