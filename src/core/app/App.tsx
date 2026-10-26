import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@core/auth/AuthContext";
import { createAppRouter } from "@core/router/createAppRouter";
import { modules } from "@core/router/modules";
import { FlagsmithProvider } from "@core/providers/FlagsmithProvider";
import { QueryProvider } from "@core/providers/QueryProvider";
import { ThemeProvider } from "@core/providers/ThemeProvider";
import { ToastProvider } from "@core/providers/ToastProvider";
import { ClienteAtivoProvider } from "@shared/hooks/useClienteAtivo";

const router = createAppRouter(modules);

/**
 * Composição raiz do app. A ordem dos providers importa:
 *
 * 1. Flagsmith no topo pra expor flags antes de qualquer coisa (opt-in).
 * 2. Query antes do Auth, pois o Auth pode usar queries futuramente.
 * 3. Theme antes do Auth pra que o LoadingApp (dentro do AuthProvider)
 *    não precise se preocupar com estilos.
 * 4. Auth antes do Router — rotas precisam saber se o user está logado.
 */
const App = () => {
  return (
    <FlagsmithProvider>
      <QueryProvider>
        <ThemeProvider>
                    <AuthProvider>
                      <ToastProvider />
                      <ClienteAtivoProvider>
                        <RouterProvider router={router} />
                      </ClienteAtivoProvider>
                    </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </FlagsmithProvider>
  );
};

export default App;
