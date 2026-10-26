/**
 * Feature flags do projeto. Adicione aqui conforme o produto crescer.
 *
 * Uso em componentes/rotas:
 *   const flags = useFlags(featureFlags);
 *   if (flags[featureFlagMapping.MY_FEATURE]?.enabled) { ... }
 */

export const featureFlagMapping = {
  // SIDEBAR_HOME: "sidebar_home",
} as const;

export const featureFlags: readonly string[] = Object.values(featureFlagMapping);

export const flagsmithEnvId = import.meta.env.VITE_FLAGSMITH_ENV_ID ?? "";

export const flagsmithEnabled = flagsmithEnvId.length > 0;

/**
 * URL base da API do Flagsmith. Default aponta pro host corporativo
 * (Ream); sobrescreva via `VITE_FLAGSMITH_API_URL` quando precisar
 * apontar pra outro ambiente/instância.
 */
export const flagsmithApiUrl =
  import.meta.env.VITE_FLAGSMITH_API_URL ??
  "https://flagsmith.ream.com.br/api/v1/";
