import type { IHttpService } from "@core/http/models/IHttpService";
import {
  CONTRACTS_ENDPOINTS,
  type ContractAction,
  type ContractActionRequest,
  type ContractListQuery,
  type ContractResponse,
  type CreateContractRequest,
  type NewRevisionRequest,
  type Paginated,
  type UpdateContractRequest,
} from "./contract";

export const MAX_LIMIT = 100;

/**
 * Remove chaves indefinidas/vazias: a API tem query estrita e responde 400
 * para parâmetro desconhecido ou inválido.
 */
export function cleanQuery<T extends object>(q: T): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v as string | number;
  }
  return out;
}

/** Normaliza `{ rows, total }` (aceita também um array puro). */
export function toPaginated<T>(resp: Paginated<T> | T[] | undefined): Paginated<T> {
  if (!resp) return { rows: [], total: 0 };
  if (Array.isArray(resp)) return { rows: resp, total: resp.length };
  return { rows: resp.rows ?? [], total: resp.total ?? resp.rows?.length ?? 0 };
}

/** Busca todas as páginas de um endpoint paginado (limite de segurança de páginas). */
export async function fetchAllPages<T>(
  http: IHttpService,
  path: string,
  query: Record<string, string | number> = {},
  maxPages = 20,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const resp = toPaginated<T>(
      await http.get<Paginated<T> | T[]>(path, { ...query, page, limit: MAX_LIMIT }),
    );
    all.push(...resp.rows);
    if (all.length >= resp.total || resp.rows.length === 0) break;
  }
  return all;
}

export interface IContractsService {
  list(q?: ContractListQuery): Promise<Paginated<ContractResponse>>;
  /** Todas as páginas do filtro (usado no filtro por cliente, que une vários depositantes). */
  listAll(q?: Omit<ContractListQuery, "page" | "limit">): Promise<ContractResponse[]>;
  get(id: string): Promise<ContractResponse>;
  create(body: CreateContractRequest): Promise<ContractResponse>;
  update(id: string, body: UpdateContractRequest): Promise<ContractResponse>;
  act(
    id: string,
    action: ContractAction,
    body?: ContractActionRequest,
  ): Promise<ContractResponse>;
  createRevision(id: string, body: NewRevisionRequest): Promise<ContractResponse>;
}

/**
 * Service de contratos (`/rest/contracts`). Erros HTTP propagam como
 * `AppError` (com `status`) para a página decidir a mensagem. As ações `POST`
 * respondem 201: qualquer 2xx é sucesso (o `AxiosHttpService` já rejeita o resto).
 */
export class ContractsService implements IContractsService {
  constructor(private readonly http: IHttpService) {}

  async list(q: ContractListQuery = {}): Promise<Paginated<ContractResponse>> {
    const limit = Math.min(MAX_LIMIT, Math.max(1, q.limit ?? 10));
    const page = Math.max(1, q.page ?? 1);
    const resp = await this.http.get<Paginated<ContractResponse>>(
      CONTRACTS_ENDPOINTS.root,
      cleanQuery({ ...q, page, limit }),
    );
    return toPaginated(resp);
  }

  listAll(q: Omit<ContractListQuery, "page" | "limit"> = {}): Promise<ContractResponse[]> {
    return fetchAllPages<ContractResponse>(this.http, CONTRACTS_ENDPOINTS.root, cleanQuery(q));
  }

  get(id: string): Promise<ContractResponse> {
    return this.http.get<ContractResponse>(CONTRACTS_ENDPOINTS.byId(id));
  }

  create(body: CreateContractRequest): Promise<ContractResponse> {
    return this.http.post<ContractResponse>(CONTRACTS_ENDPOINTS.root, body);
  }

  /** Substituição completa do rascunho (reenviar todos os itens). */
  update(id: string, body: UpdateContractRequest): Promise<ContractResponse> {
    return this.http.patch<ContractResponse>(CONTRACTS_ENDPOINTS.byId(id), body);
  }

  /** Corpo mínimo: somente `justification` e, no approve, `stockDeclaration`. */
  act(
    id: string,
    action: ContractAction,
    body: ContractActionRequest = {},
  ): Promise<ContractResponse> {
    const payload: ContractActionRequest = {};
    if (body.justification?.trim()) payload.justification = body.justification.trim();
    if (action === "approve" && body.stockDeclaration) {
      payload.stockDeclaration = body.stockDeclaration;
    }
    return this.http.post<ContractResponse>(CONTRACTS_ENDPOINTS.action(id, action), payload);
  }

  /** Nova revisão futura: enviar a revisão completa (todos os itens). */
  createRevision(id: string, body: NewRevisionRequest): Promise<ContractResponse> {
    return this.http.post<ContractResponse>(CONTRACTS_ENDPOINTS.revisions(id), body);
  }
}
