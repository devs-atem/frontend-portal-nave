import type { IHttpService } from "@core/http/models/IHttpService";
import { CONTRACTS_ENDPOINTS, type AttachmentResponse } from "./contract";

/** Tamanho máximo aceito pelo backend (`POST /files`). */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export interface UploadedFile {
  key: string;
  originalName: string;
}

export interface IFilesService {
  /** Envio temporário (`POST /files`); devolve a chave para confirmar como anexo. */
  upload(file: File): Promise<UploadedFile>;
  /** Confirma chaves temporárias como anexos do contrato (`POST /attachments`). */
  attachToContract(contractId: string, keys: string[]): Promise<AttachmentResponse[]>;
  /** Baixa o arquivo autenticado (a rota exige o token do usuário). */
  download(attachmentId: string): Promise<Blob>;
}

/** Valida o arquivo antes do envio; devolve a mensagem de erro ou `null`. */
export const validateAttachmentFile = (file: File): string | null =>
  file.size > MAX_ATTACHMENT_BYTES ? "O arquivo excede o limite de 20 MB." : null;

/** Upload e anexos (`/rest/files`, `/rest/attachments`). */
export class FilesService implements IFilesService {
  constructor(private readonly http: IHttpService) {}

  upload(file: File): Promise<UploadedFile> {
    const body = new FormData();
    body.append("file", file);
    return this.http.post<UploadedFile>(CONTRACTS_ENDPOINTS.files, body);
  }

  attachToContract(contractId: string, keys: string[]): Promise<AttachmentResponse[]> {
    return this.http.post<AttachmentResponse[]>(CONTRACTS_ENDPOINTS.attachments, {
      entityType: "CONTRACT",
      entityId: contractId,
      keys,
    });
  }

  download(attachmentId: string): Promise<Blob> {
    return this.http.get<Blob>(CONTRACTS_ENDPOINTS.attachmentDownload(attachmentId), undefined, "blob");
  }
}
