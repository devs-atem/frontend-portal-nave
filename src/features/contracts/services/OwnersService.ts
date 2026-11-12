import type { IHttpService } from "@core/http/models/IHttpService";
import { normalizeCnpj } from "@features/products/services/contract";
import {
  CONTRACTS_ENDPOINTS,
  type OwnerListQuery,
  type OwnerProductInput,
  type OwnerOption,
  type OwnerProductResponse,
  type OwnerResponse,
  type Paginated,
} from "./contract";
import { cleanQuery, fetchAllPages, toPaginated } from "./ContractsService";

export interface IOwnersService {
  /**
   * Opções para select de depositantes (`GET /rest/owners/all`): só ACTIVE,
   * ordenado por `internalCode`, filtrado pelo escopo do usuário. Pode ser `[]`.
   */
  listOptions(): Promise<OwnerOption[]>;
  list(q?: OwnerListQuery): Promise<Paginated<OwnerResponse>>;
  /** Todos os Owners (todas as páginas) com o filtro informado. */
  listAll(q?: Pick<OwnerListQuery, "status">): Promise<OwnerResponse[]>;
  get(id: string): Promise<OwnerResponse>;
  /** Owners cujo CNPJ (canônico) ∈ `cnpjs` — uma consulta por CNPJ. */
  findByCnpjs(cnpjs: string[]): Promise<OwnerResponse[]>;
  listProducts(ownerId: string): Promise<OwnerProductResponse[]>;
  addProduct(
    ownerId: string,
    body: OwnerProductInput & { productId: string },
  ): Promise<OwnerProductResponse>;
  updateProduct(
    ownerId: string,
    productId: string,
    body: OwnerProductInput,
  ): Promise<OwnerProductResponse>;
  removeProduct(ownerId: string, productId: string): Promise<void>;
}

/** Service de depositantes (`/rest/owners`) e seus produtos habilitados. */
export class OwnersService implements IOwnersService {
  constructor(private readonly http: IHttpService) {}

  async listOptions(): Promise<OwnerOption[]> {
    console.log(`[Owners] GET ${CONTRACTS_ENDPOINTS.ownersAll} (select de depositantes)`);
    const resp = await this.http.get<OwnerOption[]>(CONTRACTS_ENDPOINTS.ownersAll);
    console.log("[Owners] resposta:", resp);
    return Array.isArray(resp) ? resp : [];
  }

  async list(q: OwnerListQuery = {}): Promise<Paginated<OwnerResponse>> {
    const resp = await this.http.get<Paginated<OwnerResponse>>(
      CONTRACTS_ENDPOINTS.owners,
      cleanQuery(q),
    );
    return toPaginated(resp);
  }

  listAll(q: Pick<OwnerListQuery, "status"> = {}): Promise<OwnerResponse[]> {
    return fetchAllPages<OwnerResponse>(
      this.http,
      CONTRACTS_ENDPOINTS.owners,
      cleanQuery(q),
    );
  }

  get(id: string): Promise<OwnerResponse> {
    return this.http.get<OwnerResponse>(CONTRACTS_ENDPOINTS.ownerById(id));
  }

  async findByCnpjs(cnpjs: string[]): Promise<OwnerResponse[]> {
    const unique = [...new Set(cnpjs.map(normalizeCnpj).filter(Boolean))];
    const results = await Promise.all(
      unique.map((cnpj) => this.list({ cnpj, limit: 100 })),
    );
    const byId = new Map<string, OwnerResponse>();
    for (const r of results) for (const o of r.rows) byId.set(o.id, o);
    return [...byId.values()];
  }

  listProducts(ownerId: string): Promise<OwnerProductResponse[]> {
    return fetchAllPages<OwnerProductResponse>(
      this.http,
      CONTRACTS_ENDPOINTS.ownerProducts(ownerId),
    );
  }

  addProduct(
    ownerId: string,
    body: OwnerProductInput & { productId: string },
  ): Promise<OwnerProductResponse> {
    return this.http.post<OwnerProductResponse>(
      CONTRACTS_ENDPOINTS.ownerProducts(ownerId),
      {
        productId: body.productId,
        ...(body.customerProductCode?.trim()
          ? { customerProductCode: body.customerProductCode.trim() }
          : {}),
        ...(body.customerProductDescription?.trim()
          ? { customerProductDescription: body.customerProductDescription.trim() }
          : {}),
      },
    );
  }

  updateProduct(
    ownerId: string,
    productId: string,
    body: OwnerProductInput,
  ): Promise<OwnerProductResponse> {
    return this.http.patch<OwnerProductResponse>(
      CONTRACTS_ENDPOINTS.ownerProduct(ownerId, productId),
      body,
    );
  }

  async removeProduct(ownerId: string, productId: string): Promise<void> {
    await this.http.delete(CONTRACTS_ENDPOINTS.ownerProduct(ownerId, productId));
  }
}
