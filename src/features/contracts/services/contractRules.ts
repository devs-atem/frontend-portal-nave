import { normalizeCnpj } from "@features/products/services/contract";
import type {
  AccountingMeasure,
  ContractAction,
  ContractItemInput,
  ContractResponse,
  ContractStatus,
  CreateContractRequest,
  RevisionInput,
  RevisionResponse,
} from "./contract";

// ─── Formatos (quantidades, percentuais, datas) ──────────────────────────────

const DECIMAL_RE = /^(0|[1-9]\d*)(\.\d{1,3})?$/;
const PERCENT_RE = /^(0|[1-9]\d*)(\.\d{1,4})?$/;

/** Quantidade: string não negativa, até 3 casas, ponto como separador. */
export const isValidDecimalString = (s: string): boolean => DECIMAL_RE.test(s);

/** Percentual: string não negativa, até 4 casas e ≤ 100. */
export const isValidPercentString = (s: string): boolean =>
  PERCENT_RE.test(s) && Number(s) <= 100;

/** `yyyy-mm-dd` → ISO UTC (início ou fim do dia). */
export const dateToIso = (date: string, endOfDay = false): string =>
  `${date}T${endOfDay ? "23:59:59.000" : "00:00:00.000"}Z`;

/** ISO → `yyyy-mm-dd` (para `<input type="date">`). */
export const isoToDate = (iso?: string): string => (iso ? iso.slice(0, 10) : "");

/** Exibe uma data ISO no padrão local; vazio vira "Indeterminada" (quando indicado). */
export const formatDate = (iso?: string, emptyLabel = "—"): string => {
  if (!iso) return emptyLabel;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

/** Exibe uma quantidade decimal (string) no padrão pt-BR. */
export const formatQty = (s?: string): string => {
  if (s === undefined || s === "") return "—";
  const n = Number(s);
  return Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })
    : s;
};

// ─── Modelo do formulário (tudo string, como digitado) ───────────────────────

export interface ItemForm {
  /** Chave local estável (não vai para a API). */
  key: string;
  productId: string;
  productCode: string;
  customerProductCode: string;
  customerProductDescription: string;
  poolId: string;
  accountingMeasure: AccountingMeasure | "";
  reservedCapacity: string;
  maximumCapacity: string;
  minimumQuota: string;
  maximumQuota: string;
  minimumStock: string;
  movementLimit: string;
  movementQuantityTolerancePercent: string;
  quotaAlertPercent: string;
  allowedMovementTypeCodes: string[];
  allowedTankCodes: string[];
}

export interface RevisionForm {
  effectiveFrom: string;
  effectiveUntil: string;
  justification: string;
  items: ItemForm[];
}

export interface ContractForm {
  internalCode: string;
  contractNumber: string;
  ownerId: string;
  source: string;
  baseCode: string;
  effectiveFrom: string;
  effectiveTo: string;
  revision: RevisionForm;
}

let keySeq = 0;
export const newKey = (): string => `k${++keySeq}`;

export const emptyItem = (): ItemForm => ({
  key: newKey(),
  productId: "",
  productCode: "",
  customerProductCode: "",
  customerProductDescription: "",
  poolId: "",
  accountingMeasure: "",
  reservedCapacity: "",
  maximumCapacity: "",
  minimumQuota: "",
  maximumQuota: "",
  minimumStock: "",
  movementLimit: "",
  movementQuantityTolerancePercent: "",
  quotaAlertPercent: "",
  allowedMovementTypeCodes: [],
  allowedTankCodes: [],
});

export const emptyContractForm = (): ContractForm => ({
  internalCode: "",
  contractNumber: "",
  ownerId: "",
  source: "",
  baseCode: "",
  effectiveFrom: "",
  effectiveTo: "",
  revision: {
    effectiveFrom: "",
    effectiveUntil: "",
    justification: "",
    items: [],
  },
});

