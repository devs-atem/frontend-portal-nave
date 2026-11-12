import { describe, it, expect, vi } from "vitest";

import type { IHttpService } from "@core/http/models/IHttpService";

import { CONTRACTS_ENDPOINTS } from "./contract";
import { OwnersService } from "./OwnersService";

const make = (http: Record<string, unknown>) =>
  new OwnersService(http as unknown as IHttpService);

describe("OwnersService.listOptions", () => {
  it("chama GET /rest/owners/all sem parâmetros e devolve o array direto", async () => {
    const options = [
      { id: "o-1", internalCode: "DEP-001", legalName: "Depositante Exemplo Ltda." },
      { id: "o-2", internalCode: "DEP-002", legalName: "Outro Depositante S.A." },
    ];
    const get = vi.fn(async () => options);

    const result = await make({ get }).listOptions();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.ownersAll);
    expect(CONTRACTS_ENDPOINTS.ownersAll).toBe("/rest/owners/all");
    expect(result).toEqual(options);
  });

  it("retorna [] para lista vazia ou resposta sem corpo", async () => {
    expect(await make({ get: vi.fn(async () => []) }).listOptions()).toEqual([]);
    expect(await make({ get: vi.fn(async () => undefined) }).listOptions()).toEqual([]);
  });
});
