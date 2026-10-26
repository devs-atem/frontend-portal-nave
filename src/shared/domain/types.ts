/**
 * Tipos de domínio do Portal do Cliente de Armazenagem (Navemazônia).
 * Espelham os modelos do protótipo, com nomes em TypeScript idiomático.
 */

export type StatusAgendamento =
  | "Rascunho"
  | "Enviado"
  | "Autorizado"
  | "Recusado"
  | "Cancelado"
  | "Concluído";

export type SituacaoVeiculo =
  | "Agendado"
  | "No pré-gate"
  | "Aguardando chamada"
  | "Em operação"
  | "Liberado"
  | "Cancelado";

export type SituacaoNFe = "Autorizada" | "Cancelada" | "Denegada" | "Pendente";

export type TipoOperacao = "Carga" | "Descarga";

export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  /** Densidade padrão a 20 °C. */
  dens: number;
}

export interface Cliente {
  id: number;
  codigo: string;
  razao: string;
  cnpj: string;
}

export interface Tanque {
  id: number;
  codigo: string;
  produtoId: number;
  clienteId: number;
  /** Capacidade total (L). */
  cap: number;
  /** Volume atual (L). */
  vol: number;
  /** Volume bloqueado (L). */
  bloqueado: number;
  /** Volume liberado (L). */
  liberado: number;
  /** Volume sem liberação (L). */
  semLib: number;
  /** Temperatura (°C). */
  temp: number;
  /** Densidade corrigida a 20 °C. */
  densCor: number;
  /** Última medição. */
  ultMed: Date;
}

export interface ItemAgendamento {
  produtoId: number;
  /** Quantidade (L). */
  qtd: number;
}

export interface Transportadora {
  tipo: "F" | "J";
  doc: string;
  nome: string;
  codigo: string;
}

export interface Agendamento {
  id: string;
  codigo: string;
  emissao: Date;
  previsao: Date;
  tipo: TipoOperacao;
  modal: string;
  situacao: SituacaoVeiculo;
  status: StatusAgendamento;
  requisicao?: string;
  placa?: string;
  navio?: string;
  uf?: string;
  carreta1?: string;
  carreta2?: string;
  transp: Transportadora;
  motorista: { nome: string; cel?: string };
  itens: ItemAgendamento[];
  clienteId: number;
  clienteVenda?: string;
  notaVenda?: string;
  patio?: string;
  /** Marcos temporais do veículo. */
  steps: {
    programacao?: Date;
    pregate?: Date;
    chegada?: Date;
    entrada?: Date;
    saida?: Date;
  };
}

export interface Descarga {
  id: number;
  data: Date;
  lote: string;
  autOp: string;
  nf: number;
  deposito: string;
  produtoId: number;
  clienteId: number;
  modal: string;
  /** Quantidade na nota (L). */
  qtdNF: number;
  /** Quantidade recebida (L). */
  qtdRec: number;
  /** Peso da nota (kg). */
  pesoNF: number;
  /** Peso líquido na balança (kg). */
  liq: number;
  placas?: string;
  transp: string;
  entrada: Date;
  saida: Date;
}

export interface Carga {
  id: number;
  data: Date;
  autOp: string;
  produtoId: number;
  clienteId: number;
  /** Litros expedidos. */
  litros: number;
  placa: string;
  transp: string;
  modal: string;
  nf?: number;
}

export interface NFe {
  id: number;
  numero: number;
  serie: number;
  chave: string;
  emissao: Date;
  valor: number;
  clienteId: number;
  situacao: SituacaoNFe;
  danfe: boolean;
}

export interface MovimentoDiario {
  data: Date;
  clienteId: number;
  produtoId: number;
  /** Entradas no dia (L). */
  ent: number;
  /** Saídas no dia (L). */
  sai: number;
  /** Ajustes (L). */
  aj: number;
  /** Saldo do dia (L). */
  saldo: number;
  /** Densidade usada no dia. */
  dens: number;
}

export interface Densidade {
  id: number;
  tanqueId: number;
  data: Date;
  /** Densidade observada. */
  densO: number;
  /** Densidade corrigida a 20 °C. */
  densC: number;
  temp: number;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  clientes: string;
  ultimo: Date;
  ativo: boolean;
}

export interface Auditoria {
  id: string;
  dh: Date;
  u: string;
  acao: string;
  ent: string;
}

export interface KpisDashboard {
  disponivel: number;
  disponivelKg: number;
  bloqueado: number;
  bloqueadoKg: number;
  veiculosNoTerminal: number;
  veiculosEmOperacao: number;
  agendamentosHoje: number;
  descargasMes: number;
  litrosRecebidosMes: number;
  cargasMes: number;
  litrosExpedidosMes: number;
}