/** Converte um item da API para o formulário (preserva todos os campos). */
export const itemToForm = (i: ContractItemInput): ItemForm => ({
  key: newKey(),
  productId: i.productId,
  productCode: i.productCode,
  customerProductCode: i.customerProductCode ?? "",
  customerProductDescription: i.customerProductDescription ?? "",
  poolId: i.poolId,
  accountingMeasure: i.accountingMeasure,
  reservedCapacity: i.reservedCapacity,
  maximumCapacity: i.maximumCapacity,
  minimumQuota: i.minimumQuota ?? "",
  maximumQuota: i.maximumQuota,
  minimumStock: i.minimumStock ?? "",
  movementLimit: i.movementLimit ?? "",
  movementQuantityTolerancePercent: i.movementQuantityTolerancePercent ?? "",
  quotaAlertPercent: i.quotaAlertPercent ?? "",
  allowedMovementTypeCodes: [...i.allowedMovementTypeCodes],
  allowedTankCodes: [...(i.allowedTankCodes ?? [])],
});

/** Revisão em rascunho (sem `approvedAt`) ou, na falta, a corrente. */
export const draftRevisionOf = (
  c: ContractResponse,
): RevisionResponse | undefined =>
  c.revisions?.find((r) => !r.approvedAt) ?? c.currentRevision;

/** Formulário de edição de rascunho a partir do detalhe do contrato. */
export const formFromContract = (c: ContractResponse): ContractForm => {
  const rev = draftRevisionOf(c);
  return {
    internalCode: c.internalCode,
    contractNumber: c.contractNumber,
    ownerId: c.ownerId,
    source: c.source,
    baseCode: c.baseCode,
    effectiveFrom: isoToDate(c.effectiveFrom),
    effectiveTo: isoToDate(c.effectiveTo),
    revision: {
      effectiveFrom: isoToDate(rev?.effectiveFrom),
      effectiveUntil: isoToDate(rev?.effectiveUntil),
      justification: rev?.justification ?? "",
      items: (rev?.items ?? []).map(itemToForm),
    },
  };
};

/** Formulário de nova revisão, pré-preenchido com os itens da revisão corrente. */
export const revisionFormFromContract = (c: ContractResponse): RevisionForm => {
  const base = c.currentRevision ?? c.revisions?.[c.revisions.length - 1];
  return {
    effectiveFrom: "",
    effectiveUntil: "",
    justification: "",
    items: (base?.items ?? []).map(itemToForm),
  };
};

// ─── Montagem do corpo da API ────────────────────────────────────────────────

const opt = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

export const buildItemInput = (i: ItemForm): ContractItemInput => ({
  productId: i.productId,
  productCode: i.productCode,
  customerProductCode: opt(i.customerProductCode),
  customerProductDescription: opt(i.customerProductDescription),
  poolId: i.poolId,
  accountingMeasure: i.accountingMeasure as AccountingMeasure,
  reservedCapacity: i.reservedCapacity.trim(),
  maximumCapacity: i.maximumCapacity.trim(),
  minimumQuota: opt(i.minimumQuota),
  maximumQuota: i.maximumQuota.trim(),
  minimumStock: opt(i.minimumStock),
  movementLimit: opt(i.movementLimit),
  movementQuantityTolerancePercent: opt(i.movementQuantityTolerancePercent),
  quotaAlertPercent: opt(i.quotaAlertPercent),
  allowedMovementTypeCodes: i.allowedMovementTypeCodes,
  allowedTankCodes: i.allowedTankCodes,
});

export const buildRevisionInput = (r: RevisionForm): RevisionInput => ({
  effectiveFrom: dateToIso(r.effectiveFrom),
  effectiveUntil: r.effectiveUntil ? dateToIso(r.effectiveUntil, true) : undefined,
  justification: opt(r.justification),
  items: r.items.map(buildItemInput),
});

