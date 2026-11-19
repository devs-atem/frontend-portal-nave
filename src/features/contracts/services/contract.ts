/**
 * Contrato da API `mw-nave` (lado front-end) para contratos de custódia,
 * depositantes (Owner) e catálogos de apoio (bases, pools, tanques).
 *
 * Fontes: `docs/frontend-integration/contratos.md` e
 * `docs/frontend-integration/contratos-apoio-permissoes.md`.
 *
 * - Quantidades e percentuais são SEMPRE string (nunca number).
 * - Datas são ISO-8601 UTC.
 * - A API omite campos nulos: os opcionais abaixo chegam como `undefined`.
 */

export const REST_PREFIX = "/rest" as const;

export type ContractStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSING"
  | "CLOSED"
  | "CANCELLED"
  | "EXPIRED";

export const CONTRACT_STATUSES: ContractStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "SUSPENDED",
  "CLOSING",
  "CLOSED",
  "CANCELLED",
  "EXPIRED",
];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CLOSING: "Em encerramento",
  CLOSED: "Encerrado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

export type AccountingMeasure = "GOV" | "GSV" | "MASS";
export const ACCOUNTING_MEASURES: AccountingMeasure[] = ["GOV", "GSV", "MASS"];

export type StockDeclaration = "ZERO" | "PREEXISTING_STOCK";

/** Ações de status (`POST /contracts/:id/{ação}`). */
export type ContractAction =
  | "submit"
  | "approve"
  | "suspend"
  | "reactivate"
  | "start-closing"
  | "close"
  | "cancel";

export const CONTRACT_ACTION_LABEL: Record<ContractAction, string> = {
  submit: "Enviar para aprovação",
  approve: "Aprovar",
  suspend: "Suspender",
  reactivate: "Reativar",
  "start-closing": "Iniciar encerramento",
  close: "Encerrar",
  cancel: "Cancelar contrato",
};

/**
 * Códigos de tipo de movimento aceitos em `allowedMovementTypeCodes`.
 * PENDÊNCIA com negócio/supervisório: não há lista oficial nem catálogo; o back
 * só exige string não vazia e compara com o `movementTypeCode` enviado pelo
 * supervisório (código diferente => UNAUTHORIZED_MOVEMENT_TYPE). Esta lista
 * fixa só vale se o supervisório usar exatamente estes códigos;
 * código fora da lista não é mais aceito pelo editor (HRZ-373).
 */
export const MOVEMENT_TYPE_CODES = ["ENTRADA", "SAIDA"] as const;

// ─── Itens e revisões ────────────────────────────────────────────────────────

/** Item de revisão enviado à API (todas as quantidades como string). */
export interface ContractItemInput {
  productId: string;
  /** Deve ser igual ao `sapCode` do produto. */
  productCode: string;
  /** Fixa em GSV (HRZ-373); `poolId` e dados do cliente não são enviados. */
  accountingMeasure: "GSV";
  reservedCapacity: string;
  maximumCapacity: string;
  minimumQuota?: string;
  maximumQuota: string;
  minimumStock?: string;
  movementLimit?: string;
  movementQuantityTolerancePercent?: string;
  quotaAlertPercent?: string;
  allowedMovementTypeCodes: string[];
  allowedTankCodes: string[];
}

export interface RevisionInput {
  effectiveFrom: string;
  effectiveUntil?: string | null;
  justification?: string;
  items: ContractItemInput[];
}

/** Item como a API devolve: pode trazer pool, dados do cliente e outra medida (contratos antigos). */
export interface ContractItemResponse extends Omit<ContractItemInput, "accountingMeasure"> {
  id: string;
  accountingMeasure: AccountingMeasure;
  poolId?: string;
  customerProductCode?: string;
  customerProductDescription?: string;
}

export interface RevisionResponse {
  id: string;
  revisionNumber: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  /** Ausente = rascunho em edição. */
  approvedAt?: string;
  justification?: string;
  items: ContractItemResponse[];
}

// ─── Contrato ────────────────────────────────────────────────────────────────

/**
 * Número do contrato e código interno são gerados pelo backend; depositante e
 * pool assumem o padrão do sistema. `revision` é opcional (itens entram na edição).
 */
export interface CreateContractRequest {
  source: string;
  baseCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  revision?: RevisionInput;
}

/** `GET /contracts/next-identifiers`: sugestão para exibição (não reserva o número). */
export interface NextIdentifiers {
  contractNumber: string;
  internalCode: string;
}

