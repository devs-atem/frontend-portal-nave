import { describe, it, expect, vi, beforeEach } from "vitest";

// Instância axios falsa: só `request` importa para a deduplicação.
const request = vi.fn();
vi.mock("axios", () => ({
  default: {
    create: () => ({
      request,
      defaults: { headers: { common: {} } },
      interceptors: { request: { clear: vi.fn(), use: vi.fn() } },
    }),
  },
}));

vi.mock("@core/config/appConfig", () => ({
  default: { api: { url: "", timeout: 1000 } },
}));

// Precisa vir depois dos mocks pra respeitar o hoisting do vi.mock
import AxiosHttpService from "./AxiosHttpService";

/** Promise controlável para simular requisição em andamento. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("AxiosHttpService.get (deduplicação)", () => {
  beforeEach(() => {
    request.mockReset();
  });

  it("GETs idênticos em andamento compartilham uma única requisição", async () => {
    const d = deferred<{ data: string[] }>();
    request.mockReturnValueOnce(d.promise);
    const http = new AxiosHttpService();

    const a = http.get<string[]>("/rest/products", { page: 1, limit: 10 });
    const b = http.get<string[]>("/rest/products", { page: 1, limit: 10 });
    d.resolve({ data: ["p1"] });

    await expect(a).resolves.toEqual(["p1"]);
    await expect(b).resolves.toEqual(["p1"]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("params diferentes geram requisições separadas", async () => {
    request.mockResolvedValue({ data: [] });
    const http = new AxiosHttpService();

    await Promise.all([
      http.get("/rest/products", { page: 1, limit: 10 }),
      http.get("/rest/products", { page: 2, limit: 10 }),
    ]);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("libera a chave ao concluir: um novo GET vai à rede de novo", async () => {
    request.mockResolvedValue({ data: [] });
    const http = new AxiosHttpService();

    await http.get("/rest/products");
    await http.get("/rest/products");

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("libera a chave também quando a requisição falha", async () => {
    request
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ data: ["ok"] });
    const http = new AxiosHttpService();

    await expect(http.get("/rest/products")).rejects.toThrow();
    await expect(http.get("/rest/products")).resolves.toEqual(["ok"]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("não deduplica métodos de escrita", async () => {
    request.mockResolvedValue({ data: {} });
    const http = new AxiosHttpService();

    await Promise.all([
      http.post("/rest/products", { name: "A" }),
      http.post("/rest/products", { name: "A" }),
    ]);

    expect(request).toHaveBeenCalledTimes(2);
  });
});
