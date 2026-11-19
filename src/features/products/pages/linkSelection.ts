/**
 * Ids pré-selecionados ao editar os vínculos de um produto ou cliente: só os ativos.
 *
 * No mw-nave o PATCH com `clientIds`/`productIds` é uma substituição que não apaga
 * vínculos: os ausentes ficam `isActive=false` e os enviados são reativados. Enviar
 * um vínculo inativo o reativaria sem o usuário pedir; omiti-lo o mantém inativo.
 */
export function activeLinkIds<T>(links: ReadonlyArray<{ id: T; linkIsActive: boolean }>): T[] {
  return links.filter((link) => link.linkIsActive).map((link) => link.id);
}
