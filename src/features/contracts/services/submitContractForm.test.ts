import { afterEach, describe, expect, it, vi } from "vitest";

import AppError from "@shared/utils/appError";
import type { ContractResponse, NextIdentifiers } from "./contract";
import type { IContractsService } from "./ContractsService";
import type { IFilesService } from "./FilesService";
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

function deps() {
  const order: string[] = [];
  const contracts = {
    create: vi.fn<IContractsService["create"]>(async () => (order.push("create"), saved())),
    update: vi.fn<IContractsService["update"]>(async () => (order.push("update"), saved())),
    createRevision: vi.fn<IContractsService["createRevision"]>(
      async () => (order.push("createRevision"), saved()),
    ),
    nextIdentifiers: vi.fn<IContractsService["nextIdentifiers"]>(async () => ({
      contractNumber: "000002",
      internalCode: "SAP-PENDENTE-000002",
    })),
  };
  const files = {
    upload: vi.fn<IFilesService["upload"]>(
      async () => (order.push("upload"), { key: "k-1", originalName: "contrato.pdf" }),
    ),
    attachToContract: vi.fn<IFilesService["attachToContract"]>(
      async () => (order.push("attach"), []),
    ),
  };
  const onIdentifiers = vi.fn<(next: NextIdentifiers) => void>();
  const d: SubmitContractFormDeps = { contracts, files, onIdentifiers };
  return { order, d, contracts, files, onIdentifiers };
}

afterEach(() => vi.restoreAllMocks());

describe("submitContractForm", () => {
  it("sem anexo: não envia arquivo nem confirma anexo", async () => {
    const { d, files } = deps();
    const result = await submitContractForm({ mode: "create", form: form(), attachment: null }, d);
    expect(files.upload).not.toHaveBeenCalled();
    expect(files.attachToContract).not.toHaveBeenCalled();
    expect(result).toMatchObject({ contractId: "c-1", attachmentFailed: false });
  });

  it("com anexo: envia o arquivo, cria o contrato e confirma o anexo, nessa ordem", async () => {
    const { d, files, order } = deps();
    const result = await submitContractForm({ mode: "create", form: form(), attachment: file }, d);
    expect(order).toEqual(["upload", "create", "attach"]);
    expect(files.attachToContract).toHaveBeenCalledWith("c-1", ["k-1"]);
    expect(result?.attachmentFailed).toBe(false);
  });

  it("falha ao confirmar o anexo: o contrato fica salvo, sinaliza e loga o erro original", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const boom = new Error("S3 indisponível");
    const { d, files } = deps();
    files.attachToContract.mockRejectedValueOnce(boom);
    const result = await submitContractForm({ mode: "create", form: form(), attachment: file }, d);
    expect(result).toMatchObject({ contractId: "c-1", attachmentFailed: true });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("anexo"), boom);
  });

  it("falha no envio do arquivo: não cria o contrato e propaga o erro", async () => {
    const { d, contracts, files } = deps();
    files.upload.mockRejectedValueOnce(new AppError("Tipo não permitido", "error", "x", 400));
    await expect(
      submitContractForm({ mode: "create", form: form(), attachment: file }, d),
    ).rejects.toThrow("Tipo não permitido");
    expect(contracts.create).not.toHaveBeenCalled();
    expect(files.attachToContract).not.toHaveBeenCalled();
  });

  it("409 na criação: busca outro número sugerido e propaga o erro", async () => {
    const { d, contracts, onIdentifiers } = deps();
    contracts.create.mockRejectedValueOnce(
      new AppError("Contract identity already exists", "error", "x", 409),
    );
    await expect(
      submitContractForm({ mode: "create", form: form(), attachment: null }, d),
    ).rejects.toThrow(/identity/);
    await vi.waitFor(() =>
      expect(onIdentifiers).toHaveBeenCalledWith({
        contractNumber: "000002",
        internalCode: "SAP-PENDENTE-000002",
      }),
    );
    expect(contracts.nextIdentifiers).toHaveBeenCalledTimes(1);
  });

  it("409 com falha ao atualizar o número: loga e não esconde o erro principal", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { d, contracts, onIdentifiers } = deps();
    contracts.create.mockRejectedValueOnce(new AppError("conflito", "error", "x", 409));
    contracts.nextIdentifiers.mockRejectedValueOnce(new Error("rede"));
    await expect(
      submitContractForm({ mode: "create", form: form(), attachment: null }, d),
    ).rejects.toThrow("conflito");
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(onIdentifiers).not.toHaveBeenCalled();
  });

  it("409 fora da criação não pede novo número", async () => {
    const { d, contracts } = deps();
    contracts.update.mockRejectedValueOnce(new AppError("conflito", "error", "x", 409));
    await expect(
      submitContractForm({ mode: "edit", id: "c-1", form: form(), attachment: null }, d),
    ).rejects.toThrow("conflito");
    expect(contracts.nextIdentifiers).not.toHaveBeenCalled();
  });

  it("modo revision: não faz upload e cria a revisão com a justificativa sem espaços", async () => {
    const { d, contracts, files } = deps();
    const result = await submitContractForm(
      { mode: "revision", id: "c-1", form: form(), attachment: file },
      d,
    );
    expect(files.upload).not.toHaveBeenCalled();
    expect(files.attachToContract).not.toHaveBeenCalled();
    expect(contracts.createRevision).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ justification: "motivo" }),
    );
    expect(result?.contractId).toBe("c-1");
  });

  it("modo edit: atualiza o rascunho e aceita anexo", async () => {
    const { d, contracts, order } = deps();
    await submitContractForm({ mode: "edit", id: "c-1", form: form(), attachment: file }, d);
    expect(order).toEqual(["upload", "update", "attach"]);
    expect(contracts.update).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ baseCode: "C001" }),
    );
  });

  it("edit sem id não envia o arquivo temporário nem grava nada", async () => {
    const { d, contracts, files } = deps();
    const result = await submitContractForm({ mode: "edit", form: form(), attachment: file }, d);
    expect(result).toBeNull();
    expect(files.upload).not.toHaveBeenCalled();
    expect(contracts.update).not.toHaveBeenCalled();
  });

  it("revision sem id não grava nada", async () => {
    const { d, contracts, files } = deps();
    const result = await submitContractForm(
      { mode: "revision", form: form(), attachment: file },
      d,
    );
    expect(result).toBeNull();
    expect(files.upload).not.toHaveBeenCalled();
    expect(contracts.createRevision).not.toHaveBeenCalled();
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
