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

const make = (http: Record<string, unknown>) =>
  new ClientRegistrationService(http as unknown as IHttpService);

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

  it("get() pede contractFields e mapeia produtos e contratos", async () => {
    const get = vi.fn(async () =>
      apiClient({
        products: [
          { id: "p1", sapCode: "123", name: "Diesel", createdAt: "x", updatedAt: "x" },
        ],
        contracts: [{ id: "c1", contractNumber: "4600001234", status: "ACTIVE" }],
      }),
    );
    const rec = await make({ get: get as unknown as IHttpService["get"] }).get(ID, { withContracts: true });

    expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientById(ID), {
      contractFields: "id,contractNumber,status,effectiveFrom,effectiveTo",
    });
    expect(rec.products).toEqual([{ id: "p1", name: "Diesel", sapCode: "123" }]);
    expect(rec.contracts).toEqual([
      { id: "c1", contractNumber: "4600001234", status: "ACTIVE" },
    ]);
  });

  it("get() sem contratos não envia contractFields", async () => {
    const get = vi.fn(async () => apiClient());
    await make({ get: get as unknown as IHttpService["get"] }).get(ID);
    expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientById(ID), undefined);
  });

  it("create() envia filiais normalizadas e nunca productIds", async () => {
    const post = vi.fn(async () => apiClient());
    await make({ post }).create({
      cnpj: "12345678000195",
      name: "Cliente Rio",
      bpid: "1001",
      branches: ["98.765.432/0001-10"],
      productIds: ["p1"],
    });
    const body = (post.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(body.cnpj).toEqual({
      headquarters: "12345678000195",
      branches: ["98765432000110"],
    });
    expect(body).not.toHaveProperty("productIds");
  });

  it("update() envia productIds só quando definido (substituição total)", async () => {
    const patch = vi.fn(async () => apiClient());
    const input = { cnpj: "12345678000195", name: "Cliente Rio", bpid: "1001" };
    await make({ patch }).update(ID, { ...input, productIds: [] });
    await make({ patch }).update(ID, input);
    const [withIds, without] = patch.mock.calls.map(
      (c) => (c as unknown[])[1] as Record<string, unknown>,
    );
    expect(withIds.productIds).toEqual([]);
    expect(without).not.toHaveProperty("productIds");
  });

  it("update() prioriza input.branches e aceita lista vazia", async () => {
    const patch = vi.fn(async () => apiClient());
    await make({ patch }).update(
      ID,
      { cnpj: "12345678000195", name: "C", bpid: "1", branches: [] },
      ["98765432000110"],
    );
    const body = (patch.mock.calls[0] as unknown[])[1] as {
      cnpj: { branches: string[] };
    };
    expect(body.cnpj.branches).toEqual([]);
  });

  it("listProductOptions() chama GET /products/all e mapeia", async () => {
    const get = vi.fn(async () => [
      { id: "p1", sapCode: "123", name: "Diesel", createdAt: "x", updatedAt: "x" },
    ]);
    const opts = await make({ get: get as unknown as IHttpService["get"] }).listProductOptions();
    expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.products);
    expect(opts).toEqual([{ id: "p1", name: "Diesel", sapCode: "123" }]);
  });

  it("remove() chama DELETE em /clients/:id", async () => {
    const del = vi.fn(async () => undefined);
    await make({ delete: del }).remove(ID);
    expect(del).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientById(ID));
  });
});
