import type { IHttpService } from "@core/http/models/IHttpService";
import {
  DEFAULT_CLIENT_CONTRACT_FIELDS,
  PRODUCTS_ENDPOINTS,
  formatCnpj,
  normalizeCnpj,
  type ClientContractSummary,
  type ClientResponse,
  type ClientsListResponse,
  type ClientsPaginationResponse,
  type CreateClientRequest,
  type ProductsListResponse,
  type UpdateClientRequest,
} from "@features/products/services/contract";

/**
 * Cliente cadastrado no portal (dados mestres).
 * Campos essenciais do cadastro: CNPJ, nome e BPID.
 */
export interface ClientRecord {
  /** UUID do cliente no mw-nave. */
  id: string;
  /** CNPJ da matriz formatado (00.000.000/0000-00; aceita alfanumérico). */
  cnpj: string;
  /** CNPJs das filiais (sem máscara), preservados nas edições. */
  branches: string[];
  /** Razão social / nome do cliente. */
  name: string;
  /** Business Partner ID (identificador no SAP/ERP). Na API: `bp`. */
  bpid: string;
  active: boolean;
  /** Produtos vinculados (só no detalhe). */
  products?: ProductOption[];
  /** Contratos por CNPJ (só no detalhe com `contractFields`). */
  contracts?: ClientContractSummary[];
}

/** Produto disponível para vínculo com o cliente. */
export interface ProductOption {
  id: string;
  name: string;
  sapCode: string;
}

/** Dados de entrada de um novo cadastro ou edição. */
export interface ClientRecordInput {
  /** CNPJ (com ou sem máscara). */
  cnpj: string;
  name: string;
  bpid: string;
  active?: boolean;
  /** CNPJs das filiais (lista completa: substitui todas as existentes). */
  branches?: string[];
  /** Produtos vinculados (lista completa). Omitido = não altera (só no PATCH). */
  productIds?: string[];
}

/** Mapeia a resposta da API para o modelo da tela. */
export function toClientRecord(c: ClientResponse): ClientRecord {
  return {
    id: c.id,
    cnpj: formatCnpj(c.cnpj?.headquarters ?? ""),
    branches: c.cnpj?.branches ?? [],
    name: c.name,
    bpid: c.bp,
    active: c.isActive,
  };
}

/** Contrato do service de cadastro de clientes (API real ou mock). */
/** Uma página de clientes + total geral (de todas as páginas). */
export interface ClientsPage {
  rows: ClientRecord[];
  total: number;
}

export interface IClientRegistrationService {
  /** Página de clientes (`GET /rest/clients?page&limit`) — usada na tela de cadastro. */
  listPage(q: { page: number; limit: number }): Promise<ClientsPage>;
  /**
   * TODOS os clientes (`GET /rest/clients/all`, sem paginação). Só para
   * seletores/lookups (ex.: filtros de Contratos) — NÃO usar em tabelas.
   */
  list(): Promise<ClientRecord[]>;
  get(id: string, opts?: { withContracts?: boolean }): Promise<ClientRecord>;
  create(input: ClientRecordInput): Promise<ClientRecord>;
  update(
    id: string,
    input: ClientRecordInput,
    branches?: string[],
  ): Promise<ClientRecord>;
  remove(id: string): Promise<void>;
  listProductOptions(): Promise<ProductOption[]>;
}

/**
 * Service de cadastro de clientes integrado ao mw-nave
 * (`/rest/clients`). Todas as operações são assíncronas; erros da camada
 * HTTP (`AppError`) propagam para a página.
 */
export class ClientRegistrationService implements IClientRegistrationService {
  constructor(private readonly http: IHttpService) {}

  async listPage(q: { page: number; limit: number }): Promise<ClientsPage> {
    const resp = await this.http.get<
      ClientsPaginationResponse | ClientResponse[]
    >(PRODUCTS_ENDPOINTS.clientsPaginated, { page: q.page, limit: q.limit });
    const rows = Array.isArray(resp) ? resp : (resp?.rows ?? []);
    const total = Array.isArray(resp)
      ? resp.length
      : (resp?.total ?? rows.length);
    return { rows: rows.map(toClientRecord), total };
  }

  async list(): Promise<ClientRecord[]> {
    const resp = await this.http.get<ClientsListResponse>(
      PRODUCTS_ENDPOINTS.clients,
    );
    return (resp ?? []).map(toClientRecord);
  }

  /**
   * Detalhe do cliente (`GET /clients/:id`) com produtos vinculados e,
   * opcionalmente, contratos resumidos (`contractFields`).
   */
  async get(
    id: string,
    opts: { withContracts?: boolean } = {},
  ): Promise<ClientRecord> {
    const params = opts.withContracts
      ? { contractFields: DEFAULT_CLIENT_CONTRACT_FIELDS.join(",") }
      : undefined;
    const c = await this.http.get<ClientResponse>(
      PRODUCTS_ENDPOINTS.clientById(id),
      params,
    );
    return {
      ...toClientRecord(c),
      products: c.products?.map((p) => ({
        id: p.id,
        name: p.name,
        sapCode: p.sapCode,
      })),
      contracts: c.contracts,
    };
  }

  /** Cria o cliente. Vínculo de produtos não existe na criação (só via PATCH). */
  async create(input: ClientRecordInput): Promise<ClientRecord> {
    const body: CreateClientRequest = {
      name: input.name,
      bp: input.bpid,
      cnpj: {
        headquarters: normalizeCnpj(input.cnpj),
        branches: (input.branches ?? []).map(normalizeCnpj),
      },
      isActive: input.active ?? true,
    };
    const created = await this.http.post<ClientResponse>(
      PRODUCTS_ENDPOINTS.clientsCreate,
      body,
    );
    return toClientRecord(created);
  }

  /**
   * Atualiza um cliente. As filiais são sempre enviadas completas (a API
   * substitui todas); `productIds` só é enviado quando definido.
   */
  async update(
    id: string,
    input: ClientRecordInput,
    branches: string[] = [],
  ): Promise<ClientRecord> {
    const body: UpdateClientRequest = {
      name: input.name,
      bp: input.bpid,
      cnpj: {
        headquarters: normalizeCnpj(input.cnpj),
        branches: (input.branches ?? branches).map(normalizeCnpj),
      },
      ...(input.active !== undefined ? { isActive: input.active } : {}),
      ...(input.productIds !== undefined ? { productIds: input.productIds } : {}),
    };
    const updated = await this.http.patch<ClientResponse>(
      PRODUCTS_ENDPOINTS.clientById(id),
      body,
    );
    return toClientRecord(updated);
  }

  /** Produtos do catálogo para o seletor de vínculo (`GET /products/all`). */
  async listProductOptions(): Promise<ProductOption[]> {
    const resp = await this.http.get<ProductsListResponse>(
      PRODUCTS_ENDPOINTS.products,
    );
    return (resp ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      sapCode: p.sapCode,
    }));
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(PRODUCTS_ENDPOINTS.clientById(id));
  }
}
