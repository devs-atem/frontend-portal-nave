import type { StatusTagStatus } from "@devs-atem/design-system";

import type {
  SituacaoNFe,
  SituacaoVeiculo,
  StatusAgendamento,
} from "./types";

/** Inteiro em pt-BR (ex.: 1.234.567). */
export const fN = (v: number): string =>
  new Intl.NumberFormat("pt-BR").format(Math.round(v));

/** Decimal em pt-BR com `casas` fixas. */
export const fDec = (v: number, casas = 2): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(v);

/** Moeda BRL. */
export const fBRL = (v: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);

/** Data (dd/mm/aaaa). */
export const fD = (d: Date): string => d.toLocaleDateString("pt-BR");

/** Data e hora (dd/mm/aaaa hh:mm). */
export const fDH = (d: Date): string =>
  `${fD(d)} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

/** Hora (hh:mm). */
export const fH = (d: Date): string =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Percentual com 1 casa (ex.: "83,0%"). */
export const fPct = (ratio: number): string => `${fDec(ratio * 100, 1)}%`;

/** ISO (yyyy-mm-dd) para inputs type=date. */
export const iso = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Traduz um status de domínio para a variante de cor do `StatusTag` do DS.
 */
export function statusToTag(
  status: StatusAgendamento | SituacaoVeiculo | SituacaoNFe | string,
): StatusTagStatus {
  const map: Record<string, StatusTagStatus> = {
    // Agendamento
    Rascunho: "neutral",
    Enviado: "info",
    Autorizado: "dark-success",
    Recusado: "error",
    Cancelado: "error",
    Concluído: "success",
    // Situação de veículo
    Agendado: "info",
    "No pré-gate": "warning",
    "Aguardando chamada": "peach",
    "Em operação": "lilac",
    Liberado: "success",
    // NF-e
    Autorizada: "success",
    Denegada: "error",
    Pendente: "warning",
    // Admin
    Ativo: "success",
    Inativo: "neutral",
  };
  return map[status] ?? "neutral";
}
