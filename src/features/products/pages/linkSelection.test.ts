import { describe, expect, it } from "vitest";

import { activeLinkIds } from "./linkSelection";

/**
 * Regressão (PR #11): a edição de vínculos pré-seleciona só os vínculos ativos.
 * No mw-nave o PATCH com `clientIds`/`productIds` não apaga os ausentes: marca
 * `isActive=false` e reativa os enviados (product.update.ts / client.update.ts).
 * Logo, omitir o inativo o MANTÉM inativo; enviá-lo o reativaria sem o usuário pedir.
 */
describe("activeLinkIds", () => {
  const links = [
    { id: "c1", linkIsActive: true },
    { id: "c2", linkIsActive: false },
    { id: "c3", linkIsActive: true },
  ];

  it("pré-seleciona somente os vínculos ativos", () => {
    expect(activeLinkIds(links)).toEqual(["c1", "c3"]);
  });

  it("salvar sem alterações não envia o vínculo inativo, então ele não é reativado nem removido", () => {
    const payload = activeLinkIds(links);
    expect(payload).not.toContain("c2");
    // O efeito no salvamento (payload do PATCH) é coberto em ProductsPage.links.test.tsx.
  });

  it("funciona com ids numéricos (clientes) e lista vazia", () => {
    expect(activeLinkIds([{ id: 7, linkIsActive: true }, { id: 8, linkIsActive: false }])).toEqual([7]);
    expect(activeLinkIds([])).toEqual([]);
  });
});
