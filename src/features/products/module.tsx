import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { ProductsPage } from "./pages/ProductsPage";
import { ApiProductsDataSource } from "./services/ApiProductsDataSource";
import type { ProductsDataSource } from "./services/ProductsDataSource";

/**
 * Módulo Products — catálogo de produtos (dados mestres fixos) e seus vínculos
 * N:N com clientes. Permite navegar nos dois sentidos (clientes de um produto e
 * produtos de um cliente) via tabela expansível com alternância de visão.
 */
declare module "@core/ioc/registry" {
  interface AppServices {
    products: ProductsDataSource;
  }
}

const PERM = "portal_nave:products:read";

const productsModule: Module = {
  name: "products",
  routes: [
    {
      path: "/products",
      element: (
        <RouteGuard rules={generatePermissionMatcher(PERM)}>
          <ProductsPage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Produtos",
    path: "/products",
    icon: "Package",
    order: 15,
    permission: PERM,
  },
  // API real (mw-nave). O mock (MockProductsDataSource) segue disponível
  // para testes/protótipos.
  services: (c) => c.add({ products: new ApiProductsDataSource(c.get("http")) }),
};

export default productsModule;
