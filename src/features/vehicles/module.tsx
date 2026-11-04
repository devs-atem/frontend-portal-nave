import type { ReactElement } from "react";
import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { VeiculosPage } from "./pages/VehiclesPage";
import { AgendamentosPage } from "./pages/SchedulesPage";
import { NovoAgendamentoPage } from "./pages/NovoAgendamentoPage";

const PERM_VEHICLES = "portal_nave:vehicles:read";
const PERM_SCHEDULES_READ = "portal_nave:schedules:read";
const PERM_SCHEDULES_WRITE = "portal_nave:schedules:write";

const guard = (perm: string, el: ReactElement) => (
  <RouteGuard rules={generatePermissionMatcher(perm)}>{el}</RouteGuard>
);

const veiculosModule: Module = {
  name: "veiculos",
  routes: [
    { path: "/veiculos", element: guard(PERM_VEHICLES, <VeiculosPage />) },
    {
      path: "/veiculos/agendamentos",
      element: guard(PERM_SCHEDULES_READ, <AgendamentosPage />),
    },
    {
      path: "/veiculos/novo-agendamento",
      element: guard(PERM_SCHEDULES_WRITE, <NovoAgendamentoPage />),
    },
  ],
  menu: {
    label: "Veículos",
    icon: "Truck",
    order: 20,
    children: [
      {
        label: "Situação de veículos",
        path: "/veiculos",
        permission: PERM_VEHICLES,
      },
      {
        label: "Agendamentos",
        path: "/veiculos/agendamentos",
        permission: PERM_SCHEDULES_READ,
      },
      {
        label: "Novo agendamento",
        path: "/veiculos/novo-agendamento",
        permission: PERM_SCHEDULES_WRITE,
      },
    ],
  },
};

export default veiculosModule;