/** Corpo completo (POST e PATCH): somente campos conhecidos, sem extras. */
export const buildContractRequest = (f: ContractForm): CreateContractRequest => ({
  internalCode: f.internalCode.trim(),
  contractNumber: f.contractNumber.trim(),
  // Depositante/Base opcionais por enquanto: omitidos quando vazios.
  ...(f.ownerId ? { ownerId: f.ownerId } : {}),
  ...(f.source && f.baseCode ? { source: f.source, baseCode: f.baseCode } : {}),
  effectiveFrom: dateToIso(f.effectiveFrom),
  effectiveTo: f.effectiveTo ? dateToIso(f.effectiveTo, true) : undefined,
  revision: buildRevisionInput(f.revision),
});

// ─── Validação ───────────────────────────────────────────────────────────────

/** Mapa de erros: chaves `internalCode`, `rev.effectiveFrom`, `item.<key>.<campo>` etc. */
export type ValidationErrors = Record<string, string>;

export interface ValidateOptions {
  /** `revision` = nova revisão de contrato existente (sem dados gerais). */
  mode: "contract" | "revision";
  /** Vigência do contrato (no modo revisão vem do contrato existente). */
  contractFrom?: string;
  contractTo?: string;
  /** Revisões já existentes (nova revisão deve ser posterior a todas). */
  existingRevisions?: RevisionResponse[];
}

const time = (date: string): number => new Date(`${date}T00:00:00Z`).getTime();

export function validateItem(i: ItemForm): ValidationErrors {
  const e: ValidationErrors = {};
  const k = (f: string): string => `item.${i.key}.${f}`;

  if (!i.productId) e[k("productId")] = "Selecione o produto.";
  if (!i.poolId) e[k("poolId")] = "Selecione o pool.";
  if (!i.accountingMeasure) e[k("accountingMeasure")] = "Selecione a medida.";

  const required: [keyof ItemForm, string][] = [
    ["reservedCapacity", "Informe a capacidade reservada."],
    ["maximumCapacity", "Informe a capacidade máxima."],
    ["maximumQuota", "Informe a cota máxima."],
  ];
  for (const [f, msg] of required) {
    const v = (i[f] as string).trim();
    if (!v) e[k(f)] = msg;
    else if (!isValidDecimalString(v)) e[k(f)] = "Use número não negativo, ponto e até 3 casas.";
  }
  for (const f of ["minimumQuota", "minimumStock", "movementLimit"] as const) {
    const v = i[f].trim();
    if (v && !isValidDecimalString(v)) e[k(f)] = "Use número não negativo, ponto e até 3 casas.";
  }
  for (const f of ["movementQuantityTolerancePercent", "quotaAlertPercent"] as const) {
    const v = i[f].trim();
    if (v && !isValidPercentString(v)) e[k(f)] = "Percentual de 0 a 100, até 4 casas.";
  }

  if (!e[k("reservedCapacity")] && !e[k("maximumCapacity")]) {
    if (Number(i.maximumCapacity) < Number(i.reservedCapacity)) {
      e[k("maximumCapacity")] = "Deve ser maior ou igual à capacidade reservada.";
    }
  }
  const minQ = i.minimumQuota.trim();
  if (minQ && !e[k("minimumQuota")] && !e[k("maximumQuota")]) {
    if (Number(i.maximumQuota) < Number(minQ)) {
      e[k("maximumQuota")] = "Deve ser maior ou igual à cota mínima.";
    }
  }
  if (i.allowedMovementTypeCodes.length === 0) {
    e[k("allowedMovementTypeCodes")] = "Selecione ao menos um tipo de movimento.";
  }
  return e;
}

