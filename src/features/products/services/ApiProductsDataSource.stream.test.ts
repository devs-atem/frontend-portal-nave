import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IHttpService } from "@core/http/models/IHttpService";

import { ApiProductsDataSource } from "./ApiProductsDataSource";

type CatalogEvent = {
  event: string;
  data: { sapCode?: string; clientCode?: string };
};

const encoder = new TextEncoder();

/**
 * Corpo SSE falso: entrega os `chunks` em ordem e depois encerra (`done`) ou,
 * com `hold`, fica pendente até o `signal` abortar (como o fetch real).
 */
function sseResponse(
  chunks: string[],
  signal: AbortSignal | undefined,
  { hold = false }: { hold?: boolean } = {},
) {
  const queue = [...chunks];
  const reader = {
    read: () => {
      const next = queue.shift();
      if (next !== undefined) {
        return Promise.resolve({ value: encoder.encode(next), done: false });
      }
      if (!hold) return Promise.resolve({ value: undefined, done: true });
      return new Promise<never>((_, reject) => {
        const fail = () => reject(new DOMException("Aborted", "AbortError"));
        if (signal?.aborted) fail();
        signal?.addEventListener("abort", fail, { once: true });
      });
    },
  };
  return { ok: true, status: 200, body: { getReader: () => reader } };
}

const errorResponse = (status: number) => ({ ok: false, status, body: null });

function makeHttp(token = "Bearer abc"): IHttpService {
  return {
    getFreshAuthorization: vi.fn(async () => token),
  } as unknown as IHttpService;
}

type FetchInit = { headers?: Record<string, string>; signal?: AbortSignal };

/** Instala um `fetch` que responde, em ordem, com cada fábrica; a última se repete. */
function stubFetch(...responses: Array<(signal?: AbortSignal) => unknown>) {
  let call = 0;
  const fetchMock = vi.fn(async (_url: string, init?: FetchInit) => {
    const make = responses[Math.min(call++, responses.length - 1)];
    return make(init?.signal);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Deixa o loop assíncrono do stream processar o que já está disponível. */
const flush = () => vi.advanceTimersByTimeAsync(0);

describe("ApiProductsDataSource.streamCatalog()", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Inicia o stream e devolve os eventos recebidos e o controle de abort. */
  function start(http: IHttpService = makeHttp()) {
    const events: CatalogEvent[] = [];
    const controller = new AbortController();
    const done = new ApiProductsDataSource(http).streamCatalog(
      (e) => events.push(e),
      controller.signal,
    );
    return { events, controller, done };
  }

  it("envia Accept text/event-stream e o token renovado no Authorization", async () => {
    const fetchMock = stubFetch((s) => sseResponse([], s, { hold: true }));
    const { controller, done } = start(makeHttp("Bearer xyz"));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/rest\/products\/catalog\/stream$/);
    expect(init?.headers).toEqual({
      Accept: "text/event-stream",
      Authorization: "Bearer xyz",
    });

    controller.abort();
    await done;
  });

  it("entrega frame completo com event e data", async () => {
    stubFetch((s) =>
      sseResponse(['event: product.updated\ndata: {"sapCode":"10460"}\n\n'], s, { hold: true }),
    );
    const { events, controller, done } = start();
    await flush();

    expect(events).toEqual([{ event: "product.updated", data: { sapCode: "10460" } }]);
    controller.abort();
    await done;
  });

  it("usa 'message' quando o frame não tem event", async () => {
    stubFetch((s) => sseResponse(['data: {"clientCode":"100245"}\n\n'], s, { hold: true }));
    const { events, controller, done } = start();
    await flush();

    expect(events).toEqual([{ event: "message", data: { clientCode: "100245" } }]);
    controller.abort();
    await done;
  });

  it("ignora frame sem data (ex.: keep-alive)", async () => {
    stubFetch((s) =>
      sseResponse([": ping\n\n", "event: x\n\n", 'event: x\ndata: {"sapCode":"1"}\n\n'], s, {
        hold: true,
      }),
    );
    const { events, controller, done } = start();
    await flush();

    expect(events).toEqual([{ event: "x", data: { sapCode: "1" } }]);
    controller.abort();
    await done;
  });

  it("ignora frame com JSON inválido, registra warn e segue recebendo eventos", async () => {
    stubFetch((s) =>
      sseResponse(['event: x\ndata: {nao-json}\n\nevent: x\ndata: {"sapCode":"1"}\n\n'], s, {
        hold: true,
      }),
    );
    const { events, controller, done } = start();
    await flush();

    expect(events).toEqual([{ event: "x", data: { sapCode: "1" } }]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("x");
    controller.abort();
    await done;
  });

  it("ignora payload JSON que não é objeto (ex.: null) sem chamar onEvent", async () => {
    stubFetch((s) =>
      sseResponse(['event: x\ndata: null\n\nevent: x\ndata: 42\n\nevent: y\ndata: {}\n\n'], s, {
        hold: true,
      }),
    );
    const { events, controller, done } = start();
    await flush();

    expect(events).toEqual([{ event: "y", data: {} }]);
    expect(warn).toHaveBeenCalledTimes(2);
    controller.abort();
    await done;
  });

  it("monta frame quebrado entre dois chunks", async () => {
    stubFetch((s) =>
      sseResponse(['event: link.updated\nda', 'ta: {"sapCode":"7","clientCode":"9"}\n', "\n"], s, {
        hold: true,
      }),
    );
    const { events, controller, done } = start();
    await flush();

    expect(events).toEqual([
      { event: "link.updated", data: { sapCode: "7", clientCode: "9" } },
    ]);
    controller.abort();
    await done;
  });

  it("normaliza \\r\\n para \\n", async () => {
    stubFetch((s) =>
      sseResponse(['event: x\r\ndata: {"sapCode":"1"}\r\n\r\n'], s, { hold: true }),
    );
    const { events, controller, done } = start();
    await flush();

    expect(events).toEqual([{ event: "x", data: { sapCode: "1" } }]);
    controller.abort();
    await done;
  });

  it("erro HTTP reconecta com backoff crescente até o teto de 15s", async () => {
    const fetchMock = stubFetch(() => errorResponse(503));
    const { controller, done } = start();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Esperas esperadas entre tentativas: 1s, 2s, 4s, 8s, 15s (teto), 15s.
    for (const [wait, calls] of [
      [1000, 2],
      [2000, 3],
      [4000, 4],
      [8000, 5],
      [15000, 6],
      [15000, 7],
    ] as const) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(fetchMock).toHaveBeenCalledTimes(calls - 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(calls);
    }

    controller.abort();
    await done;
  });

  it("desconexão do servidor dispara reconexão após o backoff", async () => {
    const fetchMock = stubFetch(
      (s) => sseResponse(['event: x\ndata: {"sapCode":"1"}\n\n'], s),
      (s) => sseResponse(['event: x\ndata: {"sapCode":"2"}\n\n'], s, { hold: true }),
    );
    const { events, controller, done } = start();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(events.map((e) => e.data.sapCode)).toEqual(["1", "2"]);

    controller.abort();
    await done;
  });

  it("abort durante a leitura encerra o loop sem reconectar", async () => {
    const fetchMock = stubFetch((s) => sseResponse([], s, { hold: true }));
    const { controller, done } = start();
    await flush();

    controller.abort();
    await expect(done).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("abort durante a espera do backoff encerra sem nova tentativa", async () => {
    const fetchMock = stubFetch(() => errorResponse(500));
    const { controller, done } = start();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    controller.abort();
    await expect(done).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
