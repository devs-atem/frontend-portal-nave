import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const svc = {
  loadProductsPage: vi.fn(),
  loadClientsPage: vi.fn(),
  getProductDetail: vi.fn(),
  getClientDetail: vi.fn(),
  listAllClients: vi.fn(),
  listAllProducts: vi.fn(),
  clientUuidOf: vi.fn((id: number) => `uuid-${id}`),
  updateProduct: vi.fn().mockResolvedValue(undefined),
  updateClientProducts: vi.fn().mockResolvedValue(undefined),
  setClientProductStatus: vi.fn(),
  createProduct: vi.fn(),
  deleteProduct: vi.fn(),
};

vi.mock("@shared/hooks/useIoC", () => ({ useIoC: () => svc }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ProductsPage } from "./ProductsPage";

const product = { id: "p1", name: "Gasolina Comum", sapCode: "ODC 01", color: "#c00" };
const clients = [
  { id: 1, codigo: "BP-1", razao: "Cliente Ativo", cnpj: "11" },
  { id: 2, codigo: "BP-2", razao: "Cliente Inativo", cnpj: "22" },
  { id: 3, codigo: "BP-3", razao: "Cliente Novo", cnpj: "33" },
];
const products = [
  { id: "p1", name: "Produto Ativo", sapCode: "A", color: "#111" },
  { id: "p2", name: "Produto Inativo", sapCode: "B", color: "#222" },
  { id: "p3", name: "Produto Novo", sapCode: "C", color: "#333" },
];

beforeEach(() => {
  vi.clearAllMocks();
  svc.loadProductsPage.mockResolvedValue({ rows: [product], total: 1 });
  svc.loadClientsPage.mockResolvedValue({ rows: [clients[0]], total: 1 });
  svc.getProductDetail.mockResolvedValue({
    clients: [
      { ...clients[0], linkIsActive: true },
      { ...clients[1], linkIsActive: false },
    ],
  });
  svc.getClientDetail.mockResolvedValue({
    products: [
      { ...products[0], linkIsActive: true },
      { ...products[1], linkIsActive: false },
    ],
  });
  svc.listAllClients.mockResolvedValue(clients);
  svc.listAllProducts.mockResolvedValue(products);
});

afterEach(cleanup);

/**
 * Regressão (PR #11): salvar os vínculos não pode remover nem reativar um vínculo inativo.
 * A substituição enviada ao mw-nave contém só os ativos + os escolhidos; o mw-nave mantém
 * os omitidos como `isActive=false` (product.update.ts / client.update.ts), sem apagar.
 */
describe("ProductsPage — salvar vínculos preserva o vínculo inativo", () => {
  it("produto: o vínculo inativo não entra em clientUuids ao adicionar um cliente", async () => {
    render(<ProductsPage />);
    fireEvent.click((await screen.findAllByText("Gasolina Comum"))[0]);
    const linksButton = await screen.findByRole("button", { name: "Clientes" });
    await waitFor(() => expect((linksButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(linksButton);

    // The details drawer is also a dialog; the link dialog is the one with checkboxes.
    await screen.findByRole("button", { name: "Salvar vínculos" });
    const active = screen.getByRole("checkbox", { name: /Cliente Ativo/ }) as HTMLInputElement;
    const inactive = screen.getByRole("checkbox", { name: /Cliente Inativo/ }) as HTMLInputElement;
    expect(active.checked).toBe(true);
    expect(inactive.checked).toBe(false);

    fireEvent.click(screen.getByRole("checkbox", { name: /Cliente Novo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar vínculos" }));

    await waitFor(() => expect(svc.updateProduct).toHaveBeenCalledTimes(1));
    expect(svc.updateProduct).toHaveBeenCalledWith("p1", { clientUuids: ["uuid-1", "uuid-3"] });
  });

  it("cliente: o vínculo inativo não entra em productIds ao adicionar um produto", async () => {
    render(<ProductsPage />);
    fireEvent.click(await screen.findByRole("tab", { name: "Por cliente" }));
    fireEvent.click((await screen.findAllByText("Cliente Ativo"))[0]);
    const productsButton = await screen.findByRole("button", { name: "Produtos" });
    await waitFor(() => expect((productsButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(productsButton);

    // The details drawer is also a dialog; the link dialog is the one with checkboxes.
    await screen.findByRole("button", { name: "Salvar vínculos" });
    expect((screen.getByRole("checkbox", { name: /Produto Ativo/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: /Produto Inativo/ }) as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByRole("checkbox", { name: /Produto Novo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar vínculos" }));

    await waitFor(() => expect(svc.updateClientProducts).toHaveBeenCalledTimes(1));
    expect(svc.updateClientProducts).toHaveBeenCalledWith(1, ["p1", "p3"]);
  });
});
