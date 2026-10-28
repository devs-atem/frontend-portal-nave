import type { Module } from "@core/router/module.contract";
import { VeiculosPage } from "./pages/VeiculosPage";
import { AgendamentosPage } from "./pages/AgendamentosPage";
import { NovoAgendamentoPage } from "./pages/NovoAgendamentoPage";

const veiculosModule: Module = {
  name: "veiculos",
  routes: [
    { path: "/veiculos", element: <VeiculosPage /> },
    { path: "/veiculos/agendamentos", element: <AgendamentosPage /> },
    { path: "/veiculos/novo-agendamento", element: <NovoAgendamentoPage /> },
  ],
  menu: {
    label: "Veículos",
    icon: "Truck",
    order: 20,
    children: [
      { label: "Situação de veículos", path: "/veiculos" },
      { label: "Agendamentos", path: "/veiculos/agendamentos" },
      { label: "Novo agendamento", path: "/veiculos/novo-agendamento" },
    ],
  },
};

export default veiculosModule;
