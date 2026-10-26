// @ts-check
/**
 * Utilitários do setup wizard, extraídos pra permitir testes.
 */

/**
 * Serializa um valor pra uma linha de `.env` compatível com ambos os
 * parsers que o template usa:
 *
 * - **dotenv** (via Vite): aceita valor com espaço sem aspas, mas aceita
 *   também com aspas duplas.
 * - **mise** (`[env] _.file = ".env"` no `mise.toml`): parser mais estrito
 *   — exige aspas quando há espaços, aspas internas ou símbolos reservados.
 *
 * Estratégia: valores simples ficam sem aspas (deixa o `.env` legível);
 * qualquer coisa com espaço, aspa, `$` ou `\` entra em aspas duplas, com
 * escape de `"` e `\`.
 *
 * @param {unknown} v
 * @returns {string}
 */
export function envValue(v) {
  if (v === undefined || v === null) return "";
  const str = String(v);
  if (str === "") return "";
  if (/[\s"'$\\]/.test(str)) {
    return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return str;
}
