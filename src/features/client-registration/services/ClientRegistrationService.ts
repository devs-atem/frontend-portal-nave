import type { IHttpService } from "@core/http/models/IHttpService";
import {
  PRODUCTS_ENDPOINTS,
  formatCnpj,
  normalizeCnpj,
  type ClientResponse,
  type ClientsListResponse,
  type CreateClientRequest,
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
}

/** Dados de entrada de um novo cadastro ou edição. */
export interface ClientRecordInput {
  /** CNPJ (com ou sem máscara). */
  cnpj: string;
  name: string;
  bpid: string;
  active?: boolean;
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

/**
 * Service de cadastro de clientes integrado ao mw-nave
 * (`/rest/clients`). Todas as operações são assíncronas; erros da camada
 * HTTP (`AppError`) propagam para a página.
 */
export class ClientRegistrationService {
  constructor(private readonly http: IHttpService) {}

  async list(): Promise<ClientRecord[]> {
    const resp = await this.http.get<ClientsListResponse>(
      PRODUCTS_ENDPOINTS.clients,
    );
    return (resp ?? []).map(toClientRecord);
  }

  async create(input: ClientRecordInput): Promise<ClientRecord> {
    const body: CreateClientRequest = {
      name: input.name,
      bp: input.bpid,
      cnpj: { headquarters: normalizeCnpj(input.cnpj), branches: [] },
      isActive: input.active ?? true,
    };
    const created = await this.http.post<ClientResponse>(
      PRODUCTS_ENDPOINTS.clientsCreate,
      body,
    );
    return toClientRecord(created);
  }

  /**
   * Atualiza um cliente. `branches` é reenviado para não perder as filiais
   * já cadastradas ao trocar o CNPJ da matriz.
   */
  async update(
    id: string,
    input: ClientRecordInput,
    branches: string[] = [],
  ): Promise<ClientRecord> {
    const body: UpdateClientRequest = {
      name: input.name,
      bp: input.bpid,
      cnpj: { headquarters: normalizeCnpj(input.cnpj), branches },
      ...(input.active !== undefined ? { isActive: input.active } : {}),
    };
    const updated = await this.http.patch<ClientResponse>(
      PRODUCTS_ENDPOINTS.clientById(id),
      body,
    );
    return toClientRecord(updated);
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(PRODUCTS_ENDPOINTS.clientById(id));
  }
}
