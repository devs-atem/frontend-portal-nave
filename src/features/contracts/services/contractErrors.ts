/**
 * Traduz erros da API de contratos para mensagens amigáveis em português.
 * 403 nunca expõe o texto técnico (`User '<id>' does not have required permissions`).
 */
const KNOWN: [RegExp, string][] = [
  [/Only DRAFT contracts can be edited/i, "Só contratos em rascunho podem ser editados. O status mudou."],
  [/Invalid contract transition/i, "Esta transição de status não é permitida. O status do contrato mudou."],
  [/Opening declaration missing/i, "Falta a declaração de abertura de um item do contrato."],
  [/non-zero custody exposure/i, "Há saldo ou posição de custódia diferente de zero. Zere antes de encerrar ou remover o item."],
  [/Contract identity already exists/i, "Já existe um contrato com este código interno ou número."],
  [/is not linked to the Owner/i, "O produto não está vinculado ao depositante."],
  [/Pool does not allow the product/i, "O pool selecionado não permite este produto."],
  [/justification is required/i, "Informe a justificativa."],
  [/Owner product already exists/i, "Este produto já está vinculado ao depositante."],
];

export function contractErrorMessage(err: unknown, fallback: string): string {
  const e = err as { status?: number; statusCode?: number } | null;
  const status = e?.status ?? e?.statusCode;
  const msg = err instanceof Error ? err.message : "";

  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 401) return "Sessão expirada. Entre novamente.";
  for (const [re, text] of KNOWN) if (re.test(msg)) return text;
  if (status === 404) return "Registro não encontrado ou fora do seu escopo.";
  if (status === 409 && msg) return msg;
  if (status === 400) return msg || "Dados inválidos. Revise os campos informados.";
  return msg || fallback;
}

/** Erros que indicam que o contrato mudou de estado: a tela deve recarregar. */
export function isStaleStateError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : "";
  return /Invalid contract transition|Only DRAFT contracts can be edited/i.test(msg);
}

export const errorStatus = (err: unknown): number | undefined => {
  const e = err as { status?: number; statusCode?: number } | null;
  return e?.status ?? e?.statusCode;
};