export function validateContractForm(
  f: ContractForm,
  o: ValidateOptions,
): ValidationErrors {
  const e: ValidationErrors = {};
  let from = o.contractFrom;
  let to = o.contractTo;

  if (o.mode === "contract") {
    if (!f.internalCode.trim()) e.internalCode = "Informe o código interno.";
    if (!f.contractNumber.trim()) e.contractNumber = "Informe o número do contrato.";
    // Depositante e Base: NÃO obrigatórios por enquanto (/owners/all ainda vem vazio).
    if (!f.effectiveFrom) e.effectiveFrom = "Informe o início da vigência.";
    if (f.effectiveFrom && f.effectiveTo && time(f.effectiveTo) <= time(f.effectiveFrom)) {
      e.effectiveTo = "O fim deve ser posterior ao início.";
    }
    from = f.effectiveFrom || undefined;
    to = f.effectiveTo || undefined;
  }

  const r = f.revision;
  if (!r.effectiveFrom) e["rev.effectiveFrom"] = "Informe o início da revisão.";
  if (r.effectiveFrom && r.effectiveUntil && time(r.effectiveUntil) <= time(r.effectiveFrom)) {
    e["rev.effectiveUntil"] = "O fim deve ser posterior ao início da revisão.";
  }
  if (r.effectiveFrom && from && time(r.effectiveFrom) < time(from)) {
    e["rev.effectiveFrom"] = "A revisão deve começar dentro da vigência do contrato.";
  }
  if (to && !e["rev.effectiveUntil"]) {
    if (!r.effectiveUntil || time(r.effectiveUntil) > time(to)) {
      e["rev.effectiveUntil"] = "A revisão deve terminar até o fim do contrato.";
    }
  }
  if (o.mode === "revision") {
    if (!r.justification.trim()) e["rev.justification"] = "Informe a justificativa.";
    const last = Math.max(
      0,
      ...(o.existingRevisions ?? []).map((x) => new Date(x.effectiveFrom).getTime()),
    );
    if (r.effectiveFrom && last && time(r.effectiveFrom) <= last) {
      e["rev.effectiveFrom"] = "Deve ser posterior a todas as revisões existentes.";
    }
  }

  if (r.items.length === 0) e["rev.items"] = "Adicione ao menos um item.";
  const seen = new Set<string>();
  for (const item of r.items) {
    Object.assign(e, validateItem(item));
    const pair = `${item.productId}|${item.poolId}`;
    if (item.productId && item.poolId) {
      if (seen.has(pair)) {
        e[`item.${item.key}.poolId`] = "Este produto já está neste pool na revisão.";
      }
      seen.add(pair);
    }
  }
  return e;
}

// ─── Ações por status ────────────────────────────────────────────────────────

export interface ActionPermissions {
  write: boolean;
  approve: boolean;
  status: boolean;
}

export interface AvailableActions {
  edit: boolean;
  newRevision: boolean;
  actions: ContractAction[];
}

/**
 * Ações disponíveis por status e permissão (máquina de estados do back).
 * ACTIVE não pode ser cancelado direto: precisa passar por CLOSING → CLOSED.
 */
export function allowedActions(
  status: ContractStatus,
  p: ActionPermissions,
): AvailableActions {
  const actions: ContractAction[] = [];
  let edit = false;
  let newRevision = false;

  switch (status) {
    case "DRAFT":
      edit = p.write;
      if (p.write) actions.push("submit");
      if (p.status) actions.push("cancel");
      break;
    case "PENDING_APPROVAL":
      if (p.approve) actions.push("approve");
      if (p.status) actions.push("cancel");
      break;
    case "ACTIVE":
      if (p.status) actions.push("suspend", "start-closing");
      newRevision = p.write;
      break;
    case "SUSPENDED":
      if (p.status) actions.push("reactivate", "start-closing", "cancel");
      newRevision = p.write;
      break;
    case "CLOSING":
      if (p.status) actions.push("close");
      break;
    default:
      break;
  }
  return { edit, newRevision, actions };
}

// ─── Vínculo cliente ↔ Owner (por CNPJ) ──────────────────────────────────────

/** Todos os CNPJs do cliente (matriz + filiais), normalizados e sem repetição. */
export const clientCnpjs = (c: { cnpj: string; branches: string[] }): string[] =>
  [...new Set([c.cnpj, ...c.branches].map(normalizeCnpj).filter(Boolean))];

/** `owner.cnpj` ∈ {matriz + filiais} do cliente (ignora máscara). */
export const clientOwnsCnpj = (
  c: { cnpj: string; branches: string[] },
  ownerCnpj?: string,
): boolean => !!ownerCnpj && clientCnpjs(c).includes(normalizeCnpj(ownerCnpj));
