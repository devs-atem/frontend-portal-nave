/**
 * Cliente cadastrado no portal (dados mestres).
 * Campos essenciais do cadastro: CNPJ, nome e BPID.
 */
export interface ClientRecord {
  id: string;
  /** CNPJ formatado (00.000.000/0000-00). */
  cnpj: string;
  /** Razão social / nome do cliente. */
  name: string;
  /** Business Partner ID (identificador no SAP/ERP). */
  bpid: string;
  active: boolean;
}

/** Dados de entrada de um novo cadastro ou edição. */
export type ClientRecordInput = Omit<ClientRecord, "id" | "active"> & {
  active?: boolean;
};

const SEED: ClientRecord[] = [
  { id: "1", cnpj: "12.345.678/0001-90", name: "Rio Negro Combustíveis Ltda", bpid: "BP-100245", active: true },
  { id: "2", cnpj: "98.765.432/0001-10", name: "Distribuidora Amazonas S.A.", bpid: "BP-100312", active: true },
  { id: "3", cnpj: "45.612.378/0001-55", name: "Solimões Energia Ltda", bpid: "BP-100478", active: true },
];

/**
 * Service de cadastro de clientes (mock em memória).
 *
 * CRUD síncrono determinístico. Para integrar com backend, injetar
 * `IHttpService` no construtor e trocar os métodos por chamadas HTTP.
 */
export class ClientRegistrationService {
  private clients: ClientRecord[] = [...SEED];

  list(): ClientRecord[] {
    return [...this.clients];
  }

  create(input: ClientRecordInput): ClientRecord {
    const created: ClientRecord = {
      id: crypto.randomUUID(),
      cnpj: input.cnpj,
      name: input.name,
      bpid: input.bpid,
      active: input.active ?? true,
    };
    this.clients = [created, ...this.clients];
    return created;
  }

  update(id: string, input: ClientRecordInput): ClientRecord | undefined {
    const idx = this.clients.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const updated: ClientRecord = {
      ...this.clients[idx],
      cnpj: input.cnpj,
      name: input.name,
      bpid: input.bpid,
      active: input.active ?? this.clients[idx].active,
    };
    this.clients = this.clients.map((c) => (c.id === id ? updated : c));
    return updated;
  }

  remove(id: string): void {
    this.clients = this.clients.filter((c) => c.id !== id);
  }
}
