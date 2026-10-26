/**
 * Dados mockados determinísticos do Portal do Cliente de Armazenagem.
 *
 * Datas são relativas a `HOJE` (data atual truncada ao dia) para a demonstração
 * parecer sempre "fresca", mas sem aleatoriedade por render.
 */
import type {
  Agendamento,
  Auditoria,
  Carga,
  Cliente,
  Densidade,
  Descarga,
  MovimentoDiario,
  NFe,
  Produto,
  Tanque,
  Usuario,
} from "./types";

export const HOJE: Date = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

export const addD = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const at = (base: Date, h: number, m = 0): Date => {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

// ─── Produtos ──────────────────────────────────────────────────────────────
export const PRODUTOS: Produto[] = [
  { id: 1, codigo: "GAS-C", nome: "Gasolina C", dens: 0.7485 },
  { id: 2, codigo: "ET-AN", nome: "Etanol Anidro", dens: 0.7915 },
  { id: 3, codigo: "ET-HI", nome: "Etanol Hidratado", dens: 0.8095 },
  { id: 4, codigo: "DS-S10", nome: "Diesel S10", dens: 0.8365 },
  { id: 5, codigo: "DS-S500", nome: "Diesel S500", dens: 0.8445 },
];

/** Paleta de cores por produto (identidade visual). */
export const COR_PRODUTO: Record<number, string> = {
  1: "#0D265E",
  2: "#1E8E5A",
  3: "#2EA36B",
  4: "#F39200",
  5: "#D17D00",
};

// ─── Clientes ──────────────────────────────────────────────────────────────
export const CLIENTES: Cliente[] = [
  { id: 1, codigo: "CLI-001", razao: "Rio Negro Combustíveis Ltda", cnpj: "12.345.678/0001-90" },
  { id: 2, codigo: "CLI-002", razao: "Distribuidora Amazonas S.A.", cnpj: "98.765.432/0001-10" },
  { id: 3, codigo: "CLI-003", razao: "Solimões Energia Ltda", cnpj: "45.612.378/0001-55" },
];

// ─── Tanques ───────────────────────────────────────────────────────────────
export const TANQUES: Tanque[] = [
  mkTank(1, "TQ-01", 1, 1, 3_000_000, 2_460_000, 180_000),
  mkTank(2, "TQ-02", 2, 1, 2_000_000, 1_240_000, 60_000),
  mkTank(3, "TQ-03", 4, 1, 2_500_000, 310_000, 0),
  mkTank(4, "TQ-04", 1, 2, 3_000_000, 2_880_000, 240_000),
  mkTank(5, "TQ-05", 3, 2, 1_500_000, 690_000, 30_000),
  mkTank(6, "TQ-06", 5, 2, 2_500_000, 1_980_000, 120_000),
  mkTank(7, "TQ-07", 4, 3, 2_000_000, 240_000, 0),
  mkTank(8, "TQ-08", 2, 3, 1_500_000, 1_125_000, 90_000),
];

function mkTank(
  id: number,
  codigo: string,
  produtoId: number,
  clienteId: number,
  cap: number,
  vol: number,
  bloqueado: number,
): Tanque {
  const prod = PRODUTOS.find((p) => p.id === produtoId)!;
  const diasMed = id % 4 === 0 ? 9 : 2; // alguns com densidade "desatualizada"
  return {
    id,
    codigo,
    produtoId,
    clienteId,
    cap,
    vol,
    bloqueado,
    liberado: vol - bloqueado,
    semLib: 0,
    temp: 27 + (id % 5) * 0.4,
    densCor: prod.dens + (id % 3) * 0.0006,
    ultMed: addD(HOJE, -diasMed),
  };
}

// ─── Movimento diário (últimos 30 dias por cliente/produto) ──────────────────
export const MOV_DIARIO: MovimentoDiario[] = (() => {
  const out: MovimentoDiario[] = [];
  const pares: Array<[number, number, number]> = [
    [1, 1, 2_300_000],
    [1, 2, 1_180_000],
    [2, 1, 2_750_000],
    [2, 5, 1_900_000],
    [3, 2, 1_050_000],
  ];
  for (const [clienteId, produtoId, base] of pares) {
    const prod = PRODUTOS.find((p) => p.id === produtoId)!;
    let saldo = base;
    for (let i = 29; i >= 0; i--) {
      const data = addD(HOJE, -i);
      const ent = i % 5 === 0 ? 120_000 + ((i * 37) % 60_000) : 0;
      const sai = 40_000 + ((i * 53) % 90_000);
      const aj = i % 11 === 0 ? -5_000 : 0;
      saldo = saldo + ent - sai + aj;
      out.push({ data, clienteId, produtoId, ent, sai, aj, saldo, dens: prod.dens });
    }
  }
  return out;
})();

// ─── Agendamentos ────────────────────────────────────────────────────────────
export const AGENDAMENTOS: Agendamento[] = [
  mkAg("a1", "AG-26711", 1, "Descarga", "Rodoviário", "Em operação", "Autorizado", "AMB1C23", [[1, 45_000]], 0, { chegada: -2, entrada: -1 }),
  mkAg("a2", "AG-26712", 1, "Carga", "Rodoviário", "Aguardando chamada", "Autorizado", "AMD2E45", [[2, 30_000]], 0, { chegada: -1 }),
  mkAg("a3", "AG-26713", 2, "Descarga", "Marítimo", "No pré-gate", "Autorizado", undefined, [[5, 1_200_000]], 0, { pregate: 0 }),
  mkAg("a4", "AG-26714", 1, "Carga", "Rodoviário", "Agendado", "Enviado", "AMF3G67", [[1, 40_000]], 0, {}),
  mkAg("a5", "AG-26715", 2, "Carga", "Rodoviário", "Agendado", "Autorizado", "AMH4I89", [[3, 25_000]], 1, {}),
  mkAg("a6", "AG-26716", 1, "Descarga", "Rodoviário", "Liberado", "Concluído", "AMJ5K01", [[4, 36_000]], -1, { chegada: -1, entrada: -1, saida: -1 }),
  mkAg("a7", "AG-26717", 3, "Carga", "Rodoviário", "Agendado", "Enviado", "AML6M23", [[2, 28_000]], 1, {}),
  mkAg("a8", "AG-26718", 2, "Descarga", "Dutoviário", "Em operação", "Autorizado", undefined, [[5, 300_000]], 0, { chegada: -1, entrada: 0 }),
];

function mkAg(
  id: string,
  codigo: string,
  clienteId: number,
  tipo: Agendamento["tipo"],
  modal: string,
  situacao: Agendamento["situacao"],
  status: Agendamento["status"],
  placa: string | undefined,
  itens: Array<[number, number]>,
  diaPrev: number,
  steps: { pregate?: number; chegada?: number; entrada?: number; saida?: number },
): Agendamento {
  const prev = at(addD(HOJE, diaPrev), 8 + (id.charCodeAt(1) % 8), 0);
  const toDate = (off?: number) => (off === undefined ? undefined : at(addD(HOJE, off), 9));
  return {
    id,
    codigo,
    emissao: addD(HOJE, -3),
    previsao: prev,
    tipo,
    modal,
    situacao,
    status,
    requisicao: `REQ-${50_000 + id.charCodeAt(1)}`,
    placa,
    navio: placa ? undefined : "NM Solimões",
    uf: "AM",
    transp: { tipo: "J", doc: "33.444.555/0001-22", nome: "Transamazônica Cargas", codigo: "TR-010" },
    motorista: { nome: placa ? "Antônio Souza Lima" : "—", cel: "(92) 98112-4470" },
    itens: itens.map(([produtoId, qtd]) => ({ produtoId, qtd })),
    clienteId,
    clienteVenda: "Posto Ponta Negra",
    notaVenda: "",
    patio: "Pátio A",
    steps: {
      programacao: addD(HOJE, -3),
      pregate: toDate(steps.pregate),
      chegada: toDate(steps.chegada),
      entrada: toDate(steps.entrada),
      saida: toDate(steps.saida),
    },
  };
}

// ─── Descargas ───────────────────────────────────────────────────────────────
export const DESCARGAS: Descarga[] = Array.from({ length: 14 }, (_, i) => {
  const produtoId = [1, 2, 4, 5][i % 4];
  const clienteId = [1, 2, 3][i % 3];
  const qtdNF = 45_000 + (i % 4) * 2_500;
  const dens = PRODUTOS.find((p) => p.id === produtoId)!.dens;
  const pesoNF = Math.round(qtdNF * dens);
  const difPct = i % 6 === 0 ? 0.012 : 0.002; // alguns acima da tolerância
  const liq = Math.round(pesoNF * (1 - (i % 2 === 0 ? -difPct : difPct)));
  const data = addD(HOJE, -(i + 1));
  return {
    id: i + 1,
    data,
    lote: `L${2600 + i}`,
    autOp: `AUT-${9000 + i}`,
    nf: 48_000 + i,
    deposito: `DEP-${(i % 3) + 1}`,
    produtoId,
    clienteId,
    modal: i % 5 === 0 ? "Marítimo" : "Rodoviário",
    qtdNF,
    qtdRec: Math.round(liq / dens),
    pesoNF,
    liq,
    placas: "AMB1C23 / AMB1C24",
    transp: "Transamazônica Cargas",
    entrada: at(data, 8, 10),
    saida: at(data, 10, 35),
  };
});

// ─── Cargas ──────────────────────────────────────────────────────────────────
export const CARGAS: Carga[] = Array.from({ length: 12 }, (_, i) => {
  const produtoId = [1, 2, 3, 4][i % 4];
  const clienteId = [1, 2][i % 2];
  const data = addD(HOJE, -(i + 1));
  return {
    id: i + 1,
    data,
    autOp: `CRG-${7000 + i}`,
    produtoId,
    clienteId,
    litros: 28_000 + (i % 5) * 2_000,
    placa: `AMC${i}D${i}0`,
    transp: "Transamazônica Cargas",
    modal: "Rodoviário",
    nf: 72_000 + i,
  };
});

// ─── NF-e ──────────────────────────────────────────────────────────────────
export const NFES: NFe[] = Array.from({ length: 16 }, (_, i) => {
  const clienteId = [1, 2, 3][i % 3];
  const situacoes = ["Autorizada", "Autorizada", "Pendente", "Cancelada"] as const;
  return {
    id: i + 1,
    numero: 100_200 + i,
    serie: 1,
    chave: `3526${String(10_000_000_000_000_000_000_000_000_000_000_000_000 + i).slice(0, 40)}`,
    emissao: at(addD(HOJE, -(i % 10)), 9 + (i % 8), i % 60),
    valor: 180_000 + (i % 6) * 12_500,
    clienteId,
    situacao: situacoes[i % situacoes.length],
    danfe: i % 4 !== 2,
  };
});

// ─── Densidades ──────────────────────────────────────────────────────────────
export const DENSIDADES: Densidade[] = (() => {
  const out: Densidade[] = [];
  let id = 1;
  for (const t of TANQUES) {
    for (let i = 5; i >= 0; i--) {
      const data = addD(HOJE, -i * 3);
      const base = t.densCor;
      const densC = base + ((i % 3) - 1) * 0.0007;
      out.push({ id: id++, tanqueId: t.id, data, densO: densC + 0.0025, densC, temp: 27 + (i % 4) * 0.5 });
    }
  }
  return out;
})();

// ─── Usuários ────────────────────────────────────────────────────────────────
export const USUARIOS: Usuario[] = [
  { id: 1, nome: "Mariana Tavares", email: "mariana@rionegro.com.br", perfil: "Cliente — Agendador", clientes: "CLI-001", ultimo: addD(HOJE, 0), ativo: true },
  { id: 2, nome: "Paulo Henrique Dias", email: "paulo@amazonas.com.br", perfil: "Cliente — Consulta", clientes: "CLI-002", ultimo: addD(HOJE, -1), ativo: true },
  { id: 3, nome: "Transamazônica Cargas", email: "op@transamazonica.com.br", perfil: "Transportadora", clientes: "—", ultimo: addD(HOJE, -2), ativo: true },
  { id: 4, nome: "Carlos Menezes", email: "carlos@navemazonia.com.br", perfil: "Operador Navemazônia", clientes: "Todos", ultimo: addD(HOJE, 0), ativo: true },
  { id: 5, nome: "Helena Barros", email: "helena@navemazonia.com.br", perfil: "Administrador", clientes: "Todos", ultimo: addD(HOJE, 0), ativo: true },
  { id: 6, nome: "Ricardo Lopes", email: "ricardo@solimoes.com.br", perfil: "Cliente — Consulta", clientes: "CLI-003", ultimo: addD(HOJE, -8), ativo: false },
];

// ─── Auditoria ───────────────────────────────────────────────────────────────
export const AUDITORIA: Auditoria[] = Array.from({ length: 10 }, (_, i) => ({
  id: `LOG-${3000 + i}`,
  dh: at(addD(HOJE, -(i % 5)), 8 + (i % 10), (i * 7) % 60),
  u: ["Mariana Tavares", "Carlos Menezes", "Helena Barros"][i % 3],
  acao: ["Criou agendamento", "Autorizou agendamento", "Alterou parâmetro", "Exportou relatório", "Cancelou agendamento"][i % 5],
  ent: ["Agendamento", "Parâmetro", "Relatório"][i % 3],
}));

export const PATIOS = ["Pátio A", "Pátio B"];
export const JANELAS = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
export const CAP_VEIC: Record<string, number> = {
  "Toco": 8_000,
  "Truck": 14_000,
  "Carreta": 45_000,
  "Bitrem": 60_000,
  "Rodotrem": 75_000,
};
export const LOCAIS_TRANSF = ["Terminal Manaus", "Base Itacoatiara", "Base Coari"];
