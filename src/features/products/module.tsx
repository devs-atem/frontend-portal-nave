import type { Module } from "@core/router/module.contract";
import { ProductsPage } from "./pages/ProductsPage";
import { MockProductsDataSource } from "./services/MockProductsDataSource";
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

const productsModule: Module = {
  name: "products",
  routes: [{ path: "/products", element: <ProductsPage /> }],
  menu: {
    label: "Produtos",
    path: "/products",
    icon: "Package",
    order: 15,
  },
  // Default: mock em memória, sem back-end.
  // Para usar a API real: c.add({ products: new ApiProductsDataSource(c.get("http")) })
  services: (c) => c.add({ products: new MockProductsDataSource() }),
};

export default productsModule;
