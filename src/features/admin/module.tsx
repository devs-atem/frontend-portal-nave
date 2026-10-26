import type { Module } from "@core/router/module.contract";
import { AdminPage } from "./pages/AdminPage";

const adminModule: Module = {
  name: "admin",
  routes: [{ path: "/admin", element: <AdminPage /> }],
  menu: {
    label: "Administração",
    path: "/admin",
    icon: "Settings",
    order: 90,
  },
};

export default adminModule;
