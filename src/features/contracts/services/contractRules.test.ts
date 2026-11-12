import { describe, it, expect } from "vitest";

import type { ContractStatus } from "./contract";
import {
  allowedActions,
  buildContractRequest,
  clientCnpjs,
  clientOwnsCnpj,
  dateToIso,
  emptyContractForm,
  emptyItem,
  isValidDecimalString,
  isValidPercentString,
  validateContractForm,
  type ContractForm,
  type ItemForm,
} from "./contractRules";

const validItem = (over: Partial<ItemForm> = {}): ItemForm => ({
  ...emptyItem(),
  productId: "p1",
  productCode: "000000000012345",
  poolId: "pool1",
  accountingMeasure: "GSV",
  reservedCapacity: "1000.000",
  maximumCapacity: "1500.000",
  minimumQuota: "100.000",
  maximumQuota: "500.000",
  allowedMovementTypeCodes: ["ENTRADA"],
  ...over,
});

const validForm = (over: Partial<ContractForm> = {}): ContractForm => ({
  ...emptyContractForm(),
  internalCode: "CT-1",
  contractNumber: "4600001234",
  ownerId: "o1",
  source: "SRC",
  baseCode: "SSA",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  revision: {
    effectiveFrom: "2026-01-01",
    effectiveUntil: "2026-12-31",
    justification: "",
    items: [validItem()],
  },
  ...over,
});

const OPTS = { mode: "contract" as const };

describe("formatos", () => {
  it("quantidade: não negativa, até 3 casas, ponto", () => {
    expect(isValidDecimalString("0")).toBe(true);
    expect(isValidDecimalString("1000.5")).toBe(true);
    expect(isValidDecimalString("1000.123")).toBe(true);
    expect(isValidDecimalString("1000.1234")).toBe(false);
    expect(isValidDecimalString("1,5")).toBe(false);
    expect(isValidDecimalString("-1")).toBe(false);
    expect(isValidDecimalString("01")).toBe(false);
    expect(isValidDecimalString("")).toBe(false);
  });

  it("percentual: até 4 casas e ≤ 100", () => {
    expect(isValidPercentString("100")).toBe(true);
    expect(isValidPercentString("2.5000")).toBe(true);
    expect(isValidPercentString("100.0001")).toBe(false);
    expect(isValidPercentString("2.12345")).toBe(false);
    expect(isValidPercentString("101")).toBe(false);
  });

  it("datas em ISO UTC", () => {
    expect(dateToIso("2026-01-01")).toBe("2026-01-01T00:00:00.000Z");
    expect(dateToIso("2026-12-31", true)).toBe("2026-12-31T23:59:59.000Z");
  });
});

describe("validateContractForm", () => {
  it("formulário válido não tem erros", () => {
    expect(validateContractForm(validForm(), OPTS)).toEqual({});
  });

  it("exige dados gerais e ao menos 1 item", () => {
    const e = validateContractForm(
      validForm({ internalCode: "", ownerId: "", source: "", revision: { ...validForm().revision, items: [] } }),
      OPTS,
    );
    expect(e.internalCode).toBeTruthy();
    expect(e.ownerId).toBeTruthy();
    expect(e.base).toBeTruthy();
    expect(e["rev.items"]).toBeTruthy();
  });

  it("vigência: fim posterior ao início e revisão dentro do contrato", () => {
    const e = validateContractForm(
      validForm({
        effectiveTo: "2025-12-31",
        revision: { ...validForm().revision, effectiveFrom: "2025-06-01", effectiveUntil: "2027-01-01" },
      }),
      OPTS,
    );
    expect(e.effectiveTo).toBeTruthy();
    expect(e["rev.effectiveFrom"]).toBeTruthy();
  });

  it("contrato com fim exige revisão terminando até o fim do contrato", () => {
    const f = validForm();
    f.revision.effectiveUntil = "";
    expect(validateContractForm(f, OPTS)["rev.effectiveUntil"]).toBeTruthy();
    f.revision.effectiveUntil = "2027-01-01";
    expect(validateContractForm(f, OPTS)["rev.effectiveUntil"]).toBeTruthy();
  });

  it("item: capacidade máxima ≥ reservada e cota máxima ≥ mínima", () => {
    const item = validItem({ maximumCapacity: "500.000", reservedCapacity: "1000.000", maximumQuota: "10", minimumQuota: "20" });
    const e = validateContractForm(validForm({ revision: { ...validForm().revision, items: [item] } }), OPTS);
    expect(e[`item.${item.key}.maximumCapacity`]).toBeTruthy();
    expect(e[`item.${item.key}.maximumQuota`]).toBeTruthy();
  });

  it("item: quantidade como número com vírgula é inválida", () => {
    const item = validItem({ reservedCapacity: "1,5" });
    const e = validateContractForm(validForm({ revision: { ...validForm().revision, items: [item] } }), OPTS);
    expect(e[`item.${item.key}.reservedCapacity`]).toBeTruthy();
  });

  it("item: exige ao menos 1 tipo de movimento; tanques podem ser []", () => {
    const item = validItem({ allowedMovementTypeCodes: [], allowedTankCodes: [] });
    const e = validateContractForm(validForm({ revision: { ...validForm().revision, items: [item] } }), OPTS);
    expect(e[`item.${item.key}.allowedMovementTypeCodes`]).toBeTruthy();
  });

  it("um produto só pode aparecer uma vez por pool", () => {
    const a = validItem();
    const b = validItem();
    const e = validateContractForm(validForm({ revision: { ...validForm().revision, items: [a, b] } }), OPTS);
    expect(e[`item.${b.key}.poolId`]).toBeTruthy();
  });

  it("nova revisão: justificativa obrigatória e início posterior às existentes", () => {
    const f = validForm();
    f.revision.justification = "";
    f.revision.effectiveFrom = "2026-03-01";
    const e = validateContractForm(f, {
      mode: "revision",
      contractFrom: "2026-01-01",
      contractTo: "2026-12-31",
      existingRevisions: [
        { id: "r1", revisionNumber: 1, effectiveFrom: "2026-06-01T00:00:00.000Z", items: [] },
      ],
    });
    expect(e["rev.justification"]).toBeTruthy();
    expect(e["rev.effectiveFrom"]).toMatch(/posterior/);
  });
});

