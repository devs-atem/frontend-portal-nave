import { afterEach, describe, expect, it, vi } from "vitest";

import AppError from "@shared/utils/appError";
import type { ContractResponse } from "./contract";
import { emptyContractForm, emptyItem, type ContractForm } from "./contractRules";
import {
  attachmentFailedMessage,
  submitContractForm,
  type SubmitContractFormDeps,
} from "./submitContractForm";

const saved = (over: Partial<ContractResponse> = {}): ContractResponse =>
  ({
    id: "c-1",
    contractNumber: "000001",
    internalCode: "SAP-PENDENTE-000001",
    ...over,
  }) as ContractResponse;

const form = (): ContractForm => ({
  ...emptyContractForm(),
  source: "SRC",
  baseCode: "C001",
  effectiveFrom: "2026-01-01",
  revision: {
    effectiveFrom: "2026-02-01",
    effectiveUntil: "",
    justification: " motivo ",
    items: [
      {
        ...emptyItem(),
        included: true,
        productId: "p1",
        productCode: "100",
        reservedCapacity: "1",
        maximumCapacity: "2",
        maximumQuota: "2",
        allowedMovementTypeCodes: ["ENTRADA"],
      },
    ],
  },
});

const file = new File(["x"], "contrato.pdf", { type: "application/pdf" });

function deps(over: Partial<SubmitContractFormDeps> = {}) {
  const order: string[] = [];
  const base = {
    contracts: {
      create: vi.fn(async () => (order.push("create"), saved())),
      update: vi.fn(async () => (order.push("update"), saved())),
      createRevision: vi.fn(async () => (order.push("createRevision"), saved())),
      nextIdentifiers: vi.fn(async () => ({
        contractNumber: "000002",
        internalCode: "SAP-PENDENTE-000002",
      })),
    },
    files: {
      upload: vi.fn(
        async () => (order.push("upload"), { key: "k-1", originalName: "contrato.pdf" }),
      ),
      attachToContract: vi.fn(async () => (order.push("attach"), [])),
    },
    onIdentifiers: vi.fn(),
  };
  return { order, d: { ...base, ...over } as unknown as SubmitContractFormDeps, base };
}

afterEach(() => vi.restoreAllMocks());

describe("submitContractForm", () => {
  it("sem anexo: não envia arquivo nem confirma anexo", async () => {
    const { d, base } = deps();
    const result = await submitContractForm({ mode: "create", form: form(), attachment: null }, d);
    expect(base.files.upload).not.toHaveBeenCalled();
    expect(base.files.attachToContract).not.toHaveBeenCalled();
    expect(result).toMatchObject({ contractId: "c-1", attachmentFailed: false });
  });

  it("com anexo: envia o arquivo, cria o contrato e confirma o anexo, nessa ordem", async () => {
    const { d, base, order } = deps();
    const result = await submitContractForm({ mode: "create", form: form(), attachment: file }, d);
    expect(order).toEqual(["upload", "create", "attach"]);
    expect(base.files.attachToContract).toHaveBeenCalledWith("c-1", ["k-1"]);
    expect(result?.attachmentFailed).toBe(false);
  });

  it("falha ao confirmar o anexo: o contrato fica salvo, sinaliza e loga o erro original", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const boom = new Error("S3 indisponível");
    const { d } = deps();
    (d.files.attachToContract as ReturnType<typeof vi.fn>).mockRejectedValueOnce(boom);
    const result = await submitContractForm({ mode: "create", form: form(), attachment: file }, d);
    expect(result).toMatchObject({ contractId: "c-1", attachmentFailed: true });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("anexo"), boom);
  });

  it("falha no envio do arquivo: não cria o contrato e propaga o erro", async () => {
    const { d, base } = deps();
    (d.files.upload as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new AppError("Tipo não permitido", "error", "x", 400),
    );
    await expect(
      submitContractForm({ mode: "create", form: form(), attachment: file }, d),
    ).rejects.toThrow("Tipo não permitido");
    expect(base.contracts.create).not.toHaveBeenCalled();
    expect(base.files.attachToContract).not.toHaveBeenCalled();
  });

  it("409 na criação: busca outro número sugerido e propaga o erro", async () => {
    const { d, base } = deps();
    (d.contracts.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new AppError("Contract identity already exists", "error", "x", 409),
    );
    await expect(
      submitContractForm({ mode: "create", form: form(), attachment: null }, d),
    ).rejects.toThrow(/identity/);
    await vi.waitFor(() =>
      expect(base.onIdentifiers).toHaveBeenCalledWith({
        contractNumber: "000002",
        internalCode: "SAP-PENDENTE-000002",
      }),
    );
    expect(base.contracts.nextIdentifiers).toHaveBeenCalledTimes(1);
  });

  it("409 com falha ao atualizar o número: loga e não esconde o erro principal", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { d, base } = deps();
    (d.contracts.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new AppError("conflito", "error", "x", 409),
    );
    (d.contracts.nextIdentifiers as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("rede"),
    );
    await expect(
      submitContractForm({ mode: "create", form: form(), attachment: null }, d),
    ).rejects.toThrow("conflito");
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(base.onIdentifiers).not.toHaveBeenCalled();
  });

  it("409 fora da criação não pede novo número", async () => {
    const { d, base } = deps();
    (d.contracts.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new AppError("conflito", "error", "x", 409),
    );
    await expect(
      submitContractForm({ mode: "edit", id: "c-1", form: form(), attachment: null }, d),
    ).rejects.toThrow("conflito");
    expect(base.contracts.nextIdentifiers).not.toHaveBeenCalled();
  });

  it("modo revision: não faz upload e cria a revisão com a justificativa sem espaços", async () => {
    const { d, base } = deps();
    const result = await submitContractForm(
      { mode: "revision", id: "c-1", form: form(), attachment: file },
      d,
    );
    expect(base.files.upload).not.toHaveBeenCalled();
    expect(base.files.attachToContract).not.toHaveBeenCalled();
    expect(base.contracts.createRevision).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ justification: "motivo" }),
    );
    expect(result?.contractId).toBe("c-1");
  });

  it("modo edit: atualiza o rascunho e aceita anexo", async () => {
    const { d, base, order } = deps();
    await submitContractForm({ mode: "edit", id: "c-1", form: form(), attachment: file }, d);
    expect(order).toEqual(["upload", "update", "attach"]);
    expect(base.contracts.update).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ baseCode: "C001" }),
    );
  });

  it("edit/revision sem id não envia nada", async () => {
    const { d, base } = deps();
    expect(
      await submitContractForm({ mode: "edit", form: form(), attachment: null }, d),
    ).toBeNull();
    expect(base.contracts.update).not.toHaveBeenCalled();
  });
});

describe("attachmentFailedMessage", () => {
  it("deixa claro que o contrato foi salvo", () => {
    expect(attachmentFailedMessage("create")).toBe(
      "O contrato foi criado, mas o anexo não foi salvo.",
    );
    expect(attachmentFailedMessage("edit")).toBe(
      "O rascunho foi salvo, mas o anexo não foi salvo.",
    );
  });
});
