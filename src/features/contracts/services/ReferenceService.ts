import type { IHttpService } from "@core/http/models/IHttpService";
import {
  PRODUCTS_ENDPOINTS,
  type ProductsListResponse,
} from "@features/products/services/contract";
import {
  CONTRACTS_ENDPOINTS,
  type BaseResponse,
  type PoolResponse,
  type TankResponse,
} from "./contract";
import { fetchAllPages } from "./ContractsService";

/** Produto do catálogo (necessário: `sapCode` vira o `productCode` do item). */
export interface CatalogProductRef {
  id: string;
  name: string;
  sapCode: string;
}

export interface IReferenceService {
  /** Bases ativas (`source` + `baseCode` é a chave). */
  listBases(): Promise<BaseResponse[]>;
  /** Pools ativos da base que permitem o produto (`productCode` = sapCode). */
  listPools(q: { source: string; baseCode: string; productCode?: string }): Promise<PoolResponse[]>;
  /**
   * Todos os pools da base (qualquer status), para resolver nomes a partir do
   * `poolId` dos itens. Exige `app:custody:pool:read` (403 sem ela).
   */
  listPoolsByBase(q: { source: string; baseCode: string }): Promise<PoolResponse[]>;
  /** Tanques ativos da base para o produto. */
  listTanks(q: { source: string; baseCode: string; productCode?: string }): Promise<TankResponse[]>;
  /** Catálogo de produtos (id → nome/sapCode). */
  listProducts(): Promise<CatalogProductRef[]>;
}

/**
 * Catálogos de apoio dos formulários de contrato:
 * `/rest/operational-catalog/{bases,tanks}`, `/rest/pools` e `/rest/products/all`.
 */
export class ReferenceService implements IReferenceService {
  constructor(private readonly http: IHttpService) {}

  listBases(): Promise<BaseResponse[]> {
    return fetchAllPages<BaseResponse>(this.http, CONTRACTS_ENDPOINTS.bases, {
      status: "ACTIVE",
    });
  }

  listPools(q: { source: string; baseCode: string; productCode?: string }): Promise<PoolResponse[]> {
    return fetchAllPages<PoolResponse>(this.http, CONTRACTS_ENDPOINTS.pools, {
      source: q.source,
      baseCode: q.baseCode,
      status: "ACTIVE",
      ...(q.productCode ? { productCode: q.productCode } : {}),
    });
  }

  listPoolsByBase(q: { source: string; baseCode: string }): Promise<PoolResponse[]> {
    return fetchAllPages<PoolResponse>(this.http, CONTRACTS_ENDPOINTS.pools, {
      source: q.source,
      baseCode: q.baseCode,
    });
  }

  listTanks(q: { source: string; baseCode: string; productCode?: string }): Promise<TankResponse[]> {
    return fetchAllPages<TankResponse>(this.http, CONTRACTS_ENDPOINTS.tanks, {
      source: q.source,
      baseCode: q.baseCode,
      status: "ACTIVE",
      ...(q.productCode ? { productCode: q.productCode } : {}),
    });
  }

  async listProducts(): Promise<CatalogProductRef[]> {
    const resp = await this.http.get<ProductsListResponse>(PRODUCTS_ENDPOINTS.products);
    return (resp ?? []).map((p) => ({ id: p.id, name: p.name, sapCode: p.sapCode }));
  }
}
