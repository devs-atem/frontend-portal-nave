/**
 * Produto do catálogo (dados mestres).
 * Reflete o que a API expõe (id, nome e código SAP); a cor é apenas visual.
 */
export interface CatalogProduct {
  id: string;
  /** Nome completo (ex.: "ÓLEO DIESEL A S10"). */
  name: string;
  /** Código SAP (único). */
  sapCode: string;
  /** Cor representativa (hex), derivada do id. */
  color: string;
}

/** Vínculo N:N entre produto e cliente. */
export interface ProductClientLink {
  productId: string;
  clientId: number;
}
