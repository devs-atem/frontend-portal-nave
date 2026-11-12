/** Estado de carga dos produtos vinculados no formulário de edição. */
export type ProductsLoadState = "idle" | "loading" | "ready" | "error";

/** Compara duas listas de ids como conjuntos (ordem irrelevante). */
export const sameSet = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * Decide o `productIds` do PATCH (substituição total no backend).
 * Só envia quando o detalhe carregou (`ready`) e a seleção mudou; caso
 * contrário retorna `undefined` para não apagar vínculos por engano.
 */
export const buildProductIdsPatch = (
  selected: string[],
  initial: string[],
  state: ProductsLoadState,
): string[] | undefined =>
  state === "ready" && !sameSet(selected, initial) ? selected : undefined;

/** Status HTTP de um erro (`AppError` usa `status`; alguns usam `statusCode`). */
export const errorStatus = (err: unknown): number | undefined => {
  const e = err as { status?: number; statusCode?: number } | null;
  return e?.status ?? e?.statusCode;
};

/**
 * Mensagem amigável por status HTTP. No 409 a API devolve a mensagem em
 * português (BP ou CNPJ da matriz duplicado, `productIds` repetido): exibe-a.
 */
export const errorMessage = (err: unknown, fallback: string): string => {
  const code = errorStatus(err);
  const msg = err instanceof Error ? err.message : "";
  if (code === 409) return msg || "Já existe um cliente com este BP ou CNPJ.";
  if (code === 400) {
    return /cnpj/i.test(msg)
      ? "CNPJ inválido."
      : "Dados inválidos. Revise os campos informados.";
  }
  if (code === 404) return "Cliente ou produto não encontrado.";
  return msg || fallback;
};
