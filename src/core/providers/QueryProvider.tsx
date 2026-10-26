import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Provider do TanStack Query.
 *
 * Defaults razoáveis pro template:
 * - `retry: 1` evita loops em erros de rede intermitentes
 * - `refetchOnWindowFocus: false` evita requisições desnecessárias
 *
 * Produtos podem reconfigurar criando o próprio `QueryClient`.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export default QueryProvider;
