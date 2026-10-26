import type { Module } from "@core/router/module.contract";
import { NfePage } from "./pages/NfePage";

const fiscalModule: Module = {
  name: "fiscal",
  routes: [{ path: "/fiscal/nfe", element: <NfePage /> }],
  menu: {
    label: "Fiscal",
    icon: "FileText",
    order: 30,
    children: [{ label: "Consulta de NF-e", path: "/fiscal/nfe" }],
  },
};

export default fiscalModule;
