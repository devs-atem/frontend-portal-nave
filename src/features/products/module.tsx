import type { Module } from "@core/router/module.contract";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductsService } from "./services/ProductsService";

/**
 * Módulo Products — catálogo de produtos (dados mestres fixos) e seus vínculos
 * N:N com clientes. Permite navegar nos dois sentidos (clientes de um produto e
 * produtos de um cliente) via tabela expansível com alternância de visão.
 */
declare module "@core/ioc/registry" {
  interface AppServices {
    products: ProductsService;
  }
}

const productsModule: Module = {
  name: "products",
  routes: [{ path: "/products", element: <ProductsPage /> }],
  menu: {
    label: "Produtos",
    path: "/products",
    icon: "Package",
    order: 15,
  },
  services: (c) => c.add({ products: new ProductsService() }),
};

export default productsModule;
