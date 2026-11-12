/**
 * Mensagem amigável para falhas das operações de produto.
 *
 * - 409: a API devolve a mensagem em português (`sapCode` duplicado,
 *   `clientIds` repetido): é exibida direto.
 * - Exclusão de produto usado em contrato: hoje a API responde 500 (erro de FK
 *   não tratado); após correção no back será 409. Ambos viram a mesma mensagem.
 */
export function productErrorMessage(
  err: unknown,
  op: "save" | "delete",
): string {
  const e = err as { status?: number; statusCode?: number } | null;
  const status = e?.status ?? e?.statusCode;
  const msg = err instanceof Error ? err.message : "";

  if (op === "delete" && (status === 500 || status === 409)) {
    return "Produto em uso em contratos e não pode ser excluído.";
  }
  if (status === 409 && msg) return msg;
  if (status === 404) return "Produto ou cliente não encontrado.";
  if (status === 400) return "Dados inválidos. Revise os campos informados.";
  return msg || "Não foi possível concluir a operação.";
}
