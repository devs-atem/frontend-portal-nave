import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { registerModuleServices } from "@core/ioc";
import { modules } from "@core/router/modules";
import App from "./App";
import "../../styles/globals.css";

// Composição final do container IoC: core services + services declarados por
// cada módulo em `src/features/*/module.tsx`. Precisa rodar antes do primeiro
// render pra que `useIoC` tenha o container completo quando componentes montarem.
registerModuleServices(modules);

const container = document.getElementById("root");
if (!container) throw new Error("Elemento #root não encontrado no index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
