import { CLIENTES } from "@shared/domain";

import type {
  ClientRecord,
  ClientRecordInput,
  IClientRegistrationService,
} from "./ClientRegistrationService";

/**
 * Implementação mock (em memória) do cadastro de clientes, semeada a partir de
 * `CLIENTES`. Os dados são perdidos ao recarregar a página. Usada enquanto a
 * API `/rest/clients` não está estável no ambiente de dev.
 */
export class MockClientRegistrationService implements IClientRegistrationService {
  private rows: ClientRecord[] = CLIENTES.map((c) => ({
    id: `mock-${c.id}`,
    cnpj: c.cnpj,
    branches: [],
    name: c.razao,
    bpid: c.codigo,
    active: true,
  }));

  private nextId = CLIENTES.length + 1;

  async list(): Promise<ClientRecord[]> {
    return this.rows.map((r) => ({ ...r }));
  }

  async create(input: ClientRecordInput): Promise<ClientRecord> {
    const record: ClientRecord = {
      id: `mock-${this.nextId++}`,
      cnpj: input.cnpj,
      branches: [],
      name: input.name,
      bpid: input.bpid,
      active: input.active ?? true,
    };
    this.rows = [...this.rows, record];
    return { ...record };
  }

  async update(
    id: string,
    input: ClientRecordInput,
    branches: string[] = [],
  ): Promise<ClientRecord> {
    const current = this.rows.find((r) => r.id === id);
    if (!current) throw new Error("Cliente não encontrado.");
    const updated: ClientRecord = {
      ...current,
      cnpj: input.cnpj,
      name: input.name,
      bpid: input.bpid,
      active: input.active ?? current.active,
      branches,
    };
    this.rows = this.rows.map((r) => (r.id === id ? updated : r));
    return { ...updated };
  }

  async remove(id: string): Promise<void> {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
}
