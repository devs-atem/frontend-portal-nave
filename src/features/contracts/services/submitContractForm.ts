import type { ContractResponse, NextIdentifiers } from "./contract";
import { errorStatus } from "./contractErrors";
import { buildContractRequest, buildRevisionInput, type ContractForm } from "./contractRules";
import type { IContractsService } from "./ContractsService";
import type { IFilesService } from "./FilesService";

export type SubmitMode = "create" | "edit" | "revision";

export interface SubmitContractFormInput {
  mode: SubmitMode;
  /** Obrigatório em `edit` e `revision`. */
  id?: string;
  form: ContractForm;
  attachment: File | null;
}

export interface SubmitContractFormDeps {
  contracts: Pick<IContractsService, "create" | "update" | "createRevision" | "nextIdentifiers">;
  files: Pick<IFilesService, "upload" | "attachToContract">;
  /** Recebe uma nova sugestão de número quando a criação conflita (409). */
  onIdentifiers?: (identifiers: NextIdentifiers) => void;
}

export interface SubmitContractFormResult {
  contract: ContractResponse;
  contractId: string;
  /** O contrato foi salvo, mas o anexo não pôde ser confirmado. */
  attachmentFailed: boolean;
}

/**
 * Envio do formulário de contrato em etapas: (1) arquivo temporário, (2) gravação do contrato
 * ou da revisão, (3) confirmação do anexo. Falha na etapa 1 ou 2 propaga o erro e nada além
 * do já feito é gravado; falha na etapa 3 NÃO desfaz o contrato e vira `attachmentFailed`.
 * A nova revisão não aceita anexo.
 */
export async function submitContractForm(
  { mode, id, form, attachment }: SubmitContractFormInput,
  { contracts, files, onIdentifiers }: SubmitContractFormDeps,
): Promise<SubmitContractFormResult | null> {
  try {
    const uploaded = attachment && mode !== "revision" ? await files.upload(attachment) : null;

    let contract: ContractResponse;
    if (mode === "create") {
      contract = await contracts.create(buildContractRequest(form));
    } else if (mode === "edit" && id) {
      contract = await contracts.update(id, buildContractRequest(form));
    } else if (mode === "revision" && id) {
      contract = await contracts.createRevision(id, {
        ...buildRevisionInput(form.revision),
        justification: form.revision.justification.trim(),
      });
    } else {
      return null;
    }

    const contractId = contract?.id ?? id ?? "";
    let attachmentFailed = false;
    if (uploaded && contractId) {
      try {
        await files.attachToContract(contractId, [uploaded.key]);
      } catch (attachErr) {
        attachmentFailed = true;
        console.warn("[contratos] falha ao confirmar o anexo do contrato", attachErr);
      }
    }
    return { contract, contractId, attachmentFailed };
  } catch (err) {
    if (errorStatus(err) === 409 && mode === "create") {
      // Número em conflito: busca outra sugestão para a próxima tentativa.
      contracts
        .nextIdentifiers()
        .then((next) => onIdentifiers?.(next))
        .catch((refreshErr: unknown) =>
          console.warn("[contratos] não foi possível atualizar o número sugerido", refreshErr),
        );
    }
    throw err;
  }
}

/** Mensagem do aviso exibido quando só o anexo falhou. */
export const attachmentFailedMessage = (mode: SubmitMode): string =>
  mode === "edit"
    ? "O rascunho foi salvo, mas o anexo não foi salvo."
    : "O contrato foi criado, mas o anexo não foi salvo.";
