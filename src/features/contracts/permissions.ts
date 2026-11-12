import { useAuth } from "@core/auth/AuthContext";
import type { ActionPermissions } from "./services/contractRules";

/**
 * Chaves de permissão do portal para o módulo de Contratos.
 *
 * O back valida `app:custody:contract:{read,write,approve,status}`; o portal
 * decide a visibilidade (UX) com as chaves `portal_nave:contracts:*` e o back
 * continua sendo a fonte de verdade (403 é tratado nas telas). Acesso
 * restrito ao gestor de contratos e ao admin (bypass do `authByPermission`).
 */
export const CONTRACT_PERM = {
  read: "portal_nave:contracts:read",
  write: "portal_nave:contracts:write",
  approve: "portal_nave:contracts:approve",
  status: "portal_nave:contracts:status",
} as const;

/** Permissões do usuário logado para as ações de contrato. */
export function useContractPermissions(): ActionPermissions {
  const { authByPermission } = useAuth();
  return {
    write: authByPermission(CONTRACT_PERM.write),
    approve: authByPermission(CONTRACT_PERM.approve),
    status: authByPermission(CONTRACT_PERM.status),
  };
}