export interface AttachmentResponse {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/** `PATCH /contracts/:id` é substituição completa do rascunho. */
export type UpdateContractRequest = CreateContractRequest;

/** `POST /contracts/:id/revisions` — `justification` obrigatória. */
export interface NewRevisionRequest extends RevisionInput {
  justification: string;
}

export interface ContractActionRequest {
  justification?: string;
  stockDeclaration?: StockDeclaration;
}

/** `internalCode` do depositante padrão do sistema (placeholder, sem dados reais). */
export const DEFAULT_OWNER_INTERNAL_CODE = "DEFAULT";

export interface OwnerSummary {
  id: string;
  internalCode?: string;
  cnpj?: string;
  legalName?: string;
  tradeName?: string;
  status?: string;
}

export interface ContractResponse {
  id: string;
  internalCode: string;
  contractNumber: string;
  ownerId: string;
  /** Presente no detalhe e nas linhas da listagem (a lista devolve o objeto completo). */
  owner?: OwnerSummary;
  source: string;
  baseCode: string;
  status: ContractStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  currentRevisionId?: string;
  currentRevision?: RevisionResponse;
  revisions?: RevisionResponse[];
  attachments?: AttachmentResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractListQuery {
  /** Base 1. */
  page?: number;
  /** 1..100 (fora da faixa a API responde 400). */
  limit?: number;
  source?: string;
  baseCode?: string;
  ownerId?: string;
  status?: ContractStatus;
  internalCode?: string;
  contractNumber?: string;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
}

// ─── Owner (depositante) ─────────────────────────────────────────────────────

export interface OwnerResponse {
  id: string;
  internalCode: string;
  cnpj: string;
  legalName: string;
  tradeName?: string;
  status: "ACTIVE" | "INACTIVE" | string;
}

/** Item de `GET /rest/owners/all` (só depositantes ACTIVE do escopo do usuário). */
export interface OwnerOption {
  id: string;
  internalCode: string;
  legalName: string;
}

export interface OwnerListQuery {
  page?: number;
  limit?: number;
  status?: "ACTIVE" | "INACTIVE";
  internalCode?: string;
  /** Igualdade exata, CNPJ canônico (sem máscara). */
  cnpj?: string;
}

/**
 * Vínculo Owner × Produto (`GET /owners/:ownerId/products` → `{ rows, total }`).
 * ATENÇÃO: `id` é o id do VÍNCULO. No item do contrato, `productId` =
 * `product.id` e `productCode` = `product.sapCode`.
 */
export interface OwnerProductResponse {
  id: string;
  product: { id: string; sapCode: string; name: string };
  customerProductCode?: string;
  customerProductDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OwnerProductInput {
  customerProductCode?: string;
  customerProductDescription?: string;
}

// ─── Catálogos de apoio ──────────────────────────────────────────────────────

export interface BaseResponse {
  id: string;
  source: string;
  baseCode: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface PoolResponse {
  id: string;
  source: string;
  baseCode: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  effectiveFrom: string;
  effectiveTo?: string;
  allowedProducts?: { productCode: string; name?: string; status?: string }[];
}

export interface TankResponse {
  tankCode: string;
  productCode: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  physicalCapacityLiters?: string;
  operationalCapacityLiters?: string;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

const enc = encodeURIComponent;

export const CONTRACTS_ENDPOINTS = {
  root: `${REST_PREFIX}/contracts`,
  nextIdentifiers: `${REST_PREFIX}/contracts/next-identifiers`,
  files: `${REST_PREFIX}/files`,
  attachments: `${REST_PREFIX}/attachments`,
  attachmentDownload: (id: string): string => `${REST_PREFIX}/attachments/${enc(id)}/download`,
  byId: (id: string): string => `${REST_PREFIX}/contracts/${enc(id)}`,
  action: (id: string, action: ContractAction): string =>
    `${REST_PREFIX}/contracts/${enc(id)}/${action}`,
  revisions: (id: string): string =>
    `${REST_PREFIX}/contracts/${enc(id)}/revisions`,

  owners: `${REST_PREFIX}/owners`,
  /** Sem paginação: só ACTIVE, ordenado por internalCode, filtrado pelo RBAC. */
  ownersAll: `${REST_PREFIX}/owners/all`,
  ownerById: (id: string): string => `${REST_PREFIX}/owners/${enc(id)}`,
  ownerProducts: (ownerId: string): string =>
    `${REST_PREFIX}/owners/${enc(ownerId)}/products`,
  ownerProduct: (ownerId: string, productId: string): string =>
    `${REST_PREFIX}/owners/${enc(ownerId)}/products/${enc(productId)}`,

  bases: `${REST_PREFIX}/operational-catalog/bases`,
  /** Sem paginação — usado nos selects de base. */
  basesAll: `${REST_PREFIX}/operational-catalog/bases/all`,
  tanks: `${REST_PREFIX}/operational-catalog/tanks`,
  pools: `${REST_PREFIX}/pools`,
} as const;
