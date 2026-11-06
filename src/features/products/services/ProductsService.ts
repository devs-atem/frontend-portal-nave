/**
 * Produto do catálogo (dados mestres, fixos).
 * Shape reduzido ao essencial para o portal: identificação + grupo + cor.
 */
export interface CatalogProduct {
  id: string;
  /** Nome completo (ex.: "ÓLEO DIESEL A S10"). */
  name: string;
  /** Sigla/abreviação (ex.: "AS-10"). */
  abbreviation: string;
  /** Código SAP. */
  sapCode: string;
  /** Cor representativa (hex). */
  color: string;
  /** Grupo do produto (ex.: "Diesel"). */
  group: string;
  active: boolean;
}

/** Vínculo N:N entre produto e cliente. */
export interface ProductClientLink {
  productId: string;
  clientId: number;
}