describe("buildContractRequest", () => {
  it("monta o corpo sem campos extras e omite opcionais vazios", () => {
    const body = buildContractRequest(validForm());
    expect(Object.keys(body).sort()).toEqual(
      ["baseCode", "contractNumber", "effectiveFrom", "effectiveTo", "internalCode", "ownerId", "revision", "source"].sort(),
    );
    expect(body.effectiveFrom).toBe("2026-01-01T00:00:00.000Z");
    const item = body.revision.items[0];
    expect(item.reservedCapacity).toBe("1000.000");
    expect(item.minimumStock).toBeUndefined();
    expect(item).not.toHaveProperty("key");
  });

  it("fim da vigência vazio fica indeterminado (omitido)", () => {
    const body = buildContractRequest(validForm({ effectiveTo: "" }));
    expect(body.effectiveTo).toBeUndefined();
  });
});

describe("allowedActions", () => {
  const all = { write: true, approve: true, status: true };
  const none = { write: false, approve: false, status: false };

  it("DRAFT: editar, enviar, cancelar", () => {
    const a = allowedActions("DRAFT", all);
    expect(a.edit).toBe(true);
    expect(a.actions).toEqual(["submit", "cancel"]);
  });

  it("ACTIVE não pode ser cancelado direto", () => {
    const a = allowedActions("ACTIVE", all);
    expect(a.actions).toEqual(["suspend", "start-closing"]);
    expect(a.actions).not.toContain("cancel");
    expect(a.newRevision).toBe(true);
  });

  it("PENDING_APPROVAL: aprovar exige approve; cancelar exige status", () => {
    expect(allowedActions("PENDING_APPROVAL", { ...none, approve: true }).actions).toEqual(["approve"]);
    expect(allowedActions("PENDING_APPROVAL", { ...none, status: true }).actions).toEqual(["cancel"]);
  });

  it("SUSPENDED e CLOSING", () => {
    expect(allowedActions("SUSPENDED", all).actions).toEqual(["reactivate", "start-closing", "cancel"]);
    expect(allowedActions("CLOSING", all).actions).toEqual(["close"]);
  });

  it("estados terminais e usuário sem permissão: somente leitura", () => {
    for (const s of ["CLOSED", "CANCELLED", "EXPIRED"] as ContractStatus[]) {
      expect(allowedActions(s, all)).toEqual({ edit: false, newRevision: false, actions: [] });
    }
    expect(allowedActions("ACTIVE", none)).toEqual({ edit: false, newRevision: false, actions: [] });
  });
});

describe("vínculo cliente × owner por CNPJ", () => {
  const client = { cnpj: "12.345.678/0001-95", branches: ["98765432000110"] };

  it("reúne matriz + filiais normalizados", () => {
    expect(clientCnpjs(client)).toEqual(["12345678000195", "98765432000110"]);
  });

  it("casa matriz ou filial, ignorando máscara", () => {
    expect(clientOwnsCnpj(client, "12345678000195")).toBe(true);
    expect(clientOwnsCnpj(client, "98.765.432/0001-10")).toBe(true);
    expect(clientOwnsCnpj(client, "11222333000181")).toBe(false);
    expect(clientOwnsCnpj(client, undefined)).toBe(false);
  });
});
