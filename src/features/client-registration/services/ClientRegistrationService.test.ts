import { describe, it, expect, vi } from "vitest";

import type { IHttpService } from "@core/http/models/IHttpService";
import { PRODUCTS_ENDPOINTS, type ClientResponse } from "@features/products/services/contract";
import AppError from "@shared/utils/appError";

import { ClientRegistrationService } from "./ClientRegistrationService";

const ID = "7c3f9b22-1d4e-4a8b-9f10-2a6b5c8d4e01";

const apiClient = (over: Partial<ClientResponse> = {}): ClientResponse => ({
  id: ID,
  name: "Cliente Rio",
  bp: "1001",
  cnpj: { headquarters: "12345678000195", branches: ["98765432000110"] },
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const make = (http: Partial<IHttpService>) =>
  new ClientRegistrationService(http as IHttpService);

describe("ClientRegistrationService", () => {
  it("list() chama GET /clients/all e mapeia a resposta", async () => {
    const get = vi.fn(async () => [apiClient()]);
    const [rec] = await make({ get }).list();

    expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clients);
    expect(rec).toMatchObject({
      id: ID,
      name: "Cliente Rio",
      bpid: "1001",
      active: true,
      cnpj: "12.345.678/0001-95",
      branches: ["98765432000110"],
    });
  });

  it("list() retorna vazio quando a API responde sem corpo", async () => {
    const get = vi.fn(async () => undefined);
    expect(await make({ get }).list()).toEqual([]);
  });

  it("list() propaga AppError em falha 500", async () => {
    const get = vi.fn(async () => {
      throw new AppError("Erro interno", "error", "AppError", 500);
    });
    await expect(make({ get }).list()).rejects.toBeInstanceOf(AppError);
  });

  it("create() normaliza o CNPJ e envia o body esperado", async () => {
    const post = vi.fn(async () => apiClient());
    await make({ post }).create({ cnpj: "12.345.678/0001-95", name: "Cliente Rio", bpid: "1001" });

    expect(post).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientsCreate, {
      name: "Cliente Rio",
      bp: "1001",
      cnpj: { headquarters: "12345678000195", branches: [] },
      isActive: true,
    });
  });

  it("update() reenvia as filiais e usa PATCH em /clients/:id", async () => {
    const patch = vi.fn(async () => apiClient());
    await make({ patch }).update(
      ID,
      { cnpj: "12345678000195", name: "Cliente Rio", bpid: "1001" },
      ["98765432000110"],
    );

    expect(patch).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientById(ID), {
      name: "Cliente Rio",
      bp: "1001",
      cnpj: { headquarters: "12345678000195", branches: ["98765432000110"] },
    });
  });

  it("remove() chama DELETE em /clients/:id", async () => {
    const del = vi.fn(async () => undefined);
    await make({ delete: del }).remove(ID);
    expect(del).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientById(ID));
  });
});
