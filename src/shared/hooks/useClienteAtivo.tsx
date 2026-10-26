import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ClienteFiltro } from "@features/inicio/services/ArmazenagemService";

interface ClienteAtivoContextValue {
  cliente: ClienteFiltro;
  setCliente: (c: ClienteFiltro) => void;
}

const ClienteAtivoContext = createContext<ClienteAtivoContextValue | null>(null);

/**
 * Cliente ativo do portal — escopo de dados exibidos nas telas.
 * Espelha o seletor "Cliente ativo" do protótipo. Default: cliente 1.
 */
export const ClienteAtivoProvider = ({ children }: { children: ReactNode }) => {
  const [cliente, setCliente] = useState<ClienteFiltro>(1);
  const value = useMemo(() => ({ cliente, setCliente }), [cliente]);
  return (
    <ClienteAtivoContext.Provider value={value}>
      {children}
    </ClienteAtivoContext.Provider>
  );
};

export function useClienteAtivo(): ClienteAtivoContextValue {
  const ctx = useContext(ClienteAtivoContext);
  if (!ctx) {
    throw new Error(
      "useClienteAtivo deve ser usado dentro de ClienteAtivoProvider",
    );
  }
  return ctx;
}
